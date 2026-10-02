// Runs Lighthouse (mobile) on the built site for home, a city page and a listing page (plus the form,
// where Performance is not required) and fails if a required category is below 100.
// Usage: npm run lighthouse   (set CHROME_PATH if Chrome isn't found automatically)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const DIST = 'dist';
const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8' };

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url!, 'http://x').pathname);
  if (!path.endsWith('/') && !extname(path)) { res.writeHead(308, { Location: path + '/' }).end(); return; }
  let file = join(DIST, path.endsWith('/') ? path + 'index.html' : path);
  let status = 200;
  try { await stat(file); } catch { file = join(DIST, '404.html'); status = 404; }
  const long = path.startsWith('/_astro/') || path.startsWith('/fonts/');
  res.writeHead(status, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': long ? 'public, max-age=31536000, immutable' : 'no-cache' });
  res.end(await readFile(file));
});
await new Promise<void>((r) => server.listen(4329, r));
const base = 'http://localhost:4329';

// Pick a city and a listing from the built data.
const data = JSON.parse(await readFile(join(DIST, 'data/listings.json'), 'utf8')) as { listings: { url: string; region: string; city: string }[] };
const first = data.listings[0];
if (!first) throw new Error('No listings in dist/data/listings.json (build with INCLUDE_DEMO=1 or add listings)');
const listingPath = new URL(first.url).pathname;
const cityPath = listingPath.split('/').slice(0, 4).join('/') + '/';

const ALL = ['performance', 'accessibility', 'best-practices', 'seo'];
const pages = [
  { name: 'home', path: '/', required: ALL },
  { name: 'city', path: cityPath, required: ALL },
  { name: 'listing', path: listingPath, required: ALL },
  { name: 'form', path: '/add-your-business/', required: ['accessibility', 'best-practices', 'seo'] },
];

const chrome = await chromeLauncher.launch({ chromePath: process.env.CHROME_PATH, chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] });
mkdirSync('lighthouse-reports', { recursive: true });
let failed = false;
try {
  for (const p of pages) {
    const result = await lighthouse(base + p.path, { port: chrome.port, output: 'html', logLevel: 'error', onlyCategories: ALL, formFactor: 'mobile' });
    const lhr = result!.lhr;
    writeFileSync(`lighthouse-reports/${p.name}.html`, result!.report as string);
    const scores = ALL.map((c) => [c, Math.round((lhr.categories[c]?.score ?? 0) * 100)] as const);
    console.log(`${p.name.padEnd(8)} ${p.path}\n  ${scores.map(([c, s]) => `${c} ${s}`).join(' · ')}`);
    for (const [c, s] of scores) {
      if (!p.required.includes(c) || s === 100) continue;
      failed = true;
      const audits = lhr.categories[c]!.auditRefs.map((r) => lhr.audits[r.id]!).filter((a) => a.score !== null && a.score < 1 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'manual');
      for (const a of audits) console.log(`    ✗ ${c}: ${a.id}: ${a.title}`);
    }
  }
} finally {
  chrome.kill();
  server.close();
}
if (failed) { console.error('\nLighthouse: some required categories are below 100 (reports in lighthouse-reports/)'); process.exit(1); }
console.log('\nLighthouse: all required categories are 100');
