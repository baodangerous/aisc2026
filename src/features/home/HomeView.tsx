import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, PhoneCall, HeartPulse, Brain, Droplets, MapPin, BookOpen, ShieldAlert } from 'lucide-react';
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
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
        <section className="flex flex-col gap-5">
          <span className="flex items-center gap-2 text-sm font-medium text-primary"><HeartPulse className="size-5" aria-hidden="true" />GoldenMinutes · Sẵn sàng giúp đỡ</span>
          <h1 className="max-w-2xl text-balance text-3xl font-bold leading-tight sm:text-5xl">Bình tĩnh hơn.<br />Hành động sớm hơn.</h1>
          <p className="max-w-xl text-base leading-relaxed text-muted">Học sơ cứu từng bước. Luyện phản xạ trước khi cần đến.</p>
        </section>

        <section aria-label="Hỗ trợ khẩn cấp" className="flex flex-col gap-5 rounded-3xl bg-primary p-6 text-primary-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldAlert className="size-6 shrink-0" aria-hidden="true" />
            <div className="flex flex-col gap-1"><h2 className="text-xl font-semibold">Có người cần cấp cứu?</h2><p className="text-sm leading-relaxed">Gọi 115 và làm theo tổng đài.</p></div>
          </div>
          <button type="button" onClick={onOpenCall115} className="flex min-h-14 shrink-0 items-center justify-center gap-3 rounded-xl bg-surface px-6 text-lg font-bold text-primary hover:bg-background"><PhoneCall className="size-5" aria-hidden="true" />Gọi 115</button>
        </section>

        <section className="flex flex-col gap-4" aria-labelledby="practice-title">
          <div className="flex items-center justify-between"><h2 id="practice-title" className="text-xl font-semibold">Luyện phản xạ</h2><span className="text-sm text-muted">Tình huống giả lập</span></div>
          <div className="grid grid-cols-3 gap-3">
            {exercises.map(({ id, label, icon: Icon }) => (
              <Link key={id} to={`/training?scenario=${id}`} className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-surface p-4 text-center text-foreground hover:border-primary">
                <Icon className="size-7 text-primary" aria-hidden="true" /><span className="text-sm font-semibold sm:text-base">{label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4" aria-labelledby="sources-title">
          <div className="flex items-center justify-between gap-3"><h2 id="sources-title" className="text-xl font-semibold">Học từ nguồn gốc</h2><Link to="/library" className="flex items-center gap-1 text-sm font-medium text-primary">Tất cả<ArrowRight className="size-4" aria-hidden="true" /></Link></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{REFERENCE_LEARNING_RESOURCES.slice(0, 3).map((resource) => <LearningResourceCard key={resource.id} resource={resource} onOpen={() => navigate(`/library?lesson=${resource.slug}`)} />)}</div>
          <p className="text-sm leading-relaxed text-muted">Nguồn công khai, không phải chứng nhận đào tạo hay thẩm định y khoa cho ứng dụng.</p>
        </section>

        <nav aria-label="Tiện ích" className="flex flex-wrap gap-3">
          <Link to="/nearby" className="flex min-h-12 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm text-foreground"><MapPin className="size-5" aria-hidden="true" />Cơ sở y tế</Link>
          <Link to="/emergency" className="flex min-h-12 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm text-foreground"><BookOpen className="size-5" aria-hidden="true" />Thông tin khẩn cấp</Link>
        </nav>
        <p className="text-sm leading-relaxed text-muted">Không thay thế nhân viên y tế. Ứng dụng không điều phối xe cấp cứu hoặc xác nhận đã kết nối 115.</p>
      </div>
    </div>
  );
}
