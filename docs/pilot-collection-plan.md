# Kế Hoạch Thu Thập Dữ Liệu Thực Nghiệm (Pilot Protocol) — Phase 3B

**Dự án:** GoldenMinutes — Luyện phản xạ sơ cấp cứu (Golden Pulse — AISC'26)  
**Mục tiêu:** Thu thập dữ liệu thực tế từ người dùng luyện tập (origin = `training_user`), chứng minh tính khả thi, tác động giảm thời gian trễ (Avoidable Delay Index - ADI) và đo lường độ khả dụng hệ thống (SUS Score).

---

## 1. Nguyên Tắc Bảo Vệ Dữ Liệu & Quyền Riêng Tư (NĐ 13/2023/NĐ-CP)

1. **Tuyệt đối không lưu trữ PII:**
   - Không thu thập họ tên, CCCD, địa chỉ nhà, số điện thoại thật hay vị trí GPS chính xác trong các phiên luyện tập.
   - Định danh phiên thông qua `device_hash` (chuỗi mã hóa một chiều SHA-256 từ fingerprint phần cứng) và `sessionId` ngẫu nhiên.
2. **Phiếu đồng thuận minh bạch (Informed Consent):**
   - Trước khi bắt đầu, người dùng xác nhận tham gia khảo sát pilot ẩn danh nhằm phục vụ nghiên cứu khoa học và cộng đồng.
   - Quyền rút lui bất cứ lúc nào qua tính năng *"Yêu cầu xóa dữ liệu"* (Right to Erasure) theo Điều 16 NĐ 13/2023/NĐ-CP.
3. **Tính nguyên vẹn:**
   - Mọi mốc thời gian sự kiện (`occurredAtClient`, `elapsedMs`) được ký xác thực số (Digital Proof) với mã băm SHA-256 để chống gian lận.

---

## 2. Các Kịch Bản Thử Nghiệm Chuẩn Hóa

Nhóm tuyển chọn 3 kịch bản sơ cấp cứu có tỷ lệ tử vong cao nhất ngoài cộng đồng:

### Kịch bản 1: Ngừng tuần hoàn ngoại viện người lớn (OHCA)
- **Mã kịch bản:** `sc_ohca_01` (AHA CPR 2020)
- **Thời gian mục tiêu:**
  - Nhận diện ngừng tuần hoàn: $\le 8$ giây.
  - Mở thẻ hướng dẫn chuẩn: $\le 15$ giây.
  - Gọi 115 hoặc nhờ người gọi: $\le 45$ giây.
  - Bắt đầu ép tim liên tục (100–120 nhịp/phút): $\le 60$ giây.
- **Ngưỡng MRO:** $ADI > 25$ giây.

### Kịch bản 2: Hóc dị vật đường thở tắc nghẽn hoàn toàn (Choking)
- **Mã kịch bản:** `sc_choking_01` (ERC 2021)
- **Thời gian mục tiêu:**
  - Mở thẻ hướng dẫn thao tác: $\le 10$ giây.
  - Gọi 115 hỗ trợ: $\le 30$ giây.
  - Bắt đầu 5 vỗ lưng + 5 ép bụng Heimlich: $\le 40$ giây.
- **Ngưỡng MRO:** $ADI > 20$ giây.

### Kịch bản 3: Chảy máu động mạch xối xả (Severe Bleeding)
- **Mã kịch bản:** `sc_bleeding_01` (ACS Stop the Bleed)
- **Thời gian mục tiêu:**
  - Mở thẻ hướng dẫn: $\le 15$ giây.
  - Gọi 115 báo tin: $\le 40$ giây.
  - Đè ép trực tiếp / Đặt garô chèn động mạch: $\le 50$ giây.
- **Ngưỡng MRO:** $ADI > 20$ giây.

---

## 3. Bộ Chỉ Số Đánh Giá Trước / Sau (Pre / Post Survey)

Người tham gia hoàn thành 3 câu hỏi Likert 1–5 trước khi bắt đầu và sau khi hoàn thành phiên luyện tập:

1. **Độ tự tin thao tác (Confidence Score):**
   > *"Tôi tự tin mình biết chính xác các bước cần làm khi gặp tình huống này."* (1: Rất không tự tin → 5: Rất tự tin)
2. **Mức độ sẵn sàng tâm lý (Preparedness Score):**
   > *"Tôi cảm thấy sẵn sàng hành động ngay mà không bị hoảng loạn."* (1: Hoàn toàn chưa sẵn sàng → 5: Rất sẵn sàng)
3. **Mức độ lo âu / sợ hãi làm sai (Anxiety Score):**
   > *"Tôi lo sợ mình sẽ thao tác sai gây nguy hiểm thêm cho nạn nhân."* (1: Rất lo sợ → 5: Rất bình tĩnh, không lo sợ)

Sau phiên luyện tập, người dùng trả lời **Thang đo Khả dụng Hệ thống chuẩn (System Usability Scale - SUS)** gồm 10 câu hỏi chuẩn hóa (điểm quy đổi từ 0 đến 100).

---

## 4. Quy Trình Vận Hành Thử Nghiệm

1. **Tuyển chọn học viên:** Tối thiểu 30–50 người dùng độc lập (sinh viên đại học, nhân viên văn phòng, tình nguyện viên cộng đồng).
2. **Tiến hành phiên:**
   - Bước 1: Mở app, hiển thị màn hình Pre-Survey (3 câu Likert).
   - Bước 2: Thực hiện bài tập mô phỏng (ghi nhận timestamp miligiây tại từng mốc).
   - Bước 3: Xem kết quả phân tích ADI và hoàn thành Post-Survey + SUS.
   - Bước 4: Tự động đồng bộ bản ghi về bảng `pilot_surveys` và `training_sessions` với `dataOrigin = 'training_user'`.
3. **Xuất báo cáo:** Chạy script `npx tsx scripts/export-pilot-report.ts` để sinh báo cáo thống kê CSV (N, Trung vị, Khoảng tin cậy 95%, Điểm SUS).
