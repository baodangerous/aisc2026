import aedImage from '../../assets/images/aed_defibrillator_access_1792058948229.jpg';
import cprImage from '../../assets/images/cpr_adult_training_1792058946824.jpg';
import bleedImage from '../../assets/images/stop_the_bleed_dressing_1792058947096.jpg';
import strokeImage from '../../assets/images/stroke_fast_assessment_1792058949757.jpg';

export type HealthNewsItem = {
  id: string;
  category: 'Sơ cứu' | 'AED' | 'Cộng đồng' | 'Đột quỵ';
  title: string;
  summary: string;
  body: string[];
  image: string;
  imageAlt: string;
  publishedAt: string;
  readMinutes: number;
};

export const HEALTH_NEWS: HealthNewsItem[] = [
  {
    id: 'news-aed-access',
    category: 'AED',
    title: 'Vì sao vị trí AED cần được biết trước khi có sự cố',
    summary: 'Mỗi phút trì hoãn sốc điện làm giảm đáng kể khả năng sống sót khi ngừng tim. Biết trước điểm AED gần nơi làm việc giúp rút ngắn thời gian tiếp cận.',
    body: [
      'Khi một người ngừng tim đột ngột, ép tim ngay lập tức và sốc điện sớm là hai mắt xích quan trọng nhất của chuỗi sống còn.',
      'Hãy dành vài phút tìm hiểu điểm AED quanh nơi bạn sống, học và làm việc. Kiểm tra lối tiếp cận, giờ mở cửa và người quản lý thiết bị.',
      'Khi đến nơi, luôn kiểm tra đèn trạng thái của máy và làm theo hướng dẫn bằng giọng nói. Không cần chờ người có chuyên môn mới được sử dụng AED.',
    ],
    image: aedImage,
    imageAlt: 'Tủ AED gắn tường tại khu vực công cộng',
    publishedAt: '2026-10-16',
    readMinutes: 3,
  },
  {
    id: 'news-cpr-hands',
    category: 'Sơ cứu',
    title: 'Ép tim chỉ bằng tay: nhịp 100–120 lần mỗi phút',
    summary: 'Người chứng kiến không cần thổi ngạt vẫn có thể giúp duy trì tuần hoàn cho nạn nhân cho đến khi đội cấp cứu đến.',
    body: [
      'Đặt gót bàn tay giữa ngực nạn nhân, hai tay chồng lên nhau, khuỷu tay thẳng.',
      'Ép sâu khoảng 5–6 cm với nhịp 100–120 lần mỗi phút, để lồng ngực nảy lên hoàn toàn sau mỗi lần ép.',
      'Hạn chế gián đoạn. Nếu có người khác, hãy đổi người ép mỗi 2 phút để giữ chất lượng.',
    ],
    image: cprImage,
    imageAlt: 'Học viên thực hành ép tim trên mô hình',
    publishedAt: '2026-10-12',
    readMinutes: 4,
  },
  {
    id: 'news-stroke-fast',
    category: 'Đột quỵ',
    title: 'Nhận biết đột quỵ nhanh với dấu hiệu BE-FAST',
    summary: 'Mất thăng bằng, nhìn mờ, méo mặt, yếu tay chân, nói khó — gọi 115 ngay và ghi lại thời điểm khởi phát.',
    body: [
      'B – Balance: mất thăng bằng đột ngột. E – Eyes: nhìn mờ hoặc mất thị lực.',
      'F – Face: méo một bên mặt. A – Arm: yếu hoặc tê một bên tay. S – Speech: nói khó, nói ngọng.',
      'T – Time: gọi 115 ngay, ghi nhớ thời điểm xuất hiện triệu chứng đầu tiên để báo cho nhân viên y tế.',
    ],
    image: strokeImage,
    imageAlt: 'Người hướng dẫn kiểm tra dấu hiệu đột quỵ trên khuôn mặt',
    publishedAt: '2026-10-08',
    readMinutes: 3,
  },
  {
    id: 'news-bleeding',
    category: 'Cộng đồng',
    title: 'Cầm máu đúng cách trong những phút đầu',
    summary: 'Ấn chặt trực tiếp lên vết thương bằng gạc hoặc vải sạch và giữ liên tục là bước quan trọng nhất trước khi có hỗ trợ y tế.',
    body: [
      'Đảm bảo an toàn cho bản thân trước khi tiếp cận nạn nhân, đeo găng tay nếu có.',
      'Ấn mạnh, liên tục lên vết thương. Không nhấc gạc ra để kiểm tra — đặt thêm gạc lên trên nếu máu thấm qua.',
      'Gọi 115 nếu máu chảy nhiều, phun thành tia hoặc nạn nhân có dấu hiệu choáng.',
    ],
    image: bleedImage,
    imageAlt: 'Thực hành băng ép cầm máu trên cánh tay',
    publishedAt: '2026-10-02',
    readMinutes: 2,
  },
];
