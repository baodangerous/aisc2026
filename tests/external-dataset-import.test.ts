import { describe, expect, it } from 'vitest';
import { normalizeExternalDataset, type SourceConfig } from '../scripts/import-external-first-aid';

const source: SourceConfig = {
  id: 'test-first-aid',
  name: 'Test First Aid QA',
  url: 'https://example.org/dataset',
  license: 'CC-BY-4.0',
  language: 'en',
  attribution: 'Test dataset attribution',
  licenseReviewed: false,
};

describe('external first-aid dataset normalization', () => {
  it('normalizes QA records with provenance and keeps every row unreviewed', () => {
    const result = normalizeExternalDataset([
      { id: 'a1', question: 'What should I do for severe bleeding?', answer: 'Call emergency services and apply firm direct pressure.' },
    ], source);

    expect(result.examples).toHaveLength(1);
    expect(result.examples[0]).toMatchObject({
      source_document_external_id: 'test-first-aid',
      quality_label: 'external_unreviewed',
      review_required: true,
      risk_label: 'unknown',
      metadata: {
        source_license: 'CC-BY-4.0',
        source_url: 'https://example.org/dataset',
        pii_checked: false,
        safety_checked: false,
        import_status: 'candidate_only',
      },
    });
    expect(result.examples[0].citations).toContain(source.url);
  });

  it('rejects missing or short questions/answers instead of silently creating empty examples', () => {
    const result = normalizeExternalDataset([
      { question: 'short', answer: 'also short' },
      { question: 'A valid question about CPR?', answer: '' },
      { prompt: 'A valid question about burns?', completion: 'Cool the burn under cool running water.' },
    ], source);

    expect(result.examples).toHaveLength(1);
    expect(result.rejected).toEqual([
      { row: 1, reason: 'question_missing_or_too_short' },
      { row: 2, reason: 'answer_missing_or_too_short' },
    ]);
  });

  it('removes exact normalized duplicates and preserves deterministic group splits', () => {
    const result = normalizeExternalDataset([
      { question: 'What is first aid for a burn?', answer: 'Cool the burn under cool running water.' },
      { question: '  What is first aid for a burn? ', answer: 'Cool the burn under cool running water.' },
      { question: 'What is first aid for a burn?', answer: 'Do not apply ice to the burn.' },
    ], source);

    expect(result.examples).toHaveLength(2);
    expect(result.duplicatesRemoved).toBe(1);
    expect(result.examples[0].split).toBe(result.examples[1].split);
    expect(result.examples[0].scenario_group_id).toBe(result.examples[1].scenario_group_id);
  });

  it('requires source provenance before processing', () => {
    expect(() => normalizeExternalDataset([], { ...source, license: '' })).toThrow(/Source id, URL and license/);
  });
});
