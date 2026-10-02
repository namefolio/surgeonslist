// "Verified" is the paid tier's name and is always written capitalised. Any other verif* wording
// (verify, verification, lowercase verified) in the built site would imply checks we don't make.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIST = 'dist';
// Data-field tokens that are not copy.
const ALLOWED_TOKENS = [/"tier":\s*"verified"/g, /verifiedUntil/g, /tier=verified/g, /thanks-verified/g, /value="verified"/g, /is-verified/g, /`verified`/g, /\bverified \(paid/g];

function files(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((f) => /\.(html|md|txt|json|xml)$/.test(f)).map((f) => join(dir, f));
}

describe('verified wording', () => {
  it('appears only as the Verified tier name', () => {
    expect(existsSync(DIST), 'run npm run build first').toBe(true);
    const problems: string[] = [];
    for (const f of files(DIST)) {
      let text = readFileSync(f, 'utf8');
      for (const re of ALLOWED_TOKENS) text = text.replace(re, '');
      for (const m of text.matchAll(/\w*verif\w*/gi)) {
        if (m[0] === 'Verified') continue;
        problems.push(`${f}: "${text.slice(Math.max(0, m.index! - 40), m.index! + 40).replace(/\s+/g, ' ')}"`);
      }
      // Entity JSON-LD never claims verification (FAQPage markup only mirrors the visible tier FAQ).
      for (const ld of text.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
        const json = JSON.parse(ld[1]!);
        if (json['@type'] !== 'FAQPage' && /verif/i.test(ld[1]!)) problems.push(`${f}: ${json['@type']} JSON-LD mentions Verified`);
      }
    }
    expect(problems).toEqual([]);
  });
});
