import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, PhoneCall, MapPin, BookOpen, ShieldAlert, Users, CircleCheck, ExternalLink, PlayCircle } from 'lucide-react';
import { REFERENCE_LEARNING_RESOURCES } from '../../content/curatedLearningCatalog';
import { HOME_EXERCISES, HOME_HERO, HOME_PHOTO_STORIES } from '../../config/homeContent';
import { LearningResourceCard } from '../library/LearningResourceCard';

export function HomeView({ onOpenCall115 }: { onOpenCall115: () => void }) {
  const navigate = useNavigate();

  return (
    <div className="bg-background pb-36 font-sans text-foreground sm:pb-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-5 sm:px-6 sm:py-10">
        {/* Hero Section */}
        <section className="hero-editorial overflow-hidden rounded-[1.5rem] border border-border bg-surface text-foreground shadow-[0_20px_50px_rgba(23,33,43,0.10)] sm:rounded-[2rem]">
          <div className="hero-editorial-image relative overflow-hidden bg-[#f4f7f8]">
            <img src={HOME_HERO.image} alt="Đội ngũ cộng đồng giới thiệu tủ AED tại một không gian công cộng" className="h-auto max-h-[24rem] w-full object-contain" />
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-border bg-surface/95 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground shadow-sm"><CircleCheck className="size-3.5 text-primary" aria-hidden="true" />Báo Khánh Hòa</div>
          </div>
          <div className="relative flex flex-col gap-6 bg-surface p-5 sm:gap-8 sm:p-8">
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted sm:tracking-[0.18em]"><span>Chuẩn bị sẵn sàng</span></div>
            <div className="max-w-2xl space-y-3 sm:space-y-4">
              <p className="text-xs font-semibold text-primary">GOLDENMINUTES</p>
              <p className="text-sm font-medium leading-5 text-muted">Cộng đồng biết cách cứu người</p>
              <h1 className="max-w-xl text-3xl font-bold leading-tight text-foreground sm:text-6xl sm:leading-[1.08]">Mỗi phút đều có ý nghĩa.</h1>
              <p className="max-w-xl text-sm leading-6 text-muted sm:text-base sm:leading-7">Học kỹ năng sơ cứu thật. Nhìn thấy những người đang hành động thật. Sẵn sàng trước khi tình huống khẩn cấp xảy ra.</p>
              <Link to="/training" className="mt-2 inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-[#e31917] px-5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"><PlayCircle className="size-5 shrink-0" aria-hidden="true" /><span className="whitespace-nowrap">Bắt đầu luyện ngay</span></Link>
            </div>
          </div>
        </section>
        <p className="text-xs text-muted">Nguồn ảnh và thông tin: <a className="underline underline-offset-2" href={HOME_HERO.sourceUrl} target="_blank" rel="noopener noreferrer">{HOME_HERO.sourceLabel}</a></p>

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

        {/* Documentary filmstrip */}
        <section className="flex flex-col gap-4" aria-labelledby="stories-title">
          <div className="flex items-end justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Từ Khánh Hòa</p><h2 id="stories-title" className="mt-1 text-2xl font-bold">Những người đang chuẩn bị</h2></div>
            <span className="text-xs text-muted">Vuốt để xem</span>
          </div>
          <div className="filmstrip -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 scrollbar-none sm:-mx-6 sm:px-6">
            {HOME_PHOTO_STORIES.map((story) => (
              <article key={story.image} className="film-card min-w-[84vw] snap-center overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_12px_28px_rgba(23,33,43,0.07)] sm:min-w-[31rem]">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#f4f7f8]">
                  <img src={story.image} alt={story.alt} className="film-card-image h-full w-full object-cover object-center" />
                  <span className="absolute left-3 top-3 rounded-full border border-border bg-surface/95 px-3 py-1 text-[11px] font-semibold text-foreground shadow-sm">Báo Khánh Hòa</span>
                </div>
                <div className="flex flex-col gap-2 p-4"><h3 className="text-lg font-bold">{story.title}</h3><p className="text-xs text-muted">Nguồn ảnh: {story.source}</p><a href={story.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-primary underline underline-offset-4">Xem nguồn đầy đủ <ExternalLink className="size-3" aria-hidden="true" /></a></div>
              </article>
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
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            {REFERENCE_LEARNING_RESOURCES.slice(0, 4).map((resource) => <a key={resource.id} href={resource.sourcePageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-4">{resource.sourceOrganization}<ExternalLink className="size-3" aria-hidden="true" /></a>)}
          </div>
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
