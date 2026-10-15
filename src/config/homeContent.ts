import { Brain, Droplets, HeartPulse, type LucideIcon } from 'lucide-react';

export type HomePhotoStory = {
  image: string;
  alt: string;
  title: string;
  source: string;
  sourceUrl: string;
};

export type HomeExercise = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export const HOME_EXERCISES: HomeExercise[] = [
  { id: 'sc_ohca_01', label: 'Ép tim', icon: HeartPulse },
  { id: 'sc_stroke_02', label: 'Đột quỵ', icon: Brain },
  { id: 'sc_bleeding_03', label: 'Cầm máu', icon: Droplets },
];

export const HOME_PHOTO_STORIES: HomePhotoStory[] = [
  {
    image: '/images/aed-community-installation.png',
    alt: 'Đội ngũ cộng đồng giới thiệu tủ AED tại một không gian công cộng',
    title: 'Một điểm AED bắt đầu từ cộng đồng',
    source: 'Báo Khánh Hòa điện tử, bài đăng ngày 12/10/2026',
    sourceUrl: 'https://baokhanhhoa.vn/xa-hoi/y-te-suc-khoe/202610/lap-dat-may-khu-rung-tim-tu-dong-tai-bao-tang-hai-duong-hoc-2f75342',
  },
  {
    image: '/images/cpr-training-session.png',
    alt: 'Lớp huấn luyện CPR thực hành với mannequin và AED',
    title: 'Học bằng tay, nhớ bằng phản xạ',
    source: 'Báo Khánh Hòa điện tử, bài đăng tháng 09/2026',
    sourceUrl: 'https://baokhanhhoa.vn/xa-hoi/y-te-suc-khoe/202609/trung-tam-cap-cuu-115-tap-huan-ky-nang-hoi-sinh-tim-phoi-va-su-dung-may-khu-rung-tim-tu-dong-cdf28d0',
  },
  {
    image: '/images/aed-public-location.png',
    alt: 'Điểm đặt AED trong khu vực công cộng có nhân sự hỗ trợ',
    title: 'Biết vị trí trước khi cần đến',
    source: 'Báo Khánh Hòa điện tử, bài đăng tháng 09/2026',
    sourceUrl: 'https://baokhanhhoa.vn/xa-hoi/y-te-suc-khoe/202609/trung-tam-cap-cuu-115-tap-huan-ky-nang-hoi-sinh-tim-phoi-va-su-dung-may-khu-rung-tim-tu-dong-cdf28d0',
  },
];

export const HOME_HERO = {
  image: HOME_PHOTO_STORIES[0].image,
  sourceUrl: HOME_PHOTO_STORIES[0].sourceUrl,
  sourceLabel: 'Báo Khánh Hòa điện tử, 12/10/2026',
};

export const CONTENT_SOURCE_POLICY = {
  officialLabel: 'Nguồn chính thống',
  attributionLabel: 'Xem nguồn đầy đủ',
  mediaImportNote: 'Media có thể thay thế sau mà không cần sửa component giao diện.',
};

