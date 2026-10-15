import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  ExternalLink,
  ShieldCheck,
  Clock,
  Globe,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  PhoneCall,
  Play,
  RotateCcw,
  Zap,
  HelpCircle,
  Award,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { MedicalLearningResource } from '../../domain/schemas';
import { SafeImage } from '../../components/common/SafeImage';
import { formatDuration } from '../../utils/formatters';
import { MetadataRow } from '../../components/common/MetadataSeparators';

interface LessonDetailModalProps {
  resource: MedicalLearningResource | null;
  onClose: () => void;
  onOpenCall115?: () => void;
}

export const LessonDetailModal: React.FC<LessonDetailModalProps> = ({
  resource,
  onClose,
  onOpenCall115,
}) => {
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState<Record<number, number>>({});
  const [showQuizExplanations, setShowQuizExplanations] = useState<Record<number, boolean>>({});

  if (!resource) return null;

  const durationStr = formatDuration(resource.durationSeconds);

  const handleSelectAnswer = (qIndex: number, optIndex: number) => {
    setSelectedQuizAnswers((prev) => ({ ...prev, [qIndex]: optIndex }));
    setShowQuizExplanations((prev) => ({ ...prev, [qIndex]: true }));
  };

  const relatedScenarioId = resource.relatedScenarioIds[0] || 'sc_ohca_01';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label={resource.title}
    >
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-[#EAECF0] my-auto">
        {/* Top Header Bar */}
        <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-slate-300 shrink-0">
              {resource.difficultyLevel}
            </span>
            <span className="text-slate-500" aria-hidden="true">·</span>
            <h2 className="text-xs sm:text-sm font-bold truncate text-white">{resource.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* 1. Embedded 16:9 Video or Fallback Card */}
          <div className="space-y-2">
            {resource.embeddingAllowed && resource.embedUrl ? (
              <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-sm border border-[#EAECF0]">
                <iframe
                  src={resource.embedUrl}
                  title={resource.title}
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
            ) : (
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 flex flex-col items-center justify-center text-white p-4 text-center">
                <SafeImage
                  src={resource.thumbnailUrl}
                  alt={resource.title}
                  fallbackCategory="general"
                  className="absolute inset-0 w-full h-full object-cover opacity-30"
                  containerClassName="absolute inset-0 w-full h-full"
                />
                <div className="relative z-10 space-y-2 max-w-md">
                  <Play className="w-10 h-10 text-white/80 mx-auto" aria-hidden="true" />
                  <p className="text-xs sm:text-sm font-bold">
                    Nội dung video thuộc quyền lưu trữ của đơn vị phát hành
                  </p>
                  <a
                    href={resource.sourcePageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 py-2 px-4 bg-[#175CD3] hover:bg-[#1849A9] text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                  >
                    <span>Xem tại nguồn chính thức</span>
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>
                </div>
              </div>
            )}

            {/* Source Org Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#F9FAFB] border border-[#EAECF0] rounded-xl text-xs text-[#475467]">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#101828]">{resource.sourceOrganization}</span>
                <span className="text-[#98A2B3]">•</span>
                <span className="flex items-center gap-1 text-[#667085]">
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{durationStr}</span>
                </span>
                <span className="text-[#98A2B3]">•</span>
                <span className="uppercase font-semibold text-[#667085]">{resource.language}</span>
              </div>

              <a
                href={resource.sourcePageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#175CD3] font-bold hover:underline inline-flex items-center gap-1 shrink-0"
              >
                <span>Xem nội dung gốc</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* 2. Critical Warning Banner */}
          <div className="p-3.5 bg-[#FEF3F2] border border-[#FEE4E2] rounded-xl flex items-start gap-3 text-xs text-[#B42318] leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-[#D92D20] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <strong className="block font-bold mb-0.5">Cảnh báo an toàn y khoa:</strong>
              <span>{resource.emergencyWarning}</span>
            </div>
          </div>

          {/* 3. Learning Objectives */}
          <div className="space-y-2">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#101828] flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#175CD3]" aria-hidden="true" />
              <span>Mục tiêu bài học</span>
            </h3>
            <div className="bg-[#F9FAFB] border border-[#EAECF0] rounded-xl p-3.5 space-y-2">
              {resource.learningObjectives.map((obj, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-[#344054]">
                  <CheckCircle2 className="w-4 h-4 text-[#12B76A] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{obj}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Core Steps */}
          <div className="space-y-3">
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#101828] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#175CD3]" aria-hidden="true" />
              <span>Các bước thực hiện chuẩn</span>
            </h3>
            <div className="space-y-2.5">
              {resource.steps.map((step) => (
                <div
                  key={step.stepNumber}
                  className="p-3.5 bg-white border border-[#EAECF0] rounded-xl shadow-2xs space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#EFF8FF] text-[#175CD3] font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      {step.stepNumber}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-[#101828]">{step.title}</h4>
                  </div>
                  <p className="text-xs text-[#475467] leading-relaxed pl-7">{step.detail}</p>
                  {step.keyPoint && (
                    <div className="ml-7 p-2 bg-[#F9FAFB] border border-[#EAECF0] rounded-lg text-[11px] text-[#175CD3] font-medium flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{step.keyPoint}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 5. Avoid Actions & 115 Danger Signs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Avoid */}
            <div className="p-3.5 bg-[#FEF3F2] border border-[#FEE4E2] rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#B42318]">
                <AlertOctagon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Những điều KHÔNG ĐƯỢC LÀM:</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-[#B42318] leading-relaxed list-disc list-inside">
                {resource.avoidActions.map((act, i) => (
                  <li key={i}>{act}</li>
                ))}
              </ul>
            </div>

            {/* 115 Signs */}
            <div className="p-3.5 bg-[#EFF8FF] border border-[#B2DDFF] rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#175CD3]">
                <PhoneCall className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Dấu hiệu kích hoạt 115 ngay:</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-[#175CD3] leading-relaxed list-disc list-inside">
                {resource.dangerSigns115.map((sign, i) => (
                  <li key={i}>{sign}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* 6. Quick Interactive Quiz */}
          {resource.quiz && resource.quiz.length > 0 && (
            <div className="space-y-3 bg-[#F9FAFB] border border-[#EAECF0] rounded-xl p-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#175CD3]" aria-hidden="true" />
                <h3 className="text-xs sm:text-sm font-bold text-[#101828]">
                  Kiểm tra phản xạ nhanh (Quiz)
                </h3>
              </div>

              {resource.quiz.map((q, qIdx) => {
                const selected = selectedQuizAnswers[qIdx];
                const isAnswered = selected !== undefined;
                const isCorrect = selected === q.correctIndex;

                return (
                  <div key={qIdx} className="space-y-2.5 pt-1">
                    <p className="text-xs font-bold text-[#344054]">{q.question}</p>
                    <div className="space-y-1.5">
                      {q.options.map((opt, optIdx) => {
                        let btnStyle = 'bg-white border-[#EAECF0] text-[#344054] hover:bg-[#F2F4F7]';
                        if (isAnswered) {
                          if (optIdx === q.correctIndex) {
                            btnStyle = 'bg-[#ECFDF3] border-[#12B76A] text-[#027A48] font-bold';
                          } else if (selected === optIdx) {
                            btnStyle = 'bg-[#FEF3F2] border-[#D92D20] text-[#B42318] line-through';
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleSelectAnswer(qIdx, optIdx)}
                            className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                          >
                            <span>{opt}</span>
                            {isAnswered && optIdx === q.correctIndex && (
                              <CheckCircle2 className="w-4 h-4 text-[#12B76A] shrink-0" aria-hidden="true" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {showQuizExplanations[qIdx] && (
                      <div
                        className={`p-2.5 rounded-lg text-[11px] leading-relaxed border ${
                          isCorrect
                            ? 'bg-[#ECFDF3] border-[#A6F4C5] text-[#027A48]'
                            : 'bg-[#FEF0C7] border-[#FEDF89] text-[#B54708]'
                        }`}
                      >
                        <strong>{isCorrect ? '✓ Chính xác!' : '✕ Chưa chính xác!'}</strong>{' '}
                        <span>{q.explanation}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 7. Action & Training Trigger Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <Link
              to={`/training?scenario=${relatedScenarioId}`}
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-[#175CD3] hover:bg-[#1849A9] text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer text-center"
            >
              <Zap className="w-4 h-4" aria-hidden="true" />
              <span>Luyện Tình Huống Liên Quan Ngay</span>
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </Link>

            {onOpenCall115 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCall115();
                }}
                className="py-3 px-4 bg-white hover:bg-[#FEF3F2] text-[#D92D20] text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 border border-[#FEE4E2] transition-all cursor-pointer"
              >
                <PhoneCall className="w-4 h-4" aria-hidden="true" />
                <span>Gọi 115 Khẩn Cấp</span>
              </button>
            )}
          </div>

          {/* 8. Medical & Legal Metadata Audit Card */}
          <div className="p-3.5 bg-[#F9FAFB] border border-[#EAECF0] rounded-xl space-y-1.5 text-[11px] text-[#667085] leading-relaxed">
            <div className="flex flex-wrap items-center justify-between gap-1 border-b border-[#EAECF0] pb-1.5">
              <span>Mức chứng cứ: <strong className="text-[#344054]">{resource.evidenceLevel}</strong></span>
              <span>Nguồn tài liệu: <strong className="text-[#344054]">{resource.sourceOrganization}</strong></span>
              <span>Ngày rà soát nguồn: <strong className="text-[#344054]">{resource.reviewedAt}</strong></span>
            </div>
            <p className="text-[10px] text-[#98A2B3] pt-0.5">
              Tài liệu tham khảo từ nguồn công khai — chưa được GoldenMinutes thẩm định y khoa độc lập. GoldenMinutes là công cụ hỗ trợ luyện tập, không thay thế khóa đào tạo có chứng chỉ và không phải dịch vụ điều phối 115.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
