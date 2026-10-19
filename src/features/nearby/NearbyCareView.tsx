import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, Crosshair, Loader2, MapPin, PhoneCall, Plus, Search } from 'lucide-react';
import { LeafletMapView } from './LeafletMapView';
import { FacilityListItem } from './FacilityListItem';
import { SubmitResourceModal } from './SubmitResourceModal';
import { useFacilities } from './useFacilities';
import { DEFAULT_CENTER, PROVINCE_CENTERS, RADIUS_OPTIONS_KM, distanceInKm, findProvince, formatDistance, isInVietnam, normalizeText, type Coords } from './geo';
import type { CareFacility } from './types';

export type { CareFacility } from './types';

type OriginSource = 'default' | 'gps' | 'province';
type LocationState = 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable' | 'outside';
type TypeFilter = 'all' | 'aed' | 'medical';

const TYPE_TABS: Array<{ id: TypeFilter; label: string }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'aed', label: 'AED' },
  { id: 'medical', label: 'Cơ sở y tế' },
];

const LOCATION_MESSAGE: Partial<Record<LocationState, string>> = {
  denied: 'Bạn chưa cấp quyền vị trí. Đang hiển thị khu vực mặc định — có thể chọn tỉnh/thành hoặc bật lại quyền trong cài đặt trình duyệt.',
  unavailable: 'Không lấy được vị trí GPS (hết thời gian hoặc thiết bị không hỗ trợ). Đang dùng khu vực mặc định.',
  outside: 'Vị trí của bạn nằm ngoài vùng dữ liệu Việt Nam. Đang dùng khu vực mặc định.',
};

export function NearbyCareView() {
  const [searchParams] = useSearchParams();
  const { data, error, isLoading, mutate } = useFacilities();
  const [origin, setOrigin] = useState<{ coords: Coords; source: OriginSource; label: string }>({ coords: DEFAULT_CENTER, source: 'default', label: DEFAULT_CENTER.label });
  const [locationState, setLocationState] = useState<LocationState>('idle');
  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);

  useEffect(() => {
    const province = searchParams.get('province');
    if (!province) return;
    const match = findProvince(province);
    if (!match) return;
    setOrigin({ coords: { lat: match.lat, lng: match.lng }, source: 'province', label: match.name });
    setQuery('');
  }, [searchParams]);

  const requestLocation = () => {
    if (!navigator.geolocation) return setLocationState('unavailable');
    setLocationState('loading');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const next = { lat: coords.latitude, lng: coords.longitude };
        if (!isInVietnam(next)) return setLocationState('outside');
        setOrigin({ coords: next, source: 'gps', label: 'Vị trí hiện tại của bạn' });
        setLocationState('granted');
        setSelectedId(null);
      },
      (err) => setLocationState(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 },
    );
  };

  useEffect(() => {
    let cancelled = false;
    if (searchParams.get('province')) return;
    navigator.permissions?.query({ name: 'geolocation' }).then((p) => {
      if (!cancelled && p.state === 'granted') requestLocation();
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [searchParams]);

  const chooseProvince = (name: string) => {
    const p = PROVINCE_CENTERS.find((item) => item.name === name);
    if (!p) return;
    setOrigin({ coords: { lat: p.lat, lng: p.lng }, source: 'province', label: p.name });
    setQuery('');
    setSelectedId(null);
  };

  const matchedProvince = findProvince(query);

  const withDistance = useMemo(() => {
    const all = data?.facilities ?? [];
    return all
      .filter((f) => typeFilter === 'all' || (typeFilter === 'aed' ? f.type === 'aed' : f.type !== 'aed'))
      .map((f) => ({ ...f, distanceKm: distanceInKm(origin.coords, f) }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [data, typeFilter, origin.coords]);

  const textQuery = normalizeText(query.trim());
  const isTextSearch = textQuery.length >= 2 && !matchedProvince;

  const visible: CareFacility[] = useMemo(() => {
    if (isTextSearch) return withDistance.filter((f) => normalizeText(`${f.name} ${f.address} ${f.province ?? ''}`).includes(textQuery)).slice(0, 50);
    return withDistance.filter((f) => f.distanceKm <= radiusKm);
  }, [withDistance, isTextSearch, textQuery, radiusKm]);

  const nearestOutside = !isTextSearch && visible.length === 0 ? withDistance[0] : undefined;
  const nextRadius = RADIUS_OPTIONS_KM.find((r) => r > radiusKm);
  const aedCount = visible.filter((f) => f.type === 'aed').length;
  const selected = visible.find((f) => f.id === selectedId) ?? null;

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (matchedProvince) chooseProvince(matchedProvince.name);
  };

  return (
    <div className="min-h-screen bg-background pb-28 font-sans text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:py-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-primary"><MapPin className="size-4" aria-hidden="true" />Điểm hỗ trợ gần bạn</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight text-balance">AED và cơ sở y tế quanh bạn</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Danh sách được sắp xếp theo khoảng cách thực tế từ điểm bắt đầu tìm kiếm. Trong tình huống nguy kịch, hãy gọi 115 trước.</p>
          </div>
          <div className="flex gap-2">
            <a href="tel:115" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-danger px-4 text-sm font-bold text-white hover:opacity-90"><PhoneCall className="size-4" aria-hidden="true" />Gọi 115</a>
            <button type="button" onClick={() => setShowSubmit(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold hover:border-primary"><Plus className="size-4" aria-hidden="true" />Đề xuất điểm AED</button>
          </div>
        </header>

        {/* Controls */}
        <section aria-label="Bộ lọc tìm kiếm" className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
          <form onSubmit={onSearchSubmit} className="flex flex-col gap-2 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Tìm theo tên, địa chỉ hoặc tỉnh/thành</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm tên cơ sở, đường, quận hoặc tỉnh/thành…" className="min-h-11 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-base sm:text-sm" />
            </label>
            <button type="button" onClick={requestLocation} disabled={locationState === 'loading'} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary-dark disabled:opacity-70">
              {locationState === 'loading' ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Crosshair className="size-4" aria-hidden="true" />}
              {locationState === 'loading' ? 'Đang xác định…' : origin.source === 'gps' ? 'Cập nhật vị trí' : 'Dùng vị trí của tôi'}
            </button>
          </form>
          {matchedProvince && (
            <button type="button" onClick={() => chooseProvince(matchedProvince.name)} className="self-start rounded-full border border-primary/30 bg-primary-soft px-3 py-1.5 text-sm font-semibold text-primary">Tìm quanh trung tâm {matchedProvince.name}</button>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <div role="tablist" aria-label="Loại điểm" className="flex rounded-xl border border-border bg-background p-1">
              {TYPE_TABS.map((t) => (
                <button key={t.id} role="tab" type="button" aria-selected={typeFilter === t.id} onClick={() => setTypeFilter(t.id)} className={`min-h-9 rounded-lg px-3 text-sm font-semibold transition-colors ${typeFilter === t.id ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground'}`}>{t.label}</button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              Bán kính
              <select value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))} disabled={isTextSearch} className="min-h-9 rounded-lg border border-border bg-background px-2 text-sm disabled:opacity-50">
                {RADIUS_OPTIONS_KM.map((r) => <option key={r} value={r}>{r} km</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              Khu vực
              <select value={origin.source === 'province' ? origin.label : ''} onChange={(e) => chooseProvince(e.target.value)} className="min-h-9 rounded-lg border border-border bg-background px-2 text-sm">
                <option value="" disabled>{origin.source === 'gps' ? 'Theo GPS' : 'Chọn tỉnh/thành'}</option>
                {PROVINCE_CENTERS.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            </label>
          </div>
          <p className="text-sm text-muted" aria-live="polite">
            <span className="font-semibold text-foreground">{origin.label}</span>
            {' · '}
            {isTextSearch ? `${visible.length} kết quả cho “${query.trim()}” trên toàn quốc` : `${visible.length} điểm trong ${radiusKm} km (${aedCount} AED)`}
          </p>
          {LOCATION_MESSAGE[locationState] && <p role="status" className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{LOCATION_MESSAGE[locationState]}</p>}
          {(error || data?.liveError) && (
            <p role="alert" className="flex flex-wrap items-center gap-2 rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />Chưa tải được một phần dữ liệu từ máy chủ.
              <button type="button" onClick={() => mutate()} className="font-bold underline">Thử lại</button>
            </p>
          )}
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="order-2 lg:order-1">
            {isLoading ? (
              <ul aria-label="Đang tải" className="space-y-3">{[0, 1, 2].map((i) => <li key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-surface" />)}</ul>
            ) : visible.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
                <p className="font-bold">{isTextSearch ? 'Không tìm thấy kết quả phù hợp' : `Không có điểm nào trong ${radiusKm} km`}</p>
                {nearestOutside && <p className="mt-2 text-sm text-muted">Điểm gần nhất: <span className="font-semibold text-foreground">{nearestOutside.name}</span> — cách {formatDistance(nearestOutside.distanceKm ?? 0)}.</p>}
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {!isTextSearch && nextRadius && <button type="button" onClick={() => setRadiusKm(nextRadius)} className="min-h-10 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">Mở rộng lên {nextRadius} km</button>}
                  {isTextSearch && <button type="button" onClick={() => setQuery('')} className="min-h-10 rounded-xl border border-border px-4 text-sm font-semibold">Xóa từ khóa</button>}
                </div>
              </div>
            ) : (
              <ul className="space-y-3 lg:max-h-[38rem] lg:overflow-y-auto lg:pr-1">
                {visible.map((f, i) => <FacilityListItem key={f.id} facility={f} rank={i} selected={f.id === selectedId} onSelect={() => setSelectedId(f.id === selectedId ? null : f.id)} />)}
              </ul>
            )}
          </div>
          <div className="order-1 h-[20rem] overflow-hidden rounded-2xl border border-border bg-surface sm:h-[26rem] lg:sticky lg:top-20 lg:order-2 lg:h-[38rem]">
            <LeafletMapView origin={origin.coords} originIsGps={origin.source === 'gps'} radiusKm={isTextSearch ? 25 : radiusKm} facilities={visible} selectedFacilityId={selected?.id ?? null} onSelectFacility={setSelectedId} />
          </div>
        </div>

        <p className="text-xs leading-5 text-muted">Thông tin địa điểm mang tính tham khảo và có thể thay đổi. Trạng thái AED không được giám sát theo thời gian thực — luôn ưu tiên làm theo hướng dẫn của tổng đài 115.</p>
      </div>
      {showSubmit && <SubmitResourceModal coords={origin.coords} onClose={() => setShowSubmit(false)} />}
    </div>
  );
}
