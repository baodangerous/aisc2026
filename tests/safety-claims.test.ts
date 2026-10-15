import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function scanDirForClaims(dir: string, forbiddenPatterns: RegExp[]): string[] {
  const violations: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git' || entry.name === 'tests') {
        continue;
      }
      violations.push(...scanDirForClaims(fullPath, forbiddenPatterns));
    } else if (entry.isFile() && /\.(tsx|ts|jsx|js|html|md)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      for (const pattern of forbiddenPatterns) {
        if (pattern.test(content)) {
          violations.push(`Violation in ${fullPath}: pattern ${pattern.toString()}`);
        }
      }
    }
  }

  return violations;
}

describe('Safety & Medical Claims Compliance Scan', () => {
  it('codebase contains no absolute unverified safety claims like "100% an toàn" or "tuyệt đối an toàn"', () => {
    const forbidden = [
      /100%\s*an\s*toàn/i,
      /an\s*toàn\s*100%/i,
      /tuyệt\s*đối\s*an\s*toàn/i,
      /chắc\s*chắn\s*cứu\s*sống/i,
      /100%\s*Nguồn\s*Thẩm\s*Định/i,
    ];

    const violations = scanDirForClaims(path.resolve(process.cwd(), 'src'), forbidden);
    expect(violations).toEqual([]);
  });
});
