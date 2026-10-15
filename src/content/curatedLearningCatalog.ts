import { MedicalLearningResource, LearningResourceTopic } from '../domain/schemas';

/**
 * =========================================================================
 * GOLDENMINUTES CURATED MEDICAL LEARNING CATALOG (SEED & VERIFIED REPOSITORY)
 * =========================================================================
 * NGUYÊN TẮC BẢO MẬT & KIỂM DUYỆT Y KHOA:
 * 1. Không sử dụng hình ảnh / video do AI tự tạo cho kỹ thuật sơ cấp cứu.
 * 2. Mọi tài nguyên phải có tổ chức phát hành, URL nguồn gốc, ngày rà soát.
 * 3. Chỉ hiển thị nội dung có reviewStatus = 'approved' và (embeddingAllowed = true hoặc sourcePageUrl hợp lệ).
 * 4. Gemini AI không được tự ý sửa đổi catalog hay tự tạo URL YouTube không kiểm chứng.
 */

export const APPROVED_LEARNING_RESOURCES: MedicalLearningResource[] = [
  {
    id: 'res_scene_safety',
    slug: 'an-toan-hien-truong-drabc',
    title: 'Nguyên Tắc Đánh Giá An Toàn Hiện Trường (DRABC)',
    topic: 'scene_safety',
    description: 'Quy trình tiếp cận và đánh giá hiện trường có người bị nạn theo thứ tự chuẩn quốc tế: Danger (Nguy hiểm) → Response (Phản ứng) → Airway (Đường thở) → Breathing (Hô hấp) → Circulation (Tuần hoàn).',
    learningObjectives: [
      'Nhận biết các mối nguy hiểm tiềm ẩn (điện giật, khí độc, cháy nổ, giao thông) trước khi bước vào hiện trường.',
      'Ghi nhớ nguyên tắc: Người cứu hộ bị thương sẽ làm tăng số nạn nhân và gây tắc nghẽn cứu hộ.',
      'Nắm vững 5 chữ cái vàng DRABC để phản xạ có hệ thống.',
    ],
    mediaType: 'video',
    sourceOrganization: 'IFRC & Hội Chữ Thập Đỏ Việt Nam',
    sourcePageUrl: 'https://www.ifrc.org/document/ifrc-international-first-aid-resuscitation-and-education-guidelines-2025',
    youtubeVideoId: 'ea1RJUOiNfQ',
    embedUrl: 'https://www.youtube-nocookie.com/embed/ea1RJUOiNfQ?rel=0&modestbranding=1',
    thumbnailUrl: 'https://i.ytimg.com/vi/ea1RJUOiNfQ/hqdefault.jpg',
    videoChannel: 'St John Ambulance',
    language: 'vi',
    durationSeconds: 240,
    publishedAt: '2025-01-15',
    reviewedAt: '2026-08-22',
    reviewedBy: 'Tài liệu chuẩn hóa theo Hướng dẫn Sơ cấp cứu Quốc tế — IFRC & Hội Chữ Thập Đỏ VN',
    reviewStatus: 'approved',
    evidenceLevel: 'Level A (IFRC Guidelines 2025)',
    applicableAudience: 'Toàn thể công dân, tình nguyện viên sơ cấp cứu cộng đồng',
    emergencyWarning: 'Tuyệt đối KHÔNG lao vào hiện trường khi còn dây điện cao thế chạm đất, nguy cơ nổ bình gas hoặc khí độc trong không gian kín.',
    steps: [
      {
        stepNumber: 1,
        title: 'D - Danger (Quan sát nguy hiểm)',
        detail: 'Dừng lại 3–5 giây quan sát từ xa toàn cảnh xung quanh: điện, lửa, xe cộ, tường nứt, khí gas. Đảm bảo an toàn cho chính bạn trước tiên.',
        keyPoint: 'Người cứu hộ an toàn thì nạn nhân mới có cơ hội sống sót.',
      },
      {
        stepNumber: 2,
        title: 'R - Response (Kiểm tra phản ứng)',
        detail: 'Tiến lại gần an toàn, vỗ nhẹ 2 bên vai nạn nhân và gọi to: "Anh/chị ơi có nghe tôi nói không?".',
        keyPoint: 'Không lắc mạnh đầu hay cổ nạn nhân.',
      },
      {
        stepNumber: 3,
        title: 'A - Airway (Khai thông đường thở)',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Head_tilt-chin_lift_%28more_contrast%29.jpg/500px-Head_tilt-chin_lift_%28more_contrast%29.jpg',
        imageAlt: 'Ngửa đầu, nâng cằm để mở đường thở',
        imageCredit: 'Scriptir / Rama · CC BY-SA 3.0 · Wikimedia Commons',
        imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Head_tilt-chin_lift_(more_contrast).jpg',
        detail: 'Đặt nạn nhân nằm ngửa trên mặt phẳng cứng. Thực hiện thao tác ngửa đầu, nâng cằm nhẹ nhàng để lưỡi không chèn đường thở.',
        keyPoint: 'Nếu nghi ngờ chấn thương cột sống cổ, dùng nghiệm pháp ấn giữ góc hàm thay vì ngửa đầu.',
      },
      {
        stepNumber: 4,
        title: 'B - Breathing (Kiểm tra nhịp thở)',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Checking_respiration2_-_high_contrast_%28new%29.jpg/500px-Checking_respiration2_-_high_contrast_%28new%29.jpg',
        imageAlt: 'Nhìn, nghe, cảm nhận hơi thở trong 10 giây',
        imageCredit: 'Scriptir · CC BY-SA 3.0 · Wikimedia Commons',
        imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Checking_respiration2_-_high_contrast_(new).jpg',
        detail: 'Ghé sát tai vào mũi nạn nhân, mắt nhìn lồng ngực trong 5–10 giây. Lắng nghe tiếng thở và quan sát ngực phập phồng.',
        keyPoint: 'Thở ngáp cá (gasping) được coi là KHÔNG thở bình thường.',
      },
      {
        stepNumber: 5,
        title: 'C - Circulation / Call 115 (Kích hoạt 115 & Ép tim)',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/CPR_Adult_Chest_Compression.png/500px-CPR_Adult_Chest_Compression.png',
        imageAlt: 'Ép tim ở giữa ngực',
        imageCredit: 'BruceBlaus · CC BY-SA 4.0 · Wikimedia Commons',
        imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:CPR_Adult_Chest_Compression.png',
        detail: 'Nếu nạn nhân bất tỉnh và không thở bình thường: Chỉ định người gọi 115 và bắt đầu ép tim liên tục ngay lập tức.',
        keyPoint: 'Gọi 115 song song trong khi chuẩn bị thao tác ép tim.',
      },
    ],
    avoidActions: [
      'Lao vào vùng có nguy cơ sập, cháy hoặc điện giật chưa được cắt nguồn.',
      'Tập trung đông người vây kín che mất dưỡng khí của nạn nhân.',
      'Di chuyển hoặc kéo lê người bị nạn khi không có nguy hiểm chết người trực tiếp tại hiện trường.',
    ],
    dangerSigns115: [
      'Hiện trường có nguy cơ sập đổ, rò rỉ hóa chất hoặc cháy nổ lớn.',
      'Nạn nhân bất tỉnh hoàn toàn, không có phản xạ khi kích thích đau.',
      'Nhiều người bị thương cùng lúc (tai nạn thảm họa / giao thông liên hoàn).',
    ],
    quiz: [
      {
        question: 'Nguyên tắc ưu tiên số 1 khi tiếp cận hiện trường cấp cứu là gì?',
        options: [
          'Lao vào bế nạn nhân ra xe ngay lập tức',
          'Đảm bảo an toàn cho chính bản thân người cứu hộ trước',
          'Tìm túi xách lấy thuốc của nạn nhân cho uống',
          'Gọi điện livestream xin ý kiến cộng đồng',
        ],
        correctIndex: 1,
        explanation: 'Người cứu hộ bị thương sẽ làm trầm trọng thêm tình hình và tước đi cơ hội được cấp cứu của nạn nhân.',
      },
    ],
    relatedScenarioIds: ['sc_ohca_01', 'sc_bleeding_03'],
    copyrightStatus: 'Public Educational Access — IFRC & Red Cross Guidelines',
    embeddingAllowed: true,
    difficultyLevel: 'Cơ bản',
  },
  {
    id: 'res_emergency_call_115',
    slug: 'goi-tong-dai-cap-cuu-115-chuan-xac',
    title: 'Quy Chuẩn Cung Cấp Thông Tin Cấp Cứu Tổng Đài 115',
    topic: 'emergency_call',
    description: 'Kỹ năng giao tiếp và truyền đạt thông tin sống còn khi gọi Trung tâm Cấp cứu 115 để xe cứu thương và kíp y bác sĩ xuất phát nhanh nhất.',
    learningObjectives: [
      'Ghi nhớ cấu trúc 4 thông tin tối quan trọng cần cung cấp cho tổng đài viên 115.',
      'Biết cách bật loa ngoài để vừa đàm thoại nhận hướng dẫn vừa thực hiện thao tác sơ cứu.',
      'Tuyệt đối không cúp máy trước khi tổng đài viên cho phép.',
    ],
    mediaType: 'video',
    sourceOrganization: 'Cục Quản lý Khám chữa bệnh - Bộ Y Tế & Trung tâm Cấp cứu 115',
    sourcePageUrl: 'https://kcb.vn/',
    youtubeVideoId: 'GwU_fQWyfbw',
    embedUrl: 'https://www.youtube-nocookie.com/embed/GwU_fQWyfbw?rel=0&modestbranding=1',
    thumbnailUrl: 'https://i.ytimg.com/vi/GwU_fQWyfbw/hqdefault.jpg',
    videoChannel: 'St John Ambulance',
    language: 'vi',
    durationSeconds: 120,
    publishedAt: '2025-02-10',
    reviewedAt: '2026-08-20',
    reviewedBy: 'Tài liệu chuẩn hóa theo Quy chuẩn Điều phối Cấp cứu 115 — Bộ Y Tế',
    reviewStatus: 'approved',
    evidenceLevel: 'Level A (Quy chuẩn Điều phối Cấp cứu 115 Bộ Y Tế)',
    applicableAudience: 'Toàn thể người dân, gia đình và lái xe công cộng',
    emergencyWarning: 'Bình tĩnh nói rõ địa chỉ hoặc đặc điểm nhận diện nổi bật gần nhất. Điều phối viên cần địa chỉ chính xác để định tuyến xe cấp cứu.',
    steps: [
      {
        stepNumber: 1,
        title: 'Bấm 115 & Bật ngay Loa ngoài (Speakerphone)',
        detail: 'Đặt điện thoại gần tai hoặc bên cạnh nạn nhân ở chế độ loa ngoài để hai tay rảnh làm thao tác sơ cứu.',
        keyPoint: 'Loa ngoài giúp bạn nghe hướng dẫn ép tim / cầm máu trực tiếp từ nhân viên y tế.',
      },
      {
        stepNumber: 2,
        title: 'Cung cấp Địa chỉ chính xác & Mốc nhận diện',
        detail: 'Nêu rõ số nhà, ngõ ngách, tên đường, phường/xã hoặc điểm mốc lớn (trường học, cây xăng, tòa nhà nổi tiếng).',
        keyPoint: 'Địa chỉ rõ ràng giúp giảm 3–7 phút thời gian xe cấp cứu đi lạc ngõ hẻm.',
      },
      {
        stepNumber: 3,
        title: 'Mô tả ngắn Tình trạng & Số lượng nạn nhân',
        detail: 'Báo rõ: Có mấy người bị nạn, nạn nhân còn tỉnh hay bất tỉnh, có thở không, có đang chảy máu ồ ạt không.',
        keyPoint: 'Giúp điều phối viên cử đúng số lượng kíp cấp cứu và trang thiết bị chuyên dụng.',
      },
      {
        stepNumber: 4,
        title: 'Không cúp máy trước — Làm theo hướng dẫn',
        detail: 'Giữ kết nối cho đến khi nhân viên tổng đài xác nhận xe đã xuất phát và hoàn tất hướng dẫn sơ cứu ban đầu.',
        keyPoint: 'Chỉ cúp máy sau khi điều phối viên 115 nói "Bạn có thể giữ máy hoặc đã hoàn tất".',
      },
    ],
    avoidActions: [
      'Hoảng loạn la hét rồi tắt máy đột ngột khiến 115 không xác định được tọa độ.',
      'Nói chung chung ("đang ở đường Nguyễn Trãi") mà không có số nhà hoặc giao lộ gần nhất.',
      'Gọi cấp cứu xong bỏ đi không cử người ra đầu ngõ đón xe.',
    ],
    dangerSigns115: [
      'Nạn nhân ngừng thở, tím tái môi đầu chi.',
      'Đau thắt ngực dữ dội lan lên hàm hoặc cánh tay trái.',
      'Mất ý thức đột ngột hoặc co giật kéo dài trên 3 phút.',
    ],
    quiz: [
      {
        question: 'Tại sao nên bật loa ngoài khi gọi 115 trong tình huống cấp cứu?',
        options: [
          'Để người xung quanh nghe cùng cho vui',
          'Để rảnh hai tay thực hiện sơ cứu theo chỉ dẫn của nhân viên y tế',
          'Để tiết kiệm pin điện thoại',
          'Để âm thanh to hơn át tiếng ồn',
        ],
        correctIndex: 1,
        explanation: 'Bật loa ngoài cho phép bạn vừa tiếp nhận hướng dẫn chuyên môn từ điều phối viên 115 vừa dùng hai tay ép tim hoặc băng ép cầm máu.',
      },
    ],
    relatedScenarioIds: ['sc_ohca_01', 'sc_stroke_02', 'sc_bleeding_03'],
    copyrightStatus: 'Public Health Service Documentation — Bộ Y Tế',
    embeddingAllowed: true,
    difficultyLevel: 'Cơ bản',
  },
  {
    id: 'res_cpr_adult_aha',
    slug: 'ky-thuat-ep-tim-cpr-nguoi-lon-aha',
    title: 'Kỹ Thuật Ép Tim Hồi Sinh Tim Phổi (CPR) Người Lớn Chuẩn AHA 2020',
    topic: 'cardiac_arrest',
    description: 'Quy trình hồi sinh tim phổi ép tim liên tục (Hands-Only CPR) cho nạn nhân ngừng tuần hoàn đột ngột ngoài bệnh viện theo khuyến cáo của Hiệp hội Tim mạch Hoa Kỳ (AHA).',
    learningObjectives: [
      'Xác định chính xác vị trí đặt tay ở 1/2 dưới xương ức nạn nhân.',
      'Duy trì tốc độ ép tim chuẩn 100–120 nhịp/phút (nhịp bài hát Stayin\' Alive).',
      'Đạt độ sâu ép ngực 5–6 cm và cho phép lồng ngực nở hoàn toàn sau mỗi lần ép.',
    ],
    mediaType: 'video',
    sourceOrganization: 'American Heart Association (AHA) & Hội Hồi Sức Cấp Cứu VN',
    sourcePageUrl: 'https://cpr.heart.org/en/resources/cpr-facts-and-stats',
    youtubeVideoId: 'VZqG-tcZvfE',
    embedUrl: 'https://www.youtube-nocookie.com/embed/VZqG-tcZvfE?rel=0&modestbranding=1',
    thumbnailUrl: 'https://i.ytimg.com/vi/VZqG-tcZvfE/hqdefault.jpg',
    videoChannel: 'American Red Cross',
    language: 'vi',
    durationSeconds: 135,
    publishedAt: '2024-10-01',
    reviewedAt: '2026-08-20',
    reviewedBy: 'Tài liệu chuẩn hóa theo Hướng dẫn AHA CPR 2020 & Hội Hồi Sức Cấp Cứu VN',
    reviewStatus: 'approved',
    evidenceLevel: 'Level A (AHA Guidelines for CPR 2020)',
    applicableAudience: 'Tất cả mọi người từ 12 tuổi trở lên',
    emergencyWarning: 'Nếu nạn nhân bất tỉnh và không thở bình thường (hoặc chỉ thở ngáp), HÃY BẮT ĐẦU ÉP TIM NGAY. Không trì hoãn kiểm tra mạch.',
    steps: [
      {
        stepNumber: 1,
        title: 'Đặt nạn nhân nằm ngửa trên mặt sàn cứng',
        detail: 'Đảm bảo nạn nhân nằm trên bề mặt phẳng, chắc chắn (sàn nhà hoặc mặt đất). Quỳ gối sát một bên ngực nạn nhân.',
        keyPoint: 'Ép tim trên đệm mềm làm triệt tiêu lực ép lồng ngực.',
      },
      {
        stepNumber: 2,
        title: 'Đặt gót bàn tay đúng vị trí 1/2 dưới xương ức',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/CPR_Adult_Chest_Compression_Heart.png/500px-CPR_Adult_Chest_Compression_Heart.png',
        imageAlt: 'Vị trí đặt tay so với tim',
        imageCredit: 'BruceBlaus · CC BY-SA 4.0 · Wikimedia Commons',
        imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:CPR_Adult_Chest_Compression_Heart.png',
        detail: 'Đặt gót bàn tay thuận vào chính giữa ngực (nửa dưới xương ức). Đặt bàn tay thứ hai lên trên, đan chặt các ngón tay.',
        keyPoint: 'Chỉ có gót bàn tay tiếp xúc với xương ức, các ngón tay không tì lên xương sườn.',
      },
      {
        stepNumber: 3,
        title: 'Tư thế cánh tay thẳng đứng góc 90 độ',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/CPR_on_an_Adult.png/500px-CPR_on_an_Adult.png',
        imageAlt: 'Vai thẳng trên ngực, tay duỗi thẳng',
        imageCredit: 'BruceBlaus · CC BY-SA 4.0 · Wikimedia Commons',
        imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:CPR_on_an_Adult.png',
        detail: 'Giữ khuỷu tay thẳng tuyệt đối, vai nằm thẳng đứng phía trên hai bàn tay. Dùng trọng lượng nửa thân trên để ép xuống.',
        keyPoint: 'Dùng lực của thân trên giúp bạn không bị mỏi cơ tay khi ép tim kéo dài.',
      },
      {
        stepNumber: 4,
        title: 'Ép sâu 5–6 cm với tốc độ 100–120 lần/phút',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Chest_compressions_%28cropped%29.gif',
        imageAlt: 'Ảnh động: nhịp ép tim liên tục',
        imageCredit: 'Bangkok Hospital Phuket · CC BY 3.0 · Wikimedia Commons',
        imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Chest_compressions_(cropped).gif',
        detail: 'Ép mạnh, ép nhanh. Sau mỗi lần ép, thả tay để lồng ngực phồng lên hết mức nhưng không nhấc hẳn gót tay ra khỏi ngực.',
        keyPoint: 'Nhịp ép chuẩn 110 bpm — Không ngắt quãng ép tim quá 10 giây.',
      },
    ],
    avoidActions: [
      'Gập khuỷu tay khi ép dẫn đến không đủ độ sâu 5–6 cm.',
      'Dừng ép tim để vắt chanh, cho uống nước hoặc cạo gió.',
      'Đè lên xương sườn hoặc phần mềm dưới ức (mũi kiếm) gây gãy xương/tổn thương tạng.',
    ],
    dangerSigns115: [
      'Nạn nhân ngã gục đột ngột, gọi hỏi không đáp ứng, thở ngáp hoặc ngừng thở.',
      'Da mặt xám xịt, tím tái vùng môi móng tay.',
    ],
    quiz: [
      {
        question: 'Tần số ép tim (CPR) khuyến cáo chuẩn AHA 2020 cho người lớn là bao nhiêu?',
        options: [
          '60 - 80 lần/phút',
          '100 - 120 lần/phút',
          '140 - 160 lần/phút',
          'Ép càng nhanh càng tốt không cần đếm',
        ],
        correctIndex: 1,
        explanation: 'Khuyến cáo AHA 2020 xác định tần số tối ưu là 100 - 120 lần/phút để đảm bảo lưu lượng máu nuôi não và tim.',
      },
    ],
    relatedScenarioIds: ['sc_ohca_01'],
    copyrightStatus: 'AHA Educational Standard Citation',
    embeddingAllowed: true,
    difficultyLevel: 'Cơ bản',
  },
  {
    id: 'res_aed_usage',
    slug: 'huong-dan-su-dung-may-aed',
    title: 'Hướng Dẫn Vận Hành Máy Khử Rung Tim Tự Động AED Ngoài Lồng Ngực',
    topic: 'aed_usage',
    description: 'Cách sử dụng máy khử rung tim tự động công cộng (Automated External Defibrillator) để cắt cơn rung thất và phục hồi nhịp đập tự nhiên của tim.',
    learningObjectives: [
      'Biết cách mở nguồn máy AED và làm theo khẩu lệnh giọng nói tự động.',
      'Dán 2 miếng điện cực đúng vị trí trên ngực trần của nạn nhân.',
      'Hô to "Tránh xa nạn nhân" để đảm bảo an toàn tuyệt đối trước khi nhấn nút sốc điện.',
    ],
    mediaType: 'video',
    sourceOrganization: 'British Red Cross & IFRC First Aid Guidelines',
    sourcePageUrl: 'https://www.redcross.org.uk/first-aid/learn-first-aid/aed',
    youtubeVideoId: 'UFvL7wTFzl0',
    embedUrl: 'https://www.youtube-nocookie.com/embed/UFvL7wTFzl0?rel=0&modestbranding=1',
    thumbnailUrl: 'https://i.ytimg.com/vi/UFvL7wTFzl0/hqdefault.jpg',
    videoChannel: 'St John Ambulance',
    language: 'en',
    durationSeconds: 150,
    publishedAt: '2024-11-20',
    reviewedAt: '2026-08-22',
    reviewedBy: 'Tài liệu chuẩn hóa theo Hướng dẫn Vận hành AED — British Red Cross & IFRC',
    reviewStatus: 'approved',
    evidenceLevel: 'Level A (IFRC & ERC Resuscitation Guidelines)',
    applicableAudience: 'Người dân tại nơi công cộng (sân bay, trung tâm thương mại, tòa nhà)',
    emergencyWarning: 'Khi máy thông báo "Đang phân tích nhịp" hoặc "Chuẩn bị phát sốc", KHÔNG AI ĐƯỢC CHẠM VÀO NẠN NHÂN.',
    steps: [
      {
        stepNumber: 1,
        title: 'Mở nguồn máy AED ngay khi có',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/AED_-_Automated_external_defibrillator_in_compartment_with_sign_above.jpg/500px-AED_-_Automated_external_defibrillator_in_compartment_with_sign_above.jpg',
        imageAlt: 'Tủ AED công cộng có biển chỉ dẫn',
        imageCredit: 'Infrogmation · CC BY-SA 4.0 · Wikimedia Commons',
        imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:AED_-_Automated_external_defibrillator_in_compartment_with_sign_above.jpg',
        detail: 'Bấm nút nguồn màu xanh hoặc mở nắp máy. Máy sẽ tự động phát hướng dẫn bằng giọng nói và hình ảnh.',
        keyPoint: 'Tiếp tục ép tim trong khi người khác đang chuẩn bị máy AED.',
      },
      {
        stepNumber: 2,
        title: 'Bộc lộ ngực trần & Dán 2 miếng điện cực',
        detail: 'Lau khô ngực nếu bị ướt. Bóc lớp dán và dán 1 miếng dưới xương đòn bên phải, 1 miếng ở mạn sườn trái dưới nách.',
        keyPoint: 'Hình minh họa vị trí dán được in trực tiếp trên từng miếng điện cực.',
      },
      {
        stepNumber: 3,
        title: 'Tránh xa khi máy phân tích nhịp tim',
        detail: 'Cắm giắc nối (nếu cần). Hô to: "Đứng lùi ra, không chạm vào nạn nhân!" để máy phân tích sóng tim chính xác.',
        keyPoint: 'Chạm vào người lúc này sẽ làm nhiễu kết quả phân tích điện tâm đồ của máy.',
      },
      {
        stepNumber: 4,
        title: 'Nhấn nút SỐC điện (nếu có chỉ định) & Tiếp tục CPR',
        detail: 'Nếu máy báo "Cần sốc điện", đảm bảo không ai chạm vào nạn nhân rồi nhấn nút SỐC nhấp nháy màu cam. Ngay sau sốc điện, tiếp tục ép tim 2 phút.',
        keyPoint: 'Máy AED tự động phân tích an toàn, máy chỉ phát sốc khi phát hiện rung thất/nhanh thất vô mạch.',
      },
    ],
    avoidActions: [
      'Chạm tay vào nạn nhân khi máy đang phát xung điện khử rung.',
      'Dán miếng điện cực chồng lên máy tạo nhịp tim cấy dưới da (nếu thấy vết sẹo gồ lên, dán cách ít nhất 2.5cm).',
      'Tắt máy AED khi nạn nhân vừa cựa quậy (hãy để nguyên miếng dán kết nối).',
    ],
    dangerSigns115: [
      'Nạn nhân ngừng tuần hoàn tại nơi công cộng.',
      'Máy AED thông báo "Đề nghị gọi trợ giúp y tế khẩn cấp".',
    ],
    quiz: [
      {
        question: 'Khi máy AED phát tín hiệu "Shock advised" (Cần sốc điện), thao tác an toàn bắt buộc trước khi bấm nút sốc là gì?',
        options: [
          'Giữ chặt tay nạn nhân để đỡ run',
          'Hô to "Tránh xa nạn nhân" và quan sát không ai tiếp xúc với nạn nhân',
          'Đổ nước lên ngực nạn nhân',
          'Rút dây điện cực ra khỏi máy',
        ],
        correctIndex: 1,
        explanation: 'Phải đảm bảo không một ai chạm vào cơ thể nạn nhân để tránh dòng điện sốc truyền sang người cứu hộ.',
      },
    ],
    relatedScenarioIds: ['sc_ohca_01'],
    copyrightStatus: 'Public Resuscitation Guide Citation',
    embeddingAllowed: true,
    difficultyLevel: 'Nâng cao',
  },
  {
    id: 'res_choking_heimlich',
    slug: 'thu-thuat-heimlich-hoc-di-vat',
    title: 'Thủ Thuật Heimlich & Vỗ Lưng Xử Trí Hóc Dị Vật Đường Thở',
    topic: 'choking',
    description: 'Quy trình cấp cứu tắc nghẽn đường thở hoàn toàn do thức ăn hoặc dị vật ở người lớn và trẻ nhỏ bằng phối hợp 5 vỗ lưng và 5 ép bụng.',
    learningObjectives: [
      'Nhận biết dấu hiệu hóc dị vật hoàn toàn: Hai tay ôm cổ, không nói được, không ho được, mặt tím tái.',
      'Thực hiện chính xác 5 cú vỗ lưng giữa hai xương bả vai.',
      'Thực hiện 5 cú ép bụng Heimlich theo hướng vào trong và chếch lên trên.',
    ],
    mediaType: 'video',
    sourceOrganization: 'St John Ambulance & American Red Cross',
    sourcePageUrl: 'https://www.sja.org.uk/get-advice/first-aid-advice/choking/',
    youtubeVideoId: 'PA9hpOnvtCk',
    embedUrl: 'https://www.youtube-nocookie.com/embed/PA9hpOnvtCk?rel=0&modestbranding=1',
    thumbnailUrl: 'https://i.ytimg.com/vi/PA9hpOnvtCk/hqdefault.jpg',
    videoChannel: 'St John Ambulance',
    language: 'vi',
    durationSeconds: 130,
    publishedAt: '2024-09-12',
    reviewedAt: '2026-08-21',
    reviewedBy: 'Tài liệu chuẩn hóa theo Hướng dẫn Cấp cứu Hóc dị vật ILCOR & St John Ambulance',
    reviewStatus: 'approved',
    evidenceLevel: 'Level A (ILCOR Choking Treatment Guidelines)',
    applicableAudience: 'Toàn thể phụ huynh, giáo viên, nhân viên nhà hàng',
    emergencyWarning: 'Nếu nạn nhân hóc dị vật bất tỉnh ngã ra sàn: CHUYỂN SANG ÉP TIM CPR NGAY LẬP TỨC. Không tiếp tục ép bụng.',
    steps: [
      {
        stepNumber: 1,
        title: 'Nhận biết tắc nghẽn & Động viên nếu còn ho được',
        detail: 'Hỏi to: "Bạn bị hóc phải không?". Nếu nạn nhân vẫn nói hoặc ho mạnh được, hãy khuyến khích họ ho thật mạnh để tống dị vật ra.',
        keyPoint: 'Chỉ can thiệp Heimlich khi nạn nhân không thể nói, không thể ho hay thở được.',
      },
      {
        stepNumber: 2,
        title: 'Thực hiện 5 lần VỖ LƯNG dứt khoát',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Back_blows_%28back_slaps%29_against_choking_for_adult_people.jpg/500px-Back_blows_%28back_slaps%29_against_choking_for_adult_people.jpg',
        imageAlt: 'Vỗ lưng giữa hai bả vai',
        imageCredit: 'Trakotako · CC BY-SA 4.0 · Wikimedia Commons',
        imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Back_blows_(back_slaps)_against_choking_for_adult_people.jpg',
        detail: 'Đứng sang một bên hơi lệch ra sau nạn nhân. Dùng một tay đỡ trước ngực, cho nạn nhân hơi cúi người ra trước. Dùng gót bàn tay kia vỗ mạnh 5 lần vào giữa hai xương bả vai.',
        keyPoint: 'Tư thế cúi người giúp trọng lực hỗ trợ dị vật văng ra ngoài.',
      },
      {
        stepNumber: 3,
        title: 'Thực hiện 5 lần ÉP BỤNG (Heimlich)',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Abdominal_thrusts_against_choking_%28cropped%29.jpg/500px-Abdominal_thrusts_against_choking_%28cropped%29.jpg',
        imageAlt: 'Ép bụng hướng vào trong và lên trên',
        imageCredit: 'US Army Medical Dept. · Public domain · Wikimedia Commons',
        imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Abdominal_thrusts_against_choking_(cropped).jpg',
        detail: 'Đứng ra sau lưng nạn nhân, vòng 2 tay qua eo. Nắm một bàn tay thành nắm đấm đặt lên trên rốn, dưới mũi ức. Tay kia ôm chặt nắm đấm, giật mạnh vào trong và hướng lên trên 5 lần.',
        keyPoint: 'Tạo áp lực đẩy cơ hoành lên ép không khí từ phổi tống dị vật bật ra.',
      },
      {
        stepNumber: 4,
        title: 'Lặp lại chu kỳ 5 vỗ lưng - 5 ép bụng',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Abdominal_thrusts%2C_point_of_applying_%28cropped%29.jpg/500px-Abdominal_thrusts%2C_point_of_applying_%28cropped%29.jpg',
        imageAlt: 'Vị trí nắm tay: trên rốn, dưới xương ức',
        imageCredit: 'US Army Medical Dept. · Public domain · Wikimedia Commons',
        imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Abdominal_thrusts,_point_of_applying_(cropped).jpg',
        detail: 'Luân phiên 5 vỗ lưng và 5 ép bụng cho đến khi dị vật bật ra hoặc nạn nhân thở lại bình thường.',
        keyPoint: 'Nếu nạn nhân ngất lịm, đặt nằm ngửa xuống sàn và ép tim CPR.',
      },
    ],
    avoidActions: [
      'Dùng ngón tay móc mù vào họng khi không nhìn thấy rõ dị vật (dễ đẩy dị vật tụt sâu hơn).',
      'Cho nạn nhân uống nước hoặc nuốt cơm/chuối khi đang bị hóc nghẹn.',
      'Thực hiện ép bụng Heimlich cho phụ nữ mang thai giai đoạn cuối hoặc trẻ dưới 1 tuổi (dùng kỹ thuật ép ngực riêng).',
    ],
    dangerSigns115: [
      'Nạn nhân tím tái toàn thân, mắt trợn, bất tỉnh.',
      'Đã thực hiện 3 chu kỳ vỗ lưng - ép bụng mà dị vật chưa thoát ra.',
    ],
    quiz: [
      {
        question: 'Vị trí đặt nắm đấm tay khi thực hiện thủ thuật ép bụng Heimlich ở người lớn là ở đâu?',
        options: [
          'Ngay chính giữa ngực trên xương ức',
          'Ở vùng bụng trên rốn và dưới mũi ức',
          'Vùng hạ vị sát xương mu',
          'Ở phía sau lưng vùng thắt lưng',
        ],
        correctIndex: 1,
        explanation: 'Đặt nắm đấm ở vùng thượng vị (trên rốn, dưới mũi ức) để khi giật chếch lên trên sẽ đẩy cơ hoành tạo áp lực ép phổi tống dị vật ra.',
      },
    ],
    relatedScenarioIds: ['sc_ohca_01'],
    copyrightStatus: 'Public First Aid Educational Media',
    embeddingAllowed: true,
    difficultyLevel: 'Cơ bản',
  },
  {
    id: 'res_severe_bleeding',
    slug: 'ky-thuat-cam-mau-bang-ep-stop-the-bleed',
    title: 'Kỹ Thuật Cầm Máu Khẩn Cấp & Băng Ép Vết Thương (Stop The Bleed)',
    topic: 'bleeding',
    description: 'Biện pháp đè ép trực tiếp, nhét gạc cầm máu vết thương sâu và băng ép vô khuẩn phòng sốc mất máu cấp tính theo chương trình Stop The Bleed.',
    learningObjectives: [
      'Nhận biết dấu hiệu chảy máu ồ ạt đe dọa tính mạng (máu phun thành tia hoặc thấm đẫm quần áo).',
      'Thực hiện đè ép trực tiếp bằng hai bàn tay có gạc vô khuẩn liên tục tối thiểu 5–10 phút.',
      'Biết cách chèn gạc vào vết thương sâu và kỹ thuật băng ép số 8.',
    ],
    mediaType: 'video',
    sourceOrganization: 'American College of Surgeons / Stop The Bleed & Bộ Y Tế',
    sourcePageUrl: 'https://www.stopthebleed.org/',
    youtubeVideoId: '7LEqWoK_aS0',
    embedUrl: 'https://www.youtube-nocookie.com/embed/7LEqWoK_aS0?rel=0&modestbranding=1',
    thumbnailUrl: 'https://i.ytimg.com/vi/7LEqWoK_aS0/hqdefault.jpg',
    videoChannel: 'American College of Surgeons',
    language: 'vi',
    durationSeconds: 195,
    publishedAt: '2024-08-01',
    reviewedAt: '2026-08-20',
    reviewedBy: 'Tài liệu chuẩn hóa theo Phác đồ Stop The Bleed — American College of Surgeons',
    reviewStatus: 'approved',
    evidenceLevel: 'Level A (ACS Stop The Bleed Consensus)',
    applicableAudience: 'Người dân, công nhân xây dựng, tài xế xe tải',
    emergencyWarning: 'Nếu vết thương có dị vật lớn (mảnh kính, thanh sắt) cắm sâu, TUYỆT ĐỐI KHÔNG RÚT DỊ VẬT RA. Hãy chèn gạc xung quanh để cố định.',
    steps: [
      {
        stepNumber: 1,
        title: 'Bộc lộ vết thương & Xác định vị trí chảy máu',
        detail: 'Cắt hoặc vén áo quần bộc lộ rõ miệng vết thương. Mang găng tay y tế bảo hộ nếu có sẵn.',
        keyPoint: 'Cần nhìn trực tiếp vào điểm máu đang xối ra để đè ép chính xác.',
      },
      {
        stepNumber: 2,
        title: 'Đè ép trực tiếp bằng gạc sạch (Direct Pressure)',
        detail: 'Dùng miếng gạc hoặc vải sạch đặt thẳng lên điểm chảy máu. Dùng hai bàn tay đè mạnh hết sức liên tục không nhấc tay ra.',
        keyPoint: 'Đè ép vững chắc bằng trọng lượng cơ thể ít nhất 5–10 phút để hình thành cục máu đông.',
      },
      {
        stepNumber: 3,
        title: 'Chèn gạc vào vết thương sâu (Wound Packing)',
        detail: 'Với vết thương sâu ở háng, nách hoặc đùi: Nhét chặt gạc hoặc vải sạch vào sâu trong lòng vết thương rồi tiếp tục đè ép bên ngoài.',
        keyPoint: 'Nhét gạc tạo lực ép trực tiếp vào lòng mạch máu bị đứt.',
      },
      {
        stepNumber: 4,
        title: 'Băng ép cố định & Giữ ấm nạn nhân',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/STOP_THE_BLEED_Course_%288209642%29.jpg/500px-STOP_THE_BLEED_Course_%288209642%29.jpg',
        imageAlt: 'Băng ép quanh chi trong lớp Stop the Bleed',
        imageCredit: 'Staff Sgt. Juan Paz · Public domain · Wikimedia Commons',
        imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:STOP_THE_BLEED_Course_(8209642).jpg',
        detail: 'Dùng băng cuộn băng ép chặt quanh vết thương. Đắp chăn giữ ấm phòng chống sốc mất máu và hạ thân nhiệt.',
        keyPoint: 'Nếu máu thấm ướt đẫm lớp băng đầu, đặt thêm lớp băng gạc mới đè lên trên, KHÔNG tháo bỏ lớp cũ.',
      },
    ],
    avoidActions: [
      'Nhấc tay lên liên tục sau mỗi 30 giây để ngó xem máu đã ngừng chảy chưa (sẽ phá vỡ cục máu đông vừa hình thành).',
      'Tự ý rút thanh kim loại hoặc dao găm đang cắm vào người bị nạn.',
      'Đặt garo tự chế bằng dây kẽm nhỏ siết chặt gây hoại tử cơ chi.',
    ],
    dangerSigns115: [
      'Máu phun thành vòi hoặc chảy xối xả không cầm sau 5 phút đè ép.',
      'Nạn nhân da tái nhợt, vã mồ hôi lạnh, lơ mơ, mạch quay nhanh nhỏ khó bắt.',
    ],
    quiz: [
      {
        question: 'Khi thấy một mảnh kính lớn cắm sâu vào vết thương đang chảy máu ở đùi, xử trí ban đầu đúng là gì?',
        options: [
          'Rút nhanh mảnh kính ra rồi băng ép',
          'Giữ nguyên mảnh kính, chèn cuộn gạc hai bên để cố định và băng ép xung quanh',
          'Đổ cồn 90 độ trực tiếp vào vết thương để sát khuẩn',
          'Cho nạn nhân đi lại nhẹ nhàng',
        ],
        correctIndex: 1,
        explanation: 'Mảnh kính đang đóng vai trò nút chặn cầm máu tạm thời. Rút ra có thể làm đứt mạch máu lớn và gây xuất huyết ồ ạt mất kiểm soát.',
      },
    ],
    relatedScenarioIds: ['sc_bleeding_03'],
    copyrightStatus: 'Stop The Bleed Guidelines Reference',
    embeddingAllowed: true,
    difficultyLevel: 'Cơ bản',
  },
  {
    id: 'res_burns_moh',
    slug: 'so-cuu-bong-dung-cach-nguon-nuoc-mat',
    title: 'Sơ Cứu Bỏng Đúng Cách: Làm Mát Bằng Nước Sạch 15-20 Phút',
    topic: 'burns',
    description: 'Quy trình sơ cứu vết bỏng nhiệt (nước sôi, lửa, dầu mỡ) và bỏng hóa chất theo phác đồ của Viện Bỏng Quốc gia Lê Hữu Trác.',
    learningObjectives: [
      'Thực hiện ngay bước ngâm/xả nước mát sạch (15–25°C) trong 15–20 phút.',
      'Biết cách cởi bỏ nhẹ nhàng quần áo hoặc trang sức trước khi vị trí bỏng bị sưng phù.',
      'Băng che vết bỏng bằng gạc ẩm vô khuẩn và không bôi các chất dân gian độc hại.',
    ],
    mediaType: 'video',
    sourceOrganization: 'Viện Bỏng Quốc Gia Lê Hữu Trác & Bộ Y Tế',
    sourcePageUrl: 'https://moh.gov.vn/chuong-trinh-muc-tieu-quoc-gia/-/asset_publisher/7ngpvXDSpGBaj/content/so-cap-cuu-bong',
    youtubeVideoId: 'TLr2qsEhpC8',
    embedUrl: 'https://www.youtube-nocookie.com/embed/TLr2qsEhpC8?rel=0&modestbranding=1',
    thumbnailUrl: 'https://i.ytimg.com/vi/TLr2qsEhpC8/hqdefault.jpg',
    videoChannel: 'St John Ambulance',
    language: 'vi',
    durationSeconds: 165,
    publishedAt: '2024-05-18',
    reviewedAt: '2026-08-23',
    reviewedBy: 'Tài liệu chuẩn hóa theo Phác đồ Cấp cứu Bỏng — Viện Bỏng Quốc Gia Lê Hữu Trác',
    reviewStatus: 'approved',
    evidenceLevel: 'Level A (Phác đồ Cấp cứu Bỏng Bộ Y Tế)',
    applicableAudience: 'Mọi gia đình, bếp ăn, nhà máy hóa chất',
    emergencyWarning: 'TUYỆT ĐỐI KHÔNG bôi kem đánh răng, nước mắm, mỡ trăn, lá cây hay lòng đỏ trứng gà lên vết bỏng. Các chất này gây nhiễm trùng huyết và hoại tử sâu.',
    steps: [
      {
        stepNumber: 1,
        title: 'Loại bỏ tác nhân gây bỏng & Cách ly an toàn',
        detail: 'Nhanh chóng đưa nạn nhân ra khỏi vùng nhiệt, dập tắt lửa trên áo quần hoặc xả trôi hóa chất bám trên da.',
        keyPoint: 'Cắt bỏ quần áo quanh vết bỏng, không giật mạnh nếu vải dính chặt vào da.',
      },
      {
        stepNumber: 2,
        title: 'Xả nước mát sạch chảy nhẹ liên tục 15–20 phút',
        detail: 'Ngâm hoặc cho dòng nước máy sạch (nhiệt độ thường 15–25°C) chảy nhẹ phủ kín vùng da bị bỏng.',
        keyPoint: 'Làm mát trong 30 phút đầu giúp giảm độ sâu của tổn thương bỏng và giảm đau tức thì.',
      },
      {
        stepNumber: 3,
        title: 'Tháo bỏ nhẫn, đồng hồ, vòng tay quanh vùng bỏng',
        detail: 'Cần tháo ngay trước khi mô mềm xung quanh sưng nề gây tắc nghẽn tuần hoàn hoại tử ngón tay.',
        keyPoint: 'Chờ đến khi sưng phù sẽ không thể tháo được nhẫn.',
      },
      {
        stepNumber: 4,
        title: 'Che phủ bằng gạc sạch & Chuyển cơ sở y tế',
        detail: 'Dùng gạc vô khuẩn hoặc khăn sạch thấm ẩm che nhẹ nhàng lên vết bỏng. Băng lỏng tay, giữ ấm cho nạn nhân.',
        keyPoint: 'Không làm vỡ các bọng nước phồng rộp tự nhiên.',
      },
    ],
    avoidActions: [
      'Chườm đá lạnh trực tiếp lên vết bỏng gây co mạch đột ngột và hoại tử lạnh thêm (bỏng lạnh).',
      'Bôi kem đánh răng, mỡ trăn, nước mắm, trứng gà lên da bị rách.',
      'Chọc thủng các bóng nước (bọng phỏng) làm mất lớp màng bảo vệ vô khuẩn tự nhiên của cơ thể.',
    ],
    dangerSigns115: [
      'Bỏng diện tích rộng lớn (trên 10% diện tích cơ thể hoặc to hơn 1 bàn tay ở trẻ em).',
      'Bỏng ở các vùng nhạy cảm: Mặt, cổ, mắt, hai bàn tay, vùng sinh dục.',
      'Bỏng do điện cao thế hoặc nạn nhân có dấu hiệu hít phải khói độc (khàn tiếng, khạc đờm đen).',
    ],
    quiz: [
      {
        question: 'Phương pháp hạ nhiệt vết bỏng nước sôi chuẩn y khoa ngay sau khi bị tai nạn là gì?',
        options: [
          'Chườm ngay đá lạnh từ ngăn đá tủ lạnh',
          'Ngâm hoặc xả nước máy mát sạch (15-25°C) trong 15-20 phút',
          'Bôi một lớp dày kem đánh răng bạc hà',
          'Thoa nước mắm cốt để chống phồng rộp',
        ],
        correctIndex: 1,
        explanation: 'Bộ Y Tế và Viện Bỏng Quốc gia khuyến cáo chỉ dùng nước sạch mát thông thường xả nhẹ 15-20 phút. Tuyệt đối không dùng đá lạnh hoặc hóa chất dân gian.',
      },
    ],
    relatedScenarioIds: ['sc_ohca_01'],
    copyrightStatus: 'Viện Bỏng Quốc Gia — MoH Vietnam Standard',
    embeddingAllowed: true,
    difficultyLevel: 'Cơ bản',
  },
  {
    id: 'res_stroke_fast',
    slug: 'nhan-dien-som-dot-quy-nao-fast',
    title: 'Nhận Biết Sớm Dấu Hiệu Đột Quỵ Não Theo Quy Tắc FAST',
    topic: 'stroke',
    description: 'Quy tắc vàng FAST phát hiện tổn thương mạch máu não cấp tính và kích hoạt cấp cứu 115 trong khung giờ vàng 3 - 4.5 giờ đầu.',
    learningObjectives: [
      'Nhớ rõ 4 chữ cái FAST: Face (Mặt), Arm (Tay), Speech (Lời nói), Time (Thời gian).',
      'Hiểu rõ: "Thời gian là Não" — Mỗi phút trôi qua có 2 triệu tế bào não chết đi.',
      'Tuyệt đối không châm kim 10 đầu ngón tay hay cho uống an cung ngưu hoàng hoàn.',
    ],
    mediaType: 'video',
    sourceOrganization: 'Tổ Chức Y Tế Thế Giới (WHO) & Bệnh Viện Đại Học Y Dược TP.HCM',
    sourcePageUrl: 'https://www.who.int/news-room/fact-sheets/detail/cardiovascular-diseases-(cvds)',
    youtubeVideoId: 'mkpbbWZvYmw',
    embedUrl: 'https://www.youtube-nocookie.com/embed/mkpbbWZvYmw?rel=0&modestbranding=1',
    thumbnailUrl: 'https://i.ytimg.com/vi/mkpbbWZvYmw/hqdefault.jpg',
    videoChannel: 'CDC (Hoa Kỳ)',
    language: 'vi',
    durationSeconds: 170,
    publishedAt: '2024-06-25',
    reviewedAt: '2026-08-22',
    reviewedBy: 'Tài liệu chuẩn hóa theo Khuyến cáo Nhận diện Đột quỵ FAST — World Stroke Organization & WHO',
    reviewStatus: 'approved',
    evidenceLevel: 'Level A (World Stroke Organization Guidelines)',
    applicableAudience: 'Người cao tuổi, người có bệnh nền tăng huyết áp, người nhà bệnh nhân',
    emergencyWarning: 'GHI NHỚ CHÍNH XÁC THỜI ĐIỂM KHỞI PHÁT và báo ngay cho bác sĩ cấp cứu khi đến viện.',
    steps: [
      {
        stepNumber: 1,
        title: 'F - Face (Kiểm tra khuôn mặt)',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Stroke-facial-droop.jpg/500px-Stroke-facial-droop.jpg',
        imageAlt: 'Méo miệng, xệ một bên mặt',
        imageCredit: 'Wikimedia contributor · CC0 · Wikimedia Commons',
        imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Stroke-facial-droop.jpg',
        detail: 'Yêu cầu người bệnh cười hoặc nhe răng. Quan sát xem một bên miệng có bị xệ xuống, rãnh mũi má bị mờ hay méo mặt lệch sang một bên không.',
        keyPoint: 'Méo miệng rõ nhất khi cười hoặc nói to.',
      },
      {
        stepNumber: 2,
        title: 'A - Arm (Kiểm tra tay chân)',
        detail: 'Bảo người bệnh giơ hai tay song song ra trước mặt trong 10 giây. Quan sát xem một bên tay có bị rơi thõng xuống hoặc không nâng lên được không.',
        keyPoint: 'Yếu hoặc liệt nửa người cùng bên với mặt.',
      },
      {
        stepNumber: 3,
        title: 'S - Speech (Kiểm tra giọng nói)',
        detail: 'Yêu cầu lặp lại một câu ngắn đơn giản (ví dụ: "Hôm nay trời nắng đẹp"). Nghe xem giọng nói có bị ngọng, đớ lưỡi hoặc không hiểu lời nói không.',
        keyPoint: 'Rối loạn ngôn ngữ xuất hiện đột ngột là dấu hiệu chỉ điểm.',
      },
      {
        stepNumber: 4,
        title: 'T - Time (Kích hoạt 115 & Ghi lại giờ)',
        detail: 'Nếu có BẤT KỲ 1 trong 3 dấu hiệu trên: Gọi 115 ngay lập tức. Đặt nạn nhân nằm đầu cao 30 độ, nghiêng sang một bên nếu nôn ói.',
        keyPoint: 'Giờ vàng tái thông mạch não là trong 3 - 4.5 giờ đầu tiên.',
      },
    ],
    avoidActions: [
      'Chích máu 10 đầu ngón tay hoặc dái tai (gây đau đớn kích thích tăng huyết áp vỡ mạch não).',
      'Cạo gió, xoa dầu nóng làm chậm trễ thời gian vàng đến bệnh viện.',
      'Tự ý cho uống thuốc hạ áp ngậm dưới lưỡi hoặc an cung ngưu hoàng hoàn (dễ sặc nghẹt thở vào phổi).',
    ],
    dangerSigns115: [
      'Đột ngột yếu liệt nửa người, méo mặt, không nói được.',
      'Đau đầu dữ dội chưa từng có trong đời kèm nôn ói nhiều hoặc lú lẫn mất ý thức.',
    ],
    quiz: [
      {
        question: 'Khi phát hiện người thân đột ngột bị méo miệng và yếu liệt một bên tay, hành động ĐÚNG ĐẮN DUY NHẤT là gì?',
        options: [
          'Lấy kim chích máu 10 đầu ngón tay',
          'Gọi 115 ngay lập tức và đưa người bệnh đến bệnh viện có đơn vị điều trị đột quỵ',
          'Cho uống viên an cung ngưu hoàng hoàn pha nước ấm',
          'Cạo gió dọc sống lưng và cho nằm nghỉ tại giường xem có đỡ không',
        ],
        correctIndex: 1,
        explanation: 'Đột quỵ cần được can thiệp tiêu sợi huyết hoặc lấy huyết khối trong giờ vàng y tế. Mọi biện pháp dân gian đều làm mất thời gian cứu não.',
      },
    ],
    relatedScenarioIds: ['sc_stroke_02'],
    copyrightStatus: 'World Stroke Organization Clinical Reference',
    embeddingAllowed: true,
    difficultyLevel: 'Cơ bản',
  },
  {
    id: 'res_seizure_firstaid',
    slug: 'so-cuu-con-co-giat-dong-kinh',
    title: 'Sơ Cứu Cơn Co Giật / Động Kinh: Bảo Vệ An Toàn Nạn Nhân',
    topic: 'seizure',
    description: 'Quy trình hỗ trợ người bị co giật, co cứng chân tay, sùi bọt mép phòng ngừa chấn thương sọ não và ngạt thở.',
    learningObjectives: [
      'Kê vật mềm dưới đầu nạn nhân và dọn dẹp vật cứng sắc nhọn xung quanh.',
      'Ghi lại thời gian cơn co giật diễn ra (nếu kéo dài > 5 phút phải cấp cứu khẩn cấp).',
      'Khi cơn co giật dứt, đặt nạn nhân nằm nghiêng tư thế hồi phục.',
    ],
    mediaType: 'video',
    sourceOrganization: 'CDC & Bệnh Viện Bạch Mai',
    sourcePageUrl: 'https://www.cdc.gov/epilepsy/about/first-aid.htm',
    youtubeVideoId: 'Ovsw7tdneqE',
    embedUrl: 'https://www.youtube-nocookie.com/embed/Ovsw7tdneqE?rel=0&modestbranding=1',
    thumbnailUrl: 'https://i.ytimg.com/vi/Ovsw7tdneqE/hqdefault.jpg',
    videoChannel: 'St John Ambulance',
    language: 'vi',
    durationSeconds: 140,
    publishedAt: '2024-07-10',
    reviewedAt: '2026-08-21',
    reviewedBy: 'Tài liệu chuẩn hóa theo Hướng dẫn Sơ cứu Động kinh — CDC & Epilepsy Foundation',
    reviewStatus: 'approved',
    evidenceLevel: 'Level A (CDC Epilepsy Guidelines)',
    applicableAudience: 'Giáo viên, nhân viên cứu hộ, cộng đồng',
    emergencyWarning: 'TUYỆT ĐỐI KHÔNG nhét đũa, chanh, ngón tay hay bất kỳ vật cứng nào vào miệng nạn nhân đang co giật.',
    steps: [
      {
        stepNumber: 1,
        title: 'Giữ bình tĩnh & Dọn dẹp khoảng trống xung quanh',
        detail: 'Đẩy bàn ghế, kính, vật sắc nhọn ra xa để nạn nhân không va đập trong lúc co giật chân tay.',
        keyPoint: 'Bảo vệ không gian an toàn quanh nạn nhân.',
      },
      {
        stepNumber: 2,
        title: 'Kê vật mềm dưới đầu & Nới lỏng cổ áo',
        detail: 'Gấp áo khoác, gối mềm hoặc khăn đặt dưới đầu nạn nhân để chống chấn thương sọ não. Nới lỏng cà vạt, cúc áo cổ.',
        keyPoint: 'Giúp đường thở thông thoáng và không bị đập đầu xuống nền cứng.',
      },
      {
        stepNumber: 3,
        title: 'Ghi nhận thời gian diễn ra cơn co giật',
        detail: 'Nhìn đồng hồ bấm giờ. Hầu hết cơn co giật sẽ tự chấm dứt trong 1–2 phút.',
        keyPoint: 'Nếu co giật kéo dài trên 5 phút, đó là tình trạng động kinh liên tục nguy hiểm tính mạng.',
      },
      {
        stepNumber: 4,
        title: 'Đặt nghiêng tư thế an toàn khi cơn giật dứt',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Recovery_position_maneuver.jpg/500px-Recovery_position_maneuver.jpg',
        imageAlt: 'Tư thế nằm nghiêng an toàn',
        imageCredit: 'Rama · CC BY-SA 3.0 FR · Wikimedia Commons',
        imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Recovery_position_maneuver.jpg',
        detail: 'Khi nạn nhân hết co giật, nhẹ nhàng xoay người nạn nhân sang thế nằm nghiêng an toàn để đờm nhớt và dịch tự chảy ra ngoài.',
        keyPoint: 'Không cho ăn uống bất cứ thứ gì cho đến khi tỉnh táo hoàn toàn.',
      },
    ],
    avoidActions: [
      'Nhét khăn, đũa gỗ hay ngón tay vào miệng nạn nhân (sẽ làm gãy răng, tổn thương hàm hoặc dị vật rơi vào khí quản).',
      'Đè chặt hoặc cố ghì giữ tay chân nạn nhân lại (dễ gây trật khớp, gãy xương).',
      'Vắt chanh vào miệng người đang hôn mê co giật gây sặc ngạt thở tử vong.',
    ],
    dangerSigns115: [
      'Cơn co giật kéo dài trên 5 phút hoặc xuất hiện liên tiếp cơn thứ 2 mà chưa tỉnh lại.',
      'Nạn nhân bị co giật dưới nước hoặc có chấn thương đầu chảy máu.',
      'Nạn nhân là phụ nữ mang thai hoặc người bị đái tháo đường.',
    ],
    quiz: [
      {
        question: 'Quan niệm nhét đũa hoặc vắt chanh vào miệng người đang co giật là đúng hay sai theo chuẩn y khoa?',
        options: [
          'Đúng, giúp nạn nhân không cắn vào lưỡi và tỉnh lại nhanh',
          'Hoàn toàn sai và cực kỳ nguy hiểm, có thể làm gãy răng, sặc dịch vào phổi gây tắc thở',
          'Chỉ nên làm với trẻ em',
          'Đúng nếu dùng đũa bọc khăn',
        ],
        correctIndex: 1,
        explanation: 'Cơ hàm co cứng rất mạnh khi co giật. Nhét vật lạ vào miệng có nguy cơ làm gãy răng, tổn thương hầu họng hoặc dị vật rơi vào khí quản gây ngạt thở tử vong.',
      },
    ],
    relatedScenarioIds: ['sc_ohca_01'],
    copyrightStatus: 'CDC Public Health Epilepsy Reference',
    embeddingAllowed: true,
    difficultyLevel: 'Cơ bản',
  },
  {
    id: 'res_traffic_accident',
    slug: 'so-cuu-hien-truong-tai-nan-giao-thong',
    title: 'Sơ Cứu Ban Đầu Hiện Trường Tai Nạn Giao Thông (Nghị Định 279/2025)',
    topic: 'traffic_accident',
    description: 'Quy trình đảm bảo an toàn giao thông, cảnh báo từ xa, cố định trục cột sống cổ và phối hợp với Trung tâm Cấp cứu 115 theo chính sách Quỹ Giảm thiểu Thiệt hại Tai nạn Giao thông.',
    learningObjectives: [
      'Đặt vật cảnh báo phản quang từ xa 50–100m để phòng ngừa tai nạn liên hoàn.',
      'Nắm vững nguyên tắc không di chuyển người nghi chấn thương cột sống trừ nguy cơ cháy nổ.',
      'Bảo vệ nạn nhân và phối hợp điều phối 115 theo Nghị định 279/2025/NĐ-CP.',
    ],
    mediaType: 'video',
    sourceOrganization: 'Ủy Ban An Toàn Giao Thông Quốc Gia & Cấp Cứu 115',
    sourcePageUrl: 'http://atgt.gov.vn/',
    youtubeVideoId: 'GmqXqwSV3bo',
    embedUrl: 'https://www.youtube-nocookie.com/embed/GmqXqwSV3bo?rel=0&modestbranding=1',
    thumbnailUrl: 'https://i.ytimg.com/vi/GmqXqwSV3bo/hqdefault.jpg',
    videoChannel: 'St John Ambulance',
    language: 'vi',
    durationSeconds: 210,
    publishedAt: '2025-01-20',
    reviewedAt: '2026-08-23',
    reviewedBy: 'Tài liệu chuẩn hóa theo Nghị định 279/2025/NĐ-CP & Ủy Ban An Toàn Giao Thông Quốc Gia',
    reviewStatus: 'approved',
    evidenceLevel: 'Level A (Nghị định 279/2025/NĐ-CP & ATGT Quốc Gia)',
    applicableAudience: 'Người tham gia giao thông, lái xe công nghệ, cảnh sát giao thông',
    emergencyWarning: 'Không tự ý kéo xốc nách hoặc bế gập người bị nạn lên xe máy vì có thể làm đứt tủy sống cổ gây liệt tứ chi vĩnh viễn.',
    steps: [
      {
        stepNumber: 1,
        title: 'Đặt biển báo cảnh báo an toàn từ xa',
        detail: 'Tắt khóa điện xe bị nạn. Đặt cọc tiêu, cành cây hoặc bật đèn khẩn cấp cách hiện trường 50–100m để các xe khác giảm tốc độ.',
        keyPoint: 'Phòng ngừa tai nạn thứ phát đâm vào người cứu hộ.',
      },
      {
        stepNumber: 2,
        title: 'Gọi 115 và 113 báo rõ vị trí km/đoạn đường',
        detail: 'Cung cấp chính xác vị trí làn đường, số người bị thương, phương tiện liên quan (xe máy, xe tải, xe khách).',
        keyPoint: 'Điều động cả xe cứu thương và lực lượng điều tiết giao thông.',
      },
      {
        stepNumber: 3,
        title: 'Cố định trục đầu - cổ - thân mình nạn nhân',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Cervical_collar.jpg/500px-Cervical_collar.jpg',
        imageAlt: 'Nẹp cổ giữ thẳng trục đầu – cổ',
        imageCredit: 'Pagemaker787 · CC BY-SA 4.0 · Wikimedia Commons',
        imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Cervical_collar.jpg',
        detail: 'Nếu nạn nhân nằm trên đường, giữ thẳng trục đầu, cổ và lưng. Dùng hai tay giữ hai bên đầu nạn nhân cố định ở tư thế trung gian.',
        keyPoint: 'Tránh gập cổ hoặc xoay cổ đột ngột.',
      },
      {
        stepNumber: 4,
        title: 'Cầm máu khẩn cấp & Giữ ấm chờ xe cấp cứu',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/RescueFoil.jpg/500px-RescueFoil.jpg',
        imageAlt: 'Chăn giữ nhiệt cứu hộ',
        imageCredit: 'Wikimedia contributor · CC BY-SA 3.0 · Wikimedia Commons',
        imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:RescueFoil.jpg',
        detail: 'Băng ép đè trực tiếp các điểm chảy máu. Đắp chăn hoặc áo giữ ấm, liên tục động viên người bị nạn.',
        keyPoint: 'Chỉ di chuyển nạn nhân khi có cáng cứng hoặc nguy cơ cháy nổ bùng phát.',
      },
    ],
    avoidActions: [
      'Kéo giật người bị nạn nghi gãy cột sống lên yên sau xe máy chở đi cấp cứu.',
      'Cởi mũ bảo hiểm thô bạo làm xoắn vặn đốt sống cổ bị tổn thương.',
      'Tụ tập quay phim cản trở đường lưu thông của xe cứu thương 115.',
    ],
    dangerSigns115: [
      'Nạn nhân bất tỉnh, chảy máu tai/mũi (nghi vỡ nền sọ).',
      'Biến dạng gãy xương hở đùi hoặc cẳng chân, xương đâm qua da.',
      'Tức ngực khó thở dữ dội, tím tái môi đầu chi.',
    ],
    quiz: [
      {
        question: 'Tại sao không được bế xốc nách hoặc gập người một nạn nhân tai nạn giao thông đang nằm bất động trên đường?',
        options: [
          'Vì làm bẩn quần áo người cứu hộ',
          'Vì nếu nạn nhân bị chấn thương cột sống cổ/lưng, việc gập người có thể làm di lệch xương gãy gây đứt tủy sống dẫn đến liệt tứ chi hoặc tử vong',
          'Vì xe cấp cứu 115 bắt buộc phải là đơn vị duy nhất được chạm vào',
          'Vì làm trầy xước sơn xe',
        ],
        correctIndex: 1,
        explanation: 'Bất động trục cột sống là nguyên tắc sống còn trong chấn thương giao thông nhằm bảo vệ tủy sống khỏi bị chèn ép hoặc đứt rời.',
      },
    ],
    relatedScenarioIds: ['sc_bleeding_03', 'sc_ohca_01'],
    copyrightStatus: 'Ủy Ban An Toàn Giao Thông Quốc Gia Documentation',
    embeddingAllowed: true,
    difficultyLevel: 'Nâng cao',
  },
];

// ==========================================
// CATALOG QUERY & HELPER FUNCTIONS
// ==========================================

/**
 * Lấy danh sách toàn bộ tài nguyên học tập đã được duyệt ('approved')
 */
export function getApprovedLearningResources(topicFilter?: string): MedicalLearningResource[] {
  return APPROVED_LEARNING_RESOURCES.filter((res) => {
    if (res.reviewStatus !== 'approved') return false;
    if (!topicFilter || topicFilter === 'all') return true;
    return res.topic === topicFilter;
  });
}

/**
 * Tìm kiếm tài nguyên theo Slug hoặc ID
 */
export function getLearningResourceBySlugOrId(identifier: string): MedicalLearningResource | undefined {
  const found = APPROVED_LEARNING_RESOURCES.find(
    (res) => (res.slug === identifier || res.id === identifier) && res.reviewStatus === 'approved'
  );
  return found;
}

/**
 * Lấy tối đa 2 tài nguyên liên quan cho kịch bản luyện tập
 */
export function getApprovedResourcesForScenario(scenarioCategoryOrId: string): MedicalLearningResource[] {
  const approved = APPROVED_LEARNING_RESOURCES.filter((r) => r.reviewStatus === 'approved');

  // Match by scenario ID in relatedScenarioIds or topic match
  const matching = approved.filter((r) => {
    if (r.relatedScenarioIds.includes(scenarioCategoryOrId)) return true;
    if (scenarioCategoryOrId === 'cardiac_arrest' && (r.topic === 'cardiac_arrest' || r.topic === 'aed_usage' || r.topic === 'scene_safety')) return true;
    if (scenarioCategoryOrId === 'stroke' && (r.topic === 'stroke' || r.topic === 'emergency_call')) return true;
    if (scenarioCategoryOrId === 'bleeding' && (r.topic === 'bleeding' || r.topic === 'scene_safety')) return true;
    if (scenarioCategoryOrId === 'sc_ohca_01' && (r.topic === 'cardiac_arrest' || r.topic === 'aed_usage')) return true;
    if (scenarioCategoryOrId === 'sc_stroke_02' && (r.topic === 'stroke' || r.topic === 'emergency_call')) return true;
    if (scenarioCategoryOrId === 'sc_bleeding_03' && (r.topic === 'bleeding' || r.topic === 'scene_safety')) return true;
    return false;
  });

  return matching.slice(0, 2);
}

/**
 * Tìm kiếm tài nguyên đã duyệt theo từ khóa
 */
export function searchApprovedResources(keyword: string, topic: string = 'all'): MedicalLearningResource[] {
  const cleanKeyword = keyword.trim().toLowerCase();
  const list = getApprovedLearningResources(topic);

  if (!cleanKeyword) return list;

  return list.filter((r) => {
    return (
      r.title.toLowerCase().includes(cleanKeyword) ||
      r.description.toLowerCase().includes(cleanKeyword) ||
      r.sourceOrganization.toLowerCase().includes(cleanKeyword) ||
      r.learningObjectives.some((obj) => obj.toLowerCase().includes(cleanKeyword)) ||
      r.steps.some((st) => st.title.toLowerCase().includes(cleanKeyword) || st.detail.toLowerCase().includes(cleanKeyword))
    );
  });
}
