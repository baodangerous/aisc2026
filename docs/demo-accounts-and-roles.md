# GoldenMinutes — Tài khoản demo và phân quyền

## Quy tắc bảo mật

- Script cấp tài khoản chỉ chạy ở máy quản trị có `SUPABASE_SERVICE_ROLE_KEY`; tuyệt đối không đặt khóa này trong `VITE_*`, frontend, GitHub hoặc Vercel client variables.
- Mỗi tài khoản có mật khẩu ngẫu nhiên mạnh; mật khẩu mới chỉ in ra Terminal một lần. Lưu vào password manager và không commit log/ảnh chụp chứa mật khẩu.
- Quyền tin cậy đọc từ Supabase Auth `app_metadata.role`, không đọc quyền từ `user_metadata` do người dùng có thể sửa.
- Tài khoản demo không đại diện người thật. Không dùng dữ liệu bệnh nhân thật.
- Chạy script trên project Supabase demo/staging, không chạy production nếu chưa được người phụ trách phê duyệt.
- Script không tạo phiên đăng nhập cho người dùng, không bật tích hợp bệnh viện, không tạo video room và không gửi push notification.

## Vai trò đề xuất

| Vai trò | Mục đích demo | Giới hạn |
|---|---|---|
| `citizen` | Xem nội dung, thực hành, báo cáo sự cố, phản hồi cảnh báo | Chỉ dữ liệu được phép của chính mình/cộng đồng |
| `volunteer` | Nhận và phản hồi cảnh báo cộng đồng | Không có quyền quản trị nền tảng hoặc xem hồ sơ riêng tư ngoài phạm vi |
| `clinical_reviewer` | Thẩm định nội dung sơ cứu và nguồn RAG | Không đồng nghĩa là bác sĩ đã được xác minh; chưa cấp quyền duyệt lâm sàng nếu chưa có policy riêng |
| `org_admin` | Demo quản trị tổ chức | Cần có membership active với vai trò phù hợp trong `organization_members`; chỉ có claim không tự cấp quyền truy cập tổ chức |
| `platform_admin` | Demo quản trị hệ thống | Chỉ cấp cho người trình diễn được ủy quyền; không dùng làm tài khoản thường ngày |

## Cấp tài khoản

1. Tạo/đảm bảo một project Supabase demo riêng, chạy toàn bộ migration cần thiết.
2. Trên Terminal trong thư mục repo, đặt biến môi trường tạm thời (không ghi vào file frontend):
   ```bash
   export SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
   export DEMO_EMAIL_DOMAIN="your-domain.example"
   ```
   `DEMO_EMAIL_DOMAIN` phải là domain bạn kiểm soát và nhận được email. Ví dụ dùng địa chỉ demo trên domain riêng; không tự ý dùng email của người khác.
3. Chạy:
   ```bash
   pnpm auth:provision-demo
   ```
4. Script tạo các email `demo-citizen`, `demo-volunteer`, `demo-clinical-reviewer`, `demo-org-admin`, `demo-platform-admin` tại domain đã cấu hình. Mật khẩu của tài khoản mới được sinh ngẫu nhiên và in một lần.
5. Lưu thông tin trong password manager, sau đó xóa biến môi trường khỏi phiên Terminal khi xong:
   ```bash
   unset SUPABASE_SERVICE_ROLE_KEY
   unset SUPABASE_URL
   unset DEMO_EMAIL_DOMAIN
   ```

Nếu email demo đã tồn tại, script cập nhật `app_metadata.role` và profile role nhưng **không đặt lại mật khẩu**. Với tài khoản hiện có, quản trị viên cần thực hiện reset mật khẩu qua Supabase Auth theo quy trình bảo mật.

## Kiểm tra quyền trước khi demo

- Đăng nhập lần lượt từng vai trò trong cửa sổ trình duyệt riêng/ẩn danh.
- Thử gọi API trái quyền và truy cập dữ liệu người khác; phải nhận 401/403.
- Kiểm tra vai trò phía server từ access token đã xác minh; không tin role do frontend gửi.
- Với `org_admin`, thêm membership hợp lệ qua quy trình quản trị tổ chức sau khi xác minh ID tổ chức. Không tự tạo membership chỉ dựa vào email.
- Tắt/xóa tài khoản demo sau buổi trình diễn; xoay khóa service-role nếu từng bị lộ.

## Trạng thái hiện thực

Script tạo tài khoản Supabase Auth và đồng bộ `profiles`; script chưa tạo tổ chức, chưa tự thêm `organization_members`, chưa xác nhận quyền từng trang/API và chưa tạo dữ liệu nghiệp vụ mẫu. Cần chạy trong project của bạn rồi kiểm thử các RLS policy và server authorization trước khi tuyên bố RBAC hoàn chỉnh.
