# GoldenMinutes — Tài khoản demo và phân quyền

## Quy tắc bảo mật

- Chỉ chạy script trên project Supabase demo/staging riêng. Không chạy trên project đang gắn nhãn production.
- Script yêu cầu xác nhận staging và kiểm tra `DEMO_EXPECTED_PROJECT_REF` khớp chính xác với hostname trong `SUPABASE_URL`. Đây là hàng rào chống nhầm project, không thay thế việc tự xác nhận project trong Dashboard.
- `SUPABASE_SERVICE_ROLE_KEY` / secret key chỉ dùng trong phiên Terminal quản trị; tuyệt đối không đặt trong `VITE_*`, frontend, GitHub hoặc biến môi trường client trên Vercel.
- Mỗi tài khoản mới có mật khẩu ngẫu nhiên mạnh; mật khẩu chỉ in ra Terminal cho tài khoản vừa tạo. Lưu vào password manager và không commit log/ảnh chụp chứa mật khẩu.
- Nếu email demo đã tồn tại, script bỏ qua và không sửa mật khẩu, role hoặc hồ sơ hiện có. Kiểm tra thủ công trong Supabase Auth trước khi quyết định xử lý tài khoản đó.
- Quyền tin cậy dự kiến đọc từ Supabase Auth `app_metadata.role`, không đọc quyền từ `user_metadata` do người dùng có thể sửa. Phải xác nhận backend thực tế đã kiểm tra claim này trước khi demo chức năng quản trị.
- Tài khoản demo không đại diện người thật. Không dùng dữ liệu bệnh nhân thật.
- Script không tạo phiên đăng nhập cho người dùng, không bật tích hợp bệnh viện, không tạo video room và không gửi push notification.

## Vai trò đề xuất

| Vai trò nội bộ | Nhãn hiển thị sản phẩm | Mục đích demo | Giới hạn |
|---|---|---|---|
| `citizen` | Người dân | Xem nội dung, thực hành, báo cáo sự cố, phản hồi cảnh báo | Chỉ dữ liệu được phép của chính mình/cộng đồng |
| `volunteer` | Tình nguyện viên | Nhận và phản hồi cảnh báo cộng đồng | Không có quyền quản trị nền tảng hoặc xem hồ sơ riêng tư ngoài phạm vi |
| `clinical_reviewer` | Người thẩm định nội dung | Thẩm định nội dung sơ cứu và nguồn tham khảo | Không đồng nghĩa là bác sĩ đã được xác minh; chưa cấp quyền duyệt lâm sàng nếu chưa có policy riêng |
| `org_admin` | Quản trị viên tổ chức | Demo quản trị tổ chức | Cần membership active, hợp lệ trong tổ chức; chỉ có claim không tự cấp quyền truy cập tổ chức |
| `platform_admin` | Quản trị hệ thống | Demo quản trị hệ thống | Chỉ cấp cho người trình diễn được ủy quyền; không dùng làm tài khoản thường ngày |

## Bước 1 — Tạo project staging

1. Trong Supabase Dashboard, tạo project mới, đặt tên dễ nhận biết, ví dụ `GoldenMinutes Demo`.
2. Chọn mật khẩu database mạnh và lưu riêng; không gửi mật khẩu hoặc key vào chat.
3. Chờ project sẵn sàng. Trong project mới, vào Project Settings để lấy **Project URL** và **project ref**. Project ref là phần định danh của project trong URL, không phải database password.
4. Đảm bảo project này tách biệt với project đang dùng production. Không kết nối Vercel production deployment vào project demo.
5. Chạy các migration cần thiết trên project staging theo quy trình migration của repo. Không chạy migration ngẫu nhiên hoặc xóa dữ liệu trên project production.

## Bước 2 — Cấp 5 tài khoản demo

Tại Terminal, vào thư mục repo và cài dependencies nếu chưa có:

```bash
cd ~/Downloads/aisc2026
pnpm install
```

Sau đó đặt biến môi trường **chỉ trong phiên Terminal hiện tại**. Thay các giá trị mẫu bằng thông tin của project staging mà bạn tự kiểm tra trong Supabase Dashboard:

```bash
export SUPABASE_URL="https://YOUR_STAGING_PROJECT_REF.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="YOUR_STAGING_SERVICE_ROLE_OR_SECRET_KEY"
export DEMO_EXPECTED_PROJECT_REF="YOUR_STAGING_PROJECT_REF"
export DEMO_STAGING_CONFIRMATION="I_CONFIRM_THIS_IS_STAGING"
export DEMO_EMAIL_DOMAIN="your-domain.example"
```

`DEMO_EMAIL_DOMAIN` phải là domain bạn kiểm soát. Không tự ý dùng email của người khác. Nếu chưa có domain nhận thư, hãy dừng ở bước này và chọn phương án tài khoản demo phù hợp; không giả định rằng email xác nhận thực tế đã được gửi.

Trước khi chạy, kiểm tra lại **project name, URL và ref** trong Dashboard. Sau đó:

```bash
pnpm auth:provision-demo
```

Script tạo các email `demo-citizen`, `demo-volunteer`, `demo-clinical-reviewer`, `demo-org-admin`, `demo-platform-admin` tại domain đã cấu hình. Mật khẩu chỉ hiển thị cho tài khoản vừa tạo. Nếu tài khoản đã tồn tại, script bỏ qua để tránh sửa/nâng quyền một tài khoản cũ.

Khi hoàn tất, xóa key khỏi phiên Terminal:

```bash
unset SUPABASE_SERVICE_ROLE_KEY SUPABASE_SECRET_KEY SUPABASE_URL NEXT_PUBLIC_SUPABASE_URL
unset DEMO_EXPECTED_PROJECT_REF DEMO_STAGING_CONFIRMATION DEMO_EMAIL_DOMAIN
```

Nếu script tạo Auth user nhưng đồng bộ hồ sơ thất bại, hãy kiểm tra user đó trong Dashboard trước khi chạy lại. Không xóa hoặc cấp quyền lại một cách mù quáng.

## Bước 3 — Kiểm tra phân quyền

- Kiểm tra danh sách tài khoản trong Authentication → Users.
- Đăng nhập từng vai trò trong các cửa sổ trình duyệt riêng/ẩn danh.
- Thử gọi API trái quyền và truy cập dữ liệu người khác; phải nhận 401/403 hoặc kết quả bị giới hạn tương ứng.
- Kiểm tra vai trò phía server từ access token đã xác minh; không tin role do frontend gửi.
- Kiểm tra RLS cho mọi bảng có dữ liệu người dùng. Bảo đảm client không thể tự sửa role hoặc đọc dữ liệu riêng của người khác.
- Với `org_admin`, chỉ thêm membership qua quy trình quản trị tổ chức sau khi xác minh tổ chức và người được ủy quyền. Không tự tạo membership chỉ dựa vào email.
- Xóa hoặc vô hiệu hóa tài khoản demo sau buổi trình diễn; xoay key nếu từng bị lộ.

## Quy tắc giao diện sản phẩm

- Hiển thị nhãn thân thiện: **Người dân**, **Tình nguyện viên**, **Người thẩm định nội dung**, **Quản trị viên tổ chức**, **Quản trị hệ thống**.
- Không hiển thị tên bảng, tên cột, tên migration, raw role claim, stack trace, SQL hoặc thông báo lỗi nội bộ.
- Log kỹ thuật chỉ ở phía server; giao diện trả thông báo tiếng Việt ngắn gọn và mã tham chiếu hỗ trợ khi cần.
- Không thêm nhãn “Dữ liệu minh họa” hoặc nhãn tương tự vào giao diện demo. Tuyệt đối không trình bày số liệu giả lập như kết quả cứu hộ thực tế; chỉ hiển thị dữ liệu phù hợp với ngữ cảnh và không gây hiểu nhầm.

## Trạng thái hiện thực

Script tạo tài khoản Supabase Auth và đồng bộ hồ sơ cơ bản; script chưa tạo tổ chức, chưa tự thêm `organization_members`, chưa xác nhận quyền từng trang/API và chưa tạo dữ liệu nghiệp vụ mẫu. Cần chạy trong project staging rồi kiểm thử RLS và server authorization trước khi tuyên bố RBAC hoàn chỉnh.
