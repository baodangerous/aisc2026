import type { MedicalLearningResource } from '../domain/schemas';

// Public access does not grant redistribution rights. Link to publisher-hosted media until licensed.
const referenceDefaults = {
  learningObjectives: [], mediaType: 'article', thumbnailUrl: '', language: 'en', durationSeconds: 0,
  reviewedAt: '', reviewedBy: '', reviewStatus: 'reference_only',
  evidenceLevel: 'Nguồn tham khảo; chưa thẩm định bản hướng dẫn của ứng dụng.',
  applicableAudience: 'Người học sơ cứu',
  emergencyWarning: 'Khẩn cấp tại Việt Nam: gọi 115. Tài liệu quốc tế có thể sử dụng số 911 hoặc 999.',
  steps: [], avoidActions: [], dangerSigns115: [], quiz: [],
  copyrightStatus: 'Bản quyền thuộc đơn vị phát hành. Chỉ liên kết; không tái phân phối ảnh hoặc video.',
  sourceCheckedAt: '2026-10-15', embeddingAllowed: false, difficultyLevel: 'Cơ bản',
} satisfies Partial<MedicalLearningResource>;

const officialVideoTopics = [
  ['CPR Hands-Only: nhịp ép tim', 'cardiac_arrest', 'American Heart Association', 'https://cpr.heart.org/en/cpr-courses-and-kits/hands-only-cpr', 'Nhận diện ngừng tim, gọi 115 và bắt đầu ép tim liên tục.'],
  ['CPR người lớn: chuỗi hành động', 'cardiac_arrest', 'American Heart Association', 'https://international.heart.org/en/resuscitation/hands-only-cpr', 'Giữ an toàn hiện trường, gọi trợ giúp, ép tim và phối hợp AED.'],
  ['Sử dụng AED từng bước', 'aed_usage', 'American Heart Association', 'https://cpr.heart.org/en/cpr-courses-and-kits', 'Bật AED, dán điện cực đúng vị trí và làm theo lời nhắc của thiết bị.'],
  ['Nhận diện dấu hiệu đột quỵ FAST', 'stroke', 'American Stroke Association', 'https://www.stroke.org/en/about-stroke/stroke-symptoms', 'Nhận diện mặt méo, yếu tay, nói khó và thời điểm khởi phát.'],
  ['Đột quỵ: vì sao cần gọi ngay', 'stroke', 'American Stroke Association', 'https://www.stroke.org/en/about-stroke/stroke-symptoms', 'Ghi lại thời gian khởi phát và không tự cho người bệnh ăn uống.'],
  ['Ép trực tiếp khi chảy máu', 'bleeding', 'American College of Surgeons', 'https://www.stopthebleed.org/training/', 'Dùng tay hoặc gạc ép liên tục lên nguồn chảy máu.'],
  ['Nhồi gạc vết thương sâu', 'bleeding', 'American College of Surgeons', 'https://www.stopthebleed.org/training/', 'Nhồi gạc vào vết thương sâu rồi duy trì lực ép ổn định.'],
  ['Đặt garô đúng cách', 'bleeding', 'American College of Surgeons', 'https://www.stopthebleed.org/training/', 'Đặt garô cao và chặt khi chảy máu chi đe dọa tính mạng.'],
  ['Gọi trợ giúp trong chảy máu nặng', 'emergency_call', 'American College of Surgeons', 'https://www.stopthebleed.org/training/', 'Phân công người gọi 115, lấy bộ cầm máu và theo dõi nạn nhân.'],
  ['Sơ cứu người bất tỉnh', 'general', 'British Red Cross', 'https://www.redcross.org.uk/first-aid/learn-first-aid', 'Kiểm tra đáp ứng, nhịp thở và đặt tư thế an toàn khi phù hợp.'],
  ['Tư thế hồi phục', 'general', 'British Red Cross', 'https://www.redcross.org.uk/first-aid/learn-first-aid', 'Xoay người bệnh sang tư thế hồi phục và liên tục theo dõi thở.'],
  ['Nghẹn đường thở ở người lớn', 'choking', 'British Red Cross', 'https://www.redcross.org.uk/first-aid/learn-first-aid', 'Khuyến khích ho, vỗ lưng và ép bụng theo hướng dẫn sơ cứu.'],
  ['Bỏng nhiệt: làm mát an toàn', 'burns', 'British Red Cross', 'https://www.redcross.org.uk/first-aid/learn-first-aid', 'Làm mát dưới nước sạch mát và không bôi kem lên vùng bỏng.'],
  ['Co giật: bảo vệ người bệnh', 'seizure', 'British Red Cross', 'https://www.redcross.org.uk/first-aid/learn-first-aid', 'Dọn vật nguy hiểm, không ghì giữ và không đặt vật vào miệng.'],
  ['Tai nạn giao thông: an toàn hiện trường', 'traffic_accident', 'British Red Cross', 'https://www.redcross.org.uk/first-aid/learn-first-aid', 'Đảm bảo an toàn giao thông trước khi tiếp cận người bị nạn.'],
  ['Đau tim và dấu hiệu cảnh báo', 'cardiac_arrest', 'British Red Cross', 'https://www.redcross.org.uk/first-aid/learn-first-aid', 'Nhận diện đau ngực, khó thở và gọi cấp cứu sớm.'],
  ['Sơ cứu chấn thương đầu', 'general', 'British Red Cross', 'https://www.redcross.org.uk/first-aid/learn-first-aid', 'Hạn chế di chuyển cổ và theo dõi thay đổi ý thức.'],
  ['Chảy máu cam', 'bleeding', 'British Red Cross', 'https://www.redcross.org.uk/first-aid/learn-first-aid', 'Ngồi thẳng, hơi cúi người và bóp cánh mũi liên tục.'],
  ['Phản ứng dị ứng nặng', 'general', 'British Red Cross', 'https://www.redcross.org.uk/first-aid/learn-first-aid', 'Gọi 115 khi khó thở, sưng nhanh hoặc có dấu hiệu sốc phản vệ.'],
  ['Sơ cứu ngộ độc', 'general', 'British Red Cross', 'https://www.redcross.org.uk/first-aid/learn-first-aid', 'Không tự gây nôn; giữ lại thông tin chất gây độc để báo nhân viên y tế.'],
] as const;

const officialVideoResources: MedicalLearningResource[] = officialVideoTopics.map(([title, topic, organization, sourcePageUrl, summary], index) => ({
  ...referenceDefaults, id: `res_official_video_${index + 1}`, slug: `video-${index + 1}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  title, topic, description: `${summary} Video mở tại nguồn chính thức; không sao chép media.`, mediaType: 'video', sourceOrganization: organization,
  sourcePageUrl, relatedScenarioIds: [], language: 'en', durationSeconds: 0,
}));

export const REFERENCE_LEARNING_RESOURCES: MedicalLearningResource[] = [
  {
    ...referenceDefaults, id: 'res_cpr_adult_aha', slug: 'ky-thuat-ep-tim-cpr-nguoi-lon-aha',
    title: 'Ép tim người lớn', topic: 'cardiac_arrest',
    description: 'Video Hands-Only CPR do American Heart Association phát hành.',
    mediaType: 'video', sourceOrganization: 'American Heart Association',
    sourcePageUrl: 'https://cpr.heart.org/en/cpr-courses-and-kits/hands-only-cpr',
    relatedScenarioIds: ['sc_ohca_01'],
  },
  {
    ...referenceDefaults, id: 'res_cpr_aed_aha_international', slug: 'cpr-va-aed-aha-quoc-te',
    title: 'CPR và AED cho người lớn', topic: 'cardiac_arrest',
    description: 'Video CPR Hands-Only và CPR kết hợp AED từ AHA International. Mở tại nguồn phát hành; không sao chép media.',
    mediaType: 'video', sourceOrganization: 'American Heart Association International',
    sourcePageUrl: 'https://international.heart.org/en/resuscitation/hands-only-cpr',
    relatedScenarioIds: ['sc_ohca_01'], language: 'en', durationSeconds: 60,
  },
  {
    ...referenceDefaults, id: 'res_stroke_fast', slug: 'nhan-dien-som-dot-quy-nao-fast',
    title: 'Dấu hiệu đột quỵ', topic: 'stroke',
    description: 'Nhận diện dấu hiệu B.E. F.A.S.T. tại nguồn gốc.',
    sourceOrganization: 'American Stroke Association',
    sourcePageUrl: 'https://www.stroke.org/en/about-stroke/stroke-symptoms',
    relatedScenarioIds: ['sc_stroke_02'],
  },
  {
    ...referenceDefaults, id: 'res_stop_the_bleed', slug: 'ky-thuat-cam-mau-bang-ep-stop-the-bleed',
    title: 'Kiểm soát chảy máu', topic: 'bleeding',
    description: 'Khóa học, video và tài liệu ACS Stop the Bleed.',
    mediaType: 'video', sourceOrganization: 'American College of Surgeons',
    sourcePageUrl: 'https://www.stopthebleed.org/training/',
    relatedScenarioIds: ['sc_bleeding_03'],
  },
  {
    ...referenceDefaults, id: 'res_stop_the_bleed_videos', slug: 'video-ky-thuat-cam-mau-acs',
    title: 'Video kỹ thuật cầm máu', topic: 'bleeding',
    description: 'Video kỹ thuật ép trực tiếp, nhồi vết thương và garô từ ACS Stop the Bleed.',
    mediaType: 'video', sourceOrganization: 'American College of Surgeons',
    sourcePageUrl: 'https://www.stopthebleed.org/training/',
    relatedScenarioIds: ['sc_bleeding_03'], language: 'en', durationSeconds: 0,
  },
  {
    ...referenceDefaults, id: 'res_first_aid', slug: 'ky-nang-so-cuu-red-cross',
    title: 'Kỹ năng sơ cứu', topic: 'general',
    description: 'Học sơ cứu theo tình huống với British Red Cross.',
    sourceOrganization: 'British Red Cross',
    sourcePageUrl: 'https://www.redcross.org.uk/first-aid/learn-first-aid',
    relatedScenarioIds: ['sc_ohca_01', 'sc_bleeding_03'],
  },
  {
    ...referenceDefaults, id: 'res_red_cross_aed', slug: 'so-cuu-khi-co-aed-red-cross',
    title: 'Sơ cứu khi có AED', topic: 'cardiac_arrest',
    description: 'Hướng dẫn sơ cứu và sử dụng AED tại nguồn British Red Cross.',
    mediaType: 'article', sourceOrganization: 'British Red Cross',
    sourcePageUrl: 'https://www.redcross.org.uk/first-aid/learn-first-aid',
    relatedScenarioIds: ['sc_ohca_01'], language: 'en', durationSeconds: 0,
  },
  ...officialVideoResources,
];

export function getLearningResourceBySlugOrId(identifier: string) {
  return REFERENCE_LEARNING_RESOURCES.find((resource) => resource.id === identifier || resource.slug === identifier);
}

// Retain existing caller names, but never classify publisher links as clinical approval.
export function getApprovedLearningResources(topic?: string) {
  return REFERENCE_LEARNING_RESOURCES.filter((resource) => !topic || topic === 'all' || resource.topic === topic);
}
export function getApprovedResourcesForScenario(scenario: string) {
  return REFERENCE_LEARNING_RESOURCES.filter((resource) => resource.relatedScenarioIds.includes(scenario) || resource.topic === scenario).slice(0, 2);
}
export function searchApprovedResources(keyword: string, topic = 'all') {
  const term = keyword.trim().toLocaleLowerCase('vi');
  return getApprovedLearningResources(topic).filter((resource) =>
    `${resource.title} ${resource.description} ${resource.sourceOrganization}`.toLocaleLowerCase('vi').includes(term));
}
