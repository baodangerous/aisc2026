import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, PhoneCall, HeartPulse, Brain, Droplets, MapPin, BookOpen, ShieldAlert, Users, CircleCheck, ExternalLink, PlayCircle } from 'lucide-react';
import { REFERENCE_LEARNING_RESOURCES } from '../../content/curatedLearningCatalog';
import { LearningResourceCard } from '../library/LearningResourceCard';

export function HomeView({ onOpenCall115 }: { onOpenCall115: () => void }) {
  const navigate = useNavigate();
  const exercises = [
    { id: 'sc_ohca_01', label: 'Ép tim', icon: HeartPulse },
    { id: 'sc_stroke_02', label: 'Đột quỵ', icon: Brain },
    { id: 'sc_bleeding_03', label: 'Cầm máu', icon: Droplets },
  ];
  const photoStories = [
    {
      image: '/images/aed-community-installation.png',
      alt: 'Đội ngũ cộng đồng giới thiệu tủ AED tại một không gian công cộng',
      title: 'Một điểm AED bắt đầu từ cộng đồng',
      source: 'Ảnh người dùng cung cấp',
      sourceUrl: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-lEhwS8MRtPPU0NJEl4SJGU2Ioiprc0.png',
    },
    {
      image: '/images/cpr-training-session.png',
      alt: 'Lớp huấn luyện CPR thực hành với mannequin và AED',
      title: 'Học bằng tay, nhớ bằng phản xạ',
      source: 'Ảnh người dùng cung cấp',
      sourceUrl: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-UfqIJI5aBIZExSaSk90BqOclitZ40o.png',
    },
    {
      image: '/images/aed-public-location.png',
      alt: 'Điểm đặt AED trong khu vực công cộng có nhân sự hỗ trợ',
      title: 'Biết vị trí trước khi cần đến',
      source: 'Ảnh người dùng cung cấp',
      sourceUrl: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-JzevJg2r9L32XBqdpm05U23fq9paPF.png',
    },
  ];
  return (
    <div className="bg-background pb-24 font-sans text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        {/* Hero Section */}
        <section className="hero-editorial relative overflow-hidden rounded-[2rem] bg-[#191919] text-white">
          <div className="absolute inset-0 bg-black/35">
            <img src="/images/aed-community-installation.png" alt="" aria-hidden="true" className="h-full w-full object-cover object-[center_30%] opacity-85" />
          </div>
          <div className="relative flex min-h-[29rem] flex-col justify-between gap-12 p-6 sm:min-h-[34rem] sm:p-10">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              <span className="flex items-center gap-2"><CircleCheck className="size-4 text-[#ff6b68]" aria-hidden="true" />Chuẩn bị sẵn sàng</span>
              <span className="font-mono text-white/60">01 / 03</span>
            </div>
            <div className="max-w-xl">
              <p className="mb-3 text-sm font-semibold text-[#ffb4b2]">GOLDENMINUTES · CỘNG ĐỒNG BIẾT CỨU NGƯỜI</p>
              <h1 className="text-balance text-4xl font-bold leading-[1.05] sm:text-6xl">Mỗi phút đều có ý nghĩa.</h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-white/80">Học kỹ năng sơ cứu thật. Nhìn thấy những người đang hành động thật. Sẵn sàng trước khi tình huống khẩn cấp xảy ra.</p>
              <Link to="/training" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#e31917] px-5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"><PlayCircle className="size-5" aria-hidden="true" />Bắt đầu luyện ngay</Link>
            </div>
          </div>
        </section>
        <p className="text-xs text-muted">Ảnh nền: người dùng cung cấp · <a className="underline underline-offset-2" href="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-lEhwS8MRtPPU0NJEl4SJGU2Ioiprc0.png" target="_blank" rel="noopener noreferrer">xem ảnh gốc</a></p>

        {/* Emergency CTA */}
        <section aria-label="Hỗ trợ khẩn cấp" className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-[#e31917] to-[#b31312] p-6 text-primary-foreground shadow-lg shadow-[#e31917]/20">
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
            {exercises.map(({ id, label, icon: Icon }) => (
              <Link key={id} to={`/training?scenario=${id}`} className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-primary hover:bg-surface/80">
                <Icon className="size-6 text-primary" aria-hidden="true" />
                <span className="text-xs font-medium text-center leading-tight sm:text-sm">{label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Documentary filmstrip */}
        <section className="flex flex-col gap-4" aria-labelledby="stories-title">
          <div className="flex items-end justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Câu chuyện thật</p><h2 id="stories-title" className="mt-1 text-2xl font-bold">Ai cũng có thể bắt đầu</h2></div>
            <span className="text-xs text-muted">Vuốt để xem</span>
          </div>
          <div className="filmstrip -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 scrollbar-none sm:-mx-6 sm:px-6">
            {photoStories.map((story, index) => (
              <article key={story.image} className="film-card min-w-[84vw] snap-center overflow-hidden rounded-2xl border border-border bg-surface sm:min-w-[31rem]">
                <div className="relative aspect-[4/3] overflow-hidden bg-[#e5e7eb]">
                  <img src={story.image} alt={story.alt} className="film-card-image h-full w-full object-cover object-[center_36%]" />
                  <span className="absolute left-3 top-3 rounded-full bg-black/65 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">0{index + 1} · ĐỜI THẬT</span>
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
          <p className="text-xs leading-relaxed text-muted">Nguồn chính thống: American Heart Association, American Stroke Association, American College of Surgeons và British Red Cross. Mỗi tài liệu mở tại trang phát hành; GoldenMinutes không sao chép hoặc nhận là đơn vị chứng nhận.</p>
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
