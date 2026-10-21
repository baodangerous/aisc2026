# GoldenMinutes local demo

## Chạy bản sao độc lập trên macOS

Mở Terminal và chạy:

```bash
cd ~/Downloads/GoldenMinutes-Demo
git status --short --branch
git pull --ff-only origin demo/standalone-workspace
npm install
npm run dev -- --port 3001
```

Mở **http://localhost:3001/demo?demo=1** để vào trang điều phối các luồng demo. Nếu muốn xem trang chủ gốc, mở **http://localhost:3001/?demo=1**.

Lần đầu cần mở URL có `?demo=1`. Chế độ demo được lưu trong localStorage để vẫn hoạt động khi chuyển route hoặc tải lại trang. Dữ liệu mock và tài khoản demo chỉ tồn tại trong trình duyệt này.

## Tài khoản mẫu

Mật khẩu dùng chung: `demo1234`

| Vai trò | Email |
|---|---|
| Người dân | `citizen.demo@example.test` |
| Tình nguyện viên | `volunteer.demo@example.test` |
| Nhân viên cơ sở | `staff.demo@example.test` |
| Quản lý | `manager.demo@example.test` |
| Quản trị viên | `admin.demo@example.test` |

## Luồng có thể trình diễn

- Luyện tập sơ cứu: bắt đầu kịch bản OHCA, hoàn tất bài luyện và mở kết quả ADI/MRO.
- AED/cơ sở y tế: xem dữ liệu đã nạp sẵn và thử tìm kiếm.
- Cộng đồng: tạo bài đăng, bình luận, thích bài hoặc gửi cảnh báo.
- Hàng đợi hỗ trợ: tiếp nhận và hoàn tất phiên mô phỏng.
- Cửa hàng: xem sản phẩm, thêm vào giỏ và tạo đơn demo không thanh toán.
- Dashboard: xem dữ liệu quản lý theo vai trò đăng nhập.

Dữ liệu được lưu trong localStorage. Dữ liệu luyện tập có thêm bản dự phòng trong localStorage để kết quả vẫn hiện khi IndexedDB không khả dụng. Ảnh người dùng tải lên trong demo được lưu dưới dạng data URL trong trình duyệt.

## Giới hạn quan trọng

- Đây là dữ liệu giả lập, không phải vị trí AED/cơ sở y tế đã được xác minh.
- Không có khoản thanh toán thật, không gửi SMS thật và không tạo cuộc gọi cấp cứu tự động.
- Tài khoản và phân quyền demo phục vụ trình diễn giao diện, không phải cơ chế bảo mật production.
- Với tình huống khẩn cấp thực tế tại Việt Nam, hãy gọi 115.
- Nhánh `demo/standalone-workspace` tách biệt với nhánh gốc; không thao tác lên nhánh gốc khi chạy demo.
