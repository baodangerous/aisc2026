import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, HeartPulse } from 'lucide-react';
import { useFacilities } from '../nearby/useFacilities';

export function AedOverviewSection() {
  const { data, isLoading } = useFacilities();

  const stats = useMemo(() => {
    const all = data?.facilities ?? [];
    const aeds = all.filter((f) => f.type === 'aed');
    const byProvince = new Map<string, number>();
    aeds.forEach((a) => byProvince.set(a.province ?? 'Khác', (byProvince.get(a.province ?? 'Khác') ?? 0) + 1));
    const provinces = [...byProvince.entries()].sort((a, b) => b[1] - a[1]);
    return {
      aedTotal: aeds.length,
      medicalTotal: all.length - aeds.length,
      verified: aeds.filter((a) => a.verification === 'verified').length,
      provinces,
      max: provinces[0]?.[1] ?? 1,
    };
  }, [data]);

  return (
    <section aria-labelledby="aed-overview-title" className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-success">Mạng lưới AED</p>
          <h2 id="aed-overview-title" className="mt-1 text-2xl font-bold">Điểm AED trong danh bạ</h2>
        </div>
        <span className="flex size-11 items-center justify-center rounded-xl bg-success-soft text-success"><HeartPulse className="size-5" aria-hidden="true" /></span>
      </div>
      <dl className="grid grid-cols-3 gap-3">
        {[
          { label: 'Điểm AED', value: stats.aedTotal },
          { label: 'Cơ sở y tế', value: stats.medicalTotal },
          { label: 'AED đã xác minh', value: stats.verified },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-background p-3">
            <dt className="text-xs text-muted">{s.label}</dt>
            <dd className="mt-1 font-mono text-2xl font-bold tabular-nums">{isLoading ? '—' : s.value.toLocaleString('vi-VN')}</dd>
          </div>
        ))}
      </dl>
      {stats.provinces.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Số điểm AED theo tỉnh/thành">
          {stats.provinces.slice(0, 5).map(([name, count]) => (
            <li key={name} className="flex items-center gap-3 text-sm">
              <span className="w-36 shrink-0 truncate text-muted">{name}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-background"><span className="block h-full rounded-full bg-success" style={{ width: `${(count / stats.max) * 100}%` }} /></span>
              <span className="w-6 text-right font-mono font-semibold tabular-nums">{count}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs leading-5 text-muted">Tình trạng thiết bị không được giám sát theo thời gian thực. Hãy kiểm tra đèn trạng thái khi đến nơi.</p>
      <Link to="/nearby" className="inline-flex min-h-11 w-fit items-center gap-1 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary-dark">Tìm AED gần bạn<ChevronRight className="size-4" aria-hidden="true" /></Link>
    </section>
  );
}
