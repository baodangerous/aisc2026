# Dataset Integrity & Evaluation Readiness

**Generated:** 2026-10-21T13:25:00.000Z
**Dataset version:** v1.1.0
**Holdout rows:** 10
**Independent scenario groups:** 5
**Benchmark readiness:** not_ready

> This report checks dataset integrity and leakage only. It does not claim clinical validation or AI accuracy.

## Integrity
- Invalid rows/issues: 0
- Duplicate normalized inputs: 0
- Unique scenario groups: 5
- Task distribution: {"retrieval_qa":5,"classification":5}
- Risk distribution: {"critical":8,"emergency":2}

## Holdout overlap (must be zero)
- Exact input overlap by split: {"train":0,"validation":0,"test":0}
- Scenario-group overlap by split: {"train":0,"validation":0,"test":0}
- Exact-input leakage detected: false
- Scenario-group overlap detected: false

## Why benchmark readiness is not granted
- Holdout has fewer than 30 examples; this is a project guardrail, not a statistical guarantee.
- Holdout has fewer than 10 independent scenario groups.
- 10 holdout rows are not marked reviewed with review_required=false.

## Model evaluation status
- Rule-engine triage: NOT EVALUATED — no predictions are produced by this integrity audit.
- Gemini fact extraction: NOT EVALUATED — must run on raw inputs without gold-label-derived features.
- Retrieval Hit@k: NOT EVALUATED — must run the actual retriever against reviewed relevance judgments.

## Next steps
1. Add new independent scenario groups; do not move paraphrases of known groups into holdout.
2. Have qualified reviewers verify first-aid answers, escalation language, citations, and labels.
3. Save model predictions separately before comparing them with reviewed gold labels.
4. Re-run `pnpm data:evaluate-ai` and the dataset integrity tests before interpreting metrics.
