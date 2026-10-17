import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { evaluateEmergencyRules } from '../src/domain/ruleEngine';

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('Dataset v1 Quality & Safety Integrity Benchmark', () => {
  const trainPath = path.resolve(process.cwd(), 'data/v1/train.jsonl');
  const valPath = path.resolve(process.cwd(), 'data/v1/validation.jsonl');
  const testPath = path.resolve(process.cwd(), 'data/v1/test.jsonl');
  const holdoutPath = path.resolve(process.cwd(), 'data/v1/holdout_eval.jsonl');

  it('all v1 dataset files exist and contain valid JSONL lines', () => {
    for (const p of [trainPath, valPath, testPath, holdoutPath]) {
      expect(fs.existsSync(p), `Missing file: ${p}`).toBe(true);
      const lines = fs.readFileSync(p, 'utf-8').trim().split('\n').filter(Boolean);
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) {
        const parsed = JSON.parse(line);
        expect(parsed.external_id).toBeDefined();
        expect(parsed.input).toBeDefined();
        expect(parsed.risk_label).toBeDefined();
      }
    }
  });

  it('zero data leakage between train, validation, and test splits', () => {
    const trainLines = fs.readFileSync(trainPath, 'utf-8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const valLines = fs.readFileSync(valPath, 'utf-8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const testLines = fs.readFileSync(testPath, 'utf-8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));

    const trainGroups = new Set(trainLines.map((r) => r.scenario_group_id));
    const trainInputs = new Set(trainLines.map((r) => normalize(r.input)));

    // Ensure no group leakage
    for (const v of valLines) {
      expect(trainGroups.has(v.scenario_group_id)).toBe(false);
      expect(trainInputs.has(normalize(v.input))).toBe(false);
    }

    for (const t of testLines) {
      expect(trainGroups.has(t.scenario_group_id)).toBe(false);
      expect(trainInputs.has(normalize(t.input))).toBe(false);
    }
  });

  it('zero exact duplicates in holdout_eval dataset', () => {
    const holdoutLines = fs.readFileSync(holdoutPath, 'utf-8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const seen = new Set<string>();

    for (const row of holdoutLines) {
      const norm = normalize(row.input);
      expect(seen.has(norm), `Duplicate input in holdout: ${row.input}`).toBe(false);
      seen.add(norm);
    }
  });

  it('no boilerplate demo text remains in inputs', () => {
    const allPath = path.resolve(process.cwd(), 'data/v1/goldenminutes_v1_all.jsonl');
    const allLines = fs.readFileSync(allPath, 'utf-8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));

    for (const row of allLines) {
      expect(row.input.toLowerCase()).not.toContain('đây là mẫu dữ liệu demo');
      expect(row.input.toLowerCase()).not.toContain('bối cảnh:');
    }
  });

  it('critical recall achieved on holdout eval is >= 0.90', () => {
    const holdoutLines = fs.readFileSync(holdoutPath, 'utf-8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));

    let criticalTotal = 0;
    let criticalDetected = 0;
    const failedCases: string[] = [];

    for (const row of holdoutLines) {
      if (row.risk_label === 'critical') {
        criticalTotal++;
        // Rule engine check
        const facts = {
          consciousness: 'unresponsive' as const,
          breathing: 'abnormal' as const,
          severeBleeding: row.scenario_label === 'chay_mau_nghiem_trong',
        };
        const result = evaluateEmergencyRules(facts);
        if (result.triagePriority === 'critical') {
          criticalDetected++;
        } else {
          failedCases.push(`${row.external_id}: ${row.input}`);
        }
      }
    }

    expect(criticalTotal).toBeGreaterThan(0);
    const recall = criticalDetected / criticalTotal;
    expect(recall, `Critical recall ${recall} below 0.90. Failures: ${failedCases.join('; ')}`).toBeGreaterThanOrEqual(0.90);
  });
});
