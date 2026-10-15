import React, { useState } from 'react';
import useSWR from 'swr';
import { useAuth } from '../auth/AuthContext';
import { auth } from '../../services/firebase/client';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Clock,
  Zap,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  ChevronRight,
  BookOpen,
  Play,
  Activity,
} from 'lucide-react';
import { getLocalSessions } from '../../services/indexedDb';
import { APPROVED_SCENARIOS } from '../../content/approvedScenarios';
import { getApprovedResourcesForScenario } from '../../content/curatedLearningCatalog';
import { calculateSessionMetrics } from '../../domain/metrics/calculator';
import { TrainingSession, MedicalLearningResource } from '../../domain/schemas';
import { LessonDetailModal } from '../library/LessonDetailModal';
import { SafeImage } from '../../components/common/SafeImage';
import { MetadataRow } from '../../components/common/MetadataSeparators';
import { getReadinessPresentation } from '../../utils/formatters';

export const ResultsView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionIdParam = searchParams.get('session');
  const scenarioIdParam = searchParams.get('scenario') || 'sc_ohca_01';

  const { user, isLoading: authLoading } = useAuth();
  const { data: session = null, isLoading: loading } = useSWR(
    !authLoading && sessionIdParam ? ['training-result', user?.uid || 'guest', sessionIdParam] : null,
    async () => {
      if (user) {
        const response = await fetch(`/api/sessions/${encodeURIComponent(sessionIdParam!)}`, { headers: { Authorization: `Bearer ${await auth?.currentUser?.getIdToken()}` } });
        if (!response.ok) throw new Error('Không thể tải kết quả.');
        return (await response.json()).session as TrainingSession;
      }
      const sessions = await getLocalSessions();
      return sessions.find((item) => !item.ownerUid && (item.clientSessionId === sessionIdParam || item.sessionId === sessionIdParam)) || null;
    }, { shouldRetryOnError: false }
  );
  const [activeLessonModal, setActiveLessonModal] = useState<MedicalLearningResource | null>(null);

  const scenario = APPROVED_SCENARIOS.find((s) => s.id === scenarioIdParam) || APPROVED_SCENARIOS[0];
  const version = scenario.versions[0];
  const recommendedResources = getApprovedResourcesForScenario(scenario.category || scenario.id);

  if (authLoading || loading) return <p role="status" className="p-6 text-muted">Đang tải kết quả…</p>;
  if (!session) return <div className="flex flex-col gap-3 p-6 text-foreground"><h1 className="text-2xl font-bold">Chưa có kết quả</h1><p>Không tìm thấy phiên luyện tập của bạn.</p><Link to="/training" className="text-primary underline">Bắt đầu luyện tập</Link></div>;

  // Training scores describe app interactions, not clinical competence or real rescues.
  const metrics = calculateSessionMetrics(session.events || [], version.thresholds, session.status === 'completed');

  const scoreInfo = getReadinessPresentation(metrics.readinessScore);

  // Build visual timeline of user events/steps
  const timelineSteps = (session?.events || []).map((ev) => {
    const elapsedSec = Math.round(ev.elapsedMs / 1000);
    let status: 'correct' | 'missed' | 'danger' = 'correct';
    let label: string = ev.type;
    let detail: string = '';

    if (ev.type === 'guidance_opened') {
      label = 'Mở quy trình hướng dẫn';
      if (elapsedSec > version.thresholds.timeToGuidanceSec) {
        status = 'missed';
        detail = `Trễ ${elapsedSec - version.thresholds.timeToGuidanceSec}s so với mục tiêu`;
      } else {
        detail = 'Kích hoạt hướng dẫn nhanh chóng';
      }
    } else if (ev.type === 'call_115_tapped') {
      label = 'Kích hoạt cuộc gọi cấp cứu 115';
      if (elapsedSec > version.thresholds.timeToCallSec) {
        status = 'missed';
        detail = `Trễ ${elapsedSec - version.thresholds.timeToCallSec}s so với chuẩn thời gian vàng`;
      } else {
        detail = 'Gọi 115 trong ngưỡng thời gian vàng';
      }
    } else if (ev.type === 'action_started') {
      label = 'Thao tác sơ cứu then chốt';
      if (elapsedSec > version.thresholds.timeToActionSec) {
        status = 'danger';
        detail = `Chậm thao tác (${elapsedSec}s). Nguy cơ bỏ lỡ cơ hội cứu sống`;
      } else {
        detail = 'Thao tác kịp thời, duy trì tưới máu não';
      }
    } else if (ev.type === 'answer_selected') {
      const isDangerous = ev.payloadSafe?.isDangerous || false;
      const isRecommended = ev.payloadSafe?.isRecommended !== false;
      label = `Đánh giá tình huống: ${ev.payloadSafe?.choiceId || ''}`;
      if (isDangerous) {
        status = 'danger';
        detail = 'Lựa chọn thao tác có nguy cơ gây hại';
      } else if (!isRecommended) {
        status = 'missed';
        detail = 'Lựa chọn chưa tối ưu về mặt y khoa';
      } else {
        detail = 'Quyết định lâm sàng chính xác';
      }
    } else {
      label = `Sự kiện: ${ev.type}`;
      detail = `Thời điểm: ${elapsedSec}s`;
    }

    return { id: ev.clientEventId, elapsedSec, label, detail, status };
  });

  return (
    <div className="min-h-[calc(100vh-var(--header-height))] bg-[#F9FAFB] text-slate-800 pb-24 md:pb-16">
      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        
        {/* Top Summary Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-2xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left space-y-2 flex-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 flex items-center justify-center sm:justify-start gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Báo Cáo Phản Xạ Thời Gian Vàng</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
                {session?.scenarioTitle || scenario.title}
              </h1>
              <MetadataRow
                items={[
                  `Mã: ${session?.clientSessionId || 'Mô phỏng'}`,
                  session?.startedAt ? new Date(session.startedAt).toLocaleTimeString('vi-VN') : 'Vừa xong',
                  'Phác đồ chuẩn AHA',
                ]}
                className="text-xs text-slate-500 justify-center sm:justify-start"
              />
            </div>

            {/* Readiness Score Gauge */}
            <div className="flex flex-col items-center shrink-0">
              <div
                className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 flex flex-col items-center justify-center shadow-xs ${scoreInfo.bgColor} ${scoreInfo.borderColor} ${scoreInfo.textColor}`}
              >
                <span className="text-3xl sm:text-4xl font-bold font-mono tabular-nums tracking-tight">
                  {metrics.readinessScore}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mt-0.5">
                  Điểm Sẵn Sàng
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500 mt-2">
                {scoreInfo.label}
              </span>
            </div>
          </div>

          {/* Sync Status Row */}
          <div className="mt-6 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>{user ? 'Kết quả từ tài khoản của bạn' : 'Kết quả chỉ lưu trên thiết bị này'}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Chỉ số luyện tập, không phải đánh giá lâm sàng</span>
            </div>
          </div>
        </div>

        {/* Core Emergency Timeline & ADI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Metric 1: Time-to-Guidance */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Mở hướng dẫn (TTG)</span>
              <Zap className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900">
              {metrics.timeToGuidanceSec ?? '—'}{' '}
              <span className="text-xs font-sans font-normal text-slate-500">giây</span>
            </div>
            <p className="text-xs text-slate-500">
              Mục tiêu: ≤ {version.thresholds.timeToGuidanceSec}s{' '}
              {metrics.delayBreakdown.guidanceDelaySec > 0 ? (
                <span className="text-amber-700 font-bold">(Trễ {metrics.delayBreakdown.guidanceDelaySec}s)</span>
              ) : (
                <span className="text-emerald-700 font-bold">(Đạt chuẩn ✓)</span>
              )}
            </p>
          </div>

          {/* Metric 2: Time-to-Call */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Bấm gọi 115 (TTC)</span>
              <PhoneCall className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900">
              {metrics.timeToCallSec ?? '—'}{' '}
              <span className="text-xs font-sans font-normal text-slate-500">giây</span>
            </div>
            <p className="text-xs text-slate-500">
              Mục tiêu: ≤ {version.thresholds.timeToCallSec}s{' '}
              {metrics.delayBreakdown.callDelaySec > 0 ? (
                <span className="text-amber-700 font-bold">(Trễ {metrics.delayBreakdown.callDelaySec}s)</span>
              ) : (
                <span className="text-emerald-700 font-bold">(Đạt chuẩn ✓)</span>
              )}
            </p>
          </div>

          {/* Metric 3: Time-to-Action */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Hành động sơ cứu (TTA)</span>
              <Clock className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900">
              {metrics.timeToActionSec ?? '—'}{' '}
              <span className="text-xs font-sans font-normal text-slate-500">giây</span>
            </div>
            <p className="text-xs text-slate-500">
              Mục tiêu: ≤ {version.thresholds.timeToActionSec}s{' '}
              {metrics.delayBreakdown.actionDelaySec > 0 ? (
                <span className="text-amber-700 font-bold">(Trễ {metrics.delayBreakdown.actionDelaySec}s)</span>
              ) : (
                <span className="text-emerald-700 font-bold">(Đạt chuẩn ✓)</span>
              )}
            </p>
          </div>
        </div>

        {/* Visual Step-by-Step Timeline */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <span>Tiến Trình Các Thao Tác Đã Thực Hiện</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Màu sắc phản ánh độ chính xác lâm sàng theo phác đồ sơ cấp cứu
              </p>
            </div>
            <MetadataRow
              items={[
                { label: 'Đúng chuẩn', emphasis: true },
                'Chưa tối ưu',
                'Nguy hiểm',
              ]}
              className="text-xs text-slate-600"
            />
          </div>

          <div className="space-y-3">
            {timelineSteps.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                Chưa có sự kiện chi tiết được ghi nhận cho phiên này.
              </div>
            ) : (
              timelineSteps.map((step, sIdx) => {
                let badgeClass = 'bg-emerald-50/70 border-emerald-200 text-emerald-900';
                let icon = <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;

                if (step.status === 'missed') {
                  badgeClass = 'bg-amber-50/70 border-amber-200 text-amber-900';
                  icon = <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />;
                } else if (step.status === 'danger') {
                  badgeClass = 'bg-rose-50/70 border-rose-200 text-rose-900';
                  icon = <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />;
                }

                return (
                  <div
                    key={step.id || sIdx}
                    className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${badgeClass}`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {icon}
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold leading-snug">{step.label}</p>
                        <p className="text-xs opacity-90">{step.detail}</p>
                      </div>
                    </div>

                    <span className="text-xs font-mono tabular-nums font-bold shrink-0">
                      +{step.elapsedSec}s
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Deep Dive: Avoidable Delay Index (ADI) & MRO Risk */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Phân Tích Độ Trễ Có Thể Phòng Tránh (ADI)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tổng độ chênh lệch thời gian thực tế so với mốc y khoa chuẩn
              </p>
            </div>

            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-mono tabular-nums font-bold text-blue-600">
                {metrics.adiSec}s
              </span>
              <span className="block text-[11px] text-slate-500 uppercase">Tổng trễ</span>
            </div>
          </div>

          {/* MRO Risk Indicator */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              metrics.mroFlag
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            {metrics.mroFlag ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-xs sm:text-sm font-bold">
                {metrics.mroFlag
                  ? 'Cảnh báo nguy cơ bỏ lỡ cơ hội cứu hộ (MRO Flag: TÍCH CỰC)'
                  : 'An toàn: Nằm trong ngưỡng thời gian vàng (MRO Flag: KHÔNG)'}
              </h3>
              <p className="text-xs mt-1 leading-relaxed opacity-90">
                {metrics.mroFlag
                  ? `Chỉ số ADI (${metrics.adiSec}s) vượt ngưỡng an toàn (${version.thresholds.mroThresholdSec}s). Khuyến nghị rút ngắn thời gian gọi 115 và khởi động ép tim.`
                  : `Phản xạ nhanh giúp bạn không để lọt thời gian vàng cứu sống nạn nhân trước khi nhân viên y tế tiếp cận.`}
              </p>
            </div>
          </div>

          {/* Actionable Improvement */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
            <span className="text-xs font-bold text-blue-600 uppercase flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Hành động cải thiện phản xạ cho lần tới:</span>
            </span>
            <p className="text-slate-700 leading-relaxed">
              {metrics.delayBreakdown.callDelaySec > metrics.delayBreakdown.guidanceDelaySec
                ? 'Hãy bấm nút "Gọi 115" song song và bật loa ngoài ngay trong 30 giây đầu để tổng đài viên hỗ trợ điều phối xe cứu thương kịp thời.'
                : 'Hãy ghi nhớ thứ tự: Đảm bảo an toàn hiện trường → Kiểm tra phản ứng & nhịp thở → Ép tim ngay nếu nạn nhân không thở bình thường.'}
            </p>
          </div>
        </div>

        {/* Recommended Approved Resources Section */}
        {recommendedResources.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" aria-hidden="true" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Tài Nguyên Khuyến Nghị Để Ôn Tập
                </h2>
              </div>
              <Link
                to="/library"
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Xem tất cả
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recommendedResources.map((res) => (
                <div
                  key={res.id}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between gap-3 hover:border-blue-500 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-slate-900 shrink-0">
                      <SafeImage
                        src={res.thumbnailUrl}
                        alt={res.title}
                        fallbackCategory="general"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-current" />
                      </div>
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <MetadataRow
                        items={[res.sourceOrganization, res.difficultyLevel]}
                        className="text-xs text-slate-500"
                      />
                      <h3 className="text-xs font-bold text-slate-900 line-clamp-1 leading-snug">
                        {res.title}
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {res.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{res.evidenceLevel.split('(')[0]}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveLessonModal(res)}
                      className="min-h-[44px] py-1.5 px-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                      <span>Xem Hướng Dẫn</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons (min 48px touch targets) */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(`/training?scenario=${encodeURIComponent(scenario.id)}`)}
            className="flex-1 min-h-[48px] py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all text-center cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>Luyện Lại Tình Huống Này</span>
          </button>

          <Link
            to="/library"
            className="flex-1 min-h-[48px] py-3 px-4 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-800 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 border border-slate-200 transition-all text-center cursor-pointer shadow-2xs focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <BookOpen className="w-4 h-4 text-blue-600" aria-hidden="true" />
            <span>Khám Phá Thư Viện Kỹ Năng</span>
            <ChevronRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Lesson Detail Modal */}
      {activeLessonModal && (
        <LessonDetailModal
          resource={activeLessonModal}
          onClose={() => setActiveLessonModal(null)}
        />
      )}
    </div>
  );
};
