import { mkdir, readFile, writeFile } from 'node:fs/promises';

const seedPath = new URL('../data/goldenminutes_ai_training.jsonl', import.meta.url);
const outputPath = new URL('../data/goldenminutes_demo_500.jsonl', import.meta.url);
const seeds = (await readFile(seedPath, 'utf8')).trim().split('\n').filter(Boolean).map((line) => JSON.parse(line) as Record<string, unknown>);
const variants = [
  'người lớn', 'trẻ em', 'người cao tuổi', 'nơi công cộng', 'tại trường học',
  'tại văn phòng', 'khi ở nhà', 'khi không có người hỗ trợ', 'khi đang chờ cấp cứu', 'khi có AED gần đó',
];
const rows: Record<string, unknown>[] = [];
for (let index = 0; index < 500; index += 1) {
  const seed = seeds[index % seeds.length];
  const variant = variants[index % variants.length];
  rows.push({
    external_id: `demo-public-seed-${String(index + 1).padStart(4, '0')}`,
    task: seed.task,
    input: `${String(seed.input)} Bối cảnh: ${variant}. Đây là mẫu dữ liệu demo cần được chuyên gia rà soát.`,
    expected_output: { ...(seed.expected_output as Record<string, unknown>), review_required: true, safety_note: 'Không dùng thay hướng dẫn của nhân viên cấp cứu.' },
    source_document_external_id: seed.source_document_external_id,
    quality_label: 'synthetic',
    split: index < 400 ? 'train' : index < 450 ? 'validation' : 'test',
    provenance: 'public_curated_seed_expansion_demo',
  });
}
await mkdir(new URL('../data/', import.meta.url), { recursive: true });
await writeFile(outputPath, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
console.log(JSON.stringify({ output: outputPath.pathname, examples: rows.length, splits: { train: 400, validation: 50, test: 50 }, quality_label: 'synthetic' }));
