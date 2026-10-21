import fs from 'node:fs';
import path from 'node:path';

type RiskLabel = 'critical' | 'emergency' | 'urgent' | 'non_urgent' | 'unknown';
interface EvalExample {
  external_id: string;
  dataset_version: string;
  scenario_group_id: string;
  scenario_label: string;
  risk_label: RiskLabel;
  task: 'retrieval_qa' | 'fact_extraction' | 'classification';
  input: string;
  expected_output: unknown;
  source_document_external_id: string;
  split: string;
  quality_label?: string;
  review_required?: boolean;
}

const REQUIRED_LABELS: RiskLabel[] = ['critical', 'emergency', 'urgent', 'non_urgent', 'unknown'];
const MIN_HOLDOUT_ROWS = 30;
const MIN_HOLDOUT_GROUPS = 10;

function readJsonl(filePath: string): EvalExample[] {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter((line) => line.trim());
  return lines.map((line, index) => {
    try {
      const row = JSON.parse(line) as EvalExample;
      if (!row || typeof row !== 'object' || typeof row.input !== 'string' || typeof row.external_id !== 'string') {
        throw new Error('required fields external_id and input are missing');
      }
      return row;
    } catch (error) {
      throw new Error('Invalid dataset row at ' + filePath + ':' + (index + 1) + ': ' + (error instanceof Error ? error.message : String(error)));
    }
  });
}

function normalizeInput(input: string): string {
  return input.normalize('NFKC').toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ').trim();
}

function countBy<T extends string>(values: T[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

export function runEvaluation() {
  const root = process.cwd();
  const holdoutPath = path.resolve(root, 'data/v1/holdout_eval.jsonl');
  if (!fs.existsSync(holdoutPath)) throw new Error('Holdout evaluation dataset not found at: ' + holdoutPath);

  const examples = readJsonl(holdoutPath);
  const issues: string[] = [];
  const seenIds = new Set<string>();
  const seenInputs = new Map<string, string>();
  const duplicates: Array<{ input: string; firstId: string; duplicateId: string }> = [];

  for (const example of examples) {
    if (!example.scenario_group_id) issues.push(example.external_id + ': missing scenario_group_id');
    if (!REQUIRED_LABELS.includes(example.risk_label)) issues.push(example.external_id + ': invalid risk_label');
    if (!['retrieval_qa', 'fact_extraction', 'classification'].includes(example.task)) issues.push(example.external_id + ': invalid task');
    if (seenIds.has(example.external_id)) issues.push(example.external_id + ': duplicate external_id');
    seenIds.add(example.external_id);
    const normalized = normalizeInput(example.input);
    const previous = seenInputs.get(normalized);
    if (previous) duplicates.push({ input: normalized, firstId: previous, duplicateId: example.external_id });
    else seenInputs.set(normalized, example.external_id);
  }

  const comparisonFiles = [
    { split: 'train', path: path.resolve(root, 'data/v1/train.jsonl') },
    { split: 'validation', path: path.resolve(root, 'data/v1/validation.jsonl') },
    { split: 'test', path: path.resolve(root, 'data/v1/test.jsonl') },
  ];
  const availableSplits = comparisonFiles
    .filter((entry) => fs.existsSync(entry.path))
    .map((entry) => ({ ...entry, rows: readJsonl(entry.path) }));

  const holdoutInputs = new Set(examples.map((example) => normalizeInput(example.input)));
  const holdoutGroups = new Set(examples.map((example) => example.scenario_group_id).filter(Boolean));
  const exactInputOverlap: Record<string, number> = {};
  const scenarioGroupOverlap: Record<string, number> = {};
  for (const entry of availableSplits) {
    exactInputOverlap[entry.split] = entry.rows.filter((row) => holdoutInputs.has(normalizeInput(row.input))).length;
    scenarioGroupOverlap[entry.split] = entry.rows.filter((row) => Boolean(row.scenario_group_id) && holdoutGroups.has(row.scenario_group_id)).length;
  }

  const exactInputLeakageDetected = Object.values(exactInputOverlap).some((count) => count > 0);
  const scenarioGroupOverlapDetected = Object.values(scenarioGroupOverlap).some((count) => count > 0);
  const unreviewedRows = examples.filter((example) => example.review_required !== false || example.quality_label !== 'reviewed').length;
  const taskDistribution = countBy(examples.map((example) => example.task));
  const riskDistribution = countBy(examples.map((example) => example.risk_label));
  const sourceDistribution = countBy(examples.map((example) => example.source_document_external_id || 'unknown'));
  const uniqueScenarioGroups = new Set(examples.map((example) => example.scenario_group_id).filter(Boolean)).size;

  const readinessReasons: string[] = [];
  if (issues.length) readinessReasons.push('Dataset rows contain validation issues.');
  if (duplicates.length) readinessReasons.push('Holdout contains duplicate normalized inputs.');
  if (exactInputLeakageDetected) readinessReasons.push('Holdout inputs overlap with train, validation, or test.');
  if (scenarioGroupOverlapDetected) readinessReasons.push('Holdout scenario groups overlap with train, validation, or test.');
  if (examples.length < MIN_HOLDOUT_ROWS) readinessReasons.push('Holdout has fewer than ' + MIN_HOLDOUT_ROWS + ' examples; this is a project guardrail, not a statistical guarantee.');
  if (uniqueScenarioGroups < MIN_HOLDOUT_GROUPS) readinessReasons.push('Holdout has fewer than ' + MIN_HOLDOUT_GROUPS + ' independent scenario groups.');
  if (unreviewedRows > 0) readinessReasons.push(unreviewedRows + ' holdout rows are not marked reviewed with review_required=false.');

  const report = {
    generatedAt: new Date().toISOString(),
    datasetVersion: examples[0]?.dataset_version ?? 'unknown',
    datasetPath: holdoutPath,
    sampleSize: examples.length,
    isClinicalValidation: false,
    disclaimer: 'Báo cáo này kiểm tra tính toàn vẹn và nguy cơ rò rỉ của tập dữ liệu. Không phải đánh giá hiệu năng lâm sàng hoặc độ chính xác của AI.',
    integrity: {
      invalidRows: issues.length,
      issues,
      duplicateExternalIds: examples.length - seenIds.size,
      duplicateNormalizedInputs: duplicates.length,
      duplicateExamples: duplicates,
      uniqueScenarioGroups,
      taskDistribution,
      riskDistribution,
      sourceDistribution,
    },
    holdoutLeakageCheck: {
      comparedSplits: availableSplits.map((entry) => entry.split),
      exactInputOverlap,
      scenarioGroupOverlap,
      exactInputLeakageDetected,
      scenarioGroupOverlapDetected,
    },
    benchmarkReadiness: {
      status: readinessReasons.length === 0 ? 'ready_for_reviewed_model_evaluation' : 'not_ready',
      reasons: readinessReasons,
      minimumHoldoutRows: MIN_HOLDOUT_ROWS,
      minimumScenarioGroups: MIN_HOLDOUT_GROUPS,
      unreviewedRows,
      note: 'Passing these integrity gates does not establish clinical validity. Medical labels and answers still require qualified review.',
    },
    ruleEngineTriage: {
      status: 'not_evaluated',
      reason: 'No independent predictions are generated by this integrity audit. Never derive model/rule-engine inputs from gold risk or scenario labels.',
    },
    geminiFactExtraction: {
      status: 'not_evaluated',
      reason: 'A separate benchmark must run the configured model on raw inputs and compare saved predictions with independently reviewed labels.',
    },
    retrievalPerformance: {
      status: 'not_evaluated',
      reason: 'A retrieval benchmark must run the actual retriever against a reviewed relevance judgment set.',
    },
  };

  const outDir = path.resolve(root, 'docs/evaluation');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'ai-eval-report.json'), JSON.stringify(report, null, 2) + '\n');

  const markdown = [
    '# Dataset Integrity & Evaluation Readiness',
    '',
    '**Generated:** ' + report.generatedAt,
    '**Dataset version:** ' + report.datasetVersion,
    '**Holdout rows:** ' + report.sampleSize,
    '**Independent scenario groups:** ' + uniqueScenarioGroups,
    '**Benchmark readiness:** ' + report.benchmarkReadiness.status,
    '',
    '> This report checks dataset integrity and leakage only. It does not claim clinical validation or AI accuracy.',
    '',
    '## Integrity',
    '- Invalid rows/issues: ' + report.integrity.invalidRows,
    '- Duplicate normalized inputs: ' + report.integrity.duplicateNormalizedInputs,
    '- Unique scenario groups: ' + uniqueScenarioGroups,
    '- Task distribution: ' + JSON.stringify(taskDistribution),
    '- Risk distribution: ' + JSON.stringify(riskDistribution),
    '',
    '## Holdout overlap (must be zero)',
    '- Exact input overlap by split: ' + JSON.stringify(exactInputOverlap),
    '- Scenario-group overlap by split: ' + JSON.stringify(scenarioGroupOverlap),
    '- Exact-input leakage detected: ' + exactInputLeakageDetected,
    '- Scenario-group overlap detected: ' + scenarioGroupOverlapDetected,
    '',
    '## Why benchmark readiness is not granted',
    ...(readinessReasons.length ? readinessReasons.map((reason) => '- ' + reason) : ['- Integrity gates passed; reviewed labels and a real model run are still required.']),
    '',
    '## Model evaluation status',
    '- Rule-engine triage: NOT EVALUATED — no predictions are produced by this integrity audit.',
    '- Gemini fact extraction: NOT EVALUATED — must run on raw inputs without gold-label-derived features.',
    '- Retrieval Hit@k: NOT EVALUATED — must run the actual retriever against reviewed relevance judgments.',
    '',
    '## Next steps',
    '1. Add new independent scenario groups; do not move paraphrases of known groups into holdout.',
    '2. Have qualified reviewers verify first-aid answers, escalation language, citations, and labels.',
    '3. Save model predictions separately before comparing them with reviewed gold labels.',
    '4. Re-run `pnpm data:evaluate-ai` and the dataset integrity tests before interpreting metrics.',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(outDir, 'ai-eval-report.md'), markdown);
  console.log('Dataset integrity report generated at docs/evaluation/ai-eval-report.md and .json');
  return report;
}

if (process.argv[1] && import.meta.url === new URL('file://' + path.resolve(process.argv[1])).href) {
  try {
    runEvaluation();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
