import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

type JsonRecord = Record<string, unknown>;
type Split = 'train' | 'validation' | 'test';

export interface SourceConfig {
  id: string;
  name: string;
  url: string;
  license: string;
  language: 'vi' | 'en' | 'unknown';
  attribution: string;
  licenseReviewed: boolean;
}

export interface CandidateExample {
  external_id: string;
  dataset_version: string;
  scenario_group_id: string;
  scenario_label: 'external_unreviewed';
  risk_label: 'unknown';
  task: 'retrieval_qa';
  input: string;
  expected_output: { answer: string; safety: 'unreviewed'; requires_115: false };
  source_document_external_id: string;
  citations: string[];
  quality_label: 'synthetic';
  review_required: true;
  safety_note: string;
  metadata: {
    source_record_id: string;
    source_dataset: string;
    source_license: string;
    source_url: string;
    attribution: string;
    content_sha256: string;
    pii_checked: false;
    safety_checked: false;
    import_status: 'candidate_only';
  };
  split: Split;
}

const QUESTION_KEYS = ['question', 'query', 'instruction', 'prompt', 'input', 'user', 'human', 'question_text'];
const ANSWER_KEYS = ['answer', 'response', 'output', 'completion', 'assistant', 'answer_text', 'accepted_answer', 'chosen'];

function getString(record: JsonRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value;
    if (Array.isArray(value)) {
      const joined = value.filter((part): part is string => typeof part === 'string').join('\n').trim();
      if (joined) return joined;
    }
  }
  return '';
}

function cleanText(value: string): string {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeForHash(value: string): string {
  return cleanText(value).toLocaleLowerCase('en-US').normalize('NFKC');
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function extractRows(parsed: unknown): JsonRecord[] {
  if (Array.isArray(parsed)) return parsed.filter((row): row is JsonRecord => Boolean(row) && typeof row === 'object' && !Array.isArray(row));
  if (parsed && typeof parsed === 'object') {
    const object = parsed as JsonRecord;
    for (const key of ['data', 'records', 'examples', 'rows', 'train']) {
      if (Array.isArray(object[key])) return (object[key] as unknown[]).filter((row): row is JsonRecord => Boolean(row) && typeof row === 'object' && !Array.isArray(row));
    }
    if (getString(object, QUESTION_KEYS) && getString(object, ANSWER_KEYS)) return [object];
  }
  throw new Error('Unsupported input format: expected an array, an object containing data/records/examples/rows/train, or one QA object.');
}

function stableSplit(groupHash: string): Split {
  const bucket = Number.parseInt(groupHash.slice(0, 8), 16) % 100;
  if (bucket < 80) return 'train';
  if (bucket < 90) return 'validation';
  return 'test';
}

export function normalizeExternalDataset(rows: JsonRecord[], source: SourceConfig, datasetVersion = 'candidate-v1'): {
  examples: CandidateExample[];
  rejected: Array<{ row: number; reason: string }>;
  duplicatesRemoved: number;
} {
  if (!source.id.trim() || !source.url.trim() || !source.license.trim()) {
    throw new Error('Source id, URL and license are required for provenance.');
  }

  const seenContent = new Set<string>();
  const rejected: Array<{ row: number; reason: string }> = [];
  const prepared: Array<{ row: number; question: string; answer: string; sourceRecordId: string; contentHash: string; groupHash: string }> = [];
  let duplicatesRemoved = 0;

  rows.forEach((record, index) => {
    const question = cleanText(getString(record, QUESTION_KEYS));
    const answer = cleanText(getString(record, ANSWER_KEYS));
    if (question.length < 8) {
      rejected.push({ row: index + 1, reason: 'question_missing_or_too_short' });
      return;
    }
    if (answer.length < 8) {
      rejected.push({ row: index + 1, reason: 'answer_missing_or_too_short' });
      return;
    }
    const contentHash = hash(normalizeForHash(question) + '\n---answer---\n' + normalizeForHash(answer));
    if (seenContent.has(contentHash)) {
      duplicatesRemoved++;
      return;
    }
    seenContent.add(contentHash);
    const sourceRecordId = String(record.id ?? record._id ?? record.uid ?? ('row-' + (index + 1))).slice(0, 160);
    const groupHash = hash(normalizeForHash(question));
    prepared.push({ row: index + 1, question, answer, sourceRecordId, contentHash, groupHash });
  });

  const examples: CandidateExample[] = prepared.map((item) => ({
    external_id: source.id + ':' + item.contentHash.slice(0, 20),
    dataset_version: datasetVersion,
    scenario_group_id: source.id + ':q-' + item.groupHash.slice(0, 16),
    scenario_label: 'external_unreviewed',
    risk_label: 'unknown',
    task: 'retrieval_qa',
    input: item.question,
    expected_output: { answer: item.answer, safety: 'unreviewed', requires_115: false },
    source_document_external_id: source.id,
    citations: [source.url],
    quality_label: 'synthetic',
    review_required: true,
    safety_note: 'Nguồn QA bên ngoài chưa được chuyên gia sơ cứu rà soát. Không dùng trực tiếp để tư vấn người dùng hoặc làm dữ liệu huấn luyện đã duyệt.',
    metadata: {
      source_record_id: item.sourceRecordId,
      source_dataset: source.name,
      source_license: source.license,
      source_url: source.url,
      attribution: source.attribution,
      content_sha256: item.contentHash,
      pii_checked: false,
      safety_checked: false,
      import_status: 'candidate_only',
    },
    split: stableSplit(item.groupHash),
  }));

  return { examples, rejected, duplicatesRemoved };
}

function parseArgs(args: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error('Missing value for --' + key);
    parsed[key] = value;
    index++;
  }
  return parsed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.input || !args['source-id'] || !args['source-name'] || !args.url || !args.license || !args.attribution) {
    console.log('External First Aid QA importer (candidate-only; no database writes)\n\nRequired:\n  --input <path>          Local JSON/JSONL file downloaded from the source\n  --source-id <slug>      Stable source identifier, e.g. firstaidqa\n  --source-name <name>    Dataset name\n  --url <url>             Canonical dataset/source URL\n  --license <license>     Exact declared license, or "unknown"\n  --attribution <text>    Attribution required by the source license\nOptional:\n  --language <vi|en|unknown>   Defaults to unknown\n  --out <path>                 Defaults to data/candidates/<source-id>.jsonl\n  --report <path>              Defaults to data/candidates/<source-id>.report.json\n  --version <version>          Defaults to candidate-v1\n\nThis tool does not certify medical correctness, remove all PII, or write to Supabase.\nEvery output row is marked unreviewed and must pass human safety, license, privacy and quality review.\n');
    if (!args.help) process.exitCode = 1;
    return;
  }

  const inputPath = path.resolve(args.input);
  const raw = await readFile(inputPath, 'utf8');
  let parsedRows: JsonRecord[];
  if (inputPath.endsWith('.jsonl') || inputPath.endsWith('.ndjson')) {
    parsedRows = raw.split(/\r?\n/).filter((line) => line.trim()).map((line, index) => {
      try {
        const row: unknown = JSON.parse(line);
        if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('row is not an object');
        return row as JsonRecord;
      } catch (error) {
        throw new Error('Invalid JSONL at line ' + (index + 1) + ': ' + (error instanceof Error ? error.message : String(error)));
      }
    });
  } else {
    parsedRows = extractRows(JSON.parse(raw) as unknown);
  }

  const source: SourceConfig = {
    id: args['source-id'],
    name: args['source-name'],
    url: args.url,
    license: args.license,
    language: args.language === 'vi' || args.language === 'en' ? args.language : 'unknown',
    attribution: args.attribution,
    licenseReviewed: false,
  };
  const result = normalizeExternalDataset(parsedRows, source, args.version ?? 'candidate-v1');
  const splitCounts = { train: 0, validation: 0, test: 0 };
  for (const example of result.examples) splitCounts[example.split]++;

  const outPath = path.resolve(args.out ?? ('data/candidates/' + source.id + '.jsonl'));
  const reportPath = path.resolve(args.report ?? ('data/candidates/' + source.id + '.report.json'));
  await mkdir(path.dirname(outPath), { recursive: true });
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(outPath, result.examples.map((example) => JSON.stringify(example)).join('\n') + (result.examples.length ? '\n' : ''), 'utf8');

  const report = {
    source,
    inputPath,
    generatedAt: new Date().toISOString(),
    inputRows: parsedRows.length,
    acceptedRows: result.examples.length,
    rejectedRows: result.rejected.length,
    duplicateRowsRemoved: result.duplicatesRemoved,
    splits: splitCounts,
    outputPath: outPath,
    policy: 'candidate_only; no Supabase writes; no clinical approval implied',
    rejected: result.rejected,
  };
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && import.meta.url === new URL('file://' + path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
