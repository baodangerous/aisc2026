export const POST_CATEGORIES = [
  { value: 'general', label: 'Chia sẻ chung' },
  { value: 'training', label: 'Luyện tập' },
  { value: 'community', label: 'Cộng đồng' },
  { value: 'question', label: 'Câu hỏi' },
] as const;

export const ALERT_KINDS = [
  { value: 'cardiac_arrest', label: 'Ngừng tim' },
  { value: 'stroke', label: 'Đột quỵ' },
  { value: 'bleeding', label: 'Chảy máu nặng' },
  { value: 'accident', label: 'Tai nạn' },
  { value: 'other', label: 'Khác' },
] as const;

export const ALERT_RADII = [
  { value: '500', label: '500 mét' },
  { value: '1000', label: '1 km' },
  { value: '3000', label: '3 km' },
  { value: '5000', label: '5 km' },
] as const;

export const COMMUNITY_COPY = {
  title: 'Cộng đồng hỗ trợ nhau',
  description: 'Chia sẻ kinh nghiệm sơ cứu và thông báo tình huống khẩn cấp trong khu vực. Đây không phải kênh điều phối cấp cứu.',
  emergencyNotice: 'Gọi 115 trước. Ứng dụng chỉ chia sẻ cảnh báo với người dùng đã đăng nhập và không thay thế tổng đài.',
} as const;

export type PostCategory = typeof POST_CATEGORIES[number]['value'];
export type AlertKind = typeof ALERT_KINDS[number]['value'];

export type CommunityPost = {
  id: string;
  title: string;
  body: string;
  category: string;
  created_at: string;
};

export type CommunityAlert = {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  radius_m: number;
  latitude: number;
  longitude: number;
  created_at: string;
};

export function distanceInMeters(from: GeolocationCoordinates, latitude: number, longitude: number) {
  const earthRadius = 6371000;
  const lat1 = from.latitude * Math.PI / 180;
  const lat2 = latitude * Math.PI / 180;
  const deltaLat = (latitude - from.latitude) * Math.PI / 180;
  const deltaLon = (longitude - from.longitude) * Math.PI / 180;
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const COMMUNITY_TABLES = {
  posts: 'forum_posts',
  alerts: 'community_alerts',
  responses: 'community_alert_responses',
} as const;
