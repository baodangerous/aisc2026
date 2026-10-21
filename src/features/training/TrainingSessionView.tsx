import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Zap,
  PhoneCall,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Heart,
  Volume2,
  Mic,
  MicOff,
  Camera,
  Activity,
  Star,
  RotateCcw,
  Square,
  X,
  Check,
  Edit3,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { APPROVED_SCENARIOS } from '../../content/approvedScenarios';
import { SessionEvent, TrainingSession, FactExtractionOutput, VisualFactExtractionOutput } from '../../domain/schemas';
import { evaluateEmergencyRules } from '../../domain/ruleEngine';
import { CPRMetronome } from '../../components/CPRMetronome';
import { Call115Modal } from '../../components/Call115Modal';
import { PracticeCameraSheet } from './PracticeCameraSheet';
import { saveLocalSession, saveLocalEvent } from '../../services/indexedDb';
import { apiClient } from '../../services/api/client';
import { useVoiceInput } from '../../services/voice/useVoiceInput';
import { useAuth } from '../auth/AuthContext';

export const TrainingSessionView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const scenarioParam = searchParams.get('scenario') || 'sc_ohca_01';
  const scenario = APPROVED_SCENARIOS.find((s) => s.id === scenarioParam) || APPROVED_SCENARIOS[0];
  const version = scenario.versions[0];

  // Drill State Machine: 'pre_assessment' | 'questions' | 'guidance' | 'post_assessment'
  const [phase, setPhase] = useState<'pre_assessment' | 'questions' | 'guidance' | 'post_assessment'>('pre_assessment');
  const [confidenceBefore, setConfidenceBefore] = useState<number>(3);
  const [confidenceAfter, setConfidenceAfter] = useState<number>(4);

  // Question & Guidance index
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string>>({});
  const [completedGuidanceSteps, setCompletedGuidanceSteps] = useState<Set<number>>(new Set());

  // Text & AI Fact Extractor State
  const [aiDescriptionText, setAiDescriptionText] = useState<string>('');
  const [isExtractingAI, setIsExtractingAI] = useState<boolean>(false);
  const [aiExtractedFacts, setAiExtractedFacts] = useState<FactExtractionOutput | null>(null);
  const [isFactsConfirmed, setIsFactsConfirmed] = useState<boolean>(false);

  // Camera Practice Sheet State
  const [isCameraSheetOpen, setIsCameraSheetOpen] = useState<boolean>(false);
  const [hasCameraSnapshot, setHasCameraSnapshot] = useState<boolean>(false);
  const [visualAnalysisData, setVisualAnalysisData] = useState<VisualFactExtractionOutput | null>(null);

  // Timing & Events
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [isCall115ModalOpen, setIsCall115ModalOpen] = useState<boolean>(false);

  const sessionIdRef = useRef<string>(`sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const startTimeRef = useRef<number>(Date.now());
  const eventsRef = useRef<SessionEvent[]>([]);

  // Reusable Voice Input Hook (Web Speech API + MediaRecorder 30s Fallback + Server-Side Gemini Transcribe)
  const {
    isListening,
    isRecordingFallback,
    isTranscribing,
    transcript,
    interimTranscript,
    durationSec: voiceDurationSec,
    maxDurationSec: voiceMaxDurationSec,
    error: voiceError,
    mode: voiceMode,
    startListening,
    stopListening,
    cancelListening,
    setTranscript,
  } = useVoiceInput({
    lang: 'vi-VN',
    scenarioContextHint: scenario.title,
    onTranscriptChange: (text) => {
      setAiDescriptionText(text);
    },
    onFactsExtracted: (facts, returnedTranscript) => {
      setAiExtractedFacts(facts);
      setIsFactsConfirmed(false);
      if (returnedTranscript) {
        setAiDescriptionText(returnedTranscript);
      }
    },
  });

  // Sync hook transcript changes to manual textarea
  useEffect(() => {
    if (transcript) {
      setAiDescriptionText(transcript);
    }
  }, [transcript]);

  // Append Event with client timestamp
  const logEvent = useCallback((type: SessionEvent['type'], payloadSafe: Record<string, any> = {}) => {
    const now = Date.now();
    const ev: SessionEvent = {
      clientEventId: `ev_${now}_${Math.random().toString(36).slice(2, 7)}`,
      sessionId: sessionIdRef.current,
      type,
      occurredAtClient: new Date(now).toISOString(),
      elapsedMs: now - startTimeRef.current,
      payloadSafe,
      source: 'client',
      schemaVersion: '2.0.0',
    };
    eventsRef.current.push(ev);
    saveLocalEvent(ev).catch((err) => console.warn('Failed saving event locally:', err));
  }, []);

  // Timer Tick
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSec(Math.round((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Cleanup on unmount or phase change
  useEffect(() => {
    return () => {
      cancelListening();
    };
  }, [cancelListening]);

  // Start Drill
  const handleStartDrill = () => {
    if (isListening) {
      stopListening();
    }
    startTimeRef.current = Date.now();
    logEvent('session_started', {
      scenarioId: scenario.id,
      scenarioVersionId: version.versionId,
      confidenceBefore,
      hasVoiceInput: Boolean(aiDescriptionText),
      hasCameraObservation: Boolean(visualAnalysisData),
    });
    setPhase('questions');
    logEvent('question_viewed', { questionId: version.questions[0].id, questionIndex: 0 });
  };

  // AI Fact extraction from text
  const handleExtractFactsWithAI = async () => {
    if (!aiDescriptionText.trim()) return;
    setIsExtractingAI(true);
    try {
      const res = await apiClient.extractFacts({
        text: aiDescriptionText,
        scenarioContextHint: scenario.title,
      });
      setAiExtractedFacts(res.facts);
      setIsFactsConfirmed(false);
      logEvent('feedback_submitted', { actionKey: 'ai_fact_extraction_text' });
    } catch (err) {
      console.warn('AI Extraction failed, fallback available', err);
    } finally {
      setIsExtractingAI(false);
    }
  };

  // Confirm Facts before passing to rule engine
  const handleConfirmFacts = () => {
    setIsFactsConfirmed(true);
    logEvent('feedback_submitted', {
      actionKey: 'emergency_facts_confirmed',
      hasVoiceInput: Boolean(aiExtractedFacts),
    });
  };

  // Apply Camera Observations
  const handleApplyVisualObservations = (result: VisualFactExtractionOutput) => {
    setHasCameraSnapshot(true);
    setVisualAnalysisData(result);
    logEvent('feedback_submitted', {
      actionKey: 'camera_visual_analysis_applied',
      posture: result.postureAssessment,
    });

    if (result.simulatedFactsExtracted && !aiExtractedFacts) {
      setAiExtractedFacts({
        consciousness: result.simulatedFactsExtracted.consciousness || 'unresponsive',
        breathing: result.simulatedFactsExtracted.breathing || 'not_breathing',
        severeBleeding: result.simulatedFactsExtracted.severeBleeding ?? false,
        strokeFace: null,
        strokeArm: null,
        strokeSpeech: null,
        choking: null,
        extractedEvidence: result.observations,
        missingFacts: [],
        confidence: 0.9,
        recommendedEmergencyPrompt: 'Đã phân tích qua camera tư thế thực hành',
      });
      setIsFactsConfirmed(true);
    }
  };

  // User selects an answer choice
  const handleSelectChoice = (questionId: string, choiceId: string, isRecommended?: boolean) => {
    setSelectedChoices((prev) => ({ ...prev, [questionId]: choiceId }));
    logEvent('answer_selected', {
      questionId,
      choiceId,
      isRecommended: Boolean(isRecommended),
      questionIndex: currentQuestionIdx,
    });

    if (currentQuestionIdx < version.questions.length - 1) {
      const nextIdx = currentQuestionIdx + 1;
      setCurrentQuestionIdx(nextIdx);
      logEvent('question_viewed', {
        questionId: version.questions[nextIdx].id,
        questionIndex: nextIdx,
      });
    } else {
      // Transition to Guidance phase
      setPhase('guidance');
      logEvent('guidance_opened', { stepNumber: 1 });
    }
  };

  // Toggle guidance step completion
  const handleToggleStep = (stepNum: number) => {
    setCompletedGuidanceSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepNum)) {
        next.delete(stepNum);
      } else {
        next.add(stepNum);
        logEvent('step_completed', { stepNumber: stepNum });
      }
      return next;
    });
  };

  const handle115CallTapped = () => {
    logEvent('call_115_tapped', { destination: '115' });
    setIsCall115ModalOpen(true);
  };

  // Finish Drill & Save
  const handleFinishDrill = async () => {
    logEvent('session_completed', {
      totalElapsedSec: elapsedSec,
      confidenceAfter,
      hasCameraSnapshot,
    });

    const sessionData: TrainingSession = {
      sessionId: sessionIdRef.current,
      clientSessionId: sessionIdRef.current,
      ownerUid: user ? user.uid : undefined,
      scenarioId: scenario.id,
      scenarioVersionId: version.versionId,
      scenarioTitle: scenario.title,
      mode: 'training',
      status: 'completed',
      startedAt: new Date(startTimeRef.current).toISOString(),
      completedAt: new Date().toISOString(),
      durationSec: elapsedSec,
      confidenceBefore,
      confidenceAfter,
      confidenceDelta: confidenceAfter - confidenceBefore,
      regionCell: 'hcm_q1_central',
      dataOrigin: user ? 'training_user' : 'training_user',
      events: eventsRef.current,
      createdAt: new Date(startTimeRef.current).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Persist locally before navigating. localStorage is a demo-safe fallback
    // when IndexedDB is unavailable or blocked by the browser.
    try {
      await saveLocalSession(sessionData);
    } catch (err) {
      console.warn('IndexedDB unavailable; keeping the demo result in localStorage.', err);
    }
    try {
      const storageKey = 'goldenminutes.demo.trainingSessions.v1';
      const previous = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const savedSessions = Array.isArray(previous) ? previous : [];
      const withoutCurrent = savedSessions.filter((item: TrainingSession) =>
        item?.clientSessionId !== sessionData.clientSessionId && item?.sessionId !== sessionData.sessionId
      );
      localStorage.setItem(storageKey, JSON.stringify([...withoutCurrent, sessionData]));
    } catch (err) {
      console.warn('Could not persist demo training result in localStorage.', err);
    }

    // 2. Try background sync to server
    try {
      await apiClient.startSession({
        clientSessionId: sessionData.clientSessionId,
        scenarioId: sessionData.scenarioId,
        confidenceBefore,
        dataOrigin: 'training_user',
      });
      await apiClient.sendEventsBatch(sessionData.clientSessionId, eventsRef.current);
      await apiClient.completeSession(sessionData.clientSessionId, {
        scenarioId: sessionData.scenarioId,
        scenarioVersionId: sessionData.scenarioVersionId,
        scenarioTitle: sessionData.scenarioTitle,
        confidenceAfter,
        finalEvents: eventsRef.current,
      });
    } catch (err) {
      console.warn('Sync delayed, saved in local IndexedDB queue', err);
    }

    // 3. Navigate to results screen
    navigate(`/results?session=${sessionData.clientSessionId}&scenario=${scenario.id}`);
  };

  const currentQ = version.questions[currentQuestionIdx];

  return (
    <div className="min-h-[calc(100vh-var(--header-height))] bg-[#F9FAFB] text-[#1D2939] pb-24 md:pb-16">
      {/* Sticky Progress & Timer Bar */}
      <div className="sticky top-14 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-2.5 shadow-2xs">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          
          {/* Phase Title */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-slate-700 truncate">
              {phase === 'pre_assessment'
                ? 'Chuẩn bị bài luyện'
                : phase === 'questions'
                ? `Câu ${currentQuestionIdx + 1}/${version.questions.length}`
                : phase === 'guidance'
                ? 'Thực hiện sơ cứu'
                : 'Đánh giá sau bài luyện'}
            </span>
          </div>

          {/* Timer and 115 CTA */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono tabular-nums font-bold text-blue-600">
              <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-hidden="true" />
              <span>{Math.floor(elapsedSec / 60)}:{(elapsedSec % 60).toString().padStart(2, '0')}</span>
            </div>

            <button
              type="button"
              onClick={handle115CallTapped}
              className="py-1 px-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs whitespace-nowrap"
            >
              <PhoneCall className="w-3 h-3" />
              <span>GỌI 115</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-6">
        {/* Phase 0: Pre-Assessment & Setup */}
        {phase === 'pre_assessment' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1.5">
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Bài Luyện Phản Xạ 3 Phút</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
                  {scenario.title}
                </h1>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                  {scenario.description}
                </p>
              </div>

              {/* Initial Scenario Prompt */}
              <div className="p-3.5 bg-[#F9FAFB] border border-[#EAECF0] rounded-xl">
                <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider block">
                  Tình huống giả định:
                </span>
                <p className="text-sm font-semibold text-[#101828] mt-1 leading-snug">
                  "{version.initialAssessment}"
                </p>
              </div>

              {/* Confidence Rating Before */}
              <div className="pt-3 border-t border-[#EAECF0]">
                <label className="block text-xs font-bold text-[#344054] uppercase tracking-wider mb-2">
                  Bạn tự tin xử trí tình huống này ở mức độ nào? (1 - 5)
                </label>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setConfidenceBefore(lvl)}
                      aria-label={`Mức tự tin ${lvl} trên 5`}
                      className={`py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 ${
                        confidenceBefore === lvl
                          ? 'bg-[#175CD3] text-white shadow-xs'
                          : 'bg-[#F2F4F7] text-[#475467] hover:bg-[#EAECF0] hover:text-[#101828]'
                      }`}
                    >
                      <span>{lvl}</span>
                      <Star
                        className={`w-3.5 h-3.5 ${
                          confidenceBefore === lvl ? 'fill-amber-300 text-amber-300' : 'fill-amber-400 text-amber-500'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* B1: Reusable Microphone tiếng Việt & B2: Camera Thực Hành Area */}
              <div className="pt-3 border-t border-[#EAECF0] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#175CD3]">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>Mô tả triệu chứng &amp; Hỗ trợ AI (Giọng nói / Camera)</span>
                  </div>

                  {/* Dual Action Controls: Mic & Camera */}
                  <div className="flex items-center gap-2">
                    {/* Voice Input Trigger */}
                    {!isListening ? (
                      <button
                        type="button"
                        onClick={startListening}
                        disabled={isTranscribing}
                        className="py-1.5 px-3 bg-[#EFF8FF] hover:bg-[#D1E9FF] text-[#175CD3] border border-[#B2DDFF] rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        title="Bật micro nói mô tả tiếng Việt"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>Nói mô tả</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 bg-[#FEF3F2] border border-[#FEE4E2] px-2 py-1 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-[#D92D20] animate-ping" />
                        <span className="text-xs font-bold text-[#D92D20] font-mono">
                          {Math.floor(voiceDurationSec / 60)}:{(voiceDurationSec % 60).toString().padStart(2, '0')} / 0:30
                        </span>
                        <button
                          type="button"
                          onClick={stopListening}
                          className="px-2 py-0.5 bg-[#D92D20] text-white text-[11px] font-bold rounded hover:bg-[#B42318] cursor-pointer"
                        >
                          Dừng
                        </button>
                        <button
                          type="button"
                          onClick={cancelListening}
                          className="px-1.5 py-0.5 bg-white text-[#667085] text-[11px] font-semibold rounded border border-[#D0D5DD] hover:bg-[#F2F4F7] cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    )}

                    {/* Camera Practice Trigger */}
                    <button
                      type="button"
                      onClick={() => setIsCameraSheetOpen(true)}
                      className="py-1.5 px-3 bg-white hover:bg-[#F9FAFB] text-[#344054] border border-[#EAECF0] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="Mở camera kiểm tra tư thế thực hành"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#175CD3]" />
                      <span className="hidden sm:inline">Mở camera thực hành</span>
                      <span className="sm:hidden">Camera</span>
                    </button>
                  </div>
                </div>

                {/* Voice Status & Error Banner */}
                {isListening && (
                  <div className="p-2.5 bg-[#FEF3F2] border border-[#FEE4E2] rounded-xl text-xs flex items-center justify-between gap-2 animate-in fade-in">
                    <div className="flex items-center gap-2 text-[#D92D20] font-semibold">
                      <div className="w-2 h-2 rounded-full bg-[#D92D20] animate-pulse" />
                      <span>
                        {isRecordingFallback
                          ? 'Đang thu âm audio (tối đa 30s) để chuyển văn bản qua Gemini...'
                          : 'Đang lắng nghe giọng nói tiếng Việt... Hãy nói rõ ràng mô tả.'}
                      </span>
                    </div>
                  </div>
                )}

                {isTranscribing && (
                  <div className="p-2.5 bg-[#EFF8FF] border border-[#B2DDFF] rounded-xl text-xs text-[#175CD3] flex items-center gap-2 animate-in fade-in">
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span>Gemini đang chuyển đổi âm thanh và phân tích các dữ kiện cấp cứu...</span>
                  </div>
                )}

                {voiceError && (
                  <div className="p-2.5 bg-[#FEF3F2] border border-[#FEE4E2] rounded-xl text-xs text-[#B42318] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-[#D92D20]" />
                    <span className="flex-1">{voiceError}</span>
                  </div>
                )}

                {/* Manual & Editable Transcript Textarea */}
                <div className="relative space-y-1.5">
                  <textarea
                    rows={2}
                    placeholder="Nhập hoặc nói nhanh mô tả (Ví dụ: Nạn nhân ngã bất tỉnh, gọi không đáp ứng, thở ngáp cá, da tím tái)..."
                    value={aiDescriptionText}
                    onChange={(e) => {
                      setAiDescriptionText(e.target.value);
                      setTranscript(e.target.value);
                    }}
                    className="w-full p-3 bg-[#F9FAFB] border border-[#EAECF0] rounded-xl text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#175CD3] min-h-[68px] leading-relaxed"
                  />
                  
                  {interimTranscript && (
                    <div className="text-xs text-[#667085] italic px-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#175CD3] animate-pulse" />
                      <span>Đang nhận dạng: "{interimTranscript}"</span>
                    </div>
                  )}

                  {aiDescriptionText && !aiExtractedFacts && (
                    <button
                      type="button"
                      onClick={handleExtractFactsWithAI}
                      disabled={isExtractingAI}
                      className="py-1.5 px-3 bg-[#175CD3] hover:bg-[#1849A9] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{isExtractingAI ? 'Đang trích xuất dữ kiện...' : 'Trích xuất dữ kiện triệu chứng (AI)'}</span>
                    </button>
                  )}
                </div>

                {/* Fact Extraction Review & Confirmation Card */}
                {aiExtractedFacts && (
                  <div className="p-3.5 bg-[#EFF8FF] border border-[#B2DDFF] rounded-xl text-xs space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[#175CD3] font-bold">
                        <CheckCircle2 className="w-4 h-4 text-[#12B76A]" />
                        <span>Dữ Kiện Trích Xuất Được (Độ tin cậy: {Math.round(aiExtractedFacts.confidence * 100)}%)</span>
                      </div>
                      {isFactsConfirmed ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5] rounded-md">
                          ✓ Đã xác nhận
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-0.5 bg-[#FEF3F2] text-[#B42318] border border-[#FEE4E2] rounded-md">
                          Cần xác nhận
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-white rounded-lg border border-[#B2DDFF]">
                        <span className="text-[#667085] block text-[11px]">Tri giác / Phản xạ:</span>
                        <strong className="text-[#101828]">
                          {aiExtractedFacts.consciousness === 'unresponsive'
                            ? 'Bất tỉnh / Không phản ứng'
                            : aiExtractedFacts.consciousness === 'responsive'
                            ? 'Còn phản ứng'
                            : 'Chưa rõ'}
                        </strong>
                      </div>

                      <div className="p-2 bg-white rounded-lg border border-[#B2DDFF]">
                        <span className="text-[#667085] block text-[11px]">Hô hấp lồng ngực:</span>
                        <strong className="text-[#101828]">
                          {aiExtractedFacts.breathing === 'not_breathing'
                            ? 'Không thở'
                            : aiExtractedFacts.breathing === 'abnormal'
                            ? 'Thở ngáp / Bất thường'
                            : aiExtractedFacts.breathing === 'normal'
                            ? 'Bình thường'
                            : 'Chưa xác định'}
                        </strong>
                      </div>
                    </div>

                    {aiExtractedFacts.extractedEvidence.length > 0 && (
                      <div className="text-xs text-[#344054]">
                        <span className="font-semibold text-[#175CD3]">Bằng chứng nhận dạng:</span>
                        <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-[#475467]">
                          {aiExtractedFacts.extractedEvidence.map((ev: string, i: number) => (
                            <li key={i}>{ev}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {!isFactsConfirmed ? (
                      <div className="pt-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleConfirmFacts}
                          className="py-1.5 px-3 bg-[#027A48] hover:bg-[#05603A] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Xác nhận thông tin triệu chứng</span>
                        </button>
                        <span className="text-[11px] text-[#667085]">
                          (Xác nhận để động cơ quy tắc hỗ trợ bài luyện)
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-[#027A48] font-medium">
                        ✓ Bạn đã xác nhận thông tin. Động cơ quy tắc sẽ cá nhân hóa bài tập cho tình huống này.
                      </p>
                    )}
                  </div>
                )}

                {/* Visual Analysis Badge if camera snapshot was analyzed */}
                {visualAnalysisData && (
                  <div className="p-3 bg-[#ECFDF3] border border-[#A6F4C5] rounded-xl text-xs space-y-1 animate-in fade-in">
                    <div className="flex items-center gap-1.5 text-[#027A48] font-bold">
                      <Camera className="w-3.5 h-3.5 text-[#12B76A]" />
                      <span>Đã kiểm tra kỹ thuật qua Camera: {visualAnalysisData.handPlacement}</span>
                    </div>
                    <p className="text-xs text-[#344054]">
                      {visualAnalysisData.armAngle} • {visualAnalysisData.environmentSafety}
                    </p>
                  </div>
                )}
              </div>

              {/* Start Training Drill Button */}
              <button
                type="button"
                onClick={handleStartDrill}
                className="w-full py-3 sm:py-3.5 px-4 bg-[#D92D20] hover:bg-[#B42318] active:scale-[0.99] text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <span>BẮT ĐẦU LUYỆN TẬP PHẢN XẠ</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>
        )}

        {/* Phase 1: Step Questions */}
        {phase === 'questions' && currentQ && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Câu hỏi đánh giá {currentQuestionIdx + 1} / {version.questions.length}</span>
                <span className="text-slate-600 font-medium">Chuẩn AHA &amp; Bộ Y Tế</span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-[#101828] leading-snug">
                {currentQ.prompt}
              </h2>

              <div className="space-y-2.5">
                {currentQ.choices.map((choice) => {
                  const isSelected = selectedChoices[currentQ.id] === choice.id;
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => handleSelectChoice(currentQ.id, choice.id, choice.isRecommended)}
                      className={`w-full p-3.5 sm:p-4 rounded-xl border text-left flex items-start justify-between gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#EFF8FF] border-2 border-[#175CD3] text-[#101828] shadow-xs'
                          : 'bg-[#F9FAFB] border-[#EAECF0] text-[#344054] hover:bg-[#F2F4F7]'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-xs sm:text-sm font-semibold block leading-snug">{choice.label}</span>
                        {isSelected && choice.explanation && (
                          <p className="mt-2 text-xs text-[#475467] leading-relaxed bg-white p-2.5 rounded-lg border border-[#EAECF0]">
                            💡 {choice.explanation}
                          </p>
                        )}
                      </div>
                      <div
                        className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? 'border-[#175CD3] bg-[#175CD3]' : 'border-[#D0D5DD]'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Phase 2: Actionable Guidance Execution */}
        {phase === 'guidance' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-white border border-[#EAECF0] rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#EAECF0]">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#101828]">
                    Hướng dẫn thực hành sơ cứu
                  </h2>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Thực hiện và đánh dấu từng bước theo quy chuẩn
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Camera Practice Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setIsCameraSheetOpen(true)}
                    className="py-1.5 px-3 bg-[#EFF8FF] hover:bg-[#D1E9FF] text-[#175CD3] border border-[#B2DDFF] text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Camera tư thế</span>
                  </button>

                  <button
                    type="button"
                    onClick={handle115CallTapped}
                    className="py-1.5 px-3 bg-[#D92D20] hover:bg-[#B42318] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
                    <span>Gọi 115</span>
                  </button>
                </div>
              </div>

              {/* Steps Checklist */}
              <div className="space-y-2.5">
                {version.guidanceSteps.map((step) => {
                  const isDone = completedGuidanceSteps.has(step.stepNumber);
                  return (
                    <div
                      key={step.stepNumber}
                      onClick={() => handleToggleStep(step.stepNumber)}
                      className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isDone
                          ? 'bg-[#ECFDF3] border-[#A6F4C5] text-[#027A48]'
                          : 'bg-[#F9FAFB] border-[#EAECF0] text-[#344054] hover:border-[#175CD3]'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${
                          isDone ? 'bg-[#12B76A] text-white' : 'bg-[#F2F4F7] text-[#475467]'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-4 h-4" /> : step.stepNumber}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className={`text-xs sm:text-sm font-bold ${isDone ? 'text-[#027A48]' : 'text-[#101828]'}`}>
                            {step.title}
                          </h3>
                          {step.vitalAction && (
                            <span className="text-xs uppercase font-bold text-rose-700 tracking-wider shrink-0">
                              Trọng yếu
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#475467] mt-1 leading-relaxed">
                          {step.instruction}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CPR Metronome if Cardiac Arrest */}
              {version.targetCategory === 'cardiac_arrest' && (
                <div className="pt-1">
                  <CPRMetronome bpm={110} autoStart={false} />
                </div>
              )}

              {/* Next to Post Assessment */}
              <button
                type="button"
                onClick={() => setPhase('post_assessment')}
                className="w-full py-3 px-4 bg-[#175CD3] hover:bg-[#1849A9] active:scale-[0.99] text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer mt-2"
              >
                <span>HOÀN THÀNH VÀ ĐÁNH GIÁ KẾT QUẢ</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>
        )}

        {/* Phase 3: Post-Assessment & Finish */}
        {phase === 'post_assessment' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-white border border-[#EAECF0] rounded-2xl p-4 sm:p-6 shadow-xs text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#ECFDF3] text-[#12B76A] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#101828]">Hoàn Thành Bài Huấn Luyện!</h2>
                <p className="text-xs sm:text-sm text-[#475467] mt-1">
                  Thời gian thực hiện: <span className="font-bold text-[#175CD3] font-mono">{elapsedSec} giây</span>
                </p>
              </div>

              <div className="pt-4 border-t border-[#EAECF0] text-left">
                <label className="block text-xs font-bold text-[#344054] uppercase tracking-wider mb-2">
                  Sau khi thực hành, mức độ tự tin xử trí của bạn đạt: (1 - 5)
                </label>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setConfidenceAfter(lvl)}
                      aria-label={`Mức tự tin ${lvl} trên 5`}
                      className={`py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1 ${
                        confidenceAfter === lvl
                          ? 'bg-[#12B76A] text-white shadow-xs'
                          : 'bg-[#F2F4F7] text-[#475467] hover:bg-[#EAECF0] hover:text-[#101828]'
                      }`}
                    >
                      <span>{lvl}</span>
                      <Star
                        className={`w-3.5 h-3.5 ${
                          confidenceAfter === lvl ? 'fill-amber-300 text-amber-300' : 'fill-amber-400 text-amber-500'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleFinishDrill}
                className="w-full py-3.5 px-4 bg-[#12B76A] hover:bg-[#027A48] active:scale-[0.99] text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <span>XEM BẢNG PHÂN TÍCH THỜI GIAN VÀNG (ADI & MRO)</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Global Modals for 115 and Practice Camera Sheet */}
      <Call115Modal
        isOpen={isCall115ModalOpen}
        onClose={() => setIsCall115ModalOpen(false)}
        incidentTypeHint={scenario.title}
      />

      <PracticeCameraSheet
        isOpen={isCameraSheetOpen}
        onClose={() => setIsCameraSheetOpen(false)}
        scenarioId={scenario.id}
        scenarioTitle={scenario.title}
        stepTitle={version.guidanceSteps[0]?.title || 'Tư thế ép tim lồng ngực'}
        onApplyObservations={handleApplyVisualObservations}
        onSwitchToVoiceOrText={() => {
          setIsCameraSheetOpen(false);
          startListening();
        }}
      />
    </div>
  );
};

