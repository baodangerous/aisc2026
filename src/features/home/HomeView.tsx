import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, PhoneCall, HeartPulse, Brain, Droplets, MapPin, BookOpen, ShieldAlert, Users, CircleCheck } from 'lucide-react';
import { REFERENCE_LEARNING_RESOURCES } from '../../content/curatedLearningCatalog';
import { LearningResourceCard } from '../library/LearningResourceCard';

export function HomeView({ onOpenCall115 }: { onOpenCall115: () => void }) {
  const navigate = useNavigate();
  const exercises = [
    { id: 'sc_ohca_01', label: 'Ép tim', icon: HeartPulse },
    { id: 'sc_stroke_02', label: 'Đột quỵ', icon: Brain },
    { id: 'sc_bleeding_03', label: 'Cầm máu', icon: Droplets },
  ];
  return (
    <div className="bg-background pb-24 font-sans text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        {/* Hero Section */}
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><CircleCheck className="size-4" aria-hidden="true" />Chuẩn bị sẵn sàng</span>
            <h1 className="text-balance text-3xl font-bold leading-tight sm:text-4xl">Mỗi phút đều có ý nghĩa.</h1>
            <p className="max-w-lg text-base leading-relaxed text-muted">Tìm hiểu kỹ năng sơ cứu cơ bản, định vị AED gần đó, và sẵn sàng giúp đỡ khi cần thiết.</p>
          </div>
          
          {/* Community Image */}
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <img src="/images/aed-community-installation.png" alt="Lễ khánh thành điểm AED cộng đồng với đội ngũ y tế" className="h-48 w-full object-cover sm:h-64" />
          </div>
        </section>

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

        {/* Training Photos */}
        <section className="grid grid-cols-2 gap-3">
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <img src="/images/cpr-training-session.png" alt="Buổi huấn luyện CPR thực hành với nhóm tình nguyện viên" className="h-40 w-full object-cover sm:h-48" />
            <p className="p-2 text-xs font-medium text-muted">Huấn luyện thực hành</p>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <img src="/images/aed-public-location.png" alt="Điểm AED công cộng tại trung tâm cộng đồng" className="h-40 w-full object-cover sm:h-48" />
            <p className="p-2 text-xs font-medium text-muted">AED ở gần bạn</p>
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
          <p className="text-xs leading-relaxed text-muted">Tài liệu từ các nguồn công khai, cấp cứu chuyên viên, và tổ chức y tế. Không phải chứng chỉ y khoa chính thức.</p>
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
