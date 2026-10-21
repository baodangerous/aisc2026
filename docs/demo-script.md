# GoldenMinutes — Kịch bản demo sản phẩm (5 phút)

## Tên đề tài
**GoldenMinutes — Nền tảng AI hỗ trợ phản ứng sơ cấp cứu và cảnh báo cứu hộ cộng đồng dựa trên dữ liệu.**

> Đây là demo sản phẩm. Dữ liệu tổng hợp chỉ dùng minh họa luồng và kiểm thử giao diện; không đại diện cho ca cấp cứu thật, không chứng minh hiệu quả lâm sàng hoặc thời gian xe cấp cứu đến nơi.

## 0:00–0:40 — Bài toán và giá trị
Mở trang chủ, giới thiệu vấn đề: trong tình huống khẩn cấp, thông tin thường rời rạc, người chứng kiến có thể không biết cần mô tả gì, ai ở gần có thể hỗ trợ và làm sao chuyển thông tin nhanh cho người tiếp nhận.

**Thông điệp:** GoldenMinutes kết nối người báo sự cố, cộng đồng ở gần và người hướng dẫn được phân quyền trong một luồng có trạng thái; không thay thế tổng đài 115.

## 0:40–1:40 — Báo cáo hiện trường
Mở **Khẩn cấp**. Nhập mô tả tình huống mẫu, ví dụ: “Một người ngã trước cổng tòa nhà, không phản ứng; đã nhờ người gọi 115”. Thử nút mô tả bằng giọng nói nếu trình duyệt hỗ trợ; đính kèm ảnh/video mẫu không chứa dữ liệu cá nhân; xác nhận GPS và chọn bán kính thông báo.

Nhấn **Gửi cảnh báo cộng đồng** chỉ trong môi trường demo được phép. Giải thích người dùng chủ động xác nhận trước khi gửi, có thể bỏ qua media và vị trí nếu không đồng ý.

## 1:40–2:30 — AI làm gì?
- **LLM:** chuyển mô tả tiếng Việt thành bản tóm tắt có cấu trúc, nêu dấu hiệu người gửi đã kể và những thông tin còn thiếu. Không tự chẩn đoán và không biến điều chưa biết thành sự thật.
- **RAG:** khi được tích hợp với kho hướng dẫn đã thẩm định, truy xuất nội dung sơ cứu kèm nguồn; không tự tạo quy trình y khoa không có nguồn.
- **ML:** có thể xếp hạng ưu tiên hoặc dự báo điểm nghẽn phản ứng sau khi có dữ liệu đủ chất lượng, nhãn được rà soát và đánh giá độc lập. Không tuyên bố mô hình đã đạt độ chính xác lâm sàng nếu chưa có kết quả kiểm thử.
- **Bộ quy tắc an toàn:** nhắc gọi 115 ngay khi có dấu hiệu nguy hiểm; không phụ thuộc AI hoặc kết nối mạng.

## 2:30–3:20 — Cộng đồng và tiếp nhận
Mở **Cộng đồng** để xem cảnh báo theo vị trí/bán kính và trạng thái phản hồi. Nêu rõ thông báo trong demo chỉ tới người dùng của hệ thống; push notification trên thiết bị, xác minh người hỗ trợ, SLA và tích hợp bệnh viện cần cấu hình/đối tác thực tế.

Mở **Hỗ trợ từ xa** để trình bày hàng chờ tiếp nhận. Khi yêu cầu được chấp nhận và backend cấp phòng, người dùng có thể tham gia video. Video không thay thế 115 và không hàm ý xe cứu thương đang được điều phối nếu chưa có tích hợp chính thức.

## 3:20–4:20 — Tổ chức và dữ liệu
Mở dashboard tổ chức. Giải thích ADI là chỉ số độ trễ có thể phòng tránh được tính theo định nghĩa dự án; phân biệt phiên luyện tập, dữ liệu pilot đã xác minh và dữ liệu tổng hợp. Không gộp dữ liệu mô phỏng vào kết quả pilot hoặc dùng chúng để tuyên bố hiệu quả ngoài đời.

## 4:20–5:00 — Đối tác và mô hình triển khai
Mở trang **Đối tác**. Trình bày đề xuất:
- Cơ sở y tế/đơn vị đào tạo: thẩm định nội dung, đào tạo và quy trình tiếp nhận.
- Đơn vị vận chuyển/di chuyển: nghiên cứu kênh hỗ trợ tiếp cận hoặc truyền thông; chỉ tích hợp dữ liệu vận hành khi có thỏa thuận.
- Ví điện tử/doanh nghiệp: tài trợ CSR, chiến dịch đào tạo và xác minh đóng góp.
- Trường học/doanh nghiệp: dashboard đào tạo, báo cáo can thiệp và đo lường trước/sau.

Đây là các hướng hợp tác đề xuất, không phải xác nhận đã ký kết.

## Checklist trước buổi demo
- Dùng tài khoản demo và dữ liệu giả lập; không tải ảnh/video của người thật lên môi trường công khai.
- Kiểm tra quyền GPS, micro, camera và quyền đăng nhập trước buổi trình bày.
- Nếu Supabase hoặc AI không khả dụng, trình bày trạng thái lỗi minh bạch; không giả lập kết quả như dữ liệu thật.
- Khi có tình huống thật: gọi 115 trước, bật loa ngoài và làm theo hướng dẫn của tổng đài.
- Màn hình Digital Proof giữ nguyên disclaimer pháp lý hiện hành; không tuyên bố có giá trị pháp lý nếu chưa được cơ quan có thẩm quyền công nhận.
