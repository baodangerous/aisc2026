# GoldenMinutes AISC'26 — Baseline Audit & Environment State

**Thời điểm lập:** 17/10/2026  
**Đội ngũ:** Golden Pulse — Chủ đề Data Driven Business (AISC'26)  
**Mục tiêu:** Thiết lập baseline kiểm thử, kiến trúc và mô hình dữ liệu trước khi thực hiện các phase chuyển giao.

---

## 1. Kết Quả Kiểm Thử & Kiểm Tra Mã Nguồn (Baseline Check)

### Lệnh đã thực thi
- `npm run lint` (`tsc --noEmit`): **Thành công (0 lỗi)**
- `npm test` (`vitest run`): **13 test files pass, 41/41 tests pass (100%)**
- `npm run build` (Vite client + esbuild standalone server): **Thành công**
- `npm run build:vercel` (`vite build`): **Thành công**

### Báo cáo các bộ kiểm thử
1. `tests/no-secrets.test.ts`: Đảm bảo `.env.example` không chứa giá trị thật/giả định sai lệch, không có khóa bí mật nào rò rỉ trong source code (`AIza*`, JWT dài, `sb_secret_*`, private keys).
2. `tests/role-escalation.test.ts`: Đảm bảo kiểm soát vai trò RBAC (`citizen`, `volunteer`, `org_admin`, `platform_admin`).
3. `tests/release-data-security.test.ts`: Bảo vệ quyền riêng tư người dùng theo NĐ 13/2023/NĐ-CP (lọc PII, device_hash, geohash).
4. `tests/spawn-process-resilience.test.ts`: Kiểm tra liveness và resilience khi database ngoại tuyến.
5. `tests/api-routing-and-content-type.test.ts`: Đảm bảo toàn bộ endpoint `/api/*` trả JSON chuẩn, không fallback về HTML.
6. `tests/production-entry.test.ts`: Kiểm tra HTTP server production khởi động và đóng sạch sẽ trên `0.0.0.0:3000`.
7. `tests/volunteer-status.test.ts`: Kiểm tra quy trình đăng ký và duyệt tình nguyện viên.
8. `tests/session-idempotency.test.ts`: Chống trùng lặp sự kiện luyện tập qua `clientEventId`.
9. `tests/safety-claims.test.ts`: Đảm bảo không phát ngôn y khoa chưa kiểm chứng.
10. `tests/cors-security.test.ts`: Kiểm tra chính sách CORS trên môi trường production.
11. `tests/gemini-resilience.test.ts`: Đảm bảo lỗi từ phía Gemini được bắt lịch sự với status 500/503.
12. `tests/ai-no-fallback.test.ts`: Kiểm tra không bịa thông tin y khoa bằng từ khóa khi AI không khả dụng.
13. `tests/readyz-probe.test.ts`: Kiểm tra readiness probe.

---

## 2. Bảng Đồng Bộ Cơ Sở Dữ Liệu Live (Database Baseline Sync)

Theo báo cáo kiểm tra cơ sở dữ liệu live của dự án, các bảng sau đã được đồng bộ vào repository qua migration `202610170002_baseline_sync.sql`:

| Tên bảng / View | Trạng thái hiện tại | Chuẩn hóa quy định |
|---|---|---|
| `medical_facilities` | 352 dòng trên live DB | **Bảng chuẩn** lưu thông tin cơ sở y tế xác thực |
| `facilities` | 0 dòng (chồng lấn) | Tạo view tương thích `facilities_compat` trỏ về `medical_facilities` |
| `organizations` | Có trên live DB | Bảng quản lý tổ chức / trường học / cơ quan |
| `organization_members` | Có trên live DB | Quản lý thành viên & phân quyền RBAC |
| `organization_invitations` | Có trên live DB | Quản lý lời mời tham gia tổ chức |
| `sites` & `site_subscriptions` | Có trên live DB | Điểm cơ sở trực thuộc tổ chức & gói đăng ký |
| `data_partnerships` | Có trên live DB | Quản lý đối tác dữ liệu & MoU |
| `audit_logs` | Có trên live DB | Lưu vết kiểm toán cho các thao tác bảo mật/admin |
| `aggregates` | Có trên live DB | Bảng số liệu tổng hợp phục vụ dashboard |
| `forum_*` & `post_reactions` | Có trên live DB | Bảng diễn đàn cộng đồng |
| `app_records` | Có trên live DB | **Đánh dấu LEGACY**, không dùng cho các thực thể quan hệ mới |

*Ghi chú lệnh đồng bộ trực tiếp khi có tài khoản admin DB:*
```bash
supabase db dump --schema public > supabase/migrations/202610170002_live_dump.sql
```

---

## 3. Rà Soát Bí Mật & Môi Trường (Secrets & Environment Hygiene)

1. File `.env.example` đã được làm sạch hoàn toàn: chỉ giữ danh sách tên biến với giá trị rỗng (`KEY=`), không chứa giá trị mẫu giả nhằm tránh Vercel nạp nhầm.
2. Đã bỏ chú thích dư thừa.
3. Không biến bí mật nào (`SERVICE_ROLE`, `SECRET`) mang tiền tố `VITE_` hay `NEXT_PUBLIC_`.
4. Đã thêm test tự động `tests/no-secrets.test.ts` chặn commit chứa regex khóa bí mật hoặc private key.

---

## 4. Ràng Buộc Vercel Hobby & Supabase Free

- **Vercel Build Script:** Đã thêm `"build:vercel": "vite build"` trong `package.json` và cấu hình trong `vercel.json` (không chạy esbuild server bundle trên Vercel).
- **Vite Base URL:** Đã đổi thành `base: '/'` trong `vite.config.ts` để các route con (`/dashboard`, `/emergency`, `/verify/:hash`) tải chính xác assets.
- **Vercel Region:** Đã chỉ định `"regions": ["sin1"]` (Singapore) trong `vercel.json` để tối ưu độ trễ cho người dùng tại Việt Nam.
- **Cache-Control Headers:** Đã cấu hình `no-cache` cho `/sw.js` và `/manifest.json` trong `vercel.json`.

---

## 5. Kế Hoạch Tiếp Theo (Phase 1)
- Tiến hành audit tập dữ liệu demo 505 mẫu (`scripts/audit-dataset.ts`).
- Xây dựng dataset v1 (`data/v1/*.jsonl` + `scripts/build-dataset-v1.ts`) đạt tối thiểu 200–300 mẫu duy nhất, phủ 12 nhóm tình huống sơ cấp cứu chuẩn, không rò rỉ dữ liệu giữa các split, đầy đủ metadata & provenance.
- Thiết lập kịch bản đánh giá benchmark (`scripts/evaluate-ai.ts`).
