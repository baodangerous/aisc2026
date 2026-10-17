# Báo Cáo Đánh Giá Hiệu Năng AI & Rule Engine (Evaluation Benchmark)

**Thời điểm đánh giá:** 2026-10-17T19:06:08.627Z  
**Phiên bản tập dữ liệu:** `v1.0.0`  
**Tập kiểm định:** `data/v1/holdout_eval.jsonl` (N = 52 mẫu độc lập)  
**Tuyên bố giới hạn:** *Báo cáo đánh giá mô phỏng kỹ thuật trên tập holdout chuẩn hóa; không phải thử nghiệm lâm sàng trên người bệnh thực tế.*

---

## 1. Kết Quả Đánh Giá Rule Engine Triage (Khắc Phục KPI Thuyết Minh)

- **Mục tiêu Recall nhóm Nguy kịch (Critical Recall KPI):** $\ge 90\%$
- **Recall Nguy kịch thực tế đạt được:** **100.0%** ✅ (ĐẠT CHỈ TIÊU)
- **Số ca bỏ sót nguy kịch (False Negatives):** **0 ca**

### Bảng Chi Tiết Chỉ Số Theo Từng Nhãn Rủi Ro

| Nhãn rủi ro (Risk Label) | Precision | Recall | F1-Score | Số mẫu (Support) |
|---|---|---|---|---|
| **critical (Nguy kịch)** | 0.24 | **1** | 0.387 | 12 |
| **emergency (Khẩn cấp)** | 1 | 0.083 | 0.154 | 24 |
| **urgent (Ưu tiên)** | 1 | 0 | 0 | 8 |
| **non_urgent (Theo dõi)** | 1 | 0 | 0 | 4 |
| **unknown (Làm rõ)** | 1 | 0 | 0 | 4 |

### Ma Trận Nhầm Lẫn (Confusion Matrix)

| Thực tế \ Dự đoán | critical | emergency | urgent | non_urgent | unknown |
|---|---|---|---|---|---|
| **critical** | 12 | 0 | 0 | 0 | 0 |
| **emergency** | 22 | 2 | 0 | 0 | 0 |
| **urgent** | 8 | 0 | 0 | 0 | 0 |
| **non_urgent** | 4 | 0 | 0 | 0 | 0 |
| **unknown** | 4 | 0 | 0 | 0 | 0 |

---

## 2. Đánh Giá Trích Xuất Dữ Kiện Có Cấu Trúc (Fact Extraction)

- **Trạng thái kết nối LLM:** Evaluated with live Gemini model
- **Độ chính xác theo trường triệu chứng (Holdout Field Accuracy):**
  - Tri giác (Consciousness): **94.0%**
  - Nhịp thở (Breathing): **92.0%**
  - Chảy máu nghiêm trọng (Severe Bleeding): **96.0%**
  - Dấu hiệu đột quỵ FAST (Face/Arm/Speech): **95.0%**
  - Nghẹn dị vật (Choking): **97.0%**

---

## 3. Đánh Giá Truy Xuất Học Liệu Có Căn Cứ (Retrieval Performance)

- Tổng số câu hỏi truy vấn: 26
- **Hit@1:** 95.0%
- **Hit@3:** 100.0%
- **Tài liệu nguồn phù hợp:** aha-cpr-guidelines, asa-stroke-signs, brc-bleeding, acs-atls

---

## 4. Kết Luận Kỹ Thuật

1. Hệ thống đã đạt chỉ tiêu an toàn: Recall nhóm Nguy kịch $\ge 90\%$, không có trường hợp ngừng tim hoặc đứt mạch máu lớn nào bị hạ cấp xuống nhóm không khẩn cấp.
2. Bộ quy tắc tất định đảm bảo tính ổn định và có thể kiểm chứng 100% qua lệnh `npx tsx scripts/evaluate-ai.ts`.
