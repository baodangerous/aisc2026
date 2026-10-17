import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Secrets & Environment Security Hygiene', () => {
  it('.env.example contains only variable names with empty values', () => {
    const envExamplePath = path.resolve(process.cwd(), '.env.example');
    expect(fs.existsSync(envExamplePath)).toBe(true);
    const content = fs.readFileSync(envExamplePath, 'utf-8');
    const lines = content.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    
    for (const line of lines) {
      const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
      expect(match).not.toBeNull();
      const [, key, val] = match!;
      expect(val).toBe('');
      // No secret keys should ever be exposed as VITE_ or NEXT_PUBLIC_
      if (/SECRET|SERVICE_ROLE|PRIVATE_KEY/i.test(key)) {
        expect(key.startsWith('VITE_')).toBe(false);
        expect(key.startsWith('NEXT_PUBLIC_')).toBe(false);
      }
    }
  });

  it('no hardcoded API keys or secrets in source code files', () => {
    const scanDirs = ['src', 'server', 'scripts', 'api'];
    const forbiddenPatterns = [
      /AIza[0-9A-Za-z-_]{35}/, // Google API key
      /eyJ[A-Za-z0-9_-]{25,}\.eyJ[A-Za-z0-9_-]{25,}/, // JWT token
      /sb_secret_[a-zA-Z0-9_-]{20,}/, // Supabase secret
      /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/,
    ];

    function scanDirectory(dir: string) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== 'dist') {
            scanDirectory(fullPath);
          }
        } else if (/\.(ts|tsx|js|mjs|json)$/.test(entry.name)) {
          // Skip reading huge json data files if needed
          if (entry.name.endsWith('.jsonl')) continue;
          const content = fs.readFileSync(fullPath, 'utf-8');
          for (const pattern of forbiddenPatterns) {
            expect(pattern.test(content)).toBe(false);
          }
        }
      }
    }

    for (const dir of scanDirs) {
      scanDirectory(path.resolve(process.cwd(), dir));
    }
  });
});
