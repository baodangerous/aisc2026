# Quy Chuẩn Ánh Xạ Nhãn Rủi Ro & Phân Loại Cấp Cứu (Risk Label Mapping)

**Hệ thống:** GoldenMinutes Response Lab  
**Quy chuẩn áp dụng:** Phân tầng triage y tế kết hợp nguyên tắc AHA 2020 & ERC 2021

---

## 1. Bảng Đối Chiếu Đa Tầng (Triage Priority vs. Database Risk Labels)

Hệ thống sử dụng mô hình nhãn rủi ro 4+1 chuẩn hóa trong cơ sở dữ liệu và ánh xạ trực tiếp với rule engine xác định an toàn:

| Mã nhãn DB (`ai_risk_labels.code`) | Tên hiển thị Tiếng Việt | Mức ưu tiên Rule Engine (`triagePriority`) | Gọi 115 ngay (`requires_115`) | Thời gian vàng hành động | Hành động ưu tiên | Ví dụ tình huống điển hình |
|---|---|---|---|---|---|---|
| **`critical`** | **Nguy kịch** | `critical` | **Bắt buộc** | **Dưới 60 giây** | Bắt đầu CPR, ép tim 100–120 bpm, yêu cầu lấy AED khẩn cấp, băng ép garo cầm máu ồ ạt | Ngừng tim đột ngột (OHCA), bất tỉnh ngưng thở / thở ngáp cá, đứt động mạch phun máu, sốc phản vệ ngừng thở |
| **`emergency`** | **Khẩn cấp** | `critical` / `urgent` | **Bắt buộc** | **Dưới 3–5 phút** | Gọi 115 ngay lập tức, ghi nhận mốc thời gian khởi phát, giữ nguyên tư thế an toàn, không cho ăn uống | Nghi ngờ đột quỵ (FAST: méo mặt, liệt tay, loạn ngôn ngữ), đau thắt ngực nghi nhồi máu cơ tim, co giật kéo dài |
| **`urgent`** | **Ưu tiên** | `urgent` | Linh hoạt (theo diễn biến) | **Dưới 15 phút** | Sơ cứu khẩn trương tại chỗ, theo dõi sát sinh hiệu, chuyển tuyến y tế nếu không cải thiện | Bỏng nhiệt độ II diện tích nhỏ, nghẹn dị vật đường thở còn ho và nói được, gãy xương kín, vết thương rách da chảy máu vừa |
| **`non_urgent`** | **Theo dõi** | `moderate` | Không | Không áp lực | Sơ cứu cơ bản tại nhà, vệ sinh vết thương, nghỉ ngơi, theo dõi | Vết trầy xước nhẹ, bầm tím nông, say nắng nhẹ còn tỉnh táo, chuột rút |
| **`unknown`** | **Chưa phân loại** | `moderate` | Cảnh báo gọi 115 nếu nghi ngờ | Cần làm rõ | Đặt câu hỏi làm rõ triệu chứng quan trọng; hướng dẫn tư thế an toàn | Lời kể mơ hồ ("người nhà thấy mệt", "nằm một chỗ"), thiếu dữ kiện tri giác và hô hấp |

---

## 2. Nguyên Tắc An Toàn Bất Khả Xâm Phạm (Safety Invariant)

1. **Rule Engine là Chốt Chặn An Toàn Cuối Cùng:** Quyết định phân loại cấp cứu và hành động sinh mạng (gọi 115, CPR, Heimlich) được xác định bằng thuật toán quy tắc tất định trong `src/domain/ruleEngine/index.ts`. Generative AI chỉ đóng vai trò trích xuất đặc trưng có cấu trúc (fact extraction) hoặc truy vấn học liệu có trích dẫn (retrieval QA).
2. **Nguyên Tắc Nghiêng Về Hành Động An Toàn (Bias for Action):** Khi triệu chứng mơ hồ hoặc có mâu thuẫn giữa các dấu hiệu, hệ thống bắt buộc nghiêng về mức độ nghiêm trọng cao hơn (escalate to emergency/critical) để kích hoạt hỗ trợ gọi 115 và chuẩn bị sơ cấp cứu.
3. **Không Chẩn Đoán Bệnh:** Toàn bộ giao diện và API tuyệt đối không trả về chẩn đoán bệnh học (diagnostic claims), không chỉ định thuốc, chỉ hướng dẫn động tác cơ học an toàn và kết nối lực lượng cấp cứu chuyên nghiệp 115.
