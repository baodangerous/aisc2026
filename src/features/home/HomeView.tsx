import React from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Zap,
  PhoneCall,
  ShieldAlert,
  BookOpen,
  Brain,
  Droplets,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Clock,
} from 'lucide-react';
import { APPROVED_SCENARIOS, MEDICAL_DISCLAIMER_VI } from '../../content/approvedScenarios';
import { SafeImage } from '../../components/common/SafeImage';
import { MetadataRow } from '../../components/common/MetadataSeparators';

interface HomeViewProps {
  onOpenCall115: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onOpenCall115 }) => {
  return (
    <div className="min-h-[calc(100vh-var(--header-height))] bg-[#F9FAFB] text-slate-800 pb-24 md:pb-16">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-6 sm:pt-12 pb-8 sm:pb-14 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            
            {/* Left Column: Hero Narrative */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
              <div className="space-y-3.5">
                {/* Clean Editorial Kicker (Zero-Pill Compliance) */}
                <div className="text-xs font-semibold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  <span>Thời gian vàng cứu sống</span>
                  <span className="hidden sm:inline">· GoldenMinutes Response Lab</span>
                </div>

                <h1 className="text-[26px] sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.3] sm:leading-[1.2] [text-wrap:balance]">
                  Hệ Thống Trí Tuệ Dữ Liệu Cấp Cứu Cộng Đồng
                </h1>

                <p className="text-[15px] sm:text-base text-slate-600 leading-relaxed max-w-2xl">
                  Rút ngắn độ trễ có thể phòng tránh (<strong>Avoidable Delay Index - ADI</strong>), ngăn ngừa nguy cơ bỏ lỡ cơ hội cứu hộ với phác đồ chuẩn y khoa và nhịp ép tim CPR 110 bpm.
                </p>
              </div>

              {/* Action Buttons (min 48px primary touch targets) */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/emergency"
                  className="min-h-[56px] py-3 px-5 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-[15px] font-bold rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-rose-600/25 transition-all cursor-pointer whitespace-nowrap focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
                >
                  <ShieldAlert className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>Tôi đang gặp tình huống thật</span>
                </Link>

                <button
                  type="button"
                  onClick={onOpenCall115}
                  className="min-h-[52px] py-3 px-5 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-900 text-[15px] font-bold rounded-2xl flex items-center justify-center gap-2 border border-slate-200 shadow-xs transition-all cursor-pointer whitespace-nowrap focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  <PhoneCall className="w-5 h-5 text-rose-600 shrink-0" aria-hidden="true" />
                  <span>Gọi <span className="font-mono">115</span> khẩn cấp</span>
                </button>
              </div>

              {/* Trust Metadata */}
              <MetadataRow
                items={[
                  'Quy chuẩn AHA CPR 2020',
                  'Nghị định 279/2025/NĐ-CP',
                  'Đề án số hóa 80 máy AED',
                ]}
                className="text-xs text-slate-500 pt-2"
              />
            </div>

            {/* Right Column: Key Medical Benchmarks */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Chỉ Số Chuẩn Y Khoa
                  </span>
                  <span className="text-xs font-semibold text-emerald-700">
                    AHA Guidelines 2020
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="p-4 bg-white rounded-xl border border-slate-200">
                    <span className="text-xs font-semibold text-slate-500 block">Nhịp ép tim CPR</span>
                    <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-blue-600 mt-1">
                      110 <span className="text-xs font-normal text-slate-500 font-sans">BPM</span>
                    </div>
                    <span className="text-xs text-slate-500 mt-1 block">Tần số tối ưu tưới máu não</span>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-slate-200">
                    <span className="text-xs font-semibold text-slate-500 block">Thời gian vàng</span>
                    <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-rose-600 mt-1">
                      &lt; 4 <span className="text-xs font-normal text-slate-500 font-sans">Phút</span>
                    </div>
                    <span className="text-xs text-slate-500 mt-1 block">Ngăn tổn thương não không hồi phục</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white/80 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
                Mỗi phút trì hoãn ép tim làm giảm <strong>7–10%</strong> cơ hội sống sót của nạn nhân ngừng tuần hoàn ngoài bệnh viện.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Feature Quick Access Links (Map & Library) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Link
            to="/nearby"
            className="p-5 bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-blue-500 rounded-2xl flex items-center justify-between gap-4 shadow-2xs group transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <MapPin className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Cơ Sở Y Tế &amp; Điểm AED Gần Bạn
                </h2>
                <p className="text-xs text-slate-500">
                  Tra cứu bệnh viện cấp cứu, tính khoảng cách và định tuyến Google Maps
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 transition-colors" aria-hidden="true" />
          </Link>

          <Link
            to="/library"
            className="p-5 bg-white hover:bg-slate-50/80 border border-slate-200 hover:border-blue-500 rounded-2xl flex items-center justify-between gap-4 shadow-2xs group transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Thư Viện Video &amp; Phác Đồ Chuẩn
                </h2>
                <p className="text-xs text-slate-500">
                  Tổng hợp video hướng dẫn sơ cấp cứu theo chuẩn AHA &amp; Bộ Y Tế
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 transition-colors" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* 3. Visual First Aid Essential Learning Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-2xs space-y-5 sm:space-y-6 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Kho Tri Thức Trực Quan</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Kỹ Năng Cấp Cứu Thiết Yếu (AHA &amp; Bộ Y Tế)
              </h2>
            </div>

            <Link
              to="/library"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
            >
              <span>Xem toàn bộ học liệu</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="-mx-5 px-5 sm:mx-0 sm:px-0 flex md:grid md:grid-cols-3 gap-3 md:gap-5 overflow-x-auto md:overflow-visible snap-x snap-mandatory scroll-px-5 scrollbar-none pb-1" role="list" aria-label="Kỹ năng cấp cứu thiết yếu">
            {/* Card 1: CPR Adult */}
            <Link
              to="/library?lesson=ky-thuat-ep-tim-cpr-nguoi-lon-aha"
              role="listitem"
              className="w-[80%] shrink-0 snap-start md:w-auto bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-500 rounded-2xl overflow-hidden group transition-all shadow-2xs flex flex-col justify-between active:scale-[0.99]"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                <SafeImage
                  src="/src/assets/images/cpr_adult_training_1792058946824.jpg"
                  alt="Ép tim CPR người lớn AHA"
                  fallbackCategory="cpr"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-2 left-2 text-xs font-mono font-medium text-white flex items-center gap-1">
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  <span>02:15</span>
                </div>
              </div>
              
              <div className="p-4 space-y-2 flex-1">
                <MetadataRow
                  items={['AHA 2020', 'Hội HSCC VN', 'Cơ bản']}
                  className="text-xs text-slate-500"
                />
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 leading-snug line-clamp-2">
                  Ép tim CPR Người lớn 110 bpm liên tục
                </h3>
                <p className="text-xs text-slate-600 line-clamp-2">
                  Tư thế đặt tay ở 1/2 dưới xương ức, cánh tay thẳng góc 90° và ép sâu 5–6 cm.
                </p>
              </div>

              <div className="p-4 pt-0">
                <span className="text-xs font-bold text-blue-600 group-hover:underline flex items-center gap-1">
                  <span>Xem hướng dẫn</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
              </div>
            </Link>

            {/* Card 2: FAST Stroke */}
            <Link
              to="/library?lesson=nhan-dien-som-dot-quy-nao-fast"
              role="listitem"
              className="w-[80%] shrink-0 snap-start md:w-auto bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-500 rounded-2xl overflow-hidden group transition-all shadow-2xs flex flex-col justify-between active:scale-[0.99]"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                <SafeImage
                  src="/src/assets/images/stroke_fast_assessment_1792058949757.jpg"
                  alt="Nhận diện đột quỵ FAST"
                  fallbackCategory="stroke"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-2 left-2 text-xs font-mono font-medium text-white flex items-center gap-1">
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  <span>02:50</span>
                </div>
              </div>

              <div className="p-4 space-y-2 flex-1">
                <MetadataRow
                  items={['WHO', 'BV ĐH Y Dược', 'Cơ bản']}
                  className="text-xs text-slate-500"
                />
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 leading-snug line-clamp-2">
                  Nhận diện Đột quỵ Não theo Quy tắc FAST
                </h3>
                <p className="text-xs text-slate-600 line-clamp-2">
                  Phát hiện méo miệng, yếu tay, nói đớ và kích hoạt giờ vàng cấp cứu 3–4.5 giờ.
                </p>
              </div>

              <div className="p-4 pt-0">
                <span className="text-xs font-bold text-blue-600 group-hover:underline flex items-center gap-1">
                  <span>Xem hướng dẫn</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
              </div>
            </Link>

            {/* Card 3: Stop The Bleed */}
            <Link
              to="/library?lesson=ky-thuat-cam-mau-bang-ep-stop-the-bleed"
              role="listitem"
              className="w-[80%] shrink-0 snap-start md:w-auto bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-500 rounded-2xl overflow-hidden group transition-all shadow-2xs flex flex-col justify-between active:scale-[0.99]"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                <SafeImage
                  src="/src/assets/images/stop_the_bleed_dressing_1792058947096.jpg"
                  alt="Cầm máu khẩn cấp Stop The Bleed"
                  fallbackCategory="bleeding"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-2 left-2 text-xs font-mono font-medium text-white flex items-center gap-1">
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  <span>03:15</span>
                </div>
              </div>

              <div className="p-4 space-y-2 flex-1">
                <MetadataRow
                  items={['ACS Stop The Bleed', 'Bộ Y Tế', 'Cơ bản']}
                  className="text-xs text-slate-500"
                />
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 leading-snug line-clamp-2">
                  Cầm máu khẩn cấp &amp; Băng ép vết thương
                </h3>
                <p className="text-xs text-slate-600 line-clamp-2">
                  Kỹ thuật đè ép trực tiếp và nhét gạc vết thương sâu phòng sốc mất máu.
                </p>
              </div>

              <div className="p-4 pt-0">
                <span className="text-xs font-bold text-blue-600 group-hover:underline flex items-center gap-1">
                  <span>Xem hướng dẫn</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. 3-Minute Reflex Scenarios Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              <span>Rèn Luyện Phản Xạ 3 Phút</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Chọn Tình Huống Huấn Luyện
            </h2>
          </div>
          <p className="text-xs text-slate-500 max-w-sm">
            Mỗi bài tập đo lường chính xác từng giây phản xạ, giúp nâng cao chỉ số sẵn sàng (ADI) của bạn.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {APPROVED_SCENARIOS.map((scenario, index) => {
            const ver = scenario.versions[0];
            const isCardiac = scenario.category === 'cardiac_arrest';
            const isStroke = scenario.category === 'stroke';
            const isRecommended = index === 0;

            return (
              <div
                key={scenario.id}
                className={`bg-white border rounded-3xl p-5 sm:p-6 flex flex-col justify-between transition-all group ${
                  isRecommended
                    ? 'border-2 border-blue-600 shadow-sm'
                    : 'border-slate-200 shadow-2xs hover:border-blue-400'
                }`}
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold ${
                        isCardiac
                          ? 'bg-rose-50 text-rose-600'
                          : isStroke
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {isCardiac ? (
                        <Heart className="w-5 h-5 fill-current" aria-hidden="true" />
                      ) : isStroke ? (
                        <Brain className="w-5 h-5" aria-hidden="true" />
                      ) : (
                        <Droplets className="w-5 h-5" aria-hidden="true" />
                      )}
                    </div>

                    <MetadataRow
                      items={[
                        isRecommended ? { label: 'Khuyên Dùng', emphasis: true } : null,
                        '3 Phút',
                      ]}
                      className="text-xs text-slate-500"
                    />
                  </div>

                  <div>
                    <span className="text-xs font-mono font-bold text-slate-400">{scenario.code}</span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors mt-0.5 leading-snug">
                      {scenario.title}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {scenario.description}
                  </p>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-600">
                    <div className="flex justify-between">
                      <span>Mục tiêu mở hướng dẫn:</span>
                      <strong className="font-mono tabular-nums text-slate-900">≤ {ver.thresholds.timeToGuidanceSec}s</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Mục tiêu gọi 115:</span>
                      <strong className="font-mono tabular-nums text-slate-900">≤ {ver.thresholds.timeToCallSec}s</strong>
                    </div>
                  </div>
                </div>

                <Link
                  to={`/training?scenario=${scenario.id}`}
                  className={`mt-5 w-full min-h-[48px] py-3 px-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    isRecommended
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white'
                  }`}
                >
                  <span>Bắt đầu bài luyện</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Legal & Scientific Trust Proof Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2 text-blue-600">
            <ShieldCheck className="w-5 h-5 shrink-0" aria-hidden="true" />
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">
              Nền Tảng Pháp Lý &amp; Chuẩn Mực Y Khoa
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 leading-relaxed">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block">Nghị định 279/2025/NĐ-CP</span>
              <p>
                Quỹ giảm thiểu thiệt hại tai nạn giao thông đường bộ — Hỗ trợ kịp thời người tham gia cấp cứu nạn nhân tại hiện trường.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block">Đề án 80 Máy AED (2026)</span>
              <p>
                Đề án trang bị 80 máy khử rung tim tự động công cộng tại Khánh Hòa — Số hóa điểm chạm cứu hộ trên bản đồ mở.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 block">AHA CPR 2020 &amp; Bộ Y Tế</span>
              <p>
                Phác đồ cấp cứu hồi sinh tim phổi chuẩn hóa với nhịp ép tim tối ưu 100 - 120 lần/phút và số hóa quy trình Stop the Bleed.
              </p>
            </div>
          </div>
        </div>

        {/* Global Medical Disclaimer */}
        <div className="mt-4 p-3.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 text-center leading-relaxed">
          <p>{MEDICAL_DISCLAIMER_VI}</p>
        </div>
      </section>
    </div>
  );
};
