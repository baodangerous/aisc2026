import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !serviceKey) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');

const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const sources = JSON.parse(await readFile(new URL('../data/goldenminutes_sources.json', import.meta.url), 'utf8')) as { pipeline_version: string; sources: Array<Record<string, string>> };
const lines = (await readFile(new URL('../data/goldenminutes_ai_training.jsonl', import.meta.url), 'utf8')).trim().split('\n').filter(Boolean);
const examples = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
const summaries: Record<string, string> = {
  'aha-cpr-guidelines': 'Tài liệu chính thức về nhận diện ngừng tim, CPR và sử dụng AED. Ứng dụng chỉ dùng phần tóm tắt có dẫn nguồn và luôn hướng người dùng gọi dịch vụ cấp cứu.',
  'asa-stroke-signs': 'Tài liệu chính thức về các dấu hiệu đột quỵ khởi phát đột ngột và nhu cầu gọi cấp cứu sớm. Không dùng nội dung này để chẩn đoán.',
  'acs-atls': 'Trang phát hành chính thức của American College of Surgeons về chương trình ATLS và đánh giá chấn thương. GoldenMinutes không phải đơn vị đào tạo hoặc chứng nhận.',
  'brc-bleeding': 'Tóm tắt có dẫn nguồn về sơ cứu chảy máu nhiều: gọi trợ giúp và ép trực tiếp liên tục bằng vật liệu sạch trong khi chờ cấp cứu.'
};

const documents = sources.sources.map((source) => {
  const content = summaries[source.external_id] ?? '';
  return { external_id: source.external_id, title: source.title, topic: source.topic, language: 'vi', source_name: source.source_name, source_url: source.source_url, content, content_hash: createHash('sha256').update(content).digest('hex'), metadata: { provenance: 'official_source_summary', pipeline_version: sources.pipeline_version }, status: 'approved' };
});
const { data: insertedDocuments, error: documentError } = await supabase.from('knowledge_documents').upsert(documents, { onConflict: 'external_id' }).select('id,external_id');
if (documentError) throw documentError;
const documentIds = new Map((insertedDocuments ?? []).map((doc) => [doc.external_id, doc.id]));
const trainingRows = examples.map((example) => ({ external_id: example.external_id, task: example.task, input: example.input, expected_output: example.expected_output, source_document_id: documentIds.get(example.source_document_external_id as string) ?? null, quality_label: example.quality_label, split: example.split }));
const { error: exampleError } = await supabase.from('ai_training_examples').upsert(trainingRows, { onConflict: 'external_id' });
if (exampleError) throw exampleError;
const { error: qualityError } = await supabase.from('data_quality_runs').insert({ pipeline_version: sources.pipeline_version, source_name: 'goldenminutes_curated_seed', input_rows: examples.length, accepted_rows: trainingRows.length, rejected_rows: 0, duplicate_rows: 0, pii_redactions: 0, metrics: { documents: documents.length, tasks: [...new Set(examples.map((example) => example.task))] } });
if (qualityError) throw qualityError;
console.log(JSON.stringify({ pipeline_version: sources.pipeline_version, documents: documents.length, examples: trainingRows.length, status: 'imported' }));
