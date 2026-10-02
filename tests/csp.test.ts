// The CSP in public/_headers allows scripts only from files on this origin, so no page may ship
// an inline executable script (JSON-LD data blocks are fine) or an inline event handler.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIST = 'dist';
const pages = () => readdirSync(DIST, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.html')).map((f) => join(DIST, f));

describe('content security policy', () => {
  it('has no inline scripts or event handlers', () => {
    expect(existsSync(DIST), 'run npm run build first').toBe(true);
    const problems: string[] = [];
    for (const f of pages()) {
      const html = readFileSync(f, 'utf8');
      for (const m of html.matchAll(/<script\b([^>]*)>/g)) {
        const attrs = m[1]!;
        if (/type="application\/ld\+json"/.test(attrs) || /\bsrc=/.test(attrs)) continue;
        problems.push(`${f}: inline <script${attrs}>`);
      }
      for (const m of html.matchAll(/\son(click|submit|change|input|load)=/g)) problems.push(`${f}: inline on${m[1]} handler`);
    }
    expect(problems).toEqual([]);
  });
});
