import { useState } from 'react';
import useSWR from 'swr';
import { MapPin, ExternalLink, PhoneCall, Search } from 'lucide-react';
import { LeafletMapView } from './LeafletMapView';
import { FacilitySchema } from '../../domain/schemas/persistence';

export interface CareFacility {
  id: string; name: string; type: 'aed' | 'hospital' | 'emergency_station' | 'clinic' | 'pharmacy';
  address: string; lat: number; lng: number; operatingHours: string;
  source: 'verified_official'; disclaimer: string; phone?: string; distanceKm?: number;
}

export function NearbyCareView() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const { data = [], error, isLoading, mutate } = useSWR('verified-facilities', async () => {
    const response = await fetch('/api/facilities');
    if (!response.ok) throw new Error('Không thể tải danh bạ.');
    const payload = await response.json();
    return FacilitySchema.array().parse(payload.facilities);
  }, { shouldRetryOnError: false });
  const facilities = data.filter((item) => `${item.name} ${item.address}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')));
  const center = facilities.find((item) => item.id === selected) || facilities[0];
  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-3"><span className="flex items-center gap-2 text-sm text-primary"><MapPin className="size-5" aria-hidden="true" />Danh bạ</span><h1 className="text-3xl font-bold">Cơ sở y tế</h1><p className="text-base leading-relaxed text-muted">Chỉ hiển thị địa điểm có nguồn và hồ sơ xác minh. Không phản ánh năng lực tiếp nhận hiện tại.</p></header>
        <a href="tel:115" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"><PhoneCall className="size-5" aria-hidden="true" />Khẩn cấp: gọi 115</a>
        {isLoading ? <p role="status">Đang tải danh bạ…</p> : error ? <div role="alert" className="flex flex-col gap-3"><p>Chưa tải được danh bạ. Không sử dụng dữ liệu thay thế.</p><button type="button" onClick={() => mutate()} className="text-left text-primary underline">Thử lại</button></div> : data.length === 0 ? <section className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-8 text-center"><MapPin className="size-10 text-muted" aria-hidden="true" /><h2 className="text-xl font-semibold">Chưa có địa điểm đã xác minh</h2><p className="max-w-md text-sm leading-relaxed text-muted">Không hiển thị điểm AED minh họa hoặc địa chỉ chưa kiểm chứng để tránh chỉ dẫn sai.</p><p className="max-w-md text-sm leading-relaxed text-muted">Dữ liệu AED tại Việt Nam chưa có danh bạ quốc gia công khai đã xác minh. Khi có nguồn chính thức từ cơ quan quản lý hoặc đơn vị vận hành, dữ liệu sẽ được kiểm tra rồi mới đưa lên bản đồ.</p><a href="https://international.heart.org/en/resuscitation/hands-only-cpr" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary underline underline-offset-4">Xem video CPR và AED từ AHA International</a></section> : <>
          <label className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4"><Search className="size-5 text-muted" aria-hidden="true" /><span className="sr-only">Tìm cơ sở y tế</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên cơ sở hoặc địa chỉ" className="min-h-12 w-full bg-transparent text-foreground" /></label>
          {center && <LeafletMapView center={center} facilities={facilities.map((item) => ({ ...item, source: 'verified_official' as const }))} selectedFacilityId={selected} onSelectFacility={setSelected} userCoords={null} />}
          {facilities.map((facility) => <article key={facility.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5"><button type="button" onClick={() => setSelected(facility.id)} className="text-left text-lg font-semibold">{facility.name}</button><p className="text-sm text-muted">{facility.address}</p><p className="text-sm text-muted">Xác minh: {new Date(facility.verifiedAt).toLocaleDateString('vi-VN')}</p><a href={facility.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary">Nguồn địa điểm<ExternalLink className="size-4" aria-hidden="true" /></a></article>)}
          {!facilities.length && <p>Không tìm thấy cơ sở phù hợp.</p>}
        </>}
      </div>
    </div>
  );
}
