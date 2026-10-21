import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { MapPin, PhoneCall, Search, ShieldCheck, Plus, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { LeafletMapView } from './LeafletMapView';
import { FacilitySchema } from '../../domain/schemas/persistence';
import { supabase } from '../../services/supabase/client';
import { useAuth } from '../auth/AuthContext';

export interface CareFacility {
  id: string;
  name: string;
  type: 'aed' | 'hospital' | 'emergency_station' | 'clinic' | 'pharmacy';
  address: string;
  province?: string;
  lat: number;
  lng: number;
  operatingHours: string;
  source: 'verified_official' | 'demo';
  status: 'verified' | 'pending';
  disclaimer: string;
  phone?: string;
  distanceKm?: number;
  verifiedAt?: string;
  sourceUrl?: string;
}

export function NearbyCareView() {
  const { authUser } = useAuth();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationState, setLocationState] = useState<'idle' | 'loading' | 'ready' | 'denied'>('idle');
  const [activeTab, setActiveTab] = useState<'all' | 'aed' | 'medical'>('all');

  // Resource submission state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitForm, setSubmitForm] = useState({
    name: '',
    resourceType: 'aed' as const,
    address: '',
    lat: 10.7769,
    lng: 106.7009,
    evidenceUrl: '',
    managingOrgName: '',
  });

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
        setSubmitForm((prev) => ({ ...prev, lat: coords.latitude, lng: coords.longitude }));
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

  // 1. Fetch Medical Facilities
  const { data: medicalData = [], error: medicalError, isLoading: loadingMedical } = useSWR('verified-facilities-vietnam', async () => {
    if (!supabase) return [];
    const { data: rows, error } = await supabase.from('medical_facilities').select('id,name,type,address,province,latitude,longitude,operating_hours,phone,source_url,verified_at,status').in('status', ['verified', 'pending']).order('province').order('name');
    if (error) throw error;
    return FacilitySchema.array().parse((rows ?? []).map((row) => ({
      id: row.id, name: row.name, type: row.type, address: row.address, province: row.province ?? 'Việt Nam', district: row.province ?? 'Việt Nam', lat: row.latitude, lng: row.longitude,
      regionCell: row.province ?? 'Chưa cập nhật', isPublicAccess: true, operatingHours: row.operating_hours || 'Chưa có giờ hoạt động xác minh', phone: row.phone ?? undefined, sourceUrl: row.source_url ?? 'https://www.openstreetmap.org/copyright',
      verifiedAt: row.verified_at ?? undefined, status: row.status, disclaimer: row.status === 'verified' ? 'Thông tin cơ sở đã được xác minh.' : 'Thông tin địa điểm đang chờ xác minh.',
    })));
  }, { shouldRetryOnError: false, fallbackData: [] });

  // 2. Fetch Verified Emergency Resources (AEDs & Cabinets)
  const { data: emergencyData = [], error: emergencyError, isLoading: loadingEmergency } = useSWR('verified-emergency-resources', async () => {
    try {
      const res = await fetch('/api/resources/emergency');
      if (!res.ok) return [];
      const json = await res.json();
      return (json.resources || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        type: 'aed' as const,
        address: r.address,
        lat: r.lat,
        lng: r.lng,
        operatingHours: 'Tiếp cận công cộng 24/7',
        source: 'verified_official' as const,
        status: 'verified' as const,
        disclaimer: 'Thiết bị cấp cứu đã được thẩm định thực địa.',
        verifiedAt: r.verifiedAt,
      }));
    } catch {
      return [];
    }
  }, { shouldRetryOnError: false, fallbackData: [] });

  const allFacilities: CareFacility[] = useMemo(() => {
    const medFacilities = medicalData.map((item) => ({ ...item, source: item.status === 'verified' ? 'verified_official' as const : 'demo' as const }));
    const combined = [...emergencyData, ...medFacilities];
    return combined.filter((facility) => !/^area\s*\d+$/i.test(facility.name) && !/^bệnh viện\s*\d+$/i.test(facility.name));
  }, [medicalData, emergencyData]);

  const filteredByType = useMemo(() => {
    if (activeTab === 'aed') return allFacilities.filter((f) => f.type === 'aed');
    if (activeTab === 'medical') return allFacilities.filter((f) => f.type !== 'aed');
    return allFacilities;
  }, [allFacilities, activeTab]);

  const facilities = useMemo(() => filteredByType
    .filter((item) => `${item.name} ${item.address}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')))
    .map((item) => ({ ...item, distanceKm: userCoords ? distanceInKm(userCoords.lat, userCoords.lng, item.lat, item.lng) : undefined }))
    .sort((a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY)), [filteredByType, query, userCoords]);

  const nearbyFacilities = useMemo(() => userCoords ? facilities.filter((facility) => (facility.distanceKm ?? Infinity) <= 5) : [], [facilities, userCoords]);
  const prioritizedFacilities = userCoords && nearbyFacilities.length > 0 ? nearbyFacilities : facilities;
  const center = prioritizedFacilities.find((item) => item.id === selected) || prioritizedFacilities[0];
  const nearestFacility = prioritizedFacilities[0];

  const handleSubmitResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    try {
      const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      const token = sessionData?.session?.access_token;
      const res = await fetch('/api/resources/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(submitForm),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || 'Không thể gửi đề xuất. Vui lòng đăng nhập.');
      }
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowSubmitModal(false);
      }, 2500);
    } catch (err: any) {
      setSubmitError(err.message || 'Lỗi gửi đề xuất.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = loadingMedical || loadingEmergency;

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:py-8">
        <header className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/20 via-surface to-emerald-500/10 p-5 shadow-xl shadow-primary/5 sm:p-7">
          <div className="pointer-events-none absolute -right-12 -top-16 size-40 rounded-full bg-primary/15 blur-2xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-background/60 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-primary">
                <MapPin className="size-4" aria-hidden="true" />
                Mạng lưới cứu hộ
              </span>
              <h1 className="mt-4 max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">Tìm nơi cấp cứu & AED gần bạn</h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
                Tra cứu cơ sở y tế trên toàn Việt Nam, ưu tiên TP.HCM khi bạn ở khu vực này, cùng các điểm AED đã xác minh.
              </p>
            </div>
            <div className="hidden size-16 shrink-0 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg sm:flex">
              <MapPin className="size-8" aria-hidden="true" />
            </div>
          </div>
        </header>

        {/* Action Row: Call 115, GPS, Submit AED */}
        <div className="grid gap-3 sm:grid-cols-3">
          <a href="tel:115" className="group flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-700 via-red-600 to-red-500 px-4 font-bold text-white shadow-lg shadow-red-600/25 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-red-600/35">
            <PhoneCall className="size-5 transition group-hover:scale-110" aria-hidden="true" />
            Khẩn cấp: gọi 115
          </a>
          <button type="button" onClick={requestLocation} disabled={locationState === 'loading'} className="group flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-surface px-4 font-bold text-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md disabled:opacity-60 cursor-pointer">
            <MapPin className="size-5" aria-hidden="true" />
            {locationState === 'loading' ? 'Đang định vị…' : locationState === 'ready' ? 'Đã cập nhật vị trí' : 'Dùng vị trí của tôi'}
          </button>
          <button type="button" onClick={() => setShowSubmitModal(true)} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary px-4 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90 cursor-pointer">
            <Plus className="size-5" />
            Đóng góp điểm AED mới
          </button>
        </div>

        {/* Tab Filters */}
        <div className="flex gap-2 border-b border-border pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${activeTab === 'all' ? 'bg-primary text-primary-foreground' : 'bg-surface text-muted hover:text-foreground'}`}
          >
            Tất cả ({allFacilities.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('aed')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${activeTab === 'aed' ? 'bg-emerald-600 text-white' : 'bg-surface text-muted hover:text-foreground'}`}
          >
            Điểm đặt máy AED ({emergencyData.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('medical')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${activeTab === 'medical' ? 'bg-blue-600 text-white' : 'bg-surface text-muted hover:text-foreground'}`}
          >
            Cơ sở Y tế ({medicalData.length})
          </button>
        </div>

        {locationState === 'denied' && <p role="status" className="text-sm text-amber-700">Hãy bật quyền vị trí trong trình duyệt để tính khoảng cách theo nơi bạn đang đứng.</p>}
        {locationState === 'ready' && userCoords && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Vị trí hiện tại</p>
              <p className="mt-1 font-semibold text-blue-950 dark:text-blue-100">GPS đã sẵn sàng</p>
              <p className="mt-1 text-xs text-blue-800/80 dark:text-blue-200/80">Bản đồ đã xoay đến vị trí của bạn</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Gần nhất</p>
              <p className="mt-1 truncate font-semibold">{nearestFacility?.name ?? 'Đang tìm…'}</p>
              <p className="mt-1 text-sm text-primary">{nearestFacility?.distanceKm !== undefined ? formatDistance(nearestFacility.distanceKm) : 'Đang tính khoảng cách'}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Loại điểm</p>
              <p className="mt-1 font-semibold">{nearestFacility?.type === 'aed' ? 'Máy sốc tim AED' : 'Cơ sở Y tế'}</p>
              <p className="mt-1 text-xs text-muted">{nearestFacility?.operatingHours || 'Tiếp cận công cộng'}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div role="status" className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">Đang tải danh bạ cơ sở y tế toàn quốc…</div>
        ) : medicalError || emergencyError ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100">Không thể cập nhật danh bạ trực tuyến. Vui lòng thử tải lại trang hoặc gọi 115 khi khẩn cấp.</div>
        ) : (
          <>
            <label className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4">
              <Search className="size-5 text-muted" aria-hidden="true" />
              <span className="sr-only">Tìm cơ sở y tế hoặc AED</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên cơ sở, trạm AED hoặc địa chỉ..." className="min-h-12 w-full bg-transparent text-foreground" />
            </label>

            {center && prioritizedFacilities.length > 0 && (
              <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <div>
                    <h2 className="font-bold">Bản đồ lân cận</h2>
                    <p className="text-xs text-muted">{locationState === 'ready' ? 'Khoảng cách tính từ GPS · đang lọc trong bán kính 5 km' : 'Bấm “Dùng vị trí của tôi” để tìm trong bán kính 5 km'}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{prioritizedFacilities.length} địa điểm hiển thị</span>
                </div>
                <div className="h-[390px] sm:h-[460px]">
                  <LeafletMapView center={userCoords || center} facilities={prioritizedFacilities} selectedFacilityId={selected} onSelectFacility={setSelected} userCoords={userCoords} />
                </div>
              </section>
            )}

            <div className="grid gap-3 lg:grid-cols-2">
              {prioritizedFacilities.map((facility) => (
                <article key={facility.id} className="rounded-2xl border border-border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${facility.type === 'aed' ? 'bg-emerald-100 text-emerald-800' : 'bg-primary/10 text-primary'}`}>
                      <MapPin className="size-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <button type="button" onClick={() => setSelected(facility.id)} className="text-left text-base font-bold leading-tight hover:text-primary">
                          {facility.name}
                        </button>
                        {facility.distanceKm !== undefined && (
                          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                            {formatDistance(facility.distanceKm)}
                          </span>
                        )}
                      </div>
                      {isUsefulAddress(facility.address) && <p className="mt-1 text-sm text-muted">{facility.address}{facility.province && facility.province !== 'Việt Nam' ? ` · ${facility.province}` : ''}</p>}
                      <p className="mt-2 text-sm font-semibold text-foreground">Giờ hoạt động: <span className="font-medium text-muted">{facility.operatingHours}</span></p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className={`rounded-full px-2.5 py-1 font-semibold ${facility.type === 'aed' ? 'bg-emerald-50 text-emerald-700' : 'bg-muted/50 text-muted'}`}>
                          {facility.type === 'aed' ? 'Máy sốc tim AED' : facility.type === 'hospital' ? 'Bệnh viện' : 'Phòng khám'}
                        </span>
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700 flex items-center gap-1">
                          <ShieldCheck className="size-3" />
                          <span>Đã xác minh</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2 border-t border-border pt-3">
                    <button type="button" onClick={() => setSelected(facility.id)} className="flex-1 rounded-xl border border-border py-2 text-sm font-semibold hover:border-primary hover:text-primary">
                      Xem trên bản đồ
                    </button>
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lng}`} target="_blank" rel="noreferrer" className="rounded-xl border border-primary px-3 py-2 text-sm font-semibold text-primary">
                      Chỉ đường
                    </a>
                    {facility.phone && (
                      <a href={`tel:${facility.phone}`} className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                        <PhoneCall className="size-4" aria-hidden="true" />Gọi
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {!facilities.length && allFacilities.length > 0 && <p className="text-muted p-4">Không tìm thấy địa điểm phù hợp với từ khóa.</p>}
          </>
        )}
      </div>

      {/* Citizen Resource Submission Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleSubmitResource} className="w-full max-w-lg rounded-3xl bg-surface p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Đóng Góp Điểm AED / Hộp Cấp Cứu</h2>
              <button type="button" onClick={() => setShowSubmitModal(false)} aria-label="Đóng">
                <X className="size-5" />
              </button>
            </div>
            <p className="text-xs text-muted">
              Thông tin đề xuất sẽ được đội ngũ thẩm định y tế kiểm tra thực địa trước khi hiển thị công khai trên bản đồ.
            </p>

            {submitSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                <span>Cảm ơn bạn! Đề xuất đã được lưu vào hàng đợi thẩm định.</span>
              </div>
            )}

            {submitError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-800 flex items-center gap-2">
                <AlertCircle className="size-4 text-red-600 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <label className="block text-sm font-semibold">
              Tên địa điểm đặt thiết bị
              <input
                required
                value={submitForm.name}
                onChange={(e) => setSubmitForm({ ...submitForm, name: e.target.value })}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                placeholder="Ví dụ: AED Tiền sảnh Tòa nhà SaiGon Tower"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-semibold">
                Loại thiết bị
                <select
                  value={submitForm.resourceType}
                  onChange={(e) => setSubmitForm({ ...submitForm, resourceType: e.target.value as any })}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                >
                  <option value="aed">Máy sốc tim tự động (AED)</option>
                  <option value="first_aid_kit">Hộp sơ cấp cứu tổng hợp</option>
                  <option value="bleeding_control_kit">Bộ cầm máu khẩn cấp</option>
                  <option value="emergency_cabinet">Tủ cấp cứu công cộng</option>
                </select>
              </label>

              <label className="block text-sm font-semibold">
                Đơn vị quản lý (nếu biết)
                <input
                  value={submitForm.managingOrgName}
                  onChange={(e) => setSubmitForm({ ...submitForm, managingOrgName: e.target.value })}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                  placeholder="Ban quản lý tòa nhà..."
                />
              </label>
            </div>

            <label className="block text-sm font-semibold">
              Địa chỉ chi tiết
              <input
                required
                value={submitForm.address}
                onChange={(e) => setSubmitForm({ ...submitForm, address: e.target.value })}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                placeholder="Số 29 Lê Duẩn, Phường Bến Nghé, Quận 1..."
              />
            </label>

            <label className="block text-sm font-semibold">
              Link ảnh chụp thiết bị / Bằng chứng
              <input
                value={submitForm.evidenceUrl}
                onChange={(e) => setSubmitForm({ ...submitForm, evidenceUrl: e.target.value })}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                placeholder="https://..."
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting ? 'Đang gửi...' : 'Gửi đề xuất thẩm định'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function isUsefulAddress(address: string) {
  return address.trim().length > 0 && !/chưa cập nhật|chưa có/i.test(address);
}

function formatDistance(distanceKm: number) {
  return distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`;
}

function distanceInKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadiusKm = 6371;
  const latDelta = ((lat2 - lat1) * Math.PI) / 180;
  const lngDelta = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(latDelta / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(lngDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
