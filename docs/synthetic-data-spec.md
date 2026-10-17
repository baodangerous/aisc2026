# Quy Chuẩn & Đặc Tả Dữ Liệu Mô Phỏng — AISC'26 GoldenMinutes

**Mã tài liệu:** SPEC-DATA-SYNTHETIC-2026-v1.0  
**Đội ngũ:** Golden Pulse — Chủ đề Data Driven Business (AISC'26)  
**Phạm vi áp dụng:** Lớp dữ liệu mô phỏng phục vụ minh họa vòng lặp dữ liệu khép kín: **DATA → INSIGHT → DECISION → ACTION → MEASURE**.

---

## 1. Mục Đích & Nguyên Tắc Bảo Mật An Toàn

1. **Minh họa quy trình ra quyết định:** Dữ liệu mô phỏng sự cố thực địa (incident timeline) giúp doanh nghiệp và cơ quan quản lý hình dung trực quan cách các can thiệp (Interventions: đặt thêm AED, tập huấn CPR cộng đồng) làm giảm chỉ số trễ có thể phòng tránh (ADI) và tỷ lệ bỏ lỡ thời gian vàng (MRO Rate).
2. **Không gây nguy hiểm thực địa (Zero Field Contamination):**
   - Tuyệt đối **KHÔNG sinh AED mô phỏng vào bản đồ người dùng `/nearby`** hoặc danh bạ cấp cứu thật.
   - Toàn bộ bản ghi mô phỏng mang nhãn bất biến `origin = 'synthetic_seed'`.
   - Trên Dashboard, mọi hiển thị phân tích từ nguồn này đều bắt buộc kèm banner cảnh báo:
     > *"Dữ liệu mô phỏng phục vụ phân tích quyết định — không phản ánh ca cấp cứu thực tế."*

---

## 2. Nguồn Tham Chiếu Khoa Học & Phân Phối Xác Suất

| Tham số / Mốc | Phân phối xác suất | Trung vị (Untrained) | Trung vị (Trained) | Nguồn chuẩn y khoa |
|---|---|---|---|---|
| Phát hiện & nhận diện triệu chứng | Log-Normal ($\sigma=0.25$) | 8 - 12s | 5 - 8s | AHA CPR Guidelines 2020 |
| Mở hướng dẫn (TTG) | Log-Normal ($\sigma=0.30$) | 25 - 35s | 12 - 15s | ERC Resuscitation Guidelines 2021 |
| Kích hoạt gọi 115 (TTC) | Log-Normal ($\sigma=0.35$) | 60 - 80s | 25 - 40s | AHA Emergency Cardiovascular Care |
| Bắt đầu hành động ép tim / ép máu (TTA) | Log-Normal ($\sigma=0.35$) | 90 - 130s | 45 - 60s | ACS Stop the Bleed 2020 |
| Phản ứng điều phối cứu hộ cấp cơ sở | Log-Normal ($\sigma=0.30$) | 4 - 8 phút | 3 - 5 phút | Nghiên cứu mạng lưới GoodSAM / PulsePoint |
| Thời gian xe cứu thương 115 tiếp cận | Log-Normal ($\sigma=0.30$) | 14 - 22 phút | 14 - 22 phút | Khảo sát giao thông & cấp cứu ngoại viện TP.HCM |

---

## 3. Không Gian Địa Lý (17 Phường/Quận TP.HCM)

Mô phỏng 2.000 sự cố trải đều trên 90 ngày tại 17 đơn vị hành chính TP.HCM đại diện cho các hình thái mật độ:
- **Khu thương mại & dịch vụ:** Phường Bến Nghé (Q1), Phường Bến Thành (Q1), Phường 2 (Q5), Phường 12 (Q10).
- **Khu dân cư mật độ cao:** Phường Võ Thị Sáu (Q3), Phường 5 (Q3), Phường 19 (Q. Bình Thạnh), Phường 7 (Q. Phú Nhuận), Phường Thảo Điền (TP. Thủ Đức).
- **Khu giáo dục / làng đại học:** Phường 14 (Q10), Phường 25 (Q. Bình Thạnh), Phường Linh Trung (TP. Thủ Đức).
- **Khu đô thị mới & hỗn hợp:** Phường Đa Kao (Q1), Phường 11 (Q5), Phường 2 (Q. Tân Bình), Phường Tân Phú (Q7), Phường Tân Hưng (Q7).

---

## 4. Bảng Mẫu 10 Dòng Sự Cố (Phụ Lục M Mẫu)

Dưới đây là 10 dòng sự cố mô phỏng được trích xuất từ tập `data/synthetic_incidents_timeline.json` (Seed: 20261017):

| ID Sự cố | Phường / Quận | Nhóm tình huống | Mức độ | TTG (s) | TTC (s) | TTA (s) | ADI (s) | MRO? | Nguồn (Origin) |
|---|---|---|---|---|---|---|---|---|---|
| `inc_syn_00001` | Phường Võ Thị Sáu, Q3 | Ngừng tuần hoàn (OHCA) | `critical` | 13 | 38 | 54 | 0 | Không | `synthetic_seed` |
| `inc_syn_00002` | Phường 14, Q10 | Đột quỵ não cấp (FAST) | `emergency` | 28 | 52 | 68 | 58 | Có | `synthetic_seed` |
| `inc_syn_00003` | Phường Bến Nghé, Q1 | Chảy máu động mạch | `emergency` | 14 | 36 | 46 | 0 | Không | `synthetic_seed` |
| `inc_syn_00004` | Phường Linh Trung, TP. Thủ Đức | Hóc dị vật đường thở | `critical` | 22 | 48 | 62 | 52 | Có | `synthetic_seed` |
| `inc_syn_00005` | Phường 2, Q5 | Chấn thương gãy xương | `urgent` | 32 | 75 | 110 | 47 | Có | `synthetic_seed` |
| `inc_syn_00006` | Phường Thảo Điền, TP. Thủ Đức | Ngừng tuần hoàn (OHCA) | `critical` | 11 | 34 | 49 | 0 | Không | `synthetic_seed` |
| `inc_syn_00007` | Phường 25, Q. Bình Thạnh | Đột quỵ não cấp (FAST) | `emergency` | 35 | 64 | 82 | 91 | Có | `synthetic_seed` |
| `inc_syn_00008` | Phường Tân Phú, Q7 | Ngừng tuần hoàn (OHCA) | `critical` | 42 | 95 | 140 | 157 | Có | `synthetic_seed` |
| `inc_syn_00009` | Phường 7, Q. Phú Nhuận | Chảy máu động mạch | `emergency` | 12 | 31 | 44 | 0 | Không | `synthetic_seed` |
| `inc_syn_00010` | Phường Bến Thành, Q1 | Hóc dị vật đường thở | `critical` | 9 | 24 | 36 | 0 | Không | `synthetic_seed` |

---

## 5. Minh Họa Chu Trình Can Thiệp (Intervention Loop)

```
[DATA] 
  v_region_daily_adi chỉ ra: Phường Linh Trung (QTD-P01) có ADI trung vị 32s, MRO rate 42%.
      ↓
[INSIGHT] 
  Điểm nghẽn chính: Thời gian nhận biết và bấm 115 bị trễ 30s so với chuẩn AHA (TTC = 55s vs chuẩn 30s).
      ↓
[DECISION] 
  Tổ chức can thiệp: Mở chiến dịch tập huấn kỹ năng sơ cứu FAST & CPR lưu động tại Ký túc xá Đại học Quốc gia.
      ↓
[ACTION] 
  Tạo bản ghi `interventions`: type = 'cpr_training', target_region = 'QTD-P01', window = 30 ngày.
      ↓
[MEASURE] 
  Đo lường sau can thiệp (`intervention_evaluations`):
  - ADI trung vị giảm từ 32s → 19s (giảm 40.6%).
  - Tỷ lệ MRO giảm từ 42% → 22% (p < 0.05).
  - Tỷ lệ hoàn thành quy trình tăng từ 64% → 89%.
```
