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
}

const REQUIRED_LABELS: RiskLabel[] = ['critical', 'emergency', 'urgent', 'non_urgent', 'unknown'];

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

  const taskDistribution = countBy(examples.map((example) => example.task));
  const riskDistribution = countBy(examples.map((example) => example.risk_label));
  const sourceDistribution = countBy(examples.map((example) => example.source_document_external_id || 'unknown'));
  const groupIds = examples.map((example) => example.scenario_group_id).filter(Boolean);
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
      uniqueScenarioGroups: new Set(groupIds).size,
      taskDistribution,
      riskDistribution,
      sourceDistribution,
    },
    holdoutLeakageCheck: {
      comparedSplits: availableSplits.map((entry) => entry.split),
      exactInputOverlap,
      scenarioGroupOverlap,
      note: 'Exact input overlap should be zero. Scenario-group overlap means holdout examples share a broad scenario with training examples; report it explicitly and do not describe the holdout as scenario-independent.',
      exactInputLeakageDetected: Object.values(exactInputOverlap).some((count) => count > 0),
      scenarioGroupOverlapDetected: Object.values(scenarioGroupOverlap).some((count) => count > 0),
    },
    ruleEngineTriage: {
      status: 'not_evaluated',
      reason: 'The previous evaluator constructed rule-engine facts from gold risk/scenario labels, which leaks the answer into the input. No independent predictions are generated by this integrity audit.',
    },
    geminiFactExtraction: {
      status: 'not_evaluated',
      reason: 'Hard-coded field-accuracy values are not measurements. A separate benchmark must run the configured model on each raw input and compare predictions with independently reviewed labels.',
    },
    retrievalPerformance: {
      status: 'not_evaluated',
      reason: 'Hard-coded Hit@k values are not measurements. A retrieval benchmark must run the actual retriever against a reviewed relevance judgment set.',
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
    '',
    '> This report checks dataset integrity and leakage only. It does not claim clinical validation or AI accuracy.',
    '',
    '## Integrity',
    '- Invalid rows/issues: ' + report.integrity.invalidRows,
    '- Duplicate normalized inputs: ' + report.integrity.duplicateNormalizedInputs,
    '- Unique scenario groups: ' + report.integrity.uniqueScenarioGroups,
    '- Task distribution: ' + JSON.stringify(taskDistribution),
    '- Risk distribution: ' + JSON.stringify(riskDistribution),
    '',
    '## Holdout overlap',
    '- Exact input overlap by split: ' + JSON.stringify(exactInputOverlap),
    '- Scenario-group overlap by split: ' + JSON.stringify(scenarioGroupOverlap),
    '- Exact-input leakage detected: ' + report.holdoutLeakageCheck.exactInputLeakageDetected,
    '- Scenario-group overlap detected: ' + report.holdoutLeakageCheck.scenarioGroupOverlapDetected,
    '',
    '## Model evaluation status',
    '- Rule-engine triage: NOT EVALUATED — previous code derived rule facts from gold labels.',
    '- Gemini fact extraction: NOT EVALUATED — hard-coded accuracy values removed.',
    '- Retrieval Hit@k: NOT EVALUATED — hard-coded retrieval scores removed.',
    '',
    '## Next steps',
    '1. Review all candidate medical answers and source licenses.',
    '2. Decide whether the holdout is intended to test paraphrases within known scenarios or unseen scenario groups.',
    '3. For a true model benchmark, save independent predictions for raw inputs and compare them against reviewed labels without using gold labels as model inputs.',
    '4. Resolve all exact-input overlap before interpreting benchmark metrics.',
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
