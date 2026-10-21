# External first-aid data pipeline

## Safety boundary

External QA is **candidate data**, not approved medical knowledge. Importing it must not publish answers to the app, write it into the approved knowledge base, or imply clinical validation. The importer below writes local JSONL plus a report only; it never writes to Supabase.

## Supported workflow

1. Confirm the exact source artifact, license, attribution obligations, and permitted use. The registry in `data/external-dataset-registry.json` is a discovery checklist, not legal advice or an approval record.
2. Download the dataset artifact manually from its canonical source into a local, untracked folder such as `data/raw/`. Do not commit raw datasets unless redistribution rights are explicit.
3. Run the candidate importer:
   ```bash
   pnpm data:import-external -- --input data/raw/firstaidqa.json \
     --source-id firstaidqa \
     --source-name "FirstAidQA" \
     --url "https://huggingface.co/datasets/i-am-mushfiq/FirstAidQA" \
     --license "CC-BY-4.0" \
     --attribution "FirstAidQA dataset; verify author attribution from the dataset card" \
     --language en
   ```
4. Inspect the report and rejected rows. Output is under `data/candidates/`; every record has `quality_label=external_unreviewed`, `review_required=true`, `pii_checked=false`, and `safety_checked=false`.
5. Review source licensing/attribution, privacy, duplicate and near-duplicate questions, medical correctness, harmful/unsupported claims, and emergency escalation language. Have a qualified first-aid reviewer approve content before creating a reviewed dataset.
6. Split at the **scenario-group** level before training. All paraphrases and task variants of one scenario must stay in one split. Exact input de-duplication alone is insufficient.
7. Run `pnpm data:evaluate-ai` and `pnpm test` after every split change. The integrity audit must report zero exact-input and scenario-group overlap between holdout and train/validation/test.
8. Do not promote a dataset to benchmark-ready merely because leakage is zero. The project guardrails currently require at least 30 holdout rows, 10 independent scenario groups, reviewed labels (`quality_label=reviewed` and `review_required=false`), and no leakage. These thresholds are project gates, not a guarantee of statistical power or clinical validity.

## Current dataset v1.1.0 split status

The existing synthetic dataset has been repartitioned to remove overlap. The holdout currently contains 10 rows across 5 scenario groups; the train/validation/test corpus contains 172 rows across 21 groups (106 train, 33 validation, 33 test). This fixes the known overlap for this version, but **the holdout is intentionally marked not ready for model performance claims** because it is small and all rows still require qualified review. The 92 excluded overlapping rows are preserved in `data/v1/excluded_leakage_samples.jsonl` for traceability only: 50 former train/validation/test rows from reserved groups and 42 former holdout rows from groups not reserved for holdout. They must never be fed into training, validation, test, or benchmark runs. Add newly authored or licensed independent scenario groups before expanding the holdout; do not copy or relabel existing train examples.

## Import behavior and limitations

- Accepts JSON arrays, JSON objects with `data`, `records`, `examples`, `rows`, or `train` arrays, single QA objects, and JSONL/NDJSON files.
- Recognizes common question/answer field names. Unknown schemas should be adapted explicitly; do not guess fields silently.
- Removes HTML/script/style markup, normalizes whitespace, rejects missing/short QA pairs, and deduplicates exact normalized question-answer pairs using SHA-256.
- Uses deterministic hash-based train/validation/test assignment, so identical normalized questions remain in the same split. It does not guarantee exact 80/10/10 proportions for small datasets.
- Records source URL, license string, attribution, original row ID, content hash, and review flags.
- Does not perform medical adjudication, robust PII detection, license verification, translation, semantic deduplication, or network downloads.

## Database handling

The `ai_training_examples.quality_label` constraint supports `external_unreviewed`, but current public/authenticated read policies only expose `reviewed` or `pilot_verified` rows. Keep service-role credentials out of local candidate-processing scripts. The importer intentionally has no database client. A separate reviewed-ingestion path should require explicit approval metadata and fail closed when required provenance is absent.

## Data classes that must remain separate

- **Medical knowledge/QA:** source-cited content; candidate and reviewed states.
- **Intent classification:** labels for routing; not authoritative medical advice.
- **Public/geospatial data:** e.g. AED/facility records; validate freshness, coordinates, verification and origin.
- **Incident timelines:** operational analytics; synthetic records are immutable `synthetic_seed`; real pilot records need consent/lawful basis, minimization, access controls and retention rules.
- **Psychological/emotional first aid:** a separate domain, not interchangeable with physical first aid.
