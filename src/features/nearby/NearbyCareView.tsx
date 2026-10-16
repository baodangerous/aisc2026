import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { MapPin, PhoneCall, Search } from 'lucide-react';
import { LeafletMapView } from './LeafletMapView';
import { FacilitySchema } from '../../domain/schemas/persistence';

export interface CareFacility {
  id: string; name: string; type: 'aed' | 'hospital' | 'emergency_station' | 'clinic' | 'pharmacy';
  address: string; lat: number; lng: number; operatingHours: string;
  source: 'verified_official' | 'demo'; disclaimer: string; phone?: string; distanceKm?: number; verifiedAt?: string; sourceUrl?: string;
}

export function NearbyCareView() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationState, setLocationState] = useState<'idle' | 'loading' | 'ready' | 'denied'>('idle');

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationState('denied');
      return;
    }
    setLocationState('loading');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserCoords({ lat: coords.latitude, lng: coords.longitude });
        setLocationState('ready');
      },
      () => setLocationState('denied'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };

  useEffect(() => {
    let cancelled = false;
    if (!navigator.permissions?.query) return;
    navigator.permissions.query({ name: 'geolocation' }).then((permission) => {
      if (!cancelled && permission.state === 'granted') requestLocation();
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  const { data = [], isLoading } = useSWR('verified-facilities', async () => {
    try {
      const response = await fetch('/api/facilities');
      if (!response.ok) return [];
      const payload = await response.json();
      return FacilitySchema.array().parse(payload.facilities);
    } catch {
      return [];
    }
  }, { shouldRetryOnError: false, fallbackData: [] });
  const demoFacilities: CareFacility[] = [
    { id: 'demo-aed-community', name: 'Điểm AED cộng đồng (minh họa)', type: 'aed', address: 'Mô phỏng tại trung tâm cộng đồng · chưa phải địa chỉ dẫn đường', lat: 10.7769, lng: 106.7009, operatingHours: 'Mô phỏng 24/7', source: 'demo', disclaimer: 'Dữ liệu minh họa để trình diễn giao diện; không dùng cho điều hướng cấp cứu.', phone: '115' },
    { id: 'demo-hospital', name: 'Bệnh viện tiếp nhận cấp cứu (minh họa)', type: 'hospital', address: 'Mô phỏng mạng lưới y tế · cần xác nhận với 115', lat: 10.7829, lng: 106.6956, operatingHours: 'Mô phỏng', source: 'demo', disclaimer: 'Dữ liệu minh họa; khả năng tiếp nhận thực tế cần được xác nhận.', phone: '115' },
    { id: 'demo-station', name: 'Trạm hỗ trợ cộng đồng (minh họa)', type: 'emergency_station', address: 'Mô phỏng điểm hỗ trợ · không phải địa chỉ thật', lat: 10.7712, lng: 106.7042, operatingHours: 'Mô phỏng', source: 'demo', disclaimer: 'Dữ liệu minh họa; gọi 115 trong tình huống khẩn cấp.', phone: '115' },
  ];
  const verifiedFacilities: CareFacility[] = data.map((item) => ({ ...item, source: 'verified_official' as const }));
  const sourceFacilities: CareFacility[] = data.length ? verifiedFacilities : demoFacilities;
  const facilities = useMemo(() => sourceFacilities
    .filter((item) => `${item.name} ${item.address}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')))
    .map((item) => ({ ...item, distanceKm: userCoords ? distanceInKm(userCoords.lat, userCoords.lng, item.lat, item.lng) : undefined }))
    .sort((a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY)), [data, query, userCoords]);
  const center = facilities.find((item) => item.id === selected) || facilities[0];
  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-3"><span className="flex items-center gap-2 text-sm text-primary"><MapPin className="size-5" aria-hidden="true" />Danh bạ</span><h1 className="text-3xl font-bold">Cơ sở y tế</h1><p className="text-base leading-relaxed text-muted">Chỉ hiển thị địa điểm có nguồn và hồ sơ xác minh. Không phản ánh năng lực tiếp nhận hiện tại.</p></header>
        <div className="grid gap-3 sm:grid-cols-2">
          <a href="tel:115" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"><PhoneCall className="size-5" aria-hidden="true" />Khẩn cấp: gọi 115</a>
          <button type="button" onClick={requestLocation} disabled={locationState === 'loading'} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 font-semibold text-foreground transition-colors hover:border-primary disabled:opacity-60"><MapPin className="size-5" aria-hidden="true" />{locationState === 'loading' ? 'Đang định vị…' : locationState === 'ready' ? 'Đã cập nhật vị trí' : 'Dùng vị trí của tôi'}</button>
        </div>
        {locationState === 'denied' && <p role="status" className="text-sm text-amber-700">Không thể lấy vị trí. Bạn có thể bật quyền vị trí hoặc tìm theo tên địa điểm.</p>}
        {isLoading ? <p role="status">Đang tải danh bạ…</p> : <>
          {data.length === 0 && <div role="note" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-bold">Bản đồ minh họa — chưa có địa điểm đã xác minh</p><p className="mt-1 leading-relaxed">Các điểm bên dưới chỉ mô phỏng cách GoldenMinutes sẽ hiển thị bệnh viện, trạm hỗ trợ và AED khi có dữ liệu chính thức. Không dùng địa chỉ này để chỉ đường; hãy gọi 115.</p></div>}
          <label className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4"><Search className="size-5 text-muted" aria-hidden="true" /><span className="sr-only">Tìm cơ sở y tế</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên cơ sở hoặc địa chỉ" className="min-h-12 w-full bg-transparent text-foreground" /></label>
          {center && <LeafletMapView center={userCoords || center} facilities={facilities} selectedFacilityId={selected} onSelectFacility={setSelected} userCoords={userCoords} />}
          {facilities.map((facility) => <article key={facility.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5"><button type="button" onClick={() => setSelected(facility.id)} className="text-left text-lg font-semibold">{facility.name}</button><p className="text-sm text-muted">{facility.address}</p>{facility.distanceKm !== undefined && <p className="text-sm font-semibold text-primary">Cách vị trí của bạn khoảng {facility.distanceKm < 1 ? `${Math.round(facility.distanceKm * 1000)} m` : `${facility.distanceKm.toFixed(1)} km`}</p>}{facility.verifiedAt ? <p className="text-sm text-muted">Xác minh: {new Date(facility.verifiedAt).toLocaleDateString('vi-VN')}</p> : <p className="text-sm text-amber-700">Chưa có xác minh — dữ liệu minh họa</p>}<p className="text-xs text-muted">Dữ liệu dùng trong ứng dụng; hãy gọi 115 để xác nhận khả năng tiếp nhận.</p></article>)}
          {!facilities.length && <p>Không tìm thấy cơ sở phù hợp.</p>}
        </>}
      </div>
    </div>
  );
}

function distanceInKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadiusKm = 6371;
  const latDelta = (lat2 - lat1) * Math.PI / 180;
  const lngDelta = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(latDelta / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(lngDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
