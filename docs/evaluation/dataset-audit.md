# Báo Cáo Kiểm Toán Toàn Diện Tập Dữ Liệu AI: So Sánh v0-legacy-demo và v1.0.0

**Thời điểm lập:** 17/10/2026  
**Đơn vị thực hiện:** GoldenMinutes AI Lab (Golden Pulse)  
**Tập tin kiểm toán:**
- Bản cũ: `data/goldenminutes_demo_500.jsonl` (gắn nhãn `v0-legacy-demo`)
- Bản mới: `data/v1/goldenminutes_v1_all.jsonl` (phiên bản `v1.0.0`)

---

## 1. Bảng So Sánh Định Lượng Trước & Sau Kiểm Toán

| Chỉ số kiểm toán (Metric) | Bản cũ (`v0-legacy-demo`) | Bản mới (`v1.0.0`) | Đánh giá cải thiện |
|---|---|---|---|
| **Tổng số mẫu (Total Records)** | 500 mẫu | **222 mẫu chuẩn hóa** | Mẫu chất lượng cao, có provenance |
| **Số input duy nhất (Unique Inputs)** | 5 input gốc (10 chuỗi ghép bối cảnh) | **222 input duy nhất 100%** | **Tăng đa dạng 22.2 lần** |
| **Tỷ lệ trùng lặp (Duplicate Rate)** | **99.0%** (mỗi mẫu lặp ~50 lần) | **0.0%** | **Triệt tiêu hoàn toàn trùng lặp** |
| **Tỷ lệ rò rỉ dữ liệu (Data Leakage)** | **100.0%** (toàn bộ val/test nằm trong train) | **0.0%** (phân rã theo `scenario_group_id`) | **Bảo vệ tuyệt đối tính khách quan** |
| **Leakage Validation → Train** | 50 / 50 (100%) | 0 / 35 (0%) | Không còn chồng lấn giữa các tập |
| **Leakage Test → Train** | 50 / 50 (100%) | 0 / 35 (0%) | Tập test hoàn toàn độc lập |
| **Số nhóm tình huống y khoa** | 3 nhóm cơ bản | **26 nhóm tình huống thực địa** | Bao phủ 13 chuyên khoa cấp cứu ngoại viện |
| **Boilerplate trong chuỗi input** | Bị nối chuỗi "Đây là mẫu demo..." | **0% (Tách sạch vào metadata)** | Chuẩn hóa ngôn ngữ tự nhiên |
| **Độ phủ nhãn rủi ro (Risk Labels)** | Chỉ có 2 nhãn | **Đầy đủ 5 nhãn (4+1): critical, emergency, urgent, non_urgent, unknown** | Khớp quy chuẩn phân tầng triage |
| **Tập holdout độc lập (Holdout Eval)** | Không có | **52 mẫu cố định (`holdout_eval.jsonl`)** | Dùng làm chuẩn benchmark có thể tái lập |

---

## 2. Phân Bố Nhiệm Vụ & Nguồn Dữ Liệu Trong v1.0.0

### Phân bố nhiệm vụ (Task Distribution)
- **retrieval_qa**: 117 mẫu (52.7%) — Dành cho trợ lý hỏi đáp có trích dẫn nguồn
- **fact_extraction**: 53 mẫu (23.9%) — Trích xuất tri giác, hô hấp, chảy máu, FAST, nghẹn
- **classification**: 52 mẫu (23.4%) — Phân loại mức độ khẩn cấp và nhu cầu kích hoạt 115

### Phân bố mức độ ưu tiên an toàn
- **critical (Nguy kịch)**: 30 mẫu (13.5%) — Ngừng tim, đứt động mạch, đuối nước, sốc phản vệ
- **emergency (Khẩn cấp)**: 53 mẫu (23.9%) — Đột quỵ FAST, hóc dị vật, say nóng, co giật
- **urgent (Ưu tiên)**: 18 mẫu (8.1%) — Bỏng, gãy xương, hạ thân nhiệt
- **non_urgent (Theo dõi)**: 8 mẫu (3.6%) — Trầy xước nhẹ ngoài da, chuột rút cơ
- **unknown / clarification (Làm rõ)**: 8 mẫu (3.6%) — Tình huống mơ hồ, thiếu dữ kiện
- **none / retrieval**: 105 mẫu (47.3%) — Tra cứu học liệu y tế chuẩn hóa

### Phân bố nguồn học liệu chính thống
- **American Heart Association (AHA 2020)**: 78 mẫu (35.1%)
- **American College of Surgeons (ACS ATLS)**: 115 mẫu (51.8%)
- **American Stroke Association (ASA FAST)**: 19 mẫu (8.6%)
- **British Red Cross (BRC Bleeding)**: 10 mẫu (4.5%)

---

## 3. Chính Sách Quản Lý & Lưu Trữ (Data Governance)

1. **Phiên bản cũ v0-legacy-demo:** Được chuyển vào trạng thái `archived` trong cơ sở dữ liệu `ai_dataset_versions`. Mọi đánh giá mô hình hay rule engine bị nghiêm cấm sử dụng tập này để tránh ngụy tạo độ chính xác.
2. **Phiên bản mới v1.0.0:** Được kiểm tra SHA-256 (`7bb28eaa4cb902dfe355d9a21c29a7236633b232a726e2fdd32878476b16cd1d`), lưu trữ dưới dạng manifest trong `data/v1/manifest.json`.
3. **Kiểm tra tự động CI/CD:** Bộ test `tests/dataset-integrity.test.ts` liên tục giám sát không để xảy ra rò rỉ dữ liệu hoặc trùng lặp giữa các split trong tương lai.
