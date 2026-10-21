import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { evaluateEmergencyRules } from '../src/domain/ruleEngine';

type DatasetRow = {
  external_id: string;
  input: string;
  risk_label: string;
  scenario_group_id: string;
  review_required?: boolean;
  quality_label?: string;
  split?: string;
};

function readRows(filePath: string): DatasetRow[] {
  return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as DatasetRow);
}

function normalize(input: string): string {
  return input.normalize('NFKC').toLocaleLowerCase('vi-VN').replace(/\s+/g, ' ').trim();
}

describe('Dataset v1 integrity and leakage gates', () => {
  const dataDir = path.resolve(process.cwd(), 'data/v1');
  const trainPath = path.join(dataDir, 'train.jsonl');
  const valPath = path.join(dataDir, 'validation.jsonl');
  const testPath = path.join(dataDir, 'test.jsonl');
  const holdoutPath = path.join(dataDir, 'holdout_eval.jsonl');
  const allPath = path.join(dataDir, 'goldenminutes_v1_all.jsonl');
  const manifestPath = path.join(dataDir, 'manifest.json');
  const excludedArchivePath = path.join(dataDir, 'excluded_leakage_samples.jsonl');

  it('all split files contain valid JSONL records with required identifiers', () => {
    for (const filePath of [trainPath, valPath, testPath, holdoutPath, allPath]) {
      expect(fs.existsSync(filePath), `Missing file: ${filePath}`).toBe(true);
      const rows = readRows(filePath);
      expect(rows.length, `Empty dataset: ${filePath}`).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.external_id).toBeTruthy();
        expect(row.input).toBeTruthy();
        expect(row.risk_label).toBeTruthy();
        expect(row.scenario_group_id).toBeTruthy();
      }
    }
  });

  it('keeps scenario groups disjoint across train, validation, test, and holdout', () => {
    const splits = [
      { name: 'train', rows: readRows(trainPath) },
      { name: 'validation', rows: readRows(valPath) },
      { name: 'test', rows: readRows(testPath) },
      { name: 'holdout_eval', rows: readRows(holdoutPath) },
    ];
    const seenGroups = new Map<string, string>();

    for (const split of splits) {
      for (const row of split.rows) {
        const previousSplit = seenGroups.get(row.scenario_group_id);
        expect(previousSplit, `Scenario group ${row.scenario_group_id} leaks between ${previousSplit} and ${split.name}`).toBeUndefined();
        seenGroups.set(row.scenario_group_id, split.name);
        expect(row.split).toBe(split.name);
      }
    }
  });

  it('keeps exact normalized inputs disjoint across all model splits', () => {
    const splits = [
      { name: 'train', rows: readRows(trainPath) },
      { name: 'validation', rows: readRows(valPath) },
      { name: 'test', rows: readRows(testPath) },
      { name: 'holdout_eval', rows: readRows(holdoutPath) },
    ];
    const seenInputs = new Map<string, { id: string; split: string }>();

    for (const split of splits) {
      for (const row of split.rows) {
        const normalized = normalize(row.input);
        const previous = seenInputs.get(normalized);
        expect(previous, `Input overlap between ${previous?.split}:${previous?.id} and ${split.name}:${row.external_id}`).toBeUndefined();
        seenInputs.set(normalized, { id: row.external_id, split: split.name });
      }
    }
  });

  it('matches the manifest row counts and SHA-256 checksum', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
      version: string;
      totalRecords: number;
      holdoutEvalCount: number;
      splits: Record<string, number>;
      checksumSha256: string;
      scenarioGroupsCount: number;
      holdoutScenarioGroupsCount: number;
      excludedOverlapArchiveCount: number;
      excludedOverlapArchivePath: string;
    };
    const train = readRows(trainPath);
    const validation = readRows(valPath);
    const test = readRows(testPath);
    const holdout = readRows(holdoutPath);
    const allText = fs.readFileSync(allPath, 'utf8');
    const all = readRows(allPath);

    expect(manifest.version).toBe('v1.1.0');
    expect(manifest.totalRecords).toBe(all.length);
    expect(manifest.holdoutEvalCount).toBe(holdout.length);
    expect(manifest.splits).toEqual({ train: train.length, validation: validation.length, test: test.length });
    expect(manifest.checksumSha256).toBe(createHash('sha256').update(allText).digest('hex'));
    expect(manifest.scenarioGroupsCount).toBe(new Set(all.map((row) => row.scenario_group_id)).size);
    expect(manifest.holdoutScenarioGroupsCount).toBe(new Set(holdout.map((row) => row.scenario_group_id)).size);
    expect(manifest.excludedOverlapArchivePath).toBe('data/v1/excluded_leakage_samples.jsonl');
    expect(manifest.excludedOverlapArchiveCount).toBe(readRows(excludedArchivePath).length);
  });


  it('preserves removed overlapping records in a non-training archive', () => {
    const archive = readRows(excludedArchivePath);
    const holdout = readRows(holdoutPath);
    const modelRows = [...readRows(trainPath), ...readRows(valPath), ...readRows(testPath)];
    const modelIds = new Set(modelRows.map((row) => row.external_id));
    const holdoutGroups = new Set(holdout.map((row) => row.scenario_group_id));

    expect(archive).toHaveLength(50);
    expect(archive.every((row) => row.split === 'excluded_leakage_archive')).toBe(true);
    expect(archive.every((row) => row.exclusion_reason === 'scenario_group_reserved_for_holdout_v1_1_0')).toBe(true);
    expect(archive.every((row) => holdoutGroups.has(row.scenario_group_id))).toBe(true);
    expect(archive.every((row) => !modelIds.has(row.external_id))).toBe(true);
  });

  it('keeps the current holdout explicitly unreviewed and makes no performance claim', () => {
    const holdout = readRows(holdoutPath);
    expect(holdout.length).toBe(10);
    expect(new Set(holdout.map((row) => row.scenario_group_id)).size).toBe(5);
    expect(holdout.every((row) => row.review_required === true)).toBe(true);
    expect(holdout.every((row) => row.quality_label === 'synthetic')).toBe(true);
  });

  it('contains no boilerplate demo text in the training corpus', () => {
    const allRows = readRows(allPath);
    for (const row of allRows) {
      expect(row.input.toLowerCase()).not.toContain('đây là mẫu dữ liệu demo');
      expect(row.input.toLowerCase()).not.toContain('bối cảnh:');
    }
  });

  it('rule engine handles an independently specified emergency fixture without reading dataset labels', () => {
    const result = evaluateEmergencyRules({
      consciousness: 'unresponsive',
      breathing: 'abnormal',
      severeBleeding: false,
    });
    expect(result.triagePriority).toBe('critical');
  });
});
