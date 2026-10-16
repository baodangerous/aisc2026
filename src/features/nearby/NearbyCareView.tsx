import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { MapPin, PhoneCall, Search } from 'lucide-react';
import { LeafletMapView } from './LeafletMapView';
import { FacilitySchema } from '../../domain/schemas/persistence';
import { supabase } from '../../services/supabase/client';

export interface CareFacility {
  id: string; name: string; type: 'aed' | 'hospital' | 'emergency_station' | 'clinic' | 'pharmacy';
  address: string; lat: number; lng: number; operatingHours: string;
  source: 'verified_official' | 'demo'; status: 'verified' | 'pending'; disclaimer: string; phone?: string; distanceKm?: number; verifiedAt?: string; sourceUrl?: string;
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
    if (!supabase) return [];
    const { data: rows, error } = await supabase.from('medical_facilities').select('id,name,type,address,province,latitude,longitude,operating_hours,phone,source_url,verified_at,status').in('status', ['verified', 'pending']).order('name');
    if (error) return [];
    return FacilitySchema.array().parse((rows ?? []).map((row) => ({
      id: row.id, name: row.name, type: row.type, address: row.address, province: row.province ?? 'Chưa cập nhật', district: 'Chưa cập nhật', lat: row.latitude, lng: row.longitude,
      regionCell: row.province ?? 'Chưa cập nhật', isPublicAccess: true, operatingHours: row.operating_hours, phone: row.phone ?? undefined, sourceUrl: row.source_url ?? 'https://supabase.com',
      verifiedAt: row.verified_at ?? undefined, status: row.status, disclaimer: row.status === 'verified' ? 'Dữ liệu đã được xác minh trong cơ sở dữ liệu.' : 'Nguồn bản đồ công khai, chưa được GoldenMinutes xác minh.',
    })));
  }, { shouldRetryOnError: false, fallbackData: [] });
  const verifiedFacilities: CareFacility[] = data.map((item) => ({ ...item, source: item.status === 'verified' ? 'verified_official' as const : 'demo' as const }));
  const sourceFacilities: CareFacility[] = verifiedFacilities;
  const facilities = useMemo(() => sourceFacilities
    .filter((item) => `${item.name} ${item.address}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')))
    .map((item) => ({ ...item, distanceKm: userCoords ? distanceInKm(userCoords.lat, userCoords.lng, item.lat, item.lng) : undefined }))
    .sort((a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY)), [data, query, userCoords]);
  const center = facilities.find((item) => item.id === selected) || facilities[0];
  const nearestFacility = facilities[0];
  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:py-8">
        <header className="flex flex-col gap-2"><span className="flex items-center gap-2 text-sm font-semibold text-primary"><MapPin className="size-5" aria-hidden="true" />Lân cận</span><h1 className="text-3xl font-bold tracking-tight">Cơ sở y tế gần bạn</h1><p className="max-w-2xl text-base leading-relaxed text-muted">Cho phép truy cập vị trí để xem điểm bạn đang đứng, khoảng cách và bệnh viện/phòng khám gần nhất trên bản đồ.</p></header>
        <div className="grid gap-3 sm:grid-cols-2">
          <a href="tel:115" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"><PhoneCall className="size-5" aria-hidden="true" />Khẩn cấp: gọi 115</a>
          <button type="button" onClick={requestLocation} disabled={locationState === 'loading'} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 font-semibold text-foreground transition-colors hover:border-primary disabled:opacity-60"><MapPin className="size-5" aria-hidden="true" />{locationState === 'loading' ? 'Đang định vị…' : locationState === 'ready' ? 'Đã cập nhật vị trí' : 'Dùng vị trí của tôi'}</button>
        </div>
        {locationState === 'denied' && <p role="status" className="text-sm text-amber-700">Không thể lấy vị trí. Bạn có thể bật quyền vị trí hoặc tìm theo tên địa điểm.</p>}
        {locationState === 'ready' && userCoords && <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Vị trí hiện tại</p><p className="mt-1 font-semibold text-blue-950 dark:text-blue-100">GPS đã sẵn sàng</p><p className="mt-1 text-xs text-blue-800/80 dark:text-blue-200/80">Bản đồ đã xoay đến vị trí của bạn</p></div><div className="rounded-2xl border border-border bg-surface p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted">Gần nhất</p><p className="mt-1 truncate font-semibold">{nearestFacility?.name ?? 'Đang tìm…'}</p><p className="mt-1 text-sm text-primary">{nearestFacility?.distanceKm !== undefined ? formatDistance(nearestFacility.distanceKm) : 'Đang tính khoảng cách'}</p></div><div className="rounded-2xl border border-border bg-surface p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted">Giờ hoạt động</p><p className="mt-1 font-semibold">{nearestFacility?.operatingHours || 'Chưa cập nhật'}</p><p className="mt-1 text-xs text-muted">Gọi 115 để xác nhận đang tiếp nhận</p></div></div>}
        {isLoading ? <p role="status">Đang tải danh bạ…</p> : <>
          {data.length === 0 && <div role="note" className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted"><p className="font-bold text-foreground">Chưa có dữ liệu cơ sở y tế</p><p className="mt-1 leading-relaxed">GoldenMinutes sẽ hiển thị bệnh viện và phòng khám khi có dữ liệu bản đồ. AED có thể bổ sung sau. Khi cần cấp cứu, hãy gọi 115.</p></div>}
          <label className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4"><Search className="size-5 text-muted" aria-hidden="true" /><span className="sr-only">Tìm cơ sở y tế</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên cơ sở hoặc địa chỉ" className="min-h-12 w-full bg-transparent text-foreground" /></label>
          {center && facilities.length > 0 && <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm"><div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3"><div><h2 className="font-bold">Bản đồ lân cận</h2><p className="text-xs text-muted">{locationState === 'ready' ? 'Khoảng cách được tính từ vị trí GPS của bạn' : 'Bấm “Dùng vị trí của tôi” để tính khoảng cách'}</p></div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{facilities.length} địa điểm</span></div><div className="h-[390px] sm:h-[460px]"><LeafletMapView center={userCoords || center} facilities={facilities} selectedFacilityId={selected} onSelectFacility={setSelected} userCoords={userCoords} /></div></section>}
          <div className="grid gap-3 lg:grid-cols-2">{facilities.map((facility) => <article key={facility.id} className="rounded-2xl border border-border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"><div className="flex items-start gap-3"><div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><MapPin className="size-5" aria-hidden="true" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><button type="button" onClick={() => setSelected(facility.id)} className="text-left text-base font-bold leading-tight hover:text-primary">{facility.name}</button>{facility.distanceKm !== undefined && <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{formatDistance(facility.distanceKm)}</span>}</div>{isUsefulAddress(facility.address) && <p className="mt-1 text-sm text-muted">{facility.address}</p>}<div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-muted/50 px-2.5 py-1 font-medium text-muted">{facility.type === 'hospital' ? 'Bệnh viện' : 'Phòng khám'}</span>{isUsefulHours(facility.operatingHours) && <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{facility.operatingHours}</span>}</div></div></div><div className="mt-4 flex gap-2 border-t border-border pt-3"><button type="button" onClick={() => setSelected(facility.id)} className="flex-1 rounded-xl border border-border py-2 text-sm font-semibold hover:border-primary hover:text-primary">Xem trên bản đồ</button>{facility.phone && <a href={`tel:${facility.phone}`} className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><PhoneCall className="size-4" aria-hidden="true" />Gọi</a>}</div></article>)}</div>
          {!facilities.length && data.length > 0 && <p>Không tìm thấy cơ sở phù hợp.</p>}
        </>}
      </div>
    </div>
  );
}

function isUsefulAddress(address: string) {
  return address.trim().length > 0 && !/chưa cập nhật|chưa có/i.test(address);
}

function isUsefulHours(hours: string) {
  return hours.trim().length > 0 && !/chưa cập nhật|chưa có/i.test(hours);
}

function formatDistance(distanceKm: number) {
  return distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`;
}

function distanceInKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadiusKm = 6371;
  const latDelta = (lat2 - lat1) * Math.PI / 180;
  const lngDelta = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(latDelta / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(lngDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
