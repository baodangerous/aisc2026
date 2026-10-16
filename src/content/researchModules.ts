export type ResearchModule = {
  id: string;
  title: string;
  summary: string;
  action: string;
  href: string;
  source: string;
  sourceUrl: string;
  mode: 'offline' | 'online';
};

// Curated product ideas and links from the requested references. We do not redistribute their code, media, or corpus text.
export const RESEARCH_MODULES: ResearchModule[] = [
  {
    id: 'offline-first-aid',
    title: 'Tủ sơ cứu offline',
    summary: 'Mở các hướng dẫn cốt lõi ngay cả khi mất mạng: CPR, nghẹn, bỏng, chảy máu và co giật.',
    action: 'Mở thư viện',
    href: '/library',
    source: 'iFirstAid — offline first aid',
    sourceUrl: 'https://ifirstaid.com.au/#first-look',
    mode: 'offline',
  },
  {
    id: 'visual-distress-signal',
    title: 'Tín hiệu cầu cứu trực quan',
    summary: 'Nhận diện tín hiệu tay và dấu hiệu nguy cấp để hỗ trợ người gặp nạn khi không thể nói hoặc gọi.',
    action: 'Luyện tín hiệu',
    href: '/training?scenario=general',
    source: 'Call for Code DroneAid',
    sourceUrl: 'https://github.com/Call-for-Code/DroneAid',
    mode: 'online',
  },
  {
    id: 'emotional-first-aid',
    title: 'Sơ cứu tinh thần',
    summary: 'Bài tập lắng nghe, ổn định cảm xúc và chuyển tuyến an toàn; không chẩn đoán hoặc thay thế chuyên gia.',
    action: 'Xem hướng dẫn',
    href: '/library?topic=emotional_first_aid',
    source: 'eFAQA Corpus — tham khảo cấu trúc dữ liệu',
    sourceUrl: 'https://github.com/chatopera/efaqa-corpus-zh',
    mode: 'offline',
  },
];

export const RESEARCH_NOTE = 'GoldenMinutes chỉ dùng các nguồn trên để nghiên cứu ý tưởng và liên kết tham khảo; không sao chép mã nguồn, media hoặc nội dung corpus có bản quyền.';

export function getResearchModule(id: string) {
  return RESEARCH_MODULES.find((module) => module.id === id);
}

export function searchResearchModules(query: string) {
  const term = query.trim().toLocaleLowerCase('vi');
  return RESEARCH_MODULES.filter((module) => `${module.title} ${module.summary} ${module.source}`.toLocaleLowerCase('vi').includes(term));
}

export const EMOTIONAL_FIRST_AID_RESOURCES = [
  {
    id: 'efa-grounding',
    title: 'Ổn định trong 60 giây',
    topic: 'emotional_first_aid',
    description: 'Mời người đang hoảng loạn ngồi ở nơi an toàn, thở chậm và gọi tên 5 điều họ nhìn thấy.',
    steps: ['Đảm bảo người đó không ở trong nguy hiểm thể chất.', 'Nói ngắn, chậm, không phán xét.', 'Hỏi họ muốn gọi ai để hỗ trợ tiếp.'],
  },
  {
    id: 'efa-listening',
    title: 'Lắng nghe không phán xét',
    topic: 'emotional_first_aid',
    description: 'Tập trung vào lắng nghe và xác nhận cảm xúc, không ép kể lại chi tiết hoặc đưa lời khuyên vội vàng.',
    steps: ['Hỏi: “Mình có thể ngồi cùng bạn không?”', 'Phản hồi: “Điều này nghe thật khó khăn.”', 'Nếu có nguy cơ tự hại, gọi 115 hoặc kết nối dịch vụ chuyên môn ngay.'],
  },
] as const;

export const RESEARCH_SOURCE_LINKS = [
  { label: 'DroneAid', url: 'https://github.com/Call-for-Code/DroneAid' },
  { label: 'iFirstAid First Look', url: 'https://ifirstaid.com.au/#first-look' },
  { label: 'eFAQA Corpus', url: 'https://github.com/chatopera/efaqa-corpus-zh' },
] as const;

export default RESEARCH_MODULES;
