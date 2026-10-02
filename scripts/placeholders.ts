// Warn (not fail) while site.config.ts still has launch placeholders.
import { readFileSync } from 'node:fs';
const lines = readFileSync('site.config.ts', 'utf8').split('\n');
const hits = lines.map((l, i) => [i + 1, l] as const).filter(([, l]) => /PLACEHOLDER-|'PLACEHOLDER |turnstileSiteKey: ''/.test(l));
if (hits.length) {
  console.warn(`\n⚠ site.config.ts has ${hits.length} placeholder(s) to fill before launch:`);
  for (const [n, l] of hits) console.warn(`  line ${n}: ${l.trim()}`);
} else console.log('No placeholders left in site.config.ts');
