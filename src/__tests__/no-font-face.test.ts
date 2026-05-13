import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('Font policy: no custom @font-face rules', () => {
  it('repository contains no custom @font-face declarations', () => {
    let output = '';
    let failed = false;
    try {
      output = execSync('bunx tsx scripts/check-no-font-face.ts', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (err) {
      failed = true;
      const e = err as { stdout?: string; stderr?: string };
      output = (e.stdout ?? '') + (e.stderr ?? '');
    }
    expect(failed, output).toBe(false);
  });
});
