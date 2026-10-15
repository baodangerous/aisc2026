import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Sparkles,
  Trash2,
  Check,
  ChevronRight,
  Info,
} from 'lucide-react';
import { apiClient } from '../../services/api/client';
import { VisualFactExtractionOutput } from '../../domain/schemas';

interface PracticeCameraSheetProps {
  isOpen: boolean;
  onClose: () => void;
  scenarioId?: string;
  scenarioTitle: string;
  stepTitle?: string;
  onApplyObservations?: (result: VisualFactExtractionOutput, imageBase64: string) => void;
  onSwitchToVoiceOrText?: () => void;
}

export const PracticeCameraSheet: React.FC<PracticeCameraSheetProps> = ({
  isOpen,
  onClose,
  scenarioId = 'sc_ohca_01',
  scenarioTitle,
  stepTitle = 'Tư thế ép tim & Đánh giá an toàn',
  onApplyObservations,
  onSwitchToVoiceOrText,
}) => {
  const [hasUserConsented, setHasUserConsented] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Snapshot states
  const [capturedImageBase64, setCapturedImageBase64] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<VisualFactExtractionOutput | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean stop for all camera tracks
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (_) {}
      });
      streamRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Close and cleanup on unmount or isOpen = false
  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      setCapturedImageBase64(null);
      setAnalysisResult(null);
      setCameraError(null);
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen, stopCameraStream]);

  // Request camera stream ONLY after explicit user consent/action
  const startCamera = async (mode = facingMode) => {
    setCameraError(null);
    stopCameraStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt của bạn không hỗ trợ truy cập camera.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => console.warn('Video play error:', err));
      }
      setIsStreaming(true);
    } catch (err: any) {
      console.warn('Practice Camera error:', err);
      setIsStreaming(false);
      setCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Quyền camera bị từ chối. Bạn có thể cấp quyền trong cài đặt trình duyệt hoặc tiếp tục bằng cách Nhập văn bản / Nói mô tả.'
          : 'Không tìm thấy thiết bị camera khả dụng trên máy này.'
      );
    }
  };

  const handleConsentAndStart = () => {
    setHasUserConsented(true);
    startCamera(facingMode);
  };

  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (isStreaming) {
      startCamera(nextMode);
    }
  };

  // Capture single snapshot frame
  const handleCaptureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    setCapturedImageBase64(dataUrl);
    stopCameraStream();
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImageBase64(null);
    setAnalysisResult(null);
    startCamera(facingMode);
  };

  // Delete captured photo
  const handleDeleteSnapshot = () => {
    setCapturedImageBase64(null);
    setAnalysisResult(null);
    startCamera(facingMode);
  };

  // Send snapshot to Gemini server-side for bounded visual fact extraction
  const handleSendForVisualAnalysis = async () => {
    if (!capturedImageBase64) return;
    setIsAnalyzing(true);
    setCameraError(null);

    try {
      const res = await apiClient.extractVisualFacts({
        imageBase64: capturedImageBase64,
        mimeType: 'image/jpeg',
        scenarioId,
        stepContext: stepTitle,
      });

      setAnalysisResult(res.result);
    } catch (err: any) {
      console.warn('Visual analysis error:', err);
      setCameraError('Không thể hoàn tất phân tích hình ảnh từ máy chủ. Bạn có thể thử chụp lại hoặc quay lại bài tập.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmAndApply = () => {
    if (analysisResult && capturedImageBase64 && onApplyObservations) {
      onApplyObservations(analysisResult, capturedImageBase64);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white rounded-2xl border border-[#EAECF0] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-label="Camera Thực Hành Sơ Cứu"
      >
        {/* Top Header */}
        <div className="p-4 border-b border-[#EAECF0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EFF8FF] text-[#175CD3] flex items-center justify-center border border-[#B2DDFF]">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-[#101828]">Camera Thực Hành Sơ Cứu</h3>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]">
                  Chỉ Luyện Tập
                </span>
              </div>
              <p className="text-xs text-[#667085] truncate max-w-[220px] sm:max-w-xs">{stepTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#667085] hover:text-[#101828] rounded-lg hover:bg-[#F2F4F7] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {!hasUserConsented ? (
            /* Consent & Privacy Notice Screen */
            <div className="space-y-3.5">
              <div className="p-4 bg-[#F9FAFB] rounded-xl border border-[#EAECF0] space-y-3 text-xs text-[#344054]">
                <div className="flex items-center gap-2 text-[#027A48] font-bold text-xs uppercase">
                  <ShieldCheck className="w-4 h-4 text-[#12B76A]" />
                  <span>Cam Kết Bảo Mật &amp; Xử Lý Cục Bộ</span>
                </div>
                <p className="leading-relaxed text-[#475467]">
                  Camera hỗ trợ bạn kiểm tra tư thế ép tim, góc đặt cánh tay và khoảng cách an toàn trong buổi luyện tập.
                </p>
                <div className="p-3 bg-white rounded-lg border border-[#EAECF0] space-y-1.5 text-xs text-[#344054]">
                  <div className="font-semibold text-[#101828]">
                    • Tuân thủ nghiêm ngặt Nghị định 13/2023/NĐ-CP:
                  </div>
                  <div>• Ảnh chỉ được xử lý tạm thời trong bộ nhớ máy chủ để phân tích kỹ thuật và KHÔNG BAO GIỜ ĐƯỢC LƯU TRỮ.</div>
                  <div>• Hệ thống tuyệt đối KHÔNG nhận diện khuôn mặt, KHÔNG suy đoán danh tính và KHÔNG chẩn đoán bệnh tật.</div>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleConsentAndStart}
                  className="w-full py-2.5 px-4 bg-[#175CD3] hover:bg-[#1849A9] active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Tôi đồng ý và Bật Camera Thực Hành</span>
                </button>

                {onSwitchToVoiceOrText && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSwitchToVoiceOrText();
                    }}
                    className="w-full py-2 px-3 bg-[#F2F4F7] hover:bg-[#EAECF0] text-[#475467] text-xs font-semibold rounded-xl transition-colors cursor-pointer text-center"
                  >
                    Không dùng camera, quay lại nhập mô tả bằng văn bản/mic
                  </button>
                )}
              </div>
            </div>
          ) : cameraError && !capturedImageBase64 ? (
            /* Camera Permission / Device Error Fallback */
            <div className="p-4 bg-[#FEF3F2] rounded-xl border border-[#FEE4E2] space-y-3 text-xs text-[#B42318]">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-[#D92D20]" />
                <span>Không thể kết nối Camera</span>
              </div>
              <p className="leading-relaxed">{cameraError}</p>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="py-2 px-3.5 bg-[#D92D20] text-white font-bold rounded-xl text-xs hover:bg-[#B42318] cursor-pointer"
                >
                  Thử lại
                </button>
                {onSwitchToVoiceOrText && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSwitchToVoiceOrText();
                    }}
                    className="py-2 px-3.5 bg-white border border-[#EAECF0] text-[#344054] font-semibold rounded-xl text-xs hover:bg-[#F9FAFB] cursor-pointer"
                  >
                    Dùng Micro hoặc Nhập tay
                  </button>
                )}
              </div>
            </div>
          ) : !capturedImageBase64 ? (
            /* Live Camera Stream View */
            <div className="space-y-3">
              <div className="relative bg-black rounded-xl overflow-hidden aspect-4/3 flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Posture Overlay Box */}
                <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-white/60 m-6 rounded-2xl flex flex-col items-center justify-between p-3 text-center">
                  <span className="text-[11px] font-bold text-white bg-black/60 px-2.5 py-0.5 rounded-md backdrop-blur-xs">
                    Căn chỉnh vị trí ép tim vào giữa khung ngực
                  </span>
                  <div className="w-14 h-14 border-2 border-white/80 rounded-full flex items-center justify-center text-white text-base font-bold bg-white/15 backdrop-blur-xs">
                    +
                  </div>
                  <span className="text-[11px] font-medium text-white/90 bg-black/50 px-2 py-0.5 rounded backdrop-blur-xs">
                    Giữ hai cánh tay vuông góc 90°
                  </span>
                </div>

                {/* Switch Camera Button */}
                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-xs cursor-pointer transition-colors"
                  title="Đổi camera trước/sau"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              {/* Shutter Button */}
              <button
                type="button"
                onClick={handleCaptureFrame}
                disabled={!isStreaming}
                className="w-full py-3 px-4 bg-[#D92D20] hover:bg-[#B42318] active:scale-[0.99] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                <span>CHỤP ẢNH TƯ THẾ THỰC HÀNH</span>
              </button>

              <div className="p-2.5 bg-[#F9FAFB] rounded-xl border border-[#EAECF0] text-xs text-[#667085] flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-[#175CD3] shrink-0" />
                <span>Ảnh chỉ được xử lý tạm thời để hỗ trợ căn chỉnh và tự động bị hủy sau khi phân tích.</span>
              </div>
            </div>
          ) : (
            /* Review Captured Frame & AI Feedback */
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden aspect-4/3 bg-black">
                <img src={capturedImageBase64} alt="Ảnh thực hành sơ cứu" className="w-full h-full object-cover" />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white text-xs gap-2 backdrop-blur-xs">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#175CD3]" />
                    <span className="font-semibold">Gemini đang phân tích tư thế thực hành...</span>
                  </div>
                )}
              </div>

              {/* Analysis Result Card */}
              {analysisResult ? (
                <div className="p-3.5 bg-[#ECFDF3] border border-[#A6F4C5] rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[#027A48] font-bold">
                      <CheckCircle2 className="w-4 h-4 text-[#12B76A]" />
                      <span>Kết Quả Đánh Giá Kỹ Thuật (Gemini Vision)</span>
                    </div>
                    <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-white text-[#027A48] border border-[#A6F4C5]">
                      {analysisResult.postureAssessment === 'good' ? 'Tư thế Tốt' : 'Cần điều chỉnh'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2 bg-white/80 rounded-lg border border-[#A6F4C5]">
                      <span className="text-[#667085] block text-[11px]">Vị trí đặt tay:</span>
                      <strong className="text-[#101828]">{analysisResult.handPlacement}</strong>
                    </div>
                    <div className="p-2 bg-white/80 rounded-lg border border-[#A6F4C5]">
                      <span className="text-[#667085] block text-[11px]">Góc cánh tay:</span>
                      <strong className="text-[#101828]">{analysisResult.armAngle}</strong>
                    </div>
                  </div>

                  {analysisResult.observations.length > 0 && (
                    <div className="space-y-1 text-[#344054] pt-1">
                      <span className="font-bold text-xs text-[#027A48]">Quan sát chi tiết:</span>
                      <ul className="space-y-1 text-xs pl-3 list-disc list-outside">
                        {analysisResult.observations.map((obs, idx) => (
                          <li key={idx}>{obs}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysisResult.correctiveTips.length > 0 && (
                    <div className="p-2.5 bg-white rounded-lg border border-[#A6F4C5] text-xs space-y-1">
                      <span className="font-bold text-[#027A48]">Mẹo thực hành tiếp theo:</span>
                      <p className="text-[#344054]">{analysisResult.correctiveTips.join(' • ')}</p>
                    </div>
                  )}

                  <p className="text-[11px] text-[#667085] pt-1 italic">
                    {analysisResult.safetyDisclaimer}
                  </p>
                </div>
              ) : !isAnalyzing ? (
                /* Pre-analysis confirmation prompt */
                <div className="p-3 bg-[#EFF8FF] border border-[#B2DDFF] rounded-xl text-xs text-[#175CD3] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Ảnh đã sẵn sàng. Bấm "Gửi Phân Tích Kỹ Thuật" để kiểm tra tư thế thực hành.</span>
                </div>
              ) : null}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {!analysisResult ? (
                  <>
                    <button
                      type="button"
                      onClick={handleRetake}
                      disabled={isAnalyzing}
                      className="py-2.5 px-3 bg-[#F2F4F7] hover:bg-[#EAECF0] text-[#344054] text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-[#667085]" />
                      <span>Chụp lại</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSendForVisualAnalysis}
                      disabled={isAnalyzing}
                      className="py-2.5 px-3 bg-[#175CD3] hover:bg-[#1849A9] text-white text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Gửi Phân Tích</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleRetake}
                      className="py-2.5 px-3 bg-[#F2F4F7] hover:bg-[#EAECF0] text-[#344054] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      Chụp bài khác
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmAndApply}
                      className="py-2.5 px-3 bg-[#027A48] hover:bg-[#05603A] text-white text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Áp dụng vào bài luyện</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
