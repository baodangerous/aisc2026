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
    ...referenceDefaults, id: 'res_first_aid', slug: 'ky-nang-so-cuu-red-cross',
    title: 'Kỹ năng sơ cứu', topic: 'general',
    description: 'Học sơ cứu theo tình huống với British Red Cross.',
    sourceOrganization: 'British Red Cross',
    sourcePageUrl: 'https://www.redcross.org.uk/first-aid/learn-first-aid',
    relatedScenarioIds: ['sc_ohca_01', 'sc_bleeding_03'],
  },
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
