import useSWR from 'swr';
import { supabase } from '../../services/supabase/client';
import { useFixtures } from '../../config/dataSource';
import { normalizeCoords } from './geo';
import type { CareFacility, FacilityType, VerificationState } from './types';

const PAGE_SIZE = 1000;
const MAX_ROWS = 10000;

type LiveFacilityRow = Record<string, unknown>;

const num = (value: unknown) => (typeof value === 'number' ? value : Number(value));
const str = (value: unknown) => (typeof value === 'string' ? value : undefined);

function mapFacilityType(value: unknown): FacilityType {
  if (value === 'hospital' || value === 'clinic' || value === 'emergency_station' || value === 'pharmacy') return value;
  if (value === 'health_center') return 'clinic';
  return 'hospital';
}

function mapVerification(row: LiveFacilityRow): VerificationState {
  // Only treat as verified when the row carries both the status and a verification timestamp.
  if (row.status === 'verified' && (row.verified_at || row.verifiedAt)) return 'verified';
  if (row.status === 'pending' || row.status === 'verified') return 'pending';
  return 'unverified';
}

/** Supabase caps a select at 1,000 rows by default — paginate so all provinces are loaded, not just the first alphabetically. */
async function loadLiveMedicalFacilities(): Promise<CareFacility[]> {
  if (!supabase) return [];
  const out: CareFacility[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await supabase.from('medical_facilities').select('*').range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    for (const row of (data ?? []) as LiveFacilityRow[]) {
      const coords = normalizeCoords(num(row.lat ?? row.latitude), num(row.lng ?? row.longitude));
      const name = str(row.name)?.trim();
      if (!coords || !name || /^(area|bệnh viện)\s*\d+$/i.test(name)) continue;
      if (row.status === 'reported' || row.status === 'rejected') continue;
      out.push({
        id: String(row.id),
        name,
        type: mapFacilityType(row.type),
        address: str(row.address) ?? '',
        province: str(row.province),
        lat: coords.lat,
        lng: coords.lng,
        operatingHours: str(row.operating_hours) || 'Chưa có giờ hoạt động',
        phone: str(row.phone),
        sourceUrl: str(row.source_url),
        updatedAt: str(row.verified_at) ?? str(row.updated_at),
        origin: 'live',
        verification: mapVerification(row),
        sourceLabel: str(row.source_url)?.includes('openstreetmap') ? 'OpenStreetMap' : 'Danh bạ cơ sở y tế',
      });
    }
    if (!data || data.length < PAGE_SIZE) break;
  }
  return out;
}

async function loadLiveEmergencyResources(): Promise<CareFacility[]> {
  const res = await fetch('/api/resources/emergency');
  if (!res.ok) throw new Error(`emergency resources ${res.status}`);
  const json = (await res.json()) as { resources?: Array<Record<string, unknown>> };
  return (json.resources ?? []).flatMap((r) => {
    const coords = normalizeCoords(num(r.lat), num(r.lng));
    if (!coords) return [];
    return [{
      id: String(r.id),
      name: str(r.name) ?? 'Điểm AED',
      type: 'aed' as const,
      address: str(r.address) ?? '',
      lat: coords.lat,
      lng: coords.lng,
      operatingHours: str(r.operatingHours) || 'Theo giờ mở cửa của địa điểm',
      updatedAt: str(r.verifiedAt),
      origin: 'live' as const,
      verification: r.verifiedAt ? ('verified' as const) : ('pending' as const),
      sourceLabel: 'Hồ sơ thẩm định GoldenMinutes',
    }];
  });
}

export type FacilityLoadResult = { facilities: CareFacility[]; liveError: boolean };

async function loadFacilities(): Promise<FacilityLoadResult> {
  const [medical, emergency] = await Promise.allSettled([loadLiveMedicalFacilities(), loadLiveEmergencyResources()]);
  const live = [
    ...(medical.status === 'fulfilled' ? medical.value : []),
    ...(emergency.status === 'fulfilled' ? emergency.value : []),
  ];
  const liveError = medical.status === 'rejected' || emergency.status === 'rejected';
  if (!useFixtures) return { facilities: live, liveError };
  const fixtures = (await import('../../data/demo/facilities')).FIXTURE_FACILITIES;
  return { facilities: [...live, ...fixtures], liveError: liveError && live.length === 0 && fixtures.length === 0 };
}

export function useFacilities() {
  return useSWR('care-facilities-vn', loadFacilities, { revalidateOnFocus: false, shouldRetryOnError: false });
}
