import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPinned } from 'lucide-react';
import { PROVINCE_CENTERS, findProvince } from '../nearby/geo';
import { useFacilities } from '../nearby/useFacilities';

export function NationwideCoverageSection() {
  const { data, isLoading } = useFacilities();
  const [province, setProvince] = useState('TP. Hồ Chí Minh');
  const counts = useMemo(() => {
    const values = new Map<string, number>();
    for (const facility of data?.facilities ?? []) {
      const match = findProvince(facility.province ?? '');
      if (match) values.set(match.name, (values.get(match.name) ?? 0) + 1);
    }
    return values;
  }, [data]);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <section aria-labelledby="national-coverage-title" className="rounded-2xl border border-border bg-surface p-5 shadow-[0_10px_25px_rgba(23,33,43,0.05)] sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary"><MapPinned className="size-4" aria-hidden="true" />Mạng lưới toàn quốc</p>
          <h2 id="national-coverage-title" className="mt-1 text-2xl font-bold">Tìm điểm hỗ trợ theo tỉnh, thành</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Chọn một trong 34 tỉnh, thành phố để xem danh bạ cơ sở y tế và AED tại khu vực đó.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:max-w-sm">
          <label htmlFor="home-province" className="text-sm font-semibold">Tỉnh, thành phố</label>
          <select id="home-province" value={province} onChange={(event) => setProvince(event.target.value)} className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm">
            {PROVINCE_CENTERS.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
          </select>
          <Link to={`/nearby?province=${encodeURIComponent(province)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary-dark">
            Xem điểm hỗ trợ <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="mt-5 border-t border-border pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold">Khu vực có nhiều điểm trong danh bạ</h3>
          <span className="text-xs text-muted">{isLoading ? 'Đang cập nhật' : `${counts.size} tỉnh, thành`}</span>
        </div>
        {ranked.length ? <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {ranked.map(([name, count]) => <li key={name}>
            <Link to={`/nearby?province=${encodeURIComponent(name)}`} className="flex min-h-14 items-center justify-between gap-2 rounded-xl bg-background px-3 py-2 text-sm transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span className="truncate font-semibold">{name}</span><span className="shrink-0 rounded-full bg-surface px-2 py-1 font-mono text-xs tabular-nums text-primary">{count}</span>
            </Link>
          </li>)}
        </ul> : <p className="rounded-xl bg-background p-4 text-sm text-muted">Danh bạ đang được cập nhật.</p>}
      </div>
    </section>
  );
}
