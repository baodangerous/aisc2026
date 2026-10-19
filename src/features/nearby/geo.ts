export type Coords = { lat: number; lng: number };

export const DEFAULT_CENTER: Coords & { label: string } = { lat: 10.7769, lng: 106.7009, label: 'TP. Hồ Chí Minh (trung tâm)' };

export const RADIUS_OPTIONS_KM = [1, 3, 5, 10, 25] as const;

/**
 * Province-level search centers aligned with the 34 units listed in Decision 19/2025/QĐ-TTg,
 * effective 2025-07-01. These are map/search anchors, not official administrative boundaries.
 * Reference: https://xaydungchinhsach.chinhphu.vn/bang-danh-muc-va-ma-so-cua-34-tinh-thanh-moi-cac-don-vi-hanh-chinh-cap-xa-moi-11925070418263625.htm
 */
export const PROVINCE_CENTERS: Array<Coords & { name: string; aliases: string[] }> = [
  { name: 'Hà Nội', lat: 21.0285, lng: 105.8542, aliases: ['ha noi', 'hanoi'] },
  { name: 'Cao Bằng', lat: 22.6667, lng: 106.2500, aliases: ['cao bang'] },
  { name: 'Tuyên Quang', lat: 21.8236, lng: 105.2142, aliases: ['tuyen quang', 'hà giang', 'ha giang'] },
  { name: 'Điện Biên', lat: 21.3860, lng: 103.0230, aliases: ['dien bien', 'điện biên phủ', 'dien bien phu'] },
  { name: 'Lai Châu', lat: 22.3964, lng: 103.4582, aliases: ['lai chau'] },
  { name: 'Sơn La', lat: 21.3280, lng: 103.9140, aliases: ['son la'] },
  { name: 'Lào Cai', lat: 21.7168, lng: 104.8986, aliases: ['lao cai', 'yên bái', 'yen bai'] },
  { name: 'Thái Nguyên', lat: 21.5942, lng: 105.8482, aliases: ['thai nguyen', 'bắc kạn', 'bac kan'] },
  { name: 'Lạng Sơn', lat: 21.8537, lng: 106.7610, aliases: ['lang son'] },
  { name: 'Quảng Ninh', lat: 20.9599, lng: 107.0425, aliases: ['quang ninh', 'hạ long', 'ha long'] },
  { name: 'Bắc Ninh', lat: 21.2819, lng: 106.1975, aliases: ['bac ninh', 'bắc giang', 'bac giang'] },
  { name: 'Phú Thọ', lat: 21.3227, lng: 105.4019, aliases: ['phu tho', 'vĩnh phúc', 'vinh phuc', 'hòa bình', 'hoa binh'] },
  { name: 'Hải Phòng', lat: 20.8449, lng: 106.6881, aliases: ['hai phong', 'hải dương', 'hai duong'] },
  { name: 'Hưng Yên', lat: 20.6464, lng: 106.0511, aliases: ['hung yen', 'thái bình', 'thai binh'] },
  { name: 'Ninh Bình', lat: 20.2506, lng: 105.9745, aliases: ['ninh binh', 'nam định', 'nam dinh', 'hà nam', 'ha nam'] },
  { name: 'Thanh Hóa', lat: 19.8067, lng: 105.7852, aliases: ['thanh hoa'] },
  { name: 'Nghệ An', lat: 18.6796, lng: 105.6813, aliases: ['nghe an', 'vinh'] },
  { name: 'Hà Tĩnh', lat: 18.3428, lng: 105.9057, aliases: ['ha tinh'] },
  { name: 'Quảng Trị', lat: 17.4689, lng: 106.6223, aliases: ['quang tri', 'quảng bình', 'quang binh', 'đồng hới', 'dong hoi'] },
  { name: 'Huế', lat: 16.4637, lng: 107.5909, aliases: ['hue', 'thừa thiên huế', 'thua thien hue'] },
  { name: 'Đà Nẵng', lat: 16.0544, lng: 108.2022, aliases: ['da nang', 'quảng nam', 'quang nam'] },
  { name: 'Quảng Ngãi', lat: 15.1205, lng: 108.7923, aliases: ['quang ngai', 'kon tum'] },
  { name: 'Gia Lai', lat: 13.7820, lng: 109.2190, aliases: ['gia lai', 'quy nhơn', 'quy nhon', 'bình định', 'binh dinh', 'pleiku'] },
  { name: 'Khánh Hòa', lat: 12.2388, lng: 109.1967, aliases: ['khanh hoa', 'nha trang', 'ninh thuận', 'ninh thuan'] },
  { name: 'Đắk Lắk', lat: 12.6667, lng: 108.0382, aliases: ['dak lak', 'đắk lắk', 'buôn ma thuột', 'buon ma thuot', 'phú yên', 'phu yen'] },
  { name: 'Lâm Đồng', lat: 11.9404, lng: 108.4583, aliases: ['lam dong', 'đà lạt', 'da lat', 'đắk nông', 'dak nong', 'bình thuận', 'binh thuan'] },
  { name: 'Đồng Nai', lat: 10.9574, lng: 106.8426, aliases: ['dong nai', 'bình phước', 'binh phuoc', 'biên hòa', 'bien hoa'] },
  { name: 'TP. Hồ Chí Minh', lat: 10.7769, lng: 106.7009, aliases: ['hcm', 'ho chi minh', 'sài gòn', 'sai gon', 'saigon', 'tphcm', 'bình dương', 'binh duong', 'bà rịa', 'ba ria', 'vũng tàu', 'vung tau'] },
  { name: 'Tây Ninh', lat: 10.5360, lng: 106.4050, aliases: ['tay ninh', 'long an'] },
  { name: 'Đồng Tháp', lat: 10.3590, lng: 106.3600, aliases: ['dong thap', 'tiền giang', 'tien giang', 'cao lãnh', 'cao lanh'] },
  { name: 'Vĩnh Long', lat: 10.2530, lng: 105.9720, aliases: ['vinh long', 'bến tre', 'ben tre', 'trà vinh', 'tra vinh'] },
  { name: 'An Giang', lat: 10.0125, lng: 105.0809, aliases: ['an giang', 'kiên giang', 'kien giang', 'rạch giá', 'rach gia'] },
  { name: 'Cần Thơ', lat: 10.0452, lng: 105.7469, aliases: ['can tho', 'sóc trăng', 'soc trang', 'hậu giang', 'hau giang'] },
  { name: 'Cà Mau', lat: 9.1769, lng: 105.1524, aliases: ['ca mau', 'bạc liêu', 'bac lieu'] },
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
  const exact = PROVINCE_CENTERS.find((p) => normalizeText(p.name) === q || p.aliases.some((alias) => normalizeText(alias) === q));
  if (exact || q.length < 3) return exact;
  return PROVINCE_CENTERS.find((p) => normalizeText(p.name).startsWith(q) || p.aliases.some((alias) => normalizeText(alias).startsWith(q)));
}
