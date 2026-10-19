import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, PhoneCall, MapPin, BookOpen, ShieldAlert, Users, CircleCheck, PlayCircle, Timer, LibraryBig, Navigation, Activity, ChevronRight } from 'lucide-react';
import { REFERENCE_LEARNING_RESOURCES } from '../../content/curatedLearningCatalog';
import { RESEARCH_MODULES, RESEARCH_NOTE } from '../../content/researchModules';
import { HOME_EXERCISES } from '../../config/homeContent';
import { LearningResourceCard } from '../library/LearningResourceCard';
import { HealthNewsSection } from './HealthNewsSection';
import { AedOverviewSection } from './AedOverviewSection';
import { NationwideCoverageSection } from './NationwideCoverageSection';
import aedHeroImage from '../../assets/images/aed_defibrillator_access_1792058948229.jpg';

export function HomeView({ onOpenCall115 }: { onOpenCall115: () => void }) {
  const navigate = useNavigate();

  return (
    <div className="bg-background pb-36 font-sans text-foreground sm:pb-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-5 sm:px-6 sm:py-10">
        {/* Hero Section */}
        <section className="hero-editorial overflow-hidden rounded-[1.5rem] border border-border bg-surface text-foreground shadow-[0_20px_50px_rgba(23,33,43,0.10)] sm:rounded-[2rem]">
          <div className="hero-editorial-image relative overflow-hidden bg-[#f4f7f8]">
            <img src={aedHeroImage} alt="Tủ AED được đặt tại khu vực công cộng" className="h-auto max-h-[24rem] w-full object-cover" />
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-border bg-surface/95 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground shadow-sm"><CircleCheck className="size-3.5 text-primary" aria-hidden="true" />GoldenMinutes</div>
          </div>
          <div className="relative flex flex-col gap-6 bg-surface p-5 sm:gap-8 sm:p-8">
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted sm:tracking-[0.18em]"><span>Chuẩn bị sẵn sàng</span></div>
            <div className="max-w-2xl space-y-3 sm:space-y-4">
              <p className="text-xs font-semibold text-primary">GOLDENMINUTES</p>
              <p className="text-sm font-medium leading-5 text-muted">Sẵn sàng ở mọi tỉnh, thành</p>
              <h1 className="max-w-xl text-3xl font-bold leading-tight text-foreground sm:text-6xl sm:leading-[1.08]">Mỗi phút đều có ý nghĩa.</h1>
              <p className="max-w-xl text-sm leading-6 text-muted sm:text-base sm:leading-7">Học kỹ năng sơ cứu, khám phá điểm hỗ trợ quanh bạn và sẵn sàng trước khi tình huống khẩn cấp xảy ra.</p>
              <Link to="/training" className="mt-2 inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-[#e31917] px-5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"><PlayCircle className="size-5 shrink-0" aria-hidden="true" /><span className="whitespace-nowrap">Bắt đầu luyện ngay</span></Link>
            </div>
          </div>
        </section>
        <p className="text-xs text-muted">Kiến thức sơ cứu và danh bạ hỗ trợ được tổ chức để người dùng dễ tra cứu trên toàn quốc.</p>

        {/* Visual module dashboard */}
        <section aria-labelledby="module-dashboard-title" className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Bảng điều khiển</p>
              <h2 id="module-dashboard-title" className="mt-1 text-2xl font-bold">Sẵn sàng trong 3 phút</h2>
            </div>
            <span className="hidden rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary sm:inline-flex">7 mô-đun chính</span>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { href: '/training', label: 'Tập luyện phản xạ', caption: 'Luyện theo tình huống', metric: '03:00', icon: Timer, tone: 'bg-[#eef4ff] text-[#1849a9]' },
              { href: '/library', label: 'Thư viện sơ cứu', caption: 'Học nhanh, nhớ lâu', metric: `${REFERENCE_LEARNING_RESOURCES.length} bài`, icon: LibraryBig, tone: 'bg-[#fff4e8] text-[#b54708]' },
              { href: '/nearby', label: 'Điểm hỗ trợ gần bạn', caption: 'AED và cơ sở y tế', metric: 'Bản đồ', icon: Navigation, tone: 'bg-[#ecfdf3] text-[#027a48]' },
              { href: '/emergency', label: 'Tình huống thật', caption: 'Hướng dẫn từng bước', metric: '115', icon: Activity, tone: 'bg-[#fff1f0] text-primary' },
            ].map(({ href, label, caption, metric, icon: Icon, tone }) => (
              <Link key={href} to={href} className="group relative min-h-[10.5rem] overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-[0_10px_25px_rgba(23,33,43,0.06)] transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_16px_30px_rgba(23,33,43,0.1)]">
                <div className={`flex size-11 items-center justify-center rounded-xl ${tone}`}><Icon className="size-5" aria-hidden="true" /></div>
                <div className="mt-6 space-y-1"><h3 className="text-sm font-bold leading-snug">{label}</h3><p className="text-xs text-muted">{caption}</p></div>
                <div className="absolute bottom-4 right-4 flex items-center gap-1 text-xs font-bold text-primary"><span>{metric}</span><ChevronRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></div>
              </Link>
            ))}
          </div>
        </section>

        <HealthNewsSection />

        <AedOverviewSection />

        <NationwideCoverageSection />

        {/* Research-inspired modules */}
        <section aria-labelledby="research-modules-title" className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Nghiên cứu & mở rộng</p><h2 id="research-modules-title" className="mt-1 text-2xl font-bold">Thêm lớp bảo vệ cho cộng đồng</h2></div>
            <span className="hidden text-xs text-muted sm:inline">Nguồn mở đã đối chiếu</span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {RESEARCH_MODULES.map((module) => <article key={module.id} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-[0_10px_25px_rgba(23,33,43,0.05)]"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">{module.mode === 'offline' ? 'Offline' : 'Trong app'}</span><CircleCheck className="size-4 text-primary" aria-hidden="true" /></div><div><h3 className="text-base font-bold">{module.title}</h3><p className="mt-2 text-sm leading-6 text-muted">{module.summary}</p></div><div className="mt-auto flex items-center justify-between gap-3"><Link to={module.href} className="text-sm font-bold text-primary">{module.action} <ChevronRight className="inline size-4" aria-hidden="true" /></Link><span className="text-right text-[11px] text-muted">Mở ngay trong ứng dụng</span></div></article>)}
          </div>
          <p className="text-xs leading-relaxed text-muted">{RESEARCH_NOTE}</p>
        </section>

        {/* Emergency CTA */}
        <section aria-label="Hỗ trợ khẩn cấp" className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-[#c92827] to-[#9f1f20] p-5 text-primary-foreground shadow-[0_16px_34px_rgba(201,40,39,0.22)] sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="size-6 shrink-0 flex-shrink-0" aria-hidden="true" />
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-bold">Có người cần cấp cứu ngay?</h2>
              <p className="text-sm leading-relaxed opacity-95">Gọi <strong>115</strong> ngay và làm theo hướng dẫn của tổng đài.</p>
            </div>
          </div>
          <button type="button" onClick={onOpenCall115} className="flex h-14 items-center justify-center gap-2 self-start rounded-xl bg-surface px-6 font-bold text-primary hover:bg-background transition-colors">
            <PhoneCall className="size-5" aria-hidden="true" />
            Gọi 115
          </button>
        </section>

        {/* Quick Learn */}
        <section className="flex flex-col gap-4" aria-labelledby="quick-scenarios">
          <h2 id="quick-scenarios" className="text-lg font-bold">Tình huống thường gặp</h2>
          <div className="grid grid-cols-3 gap-2">
            {HOME_EXERCISES.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => navigate(`/training?scenario=${encodeURIComponent(id)}`)} className="editorial-surface flex min-h-[6.5rem] w-full flex-col items-center justify-center gap-2 rounded-2xl p-3 text-center transition-transform duration-200 hover:-translate-y-0.5 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <Icon className="size-6 text-primary" aria-hidden="true" />
                <span className="text-xs font-medium text-center leading-tight sm:text-sm">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Learning Resources */}
        <section className="flex flex-col gap-4" aria-labelledby="resources-title">
          <div className="flex items-center justify-between gap-3">
            <h2 id="resources-title" className="text-lg font-bold">Học thêm</h2>
            <Link to="/library" className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80">
              Tất cả
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {REFERENCE_LEARNING_RESOURCES.slice(0, 3).map((resource) => (
              <LearningResourceCard key={resource.id} resource={resource} onOpen={() => navigate(`/library?lesson=${resource.slug}`)} />
            ))}
          </div>
          <p className="text-xs leading-relaxed text-muted">Nguồn chính thống: American Heart Association, American Stroke Association, American College of Surgeons và British Red Cross. Mỗi tài liệu mở tại trang phát hành; GoldenMinutes không sao chép nội dung và không phải là đơn vị chứng nhận.</p>
          <div className="rounded-2xl border border-border bg-surface p-4 text-xs leading-relaxed text-muted">Tất cả bài học chính trong GoldenMinutes được lưu sẵn trong app để người dùng có thể đọc và luyện tập mà không cần chuyển sang website, cài app khác hoặc tạo tài khoản bên ngoài.</div>
        </section>

        {/* Utilities */}
        <nav aria-label="Tiện ích" className="flex flex-col gap-2 sm:flex-row">
          <Link to="/nearby" className="flex min-h-12 items-center justify-center gap-2 flex-1 rounded-xl border border-border bg-surface px-4 font-medium text-foreground hover:border-primary transition-colors">
            <MapPin className="size-5" aria-hidden="true" />
            <span className="text-sm">AED gần đó</span>
          </Link>
          <Link to="/emergency" className="flex min-h-12 items-center justify-center gap-2 flex-1 rounded-xl border border-border bg-surface px-4 font-medium text-foreground hover:border-primary transition-colors">
            <Users className="size-5" aria-hidden="true" />
            <span className="text-sm">Hỗ trợ khẩn cấp</span>
          </Link>
        </nav>

        {/* Disclaimer */}
        <p className="text-xs leading-relaxed text-muted border-t border-border pt-4">
          <strong>Từ chối trách nhiệm:</strong> Ứng dụng này không thay thế hướng dẫn của các chuyên viên y tế. Không phối hợp với nhân viên cấp cứu hoặc xác nhận kết nối với 115.
        </p>
      </div>
    </div>
  );
}
