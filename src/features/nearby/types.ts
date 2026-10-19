export type FacilityType = 'aed' | 'hospital' | 'emergency_station' | 'clinic' | 'pharmacy';

/** verified: source record proves on-site verification. pending: awaiting review. unverified: no verification evidence. */
export type VerificationState = 'verified' | 'pending' | 'unverified';

export interface CareFacility {
  id: string;
  name: string;
  type: FacilityType;
  address: string;
  province?: string;
  lat: number;
  lng: number;
  operatingHours: string;
  origin: 'live' | 'fixture';
  verification: VerificationState;
  sourceLabel: string;
  updatedAt?: string;
  phone?: string;
  sourceUrl?: string;
  distanceKm?: number;
}

export const FACILITY_TYPE_LABEL: Record<FacilityType, string> = {
  aed: 'Điểm AED',
  hospital: 'Bệnh viện',
  emergency_station: 'Trạm cấp cứu',
  clinic: 'Phòng khám / Trạm y tế',
  pharmacy: 'Nhà thuốc',
};

export const VERIFICATION_LABEL: Record<VerificationState, string> = {
  verified: 'Đã xác minh nguồn',
  pending: 'Đang chờ xác minh',
  unverified: 'Chưa xác minh tại chỗ',
};
