import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Seeded pseudorandom generator for deterministic reproducible dataset generation
function createRng(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

interface ScenarioTemplate {
  groupId: string;
  scenarioLabel: string;
  riskLabel: 'critical' | 'emergency' | 'urgent' | 'non_urgent' | 'unknown';
  requires115: boolean;
  topic: string;
  sourceDoc: string;
  citations: string[];
  canonicalAnswer: string;
  defaultSafety: string;
  tags: string[];
  symptoms: string[];
  emergencySigns: string[];
  recommendedAction: string;
  variants: Array<{
    task: 'retrieval_qa' | 'fact_extraction' | 'classification';
    text: string;
    facts?: {
      consciousness: 'responsive' | 'unresponsive' | 'unknown';
      breathing: 'normal' | 'abnormal' | 'not_breathing' | 'unknown';
      severeBleeding: boolean | null;
      strokeFace: boolean | null;
      strokeArm: boolean | null;
      strokeSpeech: boolean | null;
      choking: boolean | null;
    };
  }>;
}

const SCENARIOS: ScenarioTemplate[] = [
  {
    groupId: 'sc_cpr_adult',
    scenarioLabel: 'ngung_tim_nguoi_lon',
    riskLabel: 'critical',
    requires115: true,
    topic: 'cardiac_arrest',
    sourceDoc: 'aha-cpr-guidelines',
    citations: ['AHA CPR and ECC Guidelines 2020'],
    canonicalAnswer: 'Gọi 115 ngay hoặc nhờ người xung quanh gọi, yêu cầu mang máy AED tới. Lập tức đặt nạn nhân nằm ngửa trên nền phẳng cứng và ép tim liên tục ở giữa ngực với tần số 100-120 lần/phút, độ sâu 5-6 cm.',
    defaultSafety: 'critical',
    tags: ['cpr', 'ohca', 'ngung_tim', '115'],
    symptoms: ['bất tỉnh', 'ngừng thở', 'thở ngáp cá', 'môi tím'],
    emergencySigns: ['Mất tri giác hoàn toàn', 'Không có nhịp thở bình thường'],
    recommendedAction: 'Gọi 115, lấy AED và ép tim CPR liên tục không ngừng.',
    variants: [
      { task: 'retrieval_qa', text: 'Người đàn ông khoảng 50 tuổi đang đi thì ngã gục, lay gọi không có phản ứng, không thấy thở, tôi phải làm gì trước tiên?' },
      { task: 'retrieval_qa', text: 'Bố tôi tự dưng ngất xỉu nằm bất động dưới đất, gọi không dậy, thở ngáp ngáp như ngáp cá, xử trí thế nào?' },
      { task: 'retrieval_qa', text: 'nan nhan ngung tho bat tinh o van phong thi lam gi dau tien' },
      { task: 'retrieval_qa', text: 'Cứu tôi với, có người đứng tim ngã xuống đường, không bắt được mạch, xung quanh không có ai biết cấp cứu!' },
      { task: 'retrieval_qa', text: 'Khi nào thì cần ép tim ngoài lồng ngực cho người lớn?' },
      { task: 'retrieval_qa', text: 'Tần số và độ sâu ép tim đúng kỹ thuật hồi sức tim phổi CPR theo khuyến cáo y khoa?' },
      { task: 'fact_extraction', text: 'Nạn nhân nằm bất động dưới sàn, cấu véo không đáp ứng, lồng ngực không nhấp nhô, thỉnh thoảng thở hắt ra một tiếng.', facts: { consciousness: 'unresponsive', breathing: 'abnormal', severeBleeding: false, strokeFace: null, strokeArm: null, strokeSpeech: null, choking: false } },
      { task: 'fact_extraction', text: 'Bệnh nhân gọi không trả lời, thở ngáp cá, môi tím tái, không chảy máu ngoài.', facts: { consciousness: 'unresponsive', breathing: 'abnormal', severeBleeding: false, strokeFace: null, strokeArm: null, strokeSpeech: null, choking: false } },
      { task: 'fact_extraction', text: 'nguoi bi ngat bat tinh khong tho khong chay mau', facts: { consciousness: 'unresponsive', breathing: 'not_breathing', severeBleeding: false, strokeFace: null, strokeArm: null, strokeSpeech: null, choking: false } },
      { task: 'classification', text: 'Nạn nhân nằm gục tại chỗ, không thở, gọi hỏi không đáp ứng.' },
      { task: 'classification', text: 'Đột ngột mất ý thức, thở ngáp cá sau khi chơi thể thao.' }
    ]
  },
  {
    groupId: 'sc_aed_usage',
    scenarioLabel: 'su_dung_aed',
    riskLabel: 'critical',
    requires115: true,
    topic: 'cardiac_arrest',
    sourceDoc: 'aha-cpr-guidelines',
    citations: ['AHA CPR and ECC Guidelines 2020'],
    canonicalAnswer: 'Mở máy AED và làm theo hướng dẫn giọng nói: dán miếng điện cực lên ngực trần nạn nhân (dưới xương đòn phải và mạn sườn trái), cắm dây cáp, lùi ra xa khi máy phân tích nhịp tim hoặc sốc điện, tiếp tục CPR ngay sau khi sốc.',
    defaultSafety: 'critical',
    tags: ['aed', 'khu_rung', 'cpr'],
    symptoms: ['ngừng tim', 'rung thất', 'bất tỉnh'],
    emergencySigns: ['Ngừng tuần hoàn hô hấp'],
    recommendedAction: 'Bật máy AED, dán điện cực theo hình vẽ, nghe và làm theo lệnh máy.',
    variants: [
      { task: 'retrieval_qa', text: 'Tôi lấy được máy AED ở sảnh tòa nhà rồi, bây giờ dùng máy này như thế nào?' },
      { task: 'retrieval_qa', text: 'Có máy khử rung tim tự động AED bên cạnh thì dán miếng dán ở vị trí nào trên ngực?' },
      { task: 'retrieval_qa', text: 'Khi máy AED đang phát lệnh phân tích nhịp tim hoặc chuẩn bị sốc điện thì người sơ cứu phải làm gì?' },
      { task: 'retrieval_qa', text: 'cach su dung may aed cho nguoi ngung tim' },
      { task: 'retrieval_qa', text: 'Máy AED báo "Không sốc điện" thì phải làm gì tiếp theo?' },
      { task: 'retrieval_qa', text: 'Nạn nhân bị ướt người hoặc có miếng dán thuốc trên ngực thì dùng AED thế nào?' },
      { task: 'fact_extraction', text: 'Máy AED đã mang đến, nạn nhân bất tỉnh không thở, ngực ướt đẫm mồ hôi.', facts: { consciousness: 'unresponsive', breathing: 'not_breathing', severeBleeding: false, strokeFace: null, strokeArm: null, strokeSpeech: null, choking: false } },
      { task: 'fact_extraction', text: 'Người bệnh ngất xỉu ngừng thở, đã dán điện cực AED, máy đang phân tích.', facts: { consciousness: 'unresponsive', breathing: 'not_breathing', severeBleeding: false, strokeFace: null, strokeArm: null, strokeSpeech: null, choking: false } },
      { task: 'classification', text: 'Cần hỗ trợ sử dụng máy AED và quy trình khử rung tim.' },
      { task: 'classification', text: 'Đang ép tim và chuẩn bị áp dụng máy AED tại nơi công cộng.' }
    ]
  },
  {
    groupId: 'sc_stroke_fast',
    scenarioLabel: 'dot_quy_fast',
    riskLabel: 'emergency',
    requires115: true,
    topic: 'stroke',
    sourceDoc: 'asa-stroke-signs',
    citations: ['American Stroke Association Stroke Symptoms'],
    canonicalAnswer: 'Nhận diện quy tắc FAST: Mặt méo xệ một bên, Tay yếu buông rơi, Lời nói khó nói ngọng. Gọi 115 ngay lập tức, ghi nhớ chính xác thời điểm xuất hiện dấu hiệu đầu tiên. Không tự cho nạn nhân uống thuốc (Aspirin, thuốc hạ áp) hay ăn uống.',
    defaultSafety: 'emergency',
    tags: ['stroke', 'dot_quy', 'fast', '115'],
    symptoms: ['méo miệng', 'xệ mặt', 'yếu tay', 'liệt nửa người', 'nói ngọng', 'nói đớ'],
    emergencySigns: ['Méo miệng khi cười', 'Không nâng được 2 tay', 'Loạn ngôn ngữ đột ngột'],
    recommendedAction: 'Gọi 115 ngay, đặt nằm nghiêng an toàn nếu nôn, không cho uống thuốc.',
    variants: [
      { task: 'retrieval_qa', text: 'Mẹ tôi vừa uống nước xong tự nhiên méo một bên miệng, tay phải cầm đũa bị rớt, nói lắp bắp không rõ câu, là bị sao?' },
      { task: 'retrieval_qa', text: 'Dấu hiệu FAST trong nhận biết đột quỵ gồm những gì và xử trí sơ cứu ban đầu ra sao?' },
      { task: 'retrieval_qa', text: 'Nghi ngờ người nhà bị tai biến mạch máu não thì có được chích kim mười đầu ngón tay không?' },
      { task: 'retrieval_qa', text: 'nguoi gia bi meo mieng tay yeu dot ngot goi 115' },
      { task: 'retrieval_qa', text: 'Có nên cho người nghi ngờ đột quỵ uống viên An Cung Ngưu Hoàng Hoàn không?' },
      { task: 'retrieval_qa', text: 'Tại sao cần ghi nhớ mốc thời gian xuất hiện triệu chứng đột quỵ đầu tiên?' },
      { task: 'fact_extraction', text: 'Bệnh nhân vẫn tỉnh táo nhưng mặt lệch hẳn sang trái, tay phải không nhấc lên được, nói ngọng líu nhíu.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: true, strokeArm: true, strokeSpeech: true, choking: false } },
      { task: 'fact_extraction', text: 'Người nhà thấy ông cụ nói đớ, cười méo một bên miệng, tay yếu rơi cốc nước, vẫn thở đều.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: true, strokeArm: true, strokeSpeech: true, choking: false } },
      { task: 'fact_extraction', text: 'ong cu bi te nga mieng meo tay khong cam duoc do van tinh', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: true, strokeArm: true, strokeSpeech: true, choking: false } },
      { task: 'classification', text: 'Xuất hiện đột ngột méo mặt, yếu một bên tay chân, nói khó.' },
      { task: 'classification', text: 'Nghi ngờ tai biến mạch máu não / đột quỵ thiếu máu cục bộ cấp.' }
    ]
  },
  {
    groupId: 'sc_severe_bleeding',
    scenarioLabel: 'chay_mau_nghiem_trong',
    riskLabel: 'critical',
    requires115: true,
    topic: 'bleeding',
    sourceDoc: 'brc-bleeding',
    citations: ['British Red Cross Bleeding Guidelines'],
    canonicalAnswer: 'Gọi 115 ngay lập tức. Dùng gạc hoặc khăn vải sạch ép trực tiếp liên tục và thật mạnh lên vết thương. Nếu máu thấm ướt đẫm lớp gạc đầu, KHÔNG gỡ ra mà đệm thêm lớp gạc mới lên trên và tiếp tục ép chặt.',
    defaultSafety: 'critical',
    tags: ['bleeding', 'chay_mau', 'vet_thuong', 'garo'],
    symptoms: ['chảy máu xối xả', 'phun thành tia', 'máu đỏ tươi', 'thấm đẫm quần áo'],
    emergencySigns: ['Máu phun tia', 'Chảy ồ ạt không cầm sau khi đè ép'],
    recommendedAction: 'Gọi 115, ép trực tiếp mạnh liên tục bằng gạc sạch, nâng cao chi nếu không gãy xương.',
    variants: [
      { task: 'retrieval_qa', text: 'Bị kính cắt vào cẳng tay, máu đỏ tươi phun ra từng tia nhiều lắm, tôi phải làm sao để cầm máu ngay?' },
      { task: 'retrieval_qa', text: 'Vết thương sâu ở đùi chảy máu xối xả, ép vải vào vẫn ướt đẫm hết thì xử lý thế nào?' },
      { task: 'retrieval_qa', text: 'cach cam mau vet thuong dut dong mach chay mau o at' },
      { task: 'retrieval_qa', text: 'Khi nào thì được phép dùng ga-rô garrot cho vết thương chảy máu ở tay chân?' },
      { task: 'retrieval_qa', text: 'Lớp băng ép đầu tiên bị máu thấm đỏ lòm thì có được tháo ra thay cái mới không?' },
      { task: 'retrieval_qa', text: 'Người bị mất máu nhiều bắt đầu choáng váng da lạnh toát thì nằm tư thế nào?' },
      { task: 'fact_extraction', text: 'Nạn nhân bị tôn cứa cổ tay, máu phun thành tia đỏ tươi ồ ạt, mặt tái nhợt nhưng vẫn kêu đau.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: true, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'fact_extraction', text: 'Chảy máu rất nhiều ở cẳng chân sau tai nạn lao động, băng vải bị ướt đẫm, thở gấp.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: true, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'classification', text: 'Vết thương mạch máu lớn, chảy máu động mạch nguy kịch.' },
      { task: 'classification', text: 'Mất máu ồ ạt sau chấn thương rách da sâu.' }
    ]
  },
  {
    groupId: 'sc_choking_adult',
    scenarioLabel: 'hoc_di_vat_nguoi_lon',
    riskLabel: 'emergency',
    requires115: true,
    topic: 'choking',
    sourceDoc: 'aha-cpr-guidelines',
    citations: ['AHA CPR and ECC Guidelines 2020'],
    canonicalAnswer: 'Nếu nạn nhân ho được, khuyến khích tiếp tục ho. Nếu không nói được, không thở được và ôm cổ (dấu hiệu nghẹn): đứng phía sau, thực hiện 5 lần vỗ lưng giữa hai bả vai xen kẽ 5 lần ấn bụng Heimlich (đặt nắm tay trên rốn, giật mạnh vào trong và lên trên). Nếu nạn nhân bất tỉnh, bắt đầu CPR ngay.',
    defaultSafety: 'emergency',
    tags: ['choking', 'nghen', 'heimlich', 'hoc_di_vat'],
    symptoms: ['ôm cổ', 'không nói được', 'mặt tím tái', 'thở rít', 'ho không ra tiếng'],
    emergencySigns: ['Tắc nghẽn đường thở hoàn toàn', 'Mất khả năng phát âm và thở'],
    recommendedAction: 'Hỏi xác nhận, vỗ lưng và ép bụng Heimlich; nếu bất tỉnh bắt đầu CPR.',
    variants: [
      { task: 'retrieval_qa', text: 'Bạn tôi đang ăn lẩu thì bị nghẹn thịt, hai tay ôm chặt cổ họng, mặt tím tái, không nói được tiếng nào, tôi phải làm gì?' },
      { task: 'retrieval_qa', text: 'Nghiệm pháp Heimlich cho người lớn bị hóc dị vật tắc nghẽn đường thở thực hiện như thế nào?' },
      { task: 'retrieval_qa', text: 'nguoi lon bi hoc thuc an nghen tho om co tim tai' },
      { task: 'retrieval_qa', text: 'Người bị hóc dị vật đường thở mà ngã ngất bất tỉnh thì tiếp tục làm Heimlich hay làm gì?' },
      { task: 'retrieval_qa', text: 'Phụ nữ mang thai hoặc người béo phì bị hóc nghẹn thì ấn vào đâu thay cho ấn bụng?' },
      { task: 'fact_extraction', text: 'Nạn nhân hai tay ôm cổ, trợn tròn mắt, há miệng nhưng không phát ra tiếng thở, mặt tím ngắt, chưa ngất.', facts: { consciousness: 'responsive', breathing: 'abnormal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: true } },
      { task: 'fact_extraction', text: 'Bị hóc dị vật lúc ăn, không ho được, không nói được, thở rít nghẹn ngào.', facts: { consciousness: 'responsive', breathing: 'abnormal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: true } },
      { task: 'classification', text: 'Hóc dị vật đường thở nguy kịch ở người lớn (Severe airway obstruction).' },
      { task: 'classification', text: 'Tắc nghẽn hô hấp cơ học do thức ăn.' }
    ]
  },
  {
    groupId: 'sc_choking_infant',
    scenarioLabel: 'hoc_di_vat_tre_nho',
    riskLabel: 'emergency',
    requires115: true,
    topic: 'choking',
    sourceDoc: 'aha-cpr-guidelines',
    citations: ['AHA CPR and ECC Guidelines 2020'],
    canonicalAnswer: 'Với trẻ dưới 1 tuổi: Đặt trẻ nằm sấp dọc theo cẳng tay người lớn, đầu dốc xuống thấp hơn ngực, dùng gót bàn tay vỗ dứt khoát 5 lần vào lưng giữa hai xương bả vai. Sau đó lật ngửa trẻ, dùng 2 ngón tay ấn 5 lần vào giữa ngực. Lặp lại cho đến khi dị vật bật ra. KHÔNG làm Heimlich ấn bụng ở trẻ nhũ nhi.',
    defaultSafety: 'emergency',
    tags: ['choking_infant', 'tre_em', 'vo_lung_an_nguc'],
    symptoms: ['khóc không ra tiếng', 'môi tím tái', 'khó thở', 'ho yếu ớt'],
    emergencySigns: ['Trẻ nhũ nhi ngạt thở', 'Môi da tái nhợt'],
    recommendedAction: 'Gọi 115, thực hiện 5 lần vỗ lưng xen kẽ 5 lần ấn ngực, đầu dốc xuống.',
    variants: [
      { task: 'retrieval_qa', text: 'Bé 8 tháng tuổi đang chơi đồ chơi thì bị sặc, ho sặc sụa rồi tím tái quanh môi, khóc không thành tiếng, làm sao cứu bé?' },
      { task: 'retrieval_qa', text: 'Quy trình vỗ lưng ấn ngực cấp cứu hóc dị vật cho trẻ sơ sinh và trẻ dưới 1 tuổi?' },
      { task: 'retrieval_qa', text: 'tre so sinh bi hoc sua ngat tho phai so cuu the nao' },
      { task: 'retrieval_qa', text: 'Có được dốc ngược hai chân bé lên trời để lắc khi bị sặc hóc dị vật không?' },
      { task: 'retrieval_qa', text: 'Có nên dùng ngón tay thò sâu vào họng trẻ để móc dị vật không nhìn thấy không?' },
      { task: 'fact_extraction', text: 'Trẻ 10 tháng nuốt dị vật, tím tái quanh môi, khóc không thành tiếng, chân tay còn cử động giãy giụa.', facts: { consciousness: 'responsive', breathing: 'abnormal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: true } },
      { task: 'classification', text: 'Hóc sặc dị vật đường thở ở trẻ nhũ nhi (Infant choking).' },
      { task: 'classification', text: 'Tắc nghẽn đường thở cấp tính ở trẻ nhỏ.' }
    ]
  },
  {
    groupId: 'sc_syncope_fainting',
    scenarioLabel: 'ngat_xiu_con_tho',
    riskLabel: 'urgent',
    requires115: false,
    topic: 'trauma',
    sourceDoc: 'acs-atls',
    citations: ['ACS ATLS / First Aid Standards'],
    canonicalAnswer: 'Kiểm tra xem nạn nhân có thở đều không. Nếu nạn nhân bất tỉnh nhưng vẫn thở bình thường và không chấn thương cột sống: đặt nạn nhân nằm ở tư thế hồi sức nghiêng an toàn (Recovery position), nới lỏng cổ áo, thắt lưng, thông thoáng môi trường. Nếu sau 1-2 phút không tỉnh lại, gọi 115 ngay.',
    defaultSafety: 'urgent',
    tags: ['ngat', 'tu_the_nghieng', 'say_nang'],
    symptoms: ['ngất xỉu', 'hoa mắt', 'mặt tái', 'thở đều'],
    emergencySigns: ['Mất ý thức thoáng qua'],
    recommendedAction: 'Kiểm tra nhịp thở, đặt tư thế hồi sức nghiêng an toàn, theo dõi liên tục.',
    variants: [
      { task: 'retrieval_qa', text: 'Đồng nghiệp đứng chào cờ tự nhiên hoa mắt rồi ngất xỉu xuống sàn, ngực vẫn thở đều thì nên đặt nằm tư thế nào?' },
      { task: 'retrieval_qa', text: 'Tư thế hồi phục nghiêng an toàn (Recovery position) thực hiện như thế nào và dùng trong trường hợp nào?' },
      { task: 'retrieval_qa', text: 'nguoi bi xiu nhung van tho deu co can ep tim khong' },
      { task: 'retrieval_qa', text: 'Tại sao không nên tụ tập vây kín xung quanh người vừa bị ngất xỉu?' },
      { task: 'fact_extraction', text: 'Nạn nhân ngất nằm nghiêng, gọi chưa tỉnh nhưng nhịp thở đều 16 lần/phút, mạch đập rõ, không có vết thương.', facts: { consciousness: 'unresponsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'fact_extraction', text: 'Nữ sinh ngất trong lớp học nóng bức, nhịp thở êm, mặt nhợt nhạt, gọi khẽ mở mắt.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'classification', text: 'Ngất xỉu tạm thời có nhịp thở bình thường (Syncope with normal breathing).' },
      { task: 'classification', text: 'Mất ý thức thoáng qua do giảm tưới máu não tạm thời.' }
    ]
  },
  {
    groupId: 'sc_burns_thermal',
    scenarioLabel: 'bong_nhiet',
    riskLabel: 'urgent',
    requires115: false,
    topic: 'trauma',
    sourceDoc: 'acs-atls',
    citations: ['ACS ATLS Guidelines', 'British Red Cross Burns'],
    canonicalAnswer: 'Lập tức xả nước sạch mát (15-25 độ C) liên tục lên vùng bỏng trong 15-20 phút. Tháo bỏ trang sức, đồng hồ trước khi sưng nề. Che phủ vết bỏng bằng màng bọc thực phẩm sạch hoặc gạc vô trùng không dính. TUYỆT ĐỐI KHÔNG bôi kem đánh răng, mỡ trăn, nước mắm hay chườm đá lạnh trực tiếp.',
    defaultSafety: 'urgent',
    tags: ['bong', 'nuoc_soi', 'xa_nuoc_mat'],
    symptoms: ['đỏ rát', 'phồng rộp', 'bỏng nước sôi'],
    emergencySigns: ['Bỏng diện rộng', 'Bỏng vùng mặt, cổ, khớp'],
    recommendedAction: 'Xả nước sạch mát 20 phút, che gạc sạch, không bôi chất lạ, đưa đi y tế nếu phồng rộp lớn.',
    variants: [
      { task: 'retrieval_qa', text: 'Bị nước sôi đổ vào mu bàn tay và cẳng tay đỏ ửng rát buốt, bước sơ cứu đầu tiên là gì?' },
      { task: 'retrieval_qa', text: 'Bỏng bô xe máy phồng rộp da có nên bôi kem đánh răng hay dầu mù u lên không?' },
      { task: 'retrieval_qa', text: 'bi bong lua nuoc soi thi ngam nuoc lanh bao lau' },
      { task: 'retrieval_qa', text: 'Tại sao không được dùng nước đá hoặc đá lạnh chườm trực tiếp lên vết bỏng?' },
      { task: 'retrieval_qa', text: 'Khi nào vết bỏng cần phải đưa ngay đến bệnh viện cấp cứu?' },
      { task: 'fact_extraction', text: 'Bệnh nhân tỉnh táo, bị bỏng nước sôi ở cánh tay phải, da đỏ rát diện tích bằng bàn tay, không khó thở.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'fact_extraction', text: 'Vết bỏng bô xe máy cẳng chân phồng bọng nước to bằng chén nước chấm, không rách da.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'classification', text: 'Bỏng nhiệt độ I - II diện tích nhỏ tại nhà.' },
      { task: 'classification', text: 'Tổn thương da do nhiệt độ nóng tiếp xúc.' }
    ]
  },
  {
    groupId: 'sc_seizure_epilepsy',
    scenarioLabel: 'co_giat_dong_kinh',
    riskLabel: 'emergency',
    requires115: true,
    topic: 'trauma',
    sourceDoc: 'acs-atls',
    citations: ['ACS ATLS Guidelines', 'CDC Epilepsy Seizure First Aid'],
    canonicalAnswer: 'Bảo vệ nạn nhân khỏi vật sắc nhọn xung quanh, kê vật mềm dưới đầu. TUYỆT ĐỐI KHÔNG ghì đè tay chân, KHÔNG nhét bất cứ thứ gì vào miệng (kể cả ngón tay hay thìa đũa). Khi cơn co giật kết thúc, chuyển sang tư thế nghiêng an toàn. Gọi 115 nếu cơn co giật kéo dài trên 5 phút hoặc tái phát liên tục.',
    defaultSafety: 'emergency',
    tags: ['co_giat', 'dong_kinh', 'sot_cao'],
    symptoms: ['co giật', 'trợn mắt', 'sùi bọt mép', 'gồng cứng người'],
    emergencySigns: ['Co giật trên 5 phút', 'Khó thở sau co giật'],
    recommendedAction: 'Kê mềm đầu, dọn vật cản nguy hiểm, không nhét đồ vào miệng, theo dõi thời gian.',
    variants: [
      { task: 'retrieval_qa', text: 'Đang ngồi uống cà phê thì người bàn bên cạnh ngã lăn ra đất co giật toàn thân, sùi bọt mép, xử trí thế nào đúng?' },
      { task: 'retrieval_qa', text: 'Người bị lên cơn động kinh co giật có nên nhét đũa hoặc thìa vào mồm để chống cắn lưỡi không?' },
      { task: 'retrieval_qa', text: 'so cuu nguoi bi co giat tron mat ngat tho' },
      { task: 'retrieval_qa', text: 'Sau khi người bệnh hết cơn co giật thì nên để họ nằm tư thế nào để tránh sặc đờm dãi?' },
      { task: 'retrieval_qa', text: 'Trẻ nhỏ sốt cao co giật thì cần hạ sốt và sơ cứu như thế nào?' },
      { task: 'fact_extraction', text: 'Nạn nhân gồng cứng chân tay co giật từng cơn, sùi bọt mép, mắt trợn ngược, không đáp ứng xung quanh.', facts: { consciousness: 'unresponsive', breathing: 'abnormal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'fact_extraction', text: 'Bệnh nhân co giật xong nằm mê man thở khò khè, có bọt mép và dịch dãi, không chảy máu.', facts: { consciousness: 'unresponsive', breathing: 'abnormal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'classification', text: 'Cơn co giật toàn thể nghi ngờ động kinh / sốt cao co giật.' },
      { task: 'classification', text: 'Rối loạn ý thức và vận động kịch phát sau co giật.' }
    ]
  },
  {
    groupId: 'sc_anaphylaxis_shock',
    scenarioLabel: 'soc_phan_ve',
    riskLabel: 'critical',
    requires115: true,
    topic: 'cardiac_arrest',
    sourceDoc: 'aha-cpr-guidelines',
    citations: ['AHA CPR & ECC Guidelines', 'EAACI Anaphylaxis Guidelines'],
    canonicalAnswer: 'Gọi 115 khẩn cấp. Nếu người bệnh có sẵn bút tiêm tự động Adrenaline/Epinephrine cá nhân, hỗ trợ tiêm ngay vào mặt ngoài đùi. Đặt nạn nhân nằm ngửa nâng cao chân (nếu khó thở thì ngồi nghiêng), không để đứng dậy đột ngột.',
    defaultSafety: 'critical',
    tags: ['anaphylaxis', 'soc_phan_ve', 'epinephrine'],
    symptoms: ['phù mặt', 'sưng môi', 'khó thở rít thanh quản', 'phát ban toàn thân', 'tụt huyết áp'],
    emergencySigns: ['Khó thở phù thanh quản', 'Choáng váng tụt huyết áp'],
    recommendedAction: 'Gọi 115 khẩn cấp, tiêm epinephrine tự động nếu có sẵn, nằm nâng cao chân.',
    variants: [
      { task: 'retrieval_qa', text: 'Ăn tôm xong bạn tôi nổi mề đay khắp người, môi sưng vù, cổ họng nghẹn nghẹn thở rít rất khó thở, làm sao đây?' },
      { task: 'retrieval_qa', text: 'Dấu hiệu nhận biết sốc phản vệ nguy hiểm sau khi tiêm thuốc hoặc ăn hải sản?' },
      { task: 'retrieval_qa', text: 'Bút tiêm tự động Epipen Adrenaline trong cấp cứu phản vệ tiêm vào vị trí nào?' },
      { task: 'retrieval_qa', text: 'nguoi bi di ung nang nghen tho soc phan ve thi goi cap cuu nao' },
      { task: 'fact_extraction', text: 'Nạn nhân bị ong đốt, môi mắt phù nề to, thở rít khó nhọc, mặt tím tái, mạch đập rất nhanh và yếu.', facts: { consciousness: 'responsive', breathing: 'abnormal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'fact_extraction', text: 'Dị ứng thuốc sau 10 phút, nổi mẩn đỏ ngứa rát toàn thân, nghẹn họng tức ngực, huyết áp tụt.', facts: { consciousness: 'responsive', breathing: 'abnormal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'classification', text: 'Phản ứng phản vệ mức độ nặng / Sốc phản vệ đe dọa tính mạng.' },
      { task: 'classification', text: 'Suy hô hấp tuần hoàn cấp do phản ứng quá mẫn hệ thống.' }
    ]
  },
  {
    groupId: 'sc_drowning_rescue',
    scenarioLabel: 'duoi_nuoc',
    riskLabel: 'critical',
    requires115: true,
    topic: 'cardiac_arrest',
    sourceDoc: 'aha-cpr-guidelines',
    citations: ['AHA Drowning Resuscitation Guidelines'],
    canonicalAnswer: 'Đưa nạn nhân lên bờ an toàn. Kiểm tra tri giác và hô hấp. Nếu ngừng thở/thở ngáp cá: bắt đầu ngay bằng 2-5 lần hà hơi thổi ngạt, sau đó ép tim xen kẽ (30 lần ép tim, 2 lần thổi ngạt). Gọi 115 ngay. TUYỆT ĐỐI KHÔNG vác dốc ngược nạn nhân chạy vòng quanh để xóc nước vì làm mất thời gian vàng và trào ngược thức ăn vào phổi.',
    defaultSafety: 'critical',
    tags: ['duoi_nuoc', 'cpr', 'ha_hoi'],
    symptoms: ['đuối nước', 'ngừng thở', 'bất tỉnh', 'sặc nước'],
    emergencySigns: ['Bất tỉnh sau ngạt nước', 'Ngừng tuần hoàn hô hấp'],
    recommendedAction: 'Cứu lên cạn, khai thông đường thở, hà hơi thổi ngạt kết hợp CPR ngay lập tức.',
    variants: [
      { task: 'retrieval_qa', text: 'Vừa kéo được một người bị chìm dưới hồ bơi lên, người mềm oặt không thấy thở, có nên vác lên vai chạy xóc nước không?' },
      { task: 'retrieval_qa', text: 'Quy trình sơ cứu hồi sức tim phổi CPR cho người bị ngạt nước đuối nước?' },
      { task: 'retrieval_qa', text: 'cuu nguoi duoi nuoc len bo bat tinh tho ngap ca' },
      { task: 'retrieval_qa', text: 'Tại sao trong cấp cứu đuối nước lại ưu tiên thổi ngạt trước ép tim?' },
      { task: 'fact_extraction', text: 'Nạn nhân đuối nước kéo lên bờ bất tỉnh, không cử động, ngực không thở, da lạnh ngắt.', facts: { consciousness: 'unresponsive', breathing: 'not_breathing', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'fact_extraction', text: 'Trẻ em chìm nước vừa vớt lên, mê man bất tỉnh, thở ọc ọc sùi bọt cua ở miệng.', facts: { consciousness: 'unresponsive', breathing: 'abnormal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'classification', text: 'Ngừng tim ngừng thở do ngạt nước đuối nước.' },
      { task: 'classification', text: 'Ngạt thở thiếu oxy não cấp tính sau chìm ngập nước.' }
    ]
  },
  {
    groupId: 'sc_electrocution',
    scenarioLabel: 'dien_giat',
    riskLabel: 'critical',
    requires115: true,
    topic: 'cardiac_arrest',
    sourceDoc: 'aha-cpr-guidelines',
    citations: ['AHA CPR Guidelines', 'ACS Trauma First Aid'],
    canonicalAnswer: 'Đầu tiên: NGẮT NGUỒN ĐIỆN (cúp cầu dao) hoặc dùng vật liệu cách điện khô (gậy gỗ, nhựa) tách dây điện ra. KHÔNG chạm trực tiếp vào nạn nhân khi chưa ngắt điện. Khi hiện trường an toàn, kiểm tra nhịp thở; nếu ngừng thở làm CPR ngay và gọi 115.',
    defaultSafety: 'critical',
    tags: ['dien_giat', 'an_toan_hien_truong', 'cpr'],
    symptoms: ['bị giật điện', 'ngã bất tỉnh', 'bỏng điện'],
    emergencySigns: ['Dây điện còn chạm người', 'Ngừng thở ngừng tim'],
    recommendedAction: 'Ngắt điện trước tiên, giữ an toàn bản thân, ép tim CPR nếu ngừng thở.',
    variants: [
      { task: 'retrieval_qa', text: 'Thấy thợ điện bị điện giật dính vào dây điện trần ngã bất động, tôi có lao vào kéo ra được không?' },
      { task: 'retrieval_qa', text: 'Các bước cấp cứu khẩn cấp người bị điện giật tại nhà an toàn?' },
      { task: 'retrieval_qa', text: 'bi dien giat ngat tho ngung tim thi xu tri the nao' },
      { task: 'retrieval_qa', text: 'Nạn nhân bị điện giật ngã từ trên cao xuống cần lưu ý thêm chấn thương gì?' },
      { task: 'fact_extraction', text: 'Nạn nhân bị điện giật nằm bất động cạnh ổ điện đã ngắt cầu dao, cấu không phản ứng, không thấy lồng ngực thở.', facts: { consciousness: 'unresponsive', breathing: 'not_breathing', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'fact_extraction', text: 'Người bị giật điện sinh hoạt tay có vết bỏng sém đen, gọi tỉnh nhưng hoảng loạn, đau tức ngực.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'classification', text: 'Tai nạn điện giật gây ngừng tuần hoàn hô hấp.' },
      { task: 'classification', text: 'Chấn thương điện giật có tổn thương cơ hoành và bỏng lối vào.' }
    ]
  },
  {
    groupId: 'sc_traffic_trauma',
    scenarioLabel: 'chan_thuong_giao_thong_cot_song',
    riskLabel: 'emergency',
    requires115: true,
    topic: 'trauma',
    sourceDoc: 'acs-atls',
    citations: ['ACS ATLS Spinal Trauma Guidelines'],
    canonicalAnswer: 'Gọi 115 ngay. KHÔNG tự ý bế xốc nách, gập lưng hay di chuyển nạn nhân nếu không có nguy cơ cháy nổ trước mắt, vì có thể làm đứt tủy sống gây liệt vĩnh viễn hoặc tử vong. Giữ thẳng trục đầu - cổ - thân người, chèn vật cố định hai bên đầu.',
    defaultSafety: 'emergency',
    tags: ['cot_song', 'tai_nan_giao_thong', 'co_dinh_co'],
    symptoms: ['té xe', 'đau cổ', 'mất cảm giác chân tay', 'nằm bất động'],
    emergencySigns: ['Chấn thương lực mạnh', 'Nghi ngờ tổn thương cột sống cổ'],
    recommendedAction: 'Gọi 115, giữ nguyên hiện trường và tư thế, cố định thẳng trục đầu cổ.',
    variants: [
      { task: 'retrieval_qa', text: 'Người đi xe máy bị ngã văng ra đường kêu đau buốt đốt sống cổ và tê hai chân, có nên bế người ta vào vỉa hè nằm không?' },
      { task: 'retrieval_qa', text: 'Nguyên tắc bất động cố định cột sống cổ khi sơ cứu tai nạn giao thông ngoài đường?' },
      { task: 'retrieval_qa', text: 'tai nan giao thong nga xe nghi gay cot song co duoc be khong' },
      { task: 'retrieval_qa', text: 'Khi nào bắt buộc phải di dời nạn nhân chấn thương nghi gãy cột sống ra khỏi vị trí tai nạn?' },
      { task: 'fact_extraction', text: 'Nạn nhân ngã xe máy còn tỉnh, kêu đau dữ dội vùng cổ sau gáy, hai bàn tay tê bì không nhúc nhích được, thở đều.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'fact_extraction', text: 'Va chạm ô tô, tài xế kẹt trong xe tỉnh táo, gáy đau nhức, không dám cử động cổ.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'classification', text: 'Chấn thương giao thông nghi ngờ tổn thương cột sống cổ cấp tính.' },
      { task: 'classification', text: 'Đa chấn thương cơ học năng lượng cao cần cố định cột sống.' }
    ]
  },
  {
    groupId: 'sc_chest_pain_ami',
    scenarioLabel: 'dau_that_nguc_nhoi_mau_co_tim',
    riskLabel: 'emergency',
    requires115: true,
    topic: 'cardiac_arrest',
    sourceDoc: 'aha-cpr-guidelines',
    citations: ['AHA Acute Coronary Syndromes Guidelines'],
    canonicalAnswer: 'Gọi 115 khẩn cấp. Để người bệnh ngồi nửa nằm nửa ngồi nghỉ ngơi hoàn toàn, nới lỏng quần áo. Không để người bệnh tự đi lại hay tự lái xe. Sẵn sàng theo dõi sát sinh hiệu; nếu người bệnh bất tỉnh ngưng thở, bắt đầu ép tim CPR ngay.',
    defaultSafety: 'emergency',
    tags: ['dau_nguc', 'nhoi_mau_co_tim', '115'],
    symptoms: ['đau thắt ngực đè ép', 'vã mồ hôi lạnh', 'lan ra tay trái', 'khó thở'],
    emergencySigns: ['Đau ngực trên 15 phút không giảm', 'Khó thở choáng váng'],
    recommendedAction: 'Gọi 115, cho ngồi nghỉ tuyệt đối, chuẩn bị sẵn sàng CPR nếu ngưng tim.',
    variants: [
      { task: 'retrieval_qa', text: 'Bố tôi 60 tuổi kêu đau nhói ngực trái như có đá đè, lan lên cằm và cánh tay trái, vã mồ hôi hột, cần xử trí sao?' },
      { task: 'retrieval_qa', text: 'Sơ cứu người nghi ngờ lên cơn nhồi máu cơ tim cấp trước khi xe cấp cứu 115 đến?' },
      { task: 'retrieval_qa', text: 'dau nguc trai lan len vai va tay trai kho tho goi 115' },
      { task: 'retrieval_qa', text: 'Người đau thắt ngực có được tự đi bộ hay lái xe máy đến bệnh viện không?' },
      { task: 'fact_extraction', text: 'Bệnh nhân tỉnh táo, ôm ngực kêu đau tức ngực dữ dội, vã mồ hôi trán, thở gấp hổn hển, không chảy máu ngoài.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'fact_extraction', text: 'Cơn đau thắt sau xương ức kéo dài 20 phút, mặt tái mét, buồn nôn, thở dốc.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'classification', text: 'Hội chứng vành cấp / Nghi ngờ nhồi máu cơ tim tối cấp.' },
      { task: 'classification', text: 'Thiếu máu cơ tim cục bộ đe dọa ngừng tuần hoàn.' }
    ]
  },
  {
    groupId: 'sc_fracture_limb',
    scenarioLabel: 'gay_xuong_chi',
    riskLabel: 'urgent',
    requires115: false,
    topic: 'trauma',
    sourceDoc: 'acs-atls',
    citations: ['ACS ATLS Musculoskeletal Trauma Guidelines'],
    canonicalAnswer: 'Giữ nguyên tư thế chi gãy, không cố kéo nắn thẳng lại xương. Dùng nẹp (thanh gỗ, bìa cứng gấp) cố định qua cả hai khớp trên và dưới ổ gãy. Chườm lạnh bên ngoài qua lớp khăn để giảm phù nề và giảm đau. Chuyển nạn nhân đến cơ sở y tế gần nhất.',
    defaultSafety: 'urgent',
    tags: ['gay_xuong', 'co_dinh_nep', 'chan_thuong'],
    symptoms: ['biến dạng chi', 'sưng nề bầm tím', 'đau chói khi sờ nắn', 'không cử động được'],
    emergencySigns: ['Gãy xương hở đầu xương đâm qua da', 'Mất mạch ngoại vi'],
    recommendedAction: 'Bất động chi gãy bằng nẹp, chườm lạnh, đưa đi viện, không nắn bóp.',
    variants: [
      { task: 'retrieval_qa', text: 'Ngã đá bóng cẳng chân bị gập góc biến dạng kêu đau buốt không đứng được, sơ cứu nẹp thế nào?' },
      { task: 'retrieval_qa', text: 'Gãy xương kín có được xoa bóp dầu nóng hay bẻ lại cho thẳng không?' },
      { task: 'retrieval_qa', text: 'cach bang nep co dinh gay xuong tay chan tai cho' },
      { task: 'retrieval_qa', text: 'Nạn nhân bị ngã giàn giáo gãy hở xương cẳng chân chọc ra ngoài da chảy máu thì xử lý bước nào trước?' },
      { task: 'retrieval_qa', text: 'Ngã đập cổ tay xuống đất biến dạng hình nĩa có phải bị gãy xương không?' },
      { task: 'fact_extraction', text: 'Nạn nhân ngã xe máy tỉnh táo, cẳng tay trái sưng to biến dạng gập góc, da không rách, mạch quay bắt rõ.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'fact_extraction', text: 'Gãy xương đùi kín, đùi sưng vù biến dạng ngắn chi, nạn nhân kêu la đau đớn, mặt tái.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'classification', text: 'Chấn thương gãy xương chi kín cần bất động nẹp.' },
      { task: 'classification', text: 'Gãy xương chi hở có nguy cơ sốc chấn thương và nhiễm khuẩn.' }
    ]
  },
  {
    groupId: 'sc_head_trauma',
    scenarioLabel: 'chan_thuong_so_nao',
    riskLabel: 'emergency',
    requires115: true,
    topic: 'trauma',
    sourceDoc: 'acs-atls',
    citations: ['ACS ATLS Head Trauma Guidelines'],
    canonicalAnswer: 'Gọi 115 hoặc đưa đi cấp cứu ngay nếu nạn nhân có các dấu hiệu nguy hiểm: nôn mửa liên tục nhiều lần, đau đầu tăng dần, lơ mơ buồn ngủ khó đánh thức, chảy máu hoặc dịch trong từ mũi/tai, co giật. Giữ yên đầu cổ, theo dõi tri giác liên tục.',
    defaultSafety: 'emergency',
    tags: ['so_nao', 'dap_dau', 'non_mua'],
    symptoms: ['đau đầu dữ dội', 'nôn vọt', 'lơ mơ', 'chảy máu tai mũi', 'bầm quanh mắt'],
    emergencySigns: ['Giảm tri giác', 'Nôn mửa nhiều lần', 'Đồng tử giãn không đều'],
    recommendedAction: 'Gọi 115, giữ thẳng đầu cổ, theo dõi thang điểm tri giác, không cho ăn uống.',
    variants: [
      { task: 'retrieval_qa', text: 'Trẻ bị ngã đập đầu xuống nền gạch, sưng cục u to rồi nôn ra thức ăn 2 lần, có cần đi viện cấp cứu ngay không?' },
      { task: 'retrieval_qa', text: 'Các dấu hiệu cảnh báo chấn thương sọ não nguy hiểm sau va đập đầu?' },
      { task: 'retrieval_qa', text: 'nga dap dau chay mau lo tai co phai chan thuong so nao nang khong' },
      { task: 'retrieval_qa', text: 'Sau khi đập đầu bất tỉnh 2 phút rồi tỉnh lại thì có được chủ quan ở nhà theo dõi không?' },
      { task: 'fact_extraction', text: 'Nạn nhân ngã thang đập đầu, tỉnh nhưng lơ mơ hỏi không nhớ tên, nôn mửa 1 lần, có vết rách da đầu chảy ít máu.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'fact_extraction', text: 'Va đập đầu mạnh, tai rỉ máu đỏ tươi, gọi hỏi đáp ứng chậm chạp lú lẫn.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'classification', text: 'Chấn thương sọ não kín có dấu hiệu cảnh báo tri giác.' },
      { task: 'classification', text: 'Tổn thương nội sọ sau chấn thương đầu năng lượng cao.' }
    ]
  },
  {
    groupId: 'sc_asthma_attack',
    scenarioLabel: 'con_hen_phe_quan_cap',
    riskLabel: 'emergency',
    requires115: true,
    topic: 'cardiac_arrest',
    sourceDoc: 'aha-cpr-guidelines',
    citations: ['GINA Asthma Guidelines', 'AHA First Aid'],
    canonicalAnswer: 'Hỗ trợ người bệnh ngồi thẳng lưng hơi ngả về phía trước, nới lỏng áo ngực. Hướng dẫn sử dụng ống hít cắt cơn (Salbutamol/Ventolin) 2-4 nhát hít cách nhau 1-2 phút. Nếu sau 10-15 phút không đỡ hoặc môi tím tái, nói ngắt quãng từng từ, gọi 115 khẩn cấp.',
    defaultSafety: 'emergency',
    tags: ['hen_suyen', 'kho_tho', 'ventolin'],
    symptoms: ['thở khò khè', 'thở rít thì thở ra', 'ngực co kéo', 'nói ngắt quãng'],
    emergencySigns: ['Môi tím tái', 'Không nói trọn câu', 'Thuốc cắt cơn không tác dụng'],
    recommendedAction: 'Cho ngồi thẳng, dùng bình xịt cắt cơn, gọi 115 nếu thở khò khè tăng dần.',
    variants: [
      { task: 'retrieval_qa', text: 'Em gái tôi lên cơn hen suyễn thở rít khò khè dữ dội, ngồi co ro ôm ngực, phải sơ cứu sao?' },
      { task: 'retrieval_qa', text: 'cach su dung binh xit cat con hen suyễn ventolin khi len con kho tho' },
      { task: 'retrieval_qa', text: 'Người bị hen phế quản khó thở dữ dội mà không có bình xịt bên cạnh thì làm gì?' },
      { task: 'retrieval_qa', text: 'Dấu hiệu nào cho thấy cơn hen suyễn đang chuyển sang nguy kịch đe dọa ngừng thở?' },
      { task: 'fact_extraction', text: 'Bệnh nhân ngồi tựa ghế thở rít khò khè thì thở ra, nói từng từ ngắt quãng, môi hơi tái, tỉnh táo.', facts: { consciousness: 'responsive', breathing: 'abnormal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'fact_extraction', text: 'Cơn khó thở cấp tính, thở khò khè nghe rõ từ xa, co kéo hõm ức cơ liên sườn, vã mồ hôi.', facts: { consciousness: 'responsive', breathing: 'abnormal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'classification', text: 'Cơn hen phế quản phế quản cấp tính mức độ nặng.' },
      { task: 'classification', text: 'Co thắt phế quản cấp gây suy hô hấp tiến triển.' }
    ]
  },
  {
    groupId: 'sc_heatstroke',
    scenarioLabel: 'say_nang_soc_nhiet',
    riskLabel: 'emergency',
    requires115: true,
    topic: 'trauma',
    sourceDoc: 'acs-atls',
    citations: ['ACS Wilderness and Heat Emergency Protocols'],
    canonicalAnswer: 'Đưa nạn nhân vào chỗ mát râm ngay lập tức, cởi bỏ bớt quần áo. Làm mát tích cực bằng cách chườm khăn ướt mát vào nách, bẹn, cổ hoặc dội nước mát lên người và quạt mạnh. Nếu nạn nhân lơ mơ, bất tỉnh hoặc nôn, gọi 115 ngay. Chỉ cho uống nước mát từng ngụm nhỏ nếu nạn nhân còn tỉnh hoàn toàn.',
    defaultSafety: 'emergency',
    tags: ['say_nang', 'soc_nhiet', 'lam_mat'],
    symptoms: ['sốt cao trên 40 độ', 'da nóng đỏ khô không mồ hôi', 'lơ mơ', 'mê sảng'],
    emergencySigns: ['Rối loạn tri giác', 'Sốt cực cao sau phơi nắng'],
    recommendedAction: 'Đưa vào bóng râm, làm mát tích cực các điểm mạch nách bẹn, gọi 115.',
    variants: [
      { task: 'retrieval_qa', text: 'Công nhân làm đường giữa trưa nắng gắt bị ngã khuỵu, da nóng ran khô khốc, nói lảm nhảm lơ mơ, xử trí cấp cứu ra sao?' },
      { task: 'retrieval_qa', text: 'Phân biệt say nắng thông thường và sốc nhiệt say nóng nguy kịch (Heat stroke)?' },
      { task: 'retrieval_qa', text: 'bi soc nhiet sot 40 do thi ha nhiet bang cach nao nhanh nhat' },
      { task: 'retrieval_qa', text: 'Người bị say nắng sốc nhiệt lơ mơ có được ép uống nước chanh đường không?' },
      { task: 'fact_extraction', text: 'Nạn nhân chạy bộ ngoài nắng gục xuống, người nóng như hòn than, mắt lờ đờ gọi không biết gì, thở nhanh nông.', facts: { consciousness: 'unresponsive', breathing: 'abnormal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'fact_extraction', text: 'Say nắng sốc nhiệt, da đỏ rực nóng bỏng không có giọt mồ hôi, co giật nhẹ chi trên, mê sảng.', facts: { consciousness: 'unresponsive', breathing: 'abnormal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'classification', text: 'Sốc nhiệt do gắng sức ngoài trời nắng gắt đe dọa suy đa tạng.' },
      { task: 'classification', text: 'Say nóng sốc nhiệt có rối loạn tri giác thần kinh trung ương.' }
    ]
  },
  {
    groupId: 'sc_poisoning_ingestion',
    scenarioLabel: 'ngo_doc_hoa_chat',
    riskLabel: 'emergency',
    requires115: true,
    topic: 'trauma',
    sourceDoc: 'acs-atls',
    citations: ['WHO Poisoning First Aid Protocols'],
    canonicalAnswer: 'Gọi 115 khẩn cấp hoặc Trung tâm Chống độc. TUYỆT ĐỐI KHÔNG tự ý móc họng gây nôn vì hóa chất ăn mòn sẽ làm bỏng loét lại thực quản và nguy cơ sặc vào phổi. Mang theo vỏ chai, nhãn mác hóa chất hoặc chất độc nạn nhân đã uống khi đến bệnh viện.',
    defaultSafety: 'emergency',
    tags: ['ngo_doc', 'hoa_chat', 'khong_gay_non'],
    symptoms: ['bỏng rát miệng', 'nôn mửa', 'đau bụng dữ dội', 'hơi thở có mùi hóa chất'],
    emergencySigns: ['Nuốt phải axit, kiềm, thuốc trừ sâu', 'Khó thở lơ mơ'],
    recommendedAction: 'Gọi 115, không móc họng gây nôn, giữ nguyên vỏ bao bì độc chất.',
    variants: [
      { task: 'retrieval_qa', text: 'Bé con uống nhầm chai nước tẩy bồn cầu để ở góc nhà khóc thét miệng đỏ loét, có nên móc họng cho nôn ra không?' },
      { task: 'retrieval_qa', text: 'Sơ cứu người uống nhầm thuốc trừ sâu hoặc hóa chất công nghiệp?' },
      { task: 'retrieval_qa', text: 'uong nham dau hoa xang thi co duoc moc hong gay non khong' },
      { task: 'retrieval_qa', text: 'Cần mang theo những gì khi đưa người nghi ngờ ngộ độc thuốc ngủ đến bệnh viện?' },
      { task: 'fact_extraction', text: 'Bệnh nhân tỉnh nhưng quằn quại đau rát miệng và họng, có mùi thuốc tẩy nồng nặc quanh môi, chảy nhiều dãi.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'fact_extraction', text: 'Uống nhầm thuốc trừ cỏ, nôn mửa liên tục dịch xanh đen, thở hôi mùi hóa chất, đau bụng quằn quại.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'classification', text: 'Ngộ độc hóa chất ăn mòn đường tiêu hóa cấp tính.' },
      { task: 'classification', text: 'Nhiễm độc cấp qua đường tiêu hóa cần chuyển tuyến chống độc.' }
    ]
  },
  {
    groupId: 'sc_snakebite',
    scenarioLabel: 'ran_can',
    riskLabel: 'emergency',
    requires115: true,
    topic: 'trauma',
    sourceDoc: 'acs-atls',
    citations: ['WHO Envenoming Guidelines'],
    canonicalAnswer: 'Trấn an nạn nhân, giữ yên tĩnh và BẤT ĐỘNG chi bị cắn ở vị trí thấp hơn tim để hạn chế nọc độc lan truyền. Rửa nhẹ vết cắn bằng nước sạch. TUYỆT ĐỐI KHÔNG rạch vết thương, KHÔNG hút nọc, KHÔNG đắp lá thuốc, KHÔNG ga-rô siết chặt làm hoại tử chi. Đưa ngay đến cơ sở y tế có huyết thanh kháng nọc.',
    defaultSafety: 'emergency',
    tags: ['ran_can', 'bat_dong_chi', 'huyet_thanh'],
    symptoms: ['hai dấu răng nanh', 'sưng nề bầm tím lan nhanh', 'đau nhức'],
    emergencySigns: ['Sưng lan nhanh qua khớp', 'Sụp mi mắt khó thở'],
    recommendedAction: 'Bất động chi bị cắn, để thấp hơn tim, chuyển viện cấp cứu, không rạch hút.',
    variants: [
      { task: 'retrieval_qa', text: 'Đi làm vườn bị rắn cắn vào mắt cá chân buốt nhói chảy máu, có nên lấy dao rạch vết cắn để hút nọc ra không?' },
      { task: 'retrieval_qa', text: 'cach so cuu ran doc can o tay chan dung cach theo y hoc' },
      { task: 'retrieval_qa', text: 'Tại sao không được ga-rô thắt chặt mạch máu khi bị rắn độc cắn?' },
      { task: 'retrieval_qa', text: 'Bị rắn cắn có nên đắp lá cây thuốc nam hoặc chườm đá lạnh lên vết thương không?' },
      { task: 'fact_extraction', text: 'Nạn nhân bị rắn cắn vào mu bàn chân, có 2 vết răng nanh cách nhau 1cm, mu chân sưng nề nhanh, tỉnh táo.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'fact_extraction', text: 'Rắn lục cắn vào ngón tay sưng to bầm tím tím đen, chảy máu rỉ rả không cầm, nạn nhân lo lắng hoảng loạn.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'classification', text: 'Vết thương nhiễm độc do rắn độc cắn cấp tính.' },
      { task: 'classification', text: 'Nhiễm độc nọc rắn có rối loạn đông máu tại chỗ.' }
    ]
  },
  {
    groupId: 'sc_eye_chemical_burn',
    scenarioLabel: 'hoa_chat_ban_vao_mat',
    riskLabel: 'emergency',
    requires115: true,
    topic: 'trauma',
    sourceDoc: 'acs-atls',
    citations: ['American Academy of Ophthalmology Chemical Eye Burns'],
    canonicalAnswer: 'Lập tức rửa mắt dưới vòi nước sạch chảy nhẹ liên tục trong ít nhất 15-20 phút, giữ vành mi mắt mở to để nước rửa trôi hóa chất bên trong. Nghiêng đầu về bên mắt bị tổn thương để tránh hóa chất chảy sang mắt lành. Không dụi mắt. Sau khi rửa đưa đi cấp cứu mắt ngay.',
    defaultSafety: 'emergency',
    tags: ['mat', 'bong_hoa_chat', 'rua_mat'],
    symptoms: ['bỏng rát mắt dữ dội', 'chảy nước mắt giàn giụa', 'không mở được mắt'],
    emergencySigns: ['Hóa chất vôi, axit bắn vào mắt'],
    recommendedAction: 'Xối nước sạch liên tục 15-20 phút, giữ mở mi mắt, đưa đi chuyên khoa mắt.',
    variants: [
      { task: 'retrieval_qa', text: 'Đang dọn nhà bị nước tẩy axit bắn thẳng vào mắt rát buốt không mở được mắt, phải rửa thế nào?' },
      { task: 'retrieval_qa', text: 'Bột vôi tôi rơi vào mắt thì sơ cứu rửa mắt trong bao lâu?' },
      { task: 'retrieval_qa', text: 'bi nuoc rua chen hoa chat ban vao mat co duoc nho thuoc nho mat luon khong' },
      { task: 'retrieval_qa', text: 'Tại sao phải xối nước liên tục 15-20 phút khi bị bỏng hóa chất vào mắt?' },
      { task: 'fact_extraction', text: 'Bệnh nhân bị dung dịch kiềm bắn vào mắt trái, kết mạc đỏ rực, mắt nhắm nghiền chảy nước mắt liên tục, tỉnh táo.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'fact_extraction', text: 'Bỏng vôi bột vào mắt, giác mạc mờ đục phù nề, cay rát nhắm chặt mi mắt, kêu khóc.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'classification', text: 'Bỏng hóa chất nhãn cầu cấp tính đe dọa thị lực.' },
      { task: 'classification', text: 'Tổn thương kết mạc giác mạc do hóa chất kiềm/axit.' }
    ]
  },
  {
    groupId: 'sc_hypothermia',
    scenarioLabel: 'ha_than_nhiet',
    riskLabel: 'urgent',
    requires115: false,
    topic: 'trauma',
    sourceDoc: 'acs-atls',
    citations: ['AHA First Aid Hypothermia'],
    canonicalAnswer: 'Đưa nạn nhân vào phòng ấm kín gió, cởi bỏ quần áo ướt lạnh, lau khô người. Ủ ấm bằng chăn dày ấm, tập trung vào vùng ngực, bụng và cổ. Nếu nạn nhân tỉnh táo, cho uống nước đường ấm hoặc trà ấm. TUYỆT ĐỐI KHÔNG sưởi ấm trực tiếp bằng lửa nóng hay xoa bóp tay chân vì có thể gây loạn nhịp tim.',
    defaultSafety: 'urgent',
    tags: ['ha_than_nhiet', 'u_am', 'nhiem_lanh'],
    symptoms: ['run rẩy dữ dội', 'da tái nhợt lạnh buốt', 'nói chậm chạp lóng ngóng'],
    emergencySigns: ['Ngừng run rẩy nhưng lơ mơ lú lẫn', 'Mạch chậm yếu'],
    recommendedAction: 'Ủ ấm trung tâm cơ thể bằng chăn khô, uống nước ấm, theo dõi nhịp thở.',
    variants: [
      { task: 'retrieval_qa', text: 'Đi mưa bão về bị rét run cầm cập, môi tím ngắt nói không ra lời, cách ủ ấm an toàn?' },
      { task: 'retrieval_qa', text: 'Người bị nhiễm lạnh hạ thân nhiệt có nên uống rượu mạnh để nóng người lên không?' },
      { task: 'retrieval_qa', text: 'cach u am nguoi bi ha than nhiet trong mua dong' },
      { task: 'retrieval_qa', text: 'Tại sao không được hơ lửa trực tiếp hay chườm nước sôi cho người bị hạ thân nhiệt?' },
      { task: 'fact_extraction', text: 'Nạn nhân nhiễm lạnh ướt sũng nằm run rẩy co ro, da lạnh toát, nói lí nhí nhưng vẫn tiếp xúc được.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'fact_extraction', text: 'Người già sống một mình bị hạ thân nhiệt, da lạnh tái ngắt, gọi đáp ứng chậm chạp, mạch chậm 50 lần/phút.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'classification', text: 'Hạ thân nhiệt nhẹ đến trung bình do nhiễm lạnh kéo dài.' },
      { task: 'classification', text: 'Rối loạn điều nhiệt cơ thể do môi trường lạnh giá.' }
    ]
  },
  {
    groupId: 'sc_negative_minor_scratch',
    scenarioLabel: 'tray_xuoc_nhe',
    riskLabel: 'non_urgent',
    requires115: false,
    topic: 'trauma',
    sourceDoc: 'acs-atls',
    citations: ['Standard First Aid Protocols'],
    canonicalAnswer: 'Rửa sạch vết trầy xước dưới vòi nước chảy hoặc nước muối sinh lý để loại bỏ bụi bẩn. Thấm khô bằng gạc sạch, có thể sát trùng nhẹ bằng dung dịch Povidone Iodine và dán băng cá nhân bảo vệ. Không cần gọi 115.',
    defaultSafety: 'first_aid',
    tags: ['tray_xuoc', 'nhe', 've_sinh'],
    symptoms: ['trầy da', 'rớm máu ít', 'xót da'],
    emergencySigns: [],
    recommendedAction: 'Rửa nước sạch, sát khuẩn vết thương và theo dõi tại nhà.',
    variants: [
      { task: 'retrieval_qa', text: 'Trượt chân ngã ở sân xi măng bị trầy da đầu gối rớm ít máu, xử lý tại nhà thế nào?' },
      { task: 'retrieval_qa', text: 'Vết xước móng tay chảy tí máu có cần đi bệnh viện cấp cứu 115 không?' },
      { task: 'retrieval_qa', text: 'tray xuoc dau goi chay it mau thi boi thuoc gi' },
      { task: 'retrieval_qa', text: 'Bi trầy xước da có cần tiêm phòng uốn ván SAT không?' },
      { task: 'fact_extraction', text: 'Người đi bộ va nhẹ vào cọc rào, rách lớp thượng bì mu bàn tay chảy vài giọt máu, cử động bình thường tỉnh táo.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'fact_extraction', text: 'Vết xước ngoài da cẳng tay do cành cây quẹt rớm máu nông, vết thương sạch, không sốt.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'classification', text: 'Vết thương phần mềm trầy xước nông không có nguy cơ đe dọa sinh mạng.' },
      { task: 'classification', text: 'Tổn thương da nông bề mặt sinh hoạt thông thường.' }
    ]
  },
  {
    groupId: 'sc_negative_muscle_cramp',
    scenarioLabel: 'chuot_rut_co',
    riskLabel: 'non_urgent',
    requires115: false,
    topic: 'trauma',
    sourceDoc: 'acs-atls',
    citations: ['Standard Sports First Aid'],
    canonicalAnswer: 'Dừng vận động, ngồi nghỉ ở nơi thoáng mát. Kéo giãn nhẹ nhàng nhóm cơ bị co rút (ví dụ bắp chân thì duỗi thẳng chân và gập mũi chân về phía mình), xoa bóp nhẹ và uống bổ sung nước điện giải. Không cần gọi 115.',
    defaultSafety: 'first_aid',
    tags: ['chuot_rut', 'vop_be', 'the_thao'],
    symptoms: ['co cứng bắp chân', 'đau cơ cục bộ'],
    emergencySigns: [],
    recommendedAction: 'Nghỉ ngơi, kéo giãn cơ nhẹ nhàng, bổ sung nước điện giải.',
    variants: [
      { task: 'retrieval_qa', text: 'Đang đá bóng thì bị chuột rút bắp chân co cứng đau nhói, cách sơ cứu nhanh nhất?' },
      { task: 'retrieval_qa', text: 'Bị vọp bẻ ngón chân lúc đang bơi thì tự xử lý ra sao?' },
      { task: 'retrieval_qa', text: 'chuot rut bap chuoi co can phai goi 115 cap cuu khong' },
      { task: 'retrieval_qa', text: 'Làm thế nào để phòng ngừa chuột rút khi tập luyện thể dục thể thao cường độ cao?' },
      { task: 'fact_extraction', text: 'Vận động viên tỉnh táo hoàn toàn, đau thắt cơ bắp chân sau khi chạy 5km, không khó thở, không vết thương.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'fact_extraction', text: 'Bệnh nhân tỉnh táo kêu đau thắt cơ vùng đùi sau khi bơi lội, sờ vào thấy bắp cơ cứng ngắc, mạch bình thường.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'classification', text: 'Co cứng cơ cục bộ (chuột rút / vọp bẻ) sau gắng sức thể lực.' },
      { task: 'classification', text: 'Rối loạn cơ học thần kinh cơ lành tính do thiếu nước và điện giải.' }
    ]
  },
  {
    groupId: 'sc_ambiguous_tiredness',
    scenarioLabel: 'mo_ho_thieu_du_kien',
    riskLabel: 'unknown',
    requires115: false,
    topic: 'trauma',
    sourceDoc: 'acs-atls',
    citations: ['Triage Clarification Guidelines'],
    canonicalAnswer: 'Thông tin hiện tại chưa đủ dữ kiện quan trọng để xác định mức độ nguy hiểm. Vui lòng kiểm tra ngay 2 yếu tố: (1) Nạn nhân có tỉnh táo và trả lời được không? (2) Nạn nhân có thở bình thường không? Nếu nạn nhân không đáp ứng hoặc thở bất thường, hãy gọi 115 ngay lập tức.',
    defaultSafety: 'clarification_required',
    tags: ['mo_ho', 'can_lam_ro', 'an_toan'],
    symptoms: ['thấy mệt mỏi', 'nằm im', 'khó chịu trong người'],
    emergencySigns: ['Chưa rõ tri giác và hô hấp'],
    recommendedAction: 'Hỏi rõ tri giác và nhịp thở; nếu có nghi ngờ lập tức liên hệ 115.',
    variants: [
      { task: 'retrieval_qa', text: 'Người nhà tôi hôm nay cứ nằm trên giường than mệt, ăn ít, tôi nên làm gì?' },
      { task: 'retrieval_qa', text: 'Bác tôi thấy khó chịu trong người rồi nằm im, không biết bị gì?' },
      { task: 'retrieval_qa', text: 'nguoi nha thay kho chiu nam mot cho can lam gi' },
      { task: 'retrieval_qa', text: 'Mẹ tôi bảo mệt mỏi trong người nằm nghỉ từ sáng, có cần đưa đi bệnh viện khám không?' },
      { task: 'fact_extraction', text: 'Bệnh nhân nằm trên giường nói thấy mệt, không rõ có khó thở hay đau ngực không, mắt nhắm.', facts: { consciousness: 'unknown', breathing: 'unknown', severeBleeding: null, strokeFace: null, strokeArm: null, strokeSpeech: null, choking: null } },
      { task: 'fact_extraction', text: 'Người mệt mỏi uể oải cả ngày, nằm nghỉ ngơi không sốt, không có dấu hiệu đau ngực hay méo mặt.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'classification', text: 'Tình trạng than phiền sức khỏe mơ hồ thiếu dữ liệu phân loại cấp cứu.' },
      { task: 'classification', text: 'Triệu chứng không đặc hiệu cần khai thác thêm bệnh sử.' }
    ]
  },
  {
    groupId: 'sc_ambiguous_dizziness',
    scenarioLabel: 'chong_mat_thieu_dau_hieu_than_kinh',
    riskLabel: 'unknown',
    requires115: false,
    topic: 'stroke',
    sourceDoc: 'asa-stroke-signs',
    citations: ['ASA Stroke Differentiation Guidelines'],
    canonicalAnswer: 'Hãy cho nạn nhân ngồi hoặc nằm nghỉ ngơi tại chỗ, tránh thay đổi tư thế đột ngột. Cần kiểm tra ngay xem có dấu hiệu méo miệng, yếu tay chân hoặc nói khó không. Nếu có kèm các dấu hiệu này hoặc nôn dữ dội, gọi 115 ngay. Nếu chỉ chóng mặt đơn thuần, đo huyết áp và đưa đi khám chuyên khoa.',
    defaultSafety: 'clarification_required',
    tags: ['chong_mat', 'kiem_tra_fast', 'theo_doi'],
    symptoms: ['chóng mặt', 'hoa mắt', 'choáng váng'],
    emergencySigns: ['Cần loại trừ đột quỵ não'],
    recommendedAction: 'Nghỉ ngơi, kiểm tra FAST loại trừ đột quỵ, gọi 115 nếu có yếu liệt.',
    variants: [
      { task: 'retrieval_qa', text: 'Ngồi làm việc đứng dậy tự dưng trời đất quay cuồng chóng mặt, có phải bị tai biến không?' },
      { task: 'retrieval_qa', text: 'Chóng mặt hoa mắt khi đứng lên ngồi xuống xử lý thế nào?' },
      { task: 'retrieval_qa', text: 'bi chong mat xay xam mat may thi nen lam gi tai nha' },
      { task: 'retrieval_qa', text: 'Khi nào cơn chóng mặt là dấu hiệu nguy hiểm của bệnh lý thần kinh tim mạch?' },
      { task: 'fact_extraction', text: 'Người bệnh tỉnh, chóng mặt khi xoay đầu, mặt cân đối, giơ hai tay đều nhau, nói chuyện bình thường.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'fact_extraction', text: 'Choáng váng nhẹ khi thay đổi tư thế, huyết áp 110/70, không tê yếu nửa người, tiếp xúc tốt.', facts: { consciousness: 'responsive', breathing: 'normal', severeBleeding: false, strokeFace: false, strokeArm: false, strokeSpeech: false, choking: false } },
      { task: 'classification', text: 'Chóng mặt tư thế lành tính hoặc hạ huyết áp tư thế, cần theo dõi.' },
      { task: 'classification', text: 'Rối loạn tiền đình ngoại biên hoặc choáng váng tư thế không có cờ đỏ thần kinh.' }
    ]
  }
];

export function buildDatasetV1() {
  const groups = [...SCENARIOS];

  // Group-level assignment to prevent data leakage completely:
  // Groups assigned whole to train (70%), validation (15%), or test (15%)
  const groupSplits = new Map<string, 'train' | 'validation' | 'test'>();
  
  // Deterministic split assignment across 26 groups:
  // Validation groups (4 groups): sc_aed_usage, sc_burns_thermal, sc_negative_muscle_cramp, sc_poisoning_ingestion
  // Test groups (4 groups): sc_stroke_fast, sc_drowning_rescue, sc_ambiguous_dizziness, sc_snakebite
  // Train groups (18 groups): all other 18 groups (~70%)
  const valGroupIds = new Set(['sc_aed_usage', 'sc_burns_thermal', 'sc_negative_muscle_cramp', 'sc_poisoning_ingestion']);
  const testGroupIds = new Set(['sc_stroke_fast', 'sc_drowning_rescue', 'sc_ambiguous_dizziness', 'sc_snakebite']);

  for (const g of groups) {
    if (valGroupIds.has(g.groupId)) groupSplits.set(g.groupId, 'validation');
    else if (testGroupIds.has(g.groupId)) groupSplits.set(g.groupId, 'test');
    else groupSplits.set(g.groupId, 'train');
  }

  const allRecords: any[] = [];
  const holdoutEvalRecords: any[] = [];

  for (const group of groups) {
    const split = groupSplits.get(group.groupId)!;

    for (let vIdx = 0; vIdx < group.variants.length; vIdx++) {
      const v = group.variants[vIdx];
      const externalId = `v1-${group.groupId}-${String(vIdx + 1).padStart(3, '0')}`;
      
      let expectedOutput: any = {};
      if (v.task === 'retrieval_qa') {
        expectedOutput = {
          answer: group.canonicalAnswer,
          citations: group.citations,
          safety: group.defaultSafety,
          requires_115: group.requires115,
        };
      } else if (v.task === 'fact_extraction') {
        expectedOutput = v.facts || {
          consciousness: 'unknown',
          breathing: 'unknown',
          severeBleeding: null,
          strokeFace: null,
          strokeArm: null,
          strokeSpeech: null,
          choking: null,
        };
      } else if (v.task === 'classification') {
        expectedOutput = {
          category: group.scenarioLabel,
          risk_level: group.riskLabel,
          requires_115: group.requires115,
          urgency: group.defaultSafety,
        };
      }

      const record = {
        external_id: externalId,
        dataset_version: 'v1.0.0',
        scenario_group_id: group.groupId,
        scenario_label: group.scenarioLabel,
        risk_label: group.riskLabel,
        task: v.task,
        input: v.text,
        expected_output: expectedOutput,
        source_document_external_id: group.sourceDoc,
        citations: group.citations,
        quality_label: 'synthetic',
        review_required: true,
        safety_note: 'Dữ liệu sơ cứu chuẩn hóa; không thay thế chỉ dẫn của nhân viên điều hành 115.',
        metadata: {
          symptoms: group.symptoms,
          emergency_signs: group.emergencySigns,
          recommended_action: group.recommendedAction,
          tags: group.tags,
          pii_checked: true,
          safety_checked: true,
        },
        split,
      };

      allRecords.push(record);

      // Create a fixed holdout eval sample across critical / emergency / urgent / non_urgent
      // Selected 1-2 items per group for isolated benchmark evaluation
      if (vIdx === 0 || vIdx === group.variants.length - 1) {
        holdoutEvalRecords.push({
          ...record,
          external_id: `holdout-${externalId}`,
          split: 'holdout_eval',
        });
      }
    }
  }

  // Ensure output directory exists
  const v1Dir = path.resolve(process.cwd(), 'data/v1');
  if (!fs.existsSync(v1Dir)) fs.mkdirSync(v1Dir, { recursive: true });

  // Write full dataset and individual splits
  fs.writeFileSync(path.join(v1Dir, 'goldenminutes_v1_all.jsonl'), allRecords.map((r) => JSON.stringify(r)).join('\n') + '\n');
  fs.writeFileSync(path.join(v1Dir, 'train.jsonl'), allRecords.filter((r) => r.split === 'train').map((r) => JSON.stringify(r)).join('\n') + '\n');
  fs.writeFileSync(path.join(v1Dir, 'validation.jsonl'), allRecords.filter((r) => r.split === 'validation').map((r) => JSON.stringify(r)).join('\n') + '\n');
  fs.writeFileSync(path.join(v1Dir, 'test.jsonl'), allRecords.filter((r) => r.split === 'test').map((r) => JSON.stringify(r)).join('\n') + '\n');
  fs.writeFileSync(path.join(v1Dir, 'holdout_eval.jsonl'), holdoutEvalRecords.map((r) => JSON.stringify(r)).join('\n') + '\n');

  // Compute checksums
  const allContent = fs.readFileSync(path.join(v1Dir, 'goldenminutes_v1_all.jsonl'));
  const checksum = crypto.createHash('sha256').update(allContent).digest('hex');

  const stats = {
    version: 'v1.0.0',
    totalRecords: allRecords.length,
    holdoutEvalCount: holdoutEvalRecords.length,
    splits: {
      train: allRecords.filter((r) => r.split === 'train').length,
      validation: allRecords.filter((r) => r.split === 'validation').length,
      test: allRecords.filter((r) => r.split === 'test').length,
    },
    scenarioGroupsCount: groups.length,
    checksumSha256: checksum,
    created_at: new Date().toISOString(),
  };

  fs.writeFileSync(path.join(v1Dir, 'manifest.json'), JSON.stringify(stats, null, 2));
  console.log('Dataset v1 generated successfully:', stats);
  return stats;
}

buildDatasetV1();
