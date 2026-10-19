export type Coords = { lat: number; lng: number };

export const DEFAULT_CENTER: Coords & { label: string } = { lat: 10.7769, lng: 106.7009, label: 'TP. Hồ Chí Minh (trung tâm)' };

export const RADIUS_OPTIONS_KM = [1, 3, 5, 10, 25] as const;

export const PROVINCE_CENTERS: Array<Coords & { name: string; aliases: string[] }> = [
  { name: 'TP. Hồ Chí Minh', lat: 10.7769, lng: 106.7009, aliases: ['hcm', 'hồ chí minh', 'sài gòn', 'saigon', 'tphcm'] },
  { name: 'Hà Nội', lat: 21.0285, lng: 105.8542, aliases: ['hà nội', 'ha noi', 'hanoi'] },
  { name: 'Đà Nẵng', lat: 16.0544, lng: 108.2022, aliases: ['đà nẵng', 'da nang'] },
  { name: 'Hải Phòng', lat: 20.8449, lng: 106.6881, aliases: ['hải phòng', 'hai phong'] },
  { name: 'Cần Thơ', lat: 10.0452, lng: 105.7469, aliases: ['cần thơ', 'can tho'] },
  { name: 'Huế', lat: 16.4637, lng: 107.5909, aliases: ['huế', 'hue', 'thừa thiên huế'] },
  { name: 'Khánh Hòa', lat: 12.2388, lng: 109.1967, aliases: ['khánh hòa', 'nha trang'] },
  { name: 'Lâm Đồng', lat: 11.9404, lng: 108.4583, aliases: ['lâm đồng', 'đà lạt', 'da lat'] },
  { name: 'Bà Rịa - Vũng Tàu', lat: 10.346, lng: 107.0843, aliases: ['vũng tàu', 'vung tau', 'bà rịa'] },
  { name: 'Bình Dương', lat: 10.9804, lng: 106.6519, aliases: ['bình dương', 'thủ dầu một'] },
  { name: 'Quảng Ninh', lat: 20.9599, lng: 107.0425, aliases: ['quảng ninh', 'hạ long'] },
  { name: 'Nghệ An', lat: 18.6796, lng: 105.6813, aliases: ['nghệ an', 'vinh'] },
];

const VN_BOUNDS = { minLat: 8.0, maxLat: 23.6, minLng: 102.0, maxLng: 110.0 };

export function isInVietnam({ lat, lng }: Coords) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= VN_BOUNDS.minLat && lat <= VN_BOUNDS.maxLat && lng >= VN_BOUNDS.minLng && lng <= VN_BOUNDS.maxLng;
}

/** Repairs rows where latitude/longitude were stored swapped (common in CSV/OSM imports). */
export function normalizeCoords(lat: number, lng: number): Coords | null {
  if (isInVietnam({ lat, lng })) return { lat, lng };
  if (isInVietnam({ lat: lng, lng: lat })) return { lat: lng, lng: lat };
  return null;
}

export function distanceInKm(a: Coords, b: Coords) {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function formatDistance(km: number) {
  if (km < 1) return `${Math.max(10, Math.round(km * 100) * 10)} m`;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

export function normalizeText(value: string) {
  return value.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
}

export function findProvince(query: string) {
  const q = normalizeText(query.trim());
  if (q.length < 2) return undefined;
  return PROVINCE_CENTERS.find((p) => normalizeText(p.name).includes(q) || p.aliases.some((alias) => normalizeText(alias).includes(q) || q.includes(normalizeText(alias))));
}
