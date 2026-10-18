# Proposal alignment

This ledger separates verified repository evidence from work that still requires live data, human review, or deployment checks. It is intentionally conservative.

| Commitment | Status | Evidence / gap |
|---|---|---|
| Dataset v1 has at least 200 unique records, metadata, version, and checksum | Đạt | `data/v1/manifest.json`, `docs/evaluation/dataset-audit.md`, `tests/dataset-integrity.test.ts` |
| No train/validation/test leakage | Đạt | `tests/dataset-integrity.test.ts`, `data/v1/manifest.json` |
| Critical recall measured on independent holdout | Đạt một phần | `docs/evaluation/ai-eval-report.md` reports 100% critical recall on 52 holdout records; emergency/urgent recall remains low and must not be described as solved. |
| Legacy dataset is archived, not deleted | Đạt một phần | Archive metadata is documented in `docs/evaluation/dataset-audit.md`; live archive state requires Supabase ingestion verification. |
| Incident timeline and simulated incidents | Đạt một phần | Migration `supabase/migrations/202610180002_incident_timeline_and_aed.sql` and generated data exist; live row count and 30 end-to-end practice sessions still require verification. |
| RLS and role matrix | Đạt một phần | `tests/rls-matrix.test.ts` covers policy contracts; live Supabase policy execution must still be run before claiming production coverage. |
| Offline PWA and sync | Đạt một phần | `public/manifest.json`, `public/sw.js`, IndexedDB service, and related tests exist; Android/iOS installation and full offline recovery-rate evidence are still manual acceptance checks. |
| Digital Proof verification | Đạt một phần | `/verify/:hash` and proof UI exist; PDF/image export and live `digital_proofs` persistence need a deployed-path check. |
| Responder simulation | Đạt một phần | Deterministic responder scoring exists; dispatch tier E2E evidence and real volunteer recruitment are not claimed. |
| Grounded chatbot and admin console | Chưa | Requires approved knowledge retrieval, refusal evaluation, admin authorization matrix, and E2E evidence. |
| Verified AEDs never appear in nearby/public APIs | Đạt một phần | Data guards and tests exist; requires live query/API audit with zero unverified rows. |
| Human review and pilot collection | Chưa | Project owners must obtain clinician approval, recruit 30–50 consenting participants, and import verified AED evidence. |

## Release rule

A row marked `Đạt một phần` or `Chưa` must remain visible in demos and README claims. Do not convert it to `Đạt` without attaching a reproducible command, test output, or human evidence artifact.
