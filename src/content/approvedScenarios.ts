import { Scenario, GuidanceStep } from '../domain/schemas';

export const MEDICAL_DISCLAIMER_VI =
  'TÀI LIỆU THAM KHẢO HUẤN LUYỆN — Nội dung mô phỏng phản xạ cấp cứu ban đầu mang tính giáo dục cộng đồng. Trong tình huống khẩn cấp ngoài đời thực, HÃY GỌI 115 NGAY LẬP TỨC. Ứng dụng không thay thế nhân viên y tế chuyên nghiệp và không điều phối cấp cứu trực tiếp.';

export const APPROVED_SCENARIOS: Scenario[] = [
  {
    id: 'sc_ohca_01',
    code: 'OHCA',
    title: 'Nghi ngờ ngừng tuần hoàn ngoài bệnh viện (OHCA)',
    description: 'Nạn nhân bất tỉnh đột ngột, không phản ứng, không thở hoặc thở ngáp cá. Cần kích hoạt 115 và ép tim liên tục 110 bpm ngay lập tức.',
    category: 'cardiac_arrest',
    activeVersionId: 'ver_ohca_1_0',
    createdAt: '2026-08-20T00:00:00Z',
    updatedAt: '2026-08-23T00:00:00Z',
    versions: [
      {
        versionId: 'ver_ohca_1_0',
        scenarioId: 'sc_ohca_01',
        versionNumber: 1,
        status: 'reference_only',
        title: 'Quy trình phản xạ ngừng tuần hoàn ngoại viện (AHA CPR 2025 / IFRC 2025)',
        subtitle: 'Chuỗi sống còn: An toàn → Phản ứng → Thở → Gọi 115 → Ép tim 110 bpm',
        targetCategory: 'cardiac_arrest',
        initialAssessment: 'Bạn bắt gặp một người đàn ông khoảng 50 tuổi ngã gục trên vỉa hè, bất động.',
        thresholds: {
          timeToGuidanceSec: 15,
          timeToCallSec: 45,
          timeToActionSec: 60,
          mroThresholdSec: 25,
        },
        citations: [
          'American Heart Association (AHA) CPR & ECC 2020 / 2025 Interim Guidelines',
          'Tài liệu Sơ cấp cứu ban đầu chuẩn hóa — Hội Chữ thập đỏ Việt Nam & IFRC 2025',
          'Định hướng mô hình trang bị AED công cộng cộng đồng',
        ],
        medicalDisclaimer: MEDICAL_DISCLAIMER_VI,
        reviewedBy: 'Tài liệu tham khảo đối chiếu theo khuyến cáo AHA CPR & Hội Chữ Thập Đỏ',
        reviewedAt: '2026-08-21T10:00:00Z',
        changeNotes: 'Bản tham khảo chuẩn hóa tích hợp bộ đếm nhịp CPR 110 bpm.',
        createdAt: '2026-08-20T00:00:00Z',
        questions: [
          {
            id: 'q_safety',
            prompt: 'Bước 1: Quan sát hiện trường xung quanh có nguy cơ điện giật, cháy nổ, giao thông nguy hiểm không?',
            choices: [
              {
                id: 'c_safe',
                label: 'Hiện trường an toàn, có thể tiếp cận ngay',
                isRecommended: true,
                explanation: 'Đúng. Luôn đảm bảo an toàn cho bản thân trước khi tiến lại gần nạn nhân.',
              },
              {
                id: 'c_unsafe',
                label: 'Có dây điện hở rơi gần đó, vẫn lao vào kéo người',
                isRecommended: false,
                explanation: 'Nguy hiểm! Phải ngắt nguồn điện hoặc giữ khoảng cách an toàn trước khi cấp cứu.',
              },
            ],
          },
          {
            id: 'q_response',
            prompt: 'Bước 2: Vỗ mạnh hai vai và gọi lớn: "Anh/Chị có nghe tôi nói không?". Nạn nhân nằm yên, mắt nhắm nghiền.',
            choices: [
              {
                id: 'c_unresponsive',
                label: 'Xác định nạn nhân không phản ứng (bất tỉnh)',
                isRecommended: true,
                explanation: 'Chính xác. Nạn nhân không có đáp ứng vận động hoặc lời nói.',
              },
              {
                id: 'c_shake_head',
                label: 'Nâng bổng đầu lắc mạnh liên tục để đánh thức',
                isRecommended: false,
                explanation: 'Không nên lắc mạnh vì có thể gây tổn thương cột sống cổ nếu có chấn thương kèm theo.',
              },
            ],
          },
          {
            id: 'q_breathing',
            prompt: 'Bước 3: Ngửa đầu nâng cằm, ghé sát tai quan sát lồng ngực trong 5-10 giây. Nạn nhân không thở hoặc thở ngáp ngắt quãng.',
            choices: [
              {
                id: 'c_abnormal_breath',
                label: 'Không thở bình thường → Nghi ngờ ngừng tim ngay lập tức',
                isRecommended: true,
                explanation: 'AHA 2020 khuyến nghị: Thở ngáp cá được coi là KHÔNG thở bình thường. Cần ép tim ngay!',
              },
              {
                id: 'c_wait_breath',
                label: 'Chờ thêm 3 phút để xem nạn nhân có tự thở lại không',
                isRecommended: false,
                explanation: 'Sai lầm nghiêm trọng! Mỗi phút chậm trễ làm giảm 7-10% cơ hội sống sót.',
              },
            ],
          },
        ],
        guidanceSteps: [
          {
            stepNumber: 1,
            title: 'Kích hoạt cuộc gọi 115 & Tìm máy AED',
            instruction: 'Chỉ định rõ một người xung quanh: "Anh áo xanh hãy gọi ngay 115 và tìm máy khử rung tim AED gần nhất!". Bật loa ngoài.',
            alertText: 'HÃY GỌI 115 NGAY LẬP TỨC',
            visualCue: 'call_115',
            vitalAction: true,
          },
          {
            stepNumber: 2,
            title: 'Đặt tư thế ép tim chuẩn',
            instruction: 'Đặt gót một bàn tay vào chính giữa nửa dưới xương ức nạn nhân. Đặt bàn tay thứ hai lên trên, đan các ngón tay lại. Cánh tay thẳng đứng vuông góc 90 độ với lồng ngực.',
            visualCue: 'chest_compression',
            vitalAction: true,
          },
          {
            stepNumber: 3,
            title: 'Bắt đầu ép tim liên tục 110 nhịp/phút',
            instruction: 'Ép sâu 5-6 cm với người lớn. Thả ngực nở hoàn toàn sau mỗi lần ép. Không ngắt quãng ép tim quá 10 giây.',
            visualCue: 'chest_compression',
            metronomeBpm: 110,
            durationSeconds: 120,
            vitalAction: true,
          },
          {
            stepNumber: 4,
            title: 'Mở máy AED ngay khi có (Khử rung tim)',
            instruction: 'Bật nguồn máy AED và nghe hướng dẫn bằng giọng nói: Dán miếng điện cực lên ngực trần nạn nhân. Không chạm vào người khi máy đang phân tích nhịp.',
            visualCue: 'chest_compression',
            vitalAction: false,
          },
        ],
      },
    ],
  },
  {
    id: 'sc_stroke_02',
    code: 'FAST_STROKE',
    title: 'Nhận diện sớm dấu hiệu đột quỵ cấp (FAST)',
    description: 'Nạn nhân bị méo miệng, yếu liệt một bên tay chân, nói đớ hoặc không nói được. Cần ghi nhớ giờ khởi phát và đưa đến bệnh viện có đơn vị đột quỵ cấp.',
    category: 'stroke',
    activeVersionId: 'ver_stroke_1_0',
    createdAt: '2026-08-20T00:00:00Z',
    updatedAt: '2026-08-23T00:00:00Z',
    versions: [
      {
        versionId: 'ver_stroke_1_0',
        scenarioId: 'sc_stroke_02',
        versionNumber: 1,
        status: 'reference_only',
        title: 'Thang điểm FAST nhận diện đột quỵ não cấp tính (AHA/ASA 2025)',
        subtitle: 'F - Face (Mặt), A - Arm (Tay), S - Speech (Lời nói), T - Time (Thời gian vàng)',
        targetCategory: 'stroke',
        initialAssessment: 'Bác Nam (62 tuổi) đang ngồi ăn cơm bỗng nhiên rơi đũa, miệng méo xệch sang một bên.',
        thresholds: {
          timeToGuidanceSec: 15,
          timeToCallSec: 40,
          timeToActionSec: 60,
          mroThresholdSec: 20,
        },
        citations: [
          'Hội Đột quỵ Việt Nam (VSA) — Hướng dẫn xử trí đột quỵ thiếu máu não cục bộ cấp',
          'AHA/ASA Guidelines for the Early Management of Patients With Acute Ischemic Stroke 2025',
          'Khuyến cáo Sơ cứu cộng đồng — CDC & IFRC',
        ],
        medicalDisclaimer: MEDICAL_DISCLAIMER_VI,
        reviewedBy: 'Tài liệu tham khảo chuẩn hóa theo Thang điểm FAST — Hội Đột quỵ & CDC',
        reviewedAt: '2026-08-21T14:00:00Z',
        changeNotes: 'Bản tham khảo chuẩn hóa hướng dẫn FAST và cảnh báo không châm cứu/uống thuốc lạ.',
        createdAt: '2026-08-20T00:00:00Z',
        questions: [
          {
            id: 'q_face',
            prompt: 'Bước F (Face): Yêu cầu người bệnh cười hoặc nhe răng. Bạn quan sát thấy:',
            choices: [
              {
                id: 'c_face_droop',
                label: 'Một bên miệng bị xệ, nụ cười lệch hẳn sang một bên',
                isRecommended: true,
                explanation: 'Dấu hiệu liệt dây thần kinh mặt (dấu hiệu FAST kinh điển).',
              },
              {
                id: 'c_face_normal',
                label: 'Khuôn mặt cân đối, không biến đổi',
                isRecommended: false,
                explanation: 'Ghi nhận mặt bình thường, tiếp tục kiểm tra vận động tay và lời nói.',
              },
            ],
          },
          {
            id: 'q_arm',
            prompt: 'Bước A (Arm): Bảo người bệnh nhắm mắt và giơ thẳng 2 tay ra phía trước 10 giây:',
            choices: [
              {
                id: 'c_arm_weak',
                label: 'Một tay bị rơi từ từ xuống hoặc không nhấc lên được',
                isRecommended: true,
                explanation: 'Dấu hiệu liệt nửa người hoặc giảm trương lực cơ do đột quỵ.',
              },
              {
                id: 'c_arm_strong',
                label: 'Cả hai tay giữ vững song song',
                isRecommended: false,
                explanation: 'Tay bình thường, kiểm tra bước tiếp theo.',
              },
            ],
          },
          {
            id: 'q_speech',
            prompt: 'Bước S (Speech): Yêu cầu lặp lại câu đơn giản: "Hôm nay trời rất đẹp":',
            choices: [
              {
                id: 'c_speech_slur',
                label: 'Nói ngọng, ú ớ, câu từ lộn xộn hoặc không phát âm được',
                isRecommended: true,
                explanation: 'Rối loạn ngôn ngữ do tổn thương vùng Broca hoặc Wernicke ở não.',
              },
              {
                id: 'c_speech_clear',
                label: 'Phát âm rõ ràng, chuẩn xác',
                isRecommended: false,
                explanation: 'Ngôn ngữ bình thường.',
              },
            ],
          },
        ],
        guidanceSteps: [
          {
            stepNumber: 1,
            title: 'Bước T (Time) — Gọi 115 và ghi nhớ giờ khởi phát',
            instruction: 'Gọi ngay 115. Báo rõ với tổng đài: "Nghi ngờ đột quỵ, có dấu hiệu FAST khởi phát lúc ... giờ". Thời gian vàng can thiệp tiêu sợi huyết là 3 - 4.5 giờ đầu.',
            alertText: 'THỜI GIAN LÀ NÃO — GỌI 115 NGAY',
            visualCue: 'call_115',
            vitalAction: true,
          },
          {
            stepNumber: 2,
            title: 'Đặt người bệnh nằm nghiêng an toàn (Tư thế hồi phục)',
            instruction: 'Cho người bệnh nằm nghiêng một bên, đầu hơi nâng cao 30 độ. Nới lỏng cổ áo, thắt lưng để đường thở thông thoáng và chống sặc nếu nôn trớ.',
            visualCue: 'recovery_position',
            vitalAction: true,
          },
          {
            stepNumber: 3,
            title: 'TUYỆT ĐỐI KHÔNG làm những điều sau',
            instruction: 'KHÔNG chích nặn máu đầu ngón tay/dái tai. KHÔNG cho uống thuốc hạ huyết áp, KHÔNG cho uống An Cung hay nước đường vì có thể gây sặc ngạt thở tử vong.',
            alertText: 'CẢNH BÁO NGUY HIỂM: KHÔNG TỰ Ý CHO UỐNG THUỐC',
            visualCue: 'fast_face',
            vitalAction: false,
          },
        ],
      },
    ],
  },
  {
    id: 'sc_bleeding_03',
    code: 'SEVERE_BLEEDING',
    title: 'Xử trí vết thương chảy máu nghiêm trọng / Ép cầm máu',
    description: 'Máu chảy phun thành tia hoặc ồ ạt không cầm từ vết thương chi hoặc cổ. Cần ép trực tiếp và băng ép khẩn cấp để chống sốc mất máu.',
    category: 'severe_bleeding',
    activeVersionId: 'ver_bleeding_1_0',
    createdAt: '2026-08-20T00:00:00Z',
    updatedAt: '2026-08-23T00:00:00Z',
    versions: [
      {
        versionId: 'ver_bleeding_1_0',
        scenarioId: 'sc_bleeding_03',
        versionNumber: 1,
        status: 'reference_only',
        title: 'Quy trình kiểm soát chảy máu ngoài bệnh viện (Stop the Bleed & IFRC 2025)',
        subtitle: 'Đè ép trực tiếp → Băng ép chèn gạc → Garô nếu tổn thương mạch máu lớn chi',
        targetCategory: 'severe_bleeding',
        initialAssessment: 'Nạn nhân tai nạn giao thông bị rách sâu ở cẳng chân, máu đỏ tươi phun mạnh thành tia.',
        thresholds: {
          timeToGuidanceSec: 15,
          timeToCallSec: 40,
          timeToActionSec: 50,
          mroThresholdSec: 20,
        },
        citations: [
          'American College of Surgeons (ACS) — Stop the Bleed Guidelines',
          'Hướng dẫn Sơ cấp cứu Chấn thương ban đầu — Hội Chữ thập đỏ & IFRC 2025',
        ],
        medicalDisclaimer: MEDICAL_DISCLAIMER_VI,
        reviewedBy: 'Tài liệu tham khảo chuẩn hóa theo Chương trình Stop The Bleed & IFRC',
        reviewedAt: '2026-08-22T09:00:00Z',
        changeNotes: 'Bản tham khảo kỹ thuật ép trực tiếp và hướng dẫn đặt garô cứu sinh.',
        createdAt: '2026-08-20T00:00:00Z',
        questions: [
          {
            id: 'q_bleeding_type',
            prompt: 'Bước 1: Quan sát tính chất dòng máu chảy ra từ miệng vết thương:',
            choices: [
              {
                id: 'c_arterial',
                label: 'Máu đỏ tươi phun thành tia liên tục hoặc đùn ồ ạt nhanh',
                isRecommended: true,
                explanation: 'Tổn thương động mạch nghiêm trọng — có thể tử vong do sốc mất máu trong vài phút.',
              },
              {
                id: 'c_oozing',
                label: 'Máu rỉ nhẹ bề mặt da vết xước nhỏ',
                isRecommended: false,
                explanation: 'Chảy máu mao mạch thông thường, chỉ cần sát khuẩn và dán băng.',
              },
            ],
          },
          {
            id: 'q_wound_location',
            prompt: 'Bước 2: Vết thương nằm ở vị trí nào trên cơ thể?',
            choices: [
              {
                id: 'c_limb',
                label: 'Ở tay hoặc chân (chi thể)',
                isRecommended: true,
                explanation: 'Vị trí chi thể có thể áp dụng ép trực tiếp hoặc đặt garô phía trên vết thương 5cm.',
              },
              {
                id: 'c_torso',
                label: 'Ở ngực hoặc bụng',
                isRecommended: false,
                explanation: 'Vết thương thân mình không thể đặt garô — phải nhét gạc chèn chặt và ép đè tay liên tục.',
              },
            ],
          },
        ],
        guidanceSteps: [
          {
            stepNumber: 1,
            title: 'Dùng vải sạch/gạc đè ép trực tiếp lên vết thương',
            instruction: 'Dùng hai bàn tay dồn toàn bộ trọng lượng cơ thể đè chặt lên miệng vết thương không buông. Giữ liên tục tối thiểu 5 - 10 phút.',
            alertText: 'ÉP ĐÈ MẠNH TRỰC TIẾP — KHÔNG BUÔNG TAY',
            visualCue: 'pressure_wound',
            vitalAction: true,
          },
          {
            stepNumber: 2,
            title: 'Gọi 115 & Nhờ người xung quanh tìm băng garô',
            instruction: 'Bật loa ngoài gọi 115, thông báo tình trạng: "Vết thương hở chảy máu động mạch chi, đang ép cầm máu".',
            alertText: 'GỌI 115 NGAY',
            visualCue: 'call_115',
            vitalAction: true,
          },
          {
            stepNumber: 3,
            title: 'Băng ép chặt hoặc Đặt Garô nếu máu vẫn phun',
            instruction: 'Nếu là vết thương chi và máu vẫn phun ồ ạt: Đặt garô phía trên vết thương 5 - 7 cm (về phía tim). Siết chặt cho đến khi máu ngừng chảy hoàn toàn. Ghi rõ giờ đặt garô.',
            alertText: 'GHI RÕ GIỜ ĐẶT GARÔ TRÊN TRÁN/TAY NẠN NHÂN',
            visualCue: 'pressure_wound',
            vitalAction: true,
          },
          {
            stepNumber: 4,
            title: 'Giữ ấm và chống sốc',
            instruction: 'Đắp chăn hoặc áo khoác giữ ấm cho nạn nhân. Nâng cao chân khoảng 20-30 cm nếu không có chấn thương gãy xương chi dưới.',
            visualCue: 'recovery_position',
            vitalAction: false,
          },
        ],
      },
    ],
  },
];

// Quick reference offline guides for the Citizen Library
export interface OfflineFirstAidArticle {
  id: string;
  category: string;
  title: string;
  summary: string;
  vitalSteps: string[];
  doNotList: string[];
  tag: string;
}

export const OFFLINE_LIBRARY_ARTICLES: OfflineFirstAidArticle[] = [
  {
    id: 'art_cpr',
    category: 'Ngừng tim',
    title: 'Hồi sinh tim phổi (CPR) cơ bản cho người không chuyên',
    summary: 'Quy trình ép tim liên tục cứu sống người ngừng tuần hoàn ngoại viện theo chuẩn AHA 2020.',
    vitalSteps: [
      '1. Kiểm tra an toàn hiện trường xung quanh.',
      '2. Vỗ vai kiểm tra phản ứng: Bất tỉnh không đáp ứng.',
      '3. Quan sát lồng ngực: Không thở hoặc thở ngáp cá.',
      '4. Gọi 115 bật loa ngoài và nhờ tìm máy AED gần nhất.',
      '5. Ép tim liên tục chính giữa ngực: 100 - 120 nhịp/phút, sâu 5 - 6 cm.',
      '6. Dán máy AED ngay khi có và làm theo hướng dẫn phát ra từ máy.',
    ],
    doNotList: [
      'KHÔNG ngắt quãng ép tim quá 10 giây.',
      'KHÔNG ép quá nông (dưới 5 cm) hoặc ép quá chậm.',
      'KHÔNG bỏ qua cuộc gọi 115.',
    ],
    tag: 'AHA 2020 • Cốt lõi',
  },
  {
    id: 'art_stroke',
    category: 'Đột quỵ não',
    title: 'Nhận diện và xử trí đột quỵ trong thời gian vàng',
    summary: 'Nhớ nhanh quy tắc FAST để cứu sống tế bào não trong 3 - 4.5 giờ đầu.',
    vitalSteps: [
      'F (Face): Mặt méo, nụ cười lệch.',
      'A (Arm): Tay yếu, rơi tự do khi giơ cao.',
      'S (Speech): Nói đớ, ngọng, không nói được.',
      'T (Time): GỌI 115 NGAY và ghi nhớ chính xác giờ xuất hiện triệu chứng.',
      'Đặt nạn nhân nằm nghiêng an toàn, nới lỏng quần áo.',
    ],
    doNotList: [
      'TUYỆT ĐỐI KHÔNG chích máu đầu ngón tay hay dái tai.',
      'TUYỆT ĐỐI KHÔNG cho uống bất kỳ loại thuốc nào (kể cả An Cung hay hạ áp).',
      'KHÔNG cho ăn uống gì vì nguy cơ sặc vào phổi.',
    ],
    tag: 'Hội Đột quỵ VN',
  },
  {
    id: 'art_choking',
    category: 'Dị vật đường thở',
    title: 'Thủ thuật Heimlich cấp cứu nghẹn dị vật đường thở',
    summary: 'Xử trí khi nạn nhân ôm cổ, nghẹt thở, tím tái không thể ho hoặc phát âm.',
    vitalSteps: [
      '1. Hỏi: "Bạn có bị nghẹn không?" Nếu nạn nhân chỉ gật đầu không nói được → Cần can thiệp ngay.',
      '2. Đứng sau lưng nạn nhân, vòng hai tay ôm quanh eo.',
      '3. Một tay nắm đấm đặt trên rốn, dưới mũi ức. Tay kia bọc lấy nắm đấm.',
      '4. Giật mạnh vào trong và hướng lên trên dứt khoát 5 lần liên tiếp cho đến khi dị vật bật ra.',
      '5. Nếu nạn nhân bất tỉnh: Đặt nằm xuống và tiến hành CPR ép tim.',
    ],
    doNotList: [
      'KHÔNG dùng tay móc mò dị vật trong họng nếu không nhìn thấy rõ vì có thể đẩy dị vật vào sâu hơn.',
      'KHÔNG cho uống nước khi đang nghẹn.',
    ],
    tag: 'Cấp cứu đường thở',
  },
  {
    id: 'art_bleeding',
    category: 'Chảy máu',
    title: 'Kiểm soát chảy máu nghiêm trọng và băng ép khẩn cấp',
    summary: 'Kỹ thuật Stop the Bleed ngăn ngừa sốc mất máu cấp cứu ngoại viện.',
    vitalSteps: [
      '1. Dùng gạc hoặc vải sạch đè ép trực tiếp lên miệng vết thương bằng cả hai tay.',
      '2. Duy trì lực ép mạnh liên tục, không nhấc tay lên kiểm tra trong 5 - 10 phút.',
      '3. Băng ép chèn chặt. Nếu ở chi thể và máu tiếp tục phun: Đặt garô phía trên vết thương 5 - 7 cm.',
      '4. Gọi 115 và ghi rõ thời điểm đặt garô.',
    ],
    doNotList: [
      'KHÔNG đắp các loại lá cây, tro bếp, bột cà phê lên vết thương hở.',
      'KHÔNG nới lỏng garô khi chưa có nhân viên y tế tiếp nhận.',
    ],
    tag: 'Stop the Bleed',
  },
  {
    id: 'art_drowning',
    category: 'Đuối nước',
    title: 'Sơ cứu đuối nước an toàn và đúng cách',
    summary: 'Trình tự cấp cứu nạn nhân đuối nước đưa lên bờ, phòng chống ngạt thở.',
    vitalSteps: [
      '1. Quăng phao/dây cứu nạn nhân từ xa, không nhảy xuống nước nếu không biết bơi cứu hộ.',
      '2. Đưa nạn nhân lên bờ nơi khô ráo, thoáng khí.',
      '3. Kiểm tra phản ứng và nhịp thở: Nếu bất tỉnh không thở, tiến hành ép tim CPR ngay lập tức kết hợp 2 lần thổi ngạt sau mỗi 30 lần ép.',
      '4. Gọi 115 hỗ trợ y tế.',
    ],
    doNotList: [
      'TUYỆT ĐỐI KHÔNG dốc ngược nạn nhân chạy vòng tròn để "xốc nước" vì làm mất thời gian vàng ép tim và tăng nguy cơ trào ngược dịch vào phổi.',
      'KHÔNG hơ lửa sưởi ấm.',
    ],
    tag: 'Sơ cứu tai nạn',
  },
];
