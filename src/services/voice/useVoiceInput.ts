import { useState, useRef, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { FactExtractionOutput } from '../../domain/schemas';

interface UseVoiceInputOptions {
  lang?: string;
  scenarioContextHint?: string;
  onFactsExtracted?: (facts: FactExtractionOutput, transcript: string) => void;
  onTranscriptChange?: (transcript: string) => void;
}

export interface UseVoiceInputReturn {
  isListening: boolean;
  isRecordingFallback: boolean;
  isTranscribing: boolean;
  transcript: string;
  interimTranscript: string;
  durationSec: number;
  maxDurationSec: number;
  error: string | null;
  mode: 'web_speech' | 'media_recorder' | 'unsupported';
  startListening: () => Promise<void>;
  stopListening: () => void;
  cancelListening: () => void;
  resetTranscript: () => void;
  setTranscript: (text: string) => void;
}

const MAX_DURATION_SEC = 30;

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const { lang = 'vi-VN', scenarioContextHint, onFactsExtracted, onTranscriptChange } = options;

  const [isListening, setIsListening] = useState<boolean>(false);
  const [isRecordingFallback, setIsRecordingFallback] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [durationSec, setDurationSec] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Determine browser capabilities
  const SpeechRecognition =
    typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  const mode: 'web_speech' | 'media_recorder' | 'unsupported' = SpeechRecognition
    ? 'web_speech'
    : typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia
    ? 'media_recorder'
    : 'unsupported';

  // Refs for cleanup
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const isCancelledRef = useRef<boolean>(false);

  // Clean stop for audio tracks
  const stopAllAudioTracks = useCallback(() => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      audioStreamRef.current = null;
    }
  }, []);

  // Cleanup on unmount / route change
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
        recognitionRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (_) {}
      }
      stopAllAudioTracks();
    };
  }, [stopAllAudioTracks]);

  // Convert audio blob to Base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Start MediaRecorder Fallback
  const startMediaRecorderFallback = async () => {
    try {
      stopAllAudioTracks();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      // Determine supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stopAllAudioTracks();
        setIsListening(false);
        setIsRecordingFallback(false);
        if (timerRef.current) clearInterval(timerRef.current);

        if (isCancelledRef.current) {
          audioChunksRef.current = [];
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];

        if (audioBlob.size < 100) {
          setError('Không thu được âm thanh. Vui lòng nói to hơn và thử lại.');
          return;
        }

        // Send to server-side Gemini audio transcription
        setIsTranscribing(true);
        setError(null);
        try {
          const base64 = await blobToBase64(audioBlob);
          const res = await apiClient.transcribeAudio({
            audioBase64: base64,
            mimeType,
            durationSec,
            scenarioContextHint,
          });

          if (res.transcript) {
            setTranscript((prev) => {
              const updated = prev ? `${prev} ${res.transcript}` : res.transcript;
              if (onTranscriptChange) onTranscriptChange(updated);
              return updated;
            });
          }

          if (res.facts && onFactsExtracted) {
            onFactsExtracted(res.facts, res.transcript);
          }
        } catch (err: any) {
          console.warn('Audio transcription failed:', err);
          setError('Không thể kết nối máy chủ phân tích giọng nói. Bạn có thể nhập mô tả bằng văn bản.');
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start(250); // collect chunks every 250ms
      setIsListening(true);
      setIsRecordingFallback(true);
      setDurationSec(0);

      // Start duration counter
      timerRef.current = setInterval(() => {
        setDurationSec((prev) => {
          if (prev >= MAX_DURATION_SEC - 1) {
            // Auto stop at max duration
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
            }
            return MAX_DURATION_SEC;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone permission or hardware error:', err);
      setIsListening(false);
      setIsRecordingFallback(false);
      setError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Quyền truy cập micro bị từ chối. Vui lòng cho phép micro trên thanh địa chỉ trình duyệt.'
          : 'Không thể truy cập thiết bị micro trên trình duyệt của bạn.'
      );
    }
  };

  // Start Speech Recognition (Primary)
  const startListening = async () => {
    setError(null);
    isCancelledRef.current = false;

    if (SpeechRecognition) {
      try {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch (_) {}
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang;
        recognitionRef.current = recognition;

        recognition.onstart = () => {
          setIsListening(true);
          setDurationSec(0);
          timerRef.current = setInterval(() => {
            setDurationSec((prev) => {
              if (prev >= MAX_DURATION_SEC - 1) {
                try {
                  recognition.stop();
                } catch (_) {}
                return MAX_DURATION_SEC;
              }
              return prev + 1;
            });
          }, 1000);
        };

        recognition.onresult = (event: any) => {
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const piece = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              final += piece;
            } else {
              interim += piece;
            }
          }

          if (interim) {
            setInterimTranscript(interim);
          }

          if (final) {
            setTranscript((prev) => {
              const updated = prev ? `${prev} ${final.trim()}` : final.trim();
              if (onTranscriptChange) onTranscriptChange(updated);
              return updated;
            });
            setInterimTranscript('');
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Web Speech Recognition error:', event.error);
          if (event.error === 'not-allowed') {
            setError('Quyền micro bị từ chối trong trình duyệt.');
            setIsListening(false);
          } else if (event.error === 'no-speech') {
            // Keep listening unless explicit timeout
          } else {
            // If network or speech error, switch to MediaRecorder fallback
            console.warn('Falling back to MediaRecorder audio capture...');
            try {
              recognition.abort();
            } catch (_) {}
            startMediaRecorderFallback();
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          setInterimTranscript('');
          if (timerRef.current) clearInterval(timerRef.current);
        };

        recognition.start();
      } catch (err: any) {
        console.warn('Web Speech start failed, falling back to MediaRecorder:', err);
        startMediaRecorderFallback();
      }
    } else {
      // Direct MediaRecorder fallback
      startMediaRecorderFallback();
    }
  };

  const stopListening = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }

    setIsListening(false);
  };

  const cancelListening = () => {
    isCancelledRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }

    stopAllAudioTracks();
    setIsListening(false);
    setIsRecordingFallback(false);
    setIsTranscribing(false);
    setInterimTranscript('');
  };

  const resetTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  };

  return {
    isListening,
    isRecordingFallback,
    isTranscribing,
    transcript,
    interimTranscript,
    durationSec,
    maxDurationSec: MAX_DURATION_SEC,
    error,
    mode,
    startListening,
    stopListening,
    cancelListening,
    resetTranscript,
    setTranscript,
  };
}
