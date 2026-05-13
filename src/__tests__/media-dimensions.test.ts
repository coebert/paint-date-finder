import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('CLS guard: media elements have reserved dimensions', () => {
  it('all <img>, <iframe>, <embed>, <video>, <object> tags have width/height or aspect-ratio', () => {
    let output = '';
    let failed = false;
    try {
      output = execSync('bunx tsx scripts/check-media-dimensions.ts', {
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
