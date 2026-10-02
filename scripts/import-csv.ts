// Turn a CSV into listing files. Usage: npm run import:csv -- path/to/file.csv [--source "NPPES export 2026-10"]
// Columns (header names, case-insensitive): name, street, city, state (code or name), postcode|zip, phone,
// website, lat, lng, summary, sameAs (space or ; separated), hours_monday..hours_sunday, and any attribute
// key from site.config.ts (lists separated by ";", yes/no for booleans). Rows are skipped when a listing with
// the same name + postcode + phone already exists (on disk or earlier in the CSV). Nothing is invented:
// missing values stay null.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { site, attributesSchema } from '../site.config';
import { DAYS, listingSchema } from '../src/lib/schema';
import { LISTINGS_DIR, readListings } from '../src/lib/fs-listings';
import { slugify } from '../src/form/handler';

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const key = (name: string, postcode: string | null, phone: string | null) =>
  [name.toLowerCase().replace(/[^a-z0-9]/g, ''), (postcode ?? '').replace(/\s/g, '').toLowerCase(), (phone ?? '').replace(/\D/g, '')].join('|');

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const source = args.includes('--source') ? args[args.indexOf('--source') + 1]! : 'CSV import';
if (!file) { console.error('Usage: npm run import:csv -- file.csv [--source "where the data came from"]'); process.exit(1); }

const [header, ...rows] = parseCsv(readFileSync(file, 'utf8'));
const cols = header!.map((h) => h.trim().toLowerCase());
const get = (r: string[], ...names: string[]) => {
  for (const n of names) { const i = cols.indexOf(n.toLowerCase()); if (i >= 0 && r[i]?.trim()) return r[i]!.trim(); }
  return null;
};
const regionByCode = new Map(Object.entries(site.regions).flatMap(([slug, r]) => [[r.code.toLowerCase(), slug], [r.name.toLowerCase(), slug]]));
const existing = readListings();
const seen = new Set(existing.map((e) => key(e.data.name, e.data.address.postalCode, e.data.phone)));
const slugs = new Set(existing.map((e) => e.data.slug));
const today = new Date().toISOString().slice(0, 10);
let added = 0, skipped = 0;
const errors: string[] = [];

for (const [i, r] of rows.entries()) {
  const line = i + 2;
  const name = get(r, 'name');
  const city = get(r, 'city', 'locality');
  const state = get(r, 'state', 'region');
  const regionSlug = state ? regionByCode.get(state.toLowerCase()) : undefined;
  if (!name || !city || !regionSlug) { errors.push(`line ${line}: needs name, city and a known state`); continue; }
  const postcode = get(r, 'postcode', 'zip', 'postalcode');
  const phone = get(r, 'phone');
  const k = key(name, postcode, phone);
  if (seen.has(k)) { skipped++; continue; }

  const attrs: Record<string, unknown> = {};
  for (const [a, schema] of Object.entries(attributesSchema.shape)) {
    const v = get(r, a);
    if (v === null) continue;
    const isList = schema.safeParse(['x']).success;
    attrs[a] = isList ? v.split(';').map((s) => s.trim()).filter(Boolean) : /^(yes|true|y|1)$/i.test(v) ? true : /^(no|false|n|0)$/i.test(v) ? false : v;
  }
  const specs = (attrs[site.taxonomy.attribute] as string[] | undefined) ?? [];
  let slug = slugify(name);
  if (slugs.has(slug)) slug = slugify(`${name} ${city}`);
  for (let n = 2; slugs.has(slug); n++) slug = `${slugify(name)}-${n}`;
  const hours = Object.fromEntries(DAYS.map((d) => [d, get(r, `hours_${d}`)]));
  const lat = get(r, 'lat', 'latitude'), lng = get(r, 'lng', 'lon', 'longitude');
  const st = site.regions[regionSlug]!.code;

  const data = {
    name, slug, status: 'published', tier: 'basic', verifiedUntil: null,
    address: { streetAddress: get(r, 'street', 'address', 'streetaddress'), locality: city, region: st, postalCode: postcode },
    lat: lat ? Number(lat) : null, lng: lng ? Number(lng) : null, phone, website: get(r, 'website', 'url'),
    sameAs: (get(r, 'sameas') ?? '').split(/[\s;]+/).filter(Boolean),
    hours: Object.values(hours).some(Boolean) ? hours : null,
    summary: get(r, 'summary') ?? `${name} is listed under ${specs.map((s) => site.taxonomy.termLabel(s).toLowerCase()).join(', ') || site.entity.many} in ${city}, ${st}.`,
    attributes: attrs, lastUpdated: today, source, description: null, bookingUrl: null,
  };
  const parsed = listingSchema.safeParse(data);
  if (!parsed.success) { errors.push(`line ${line} (${name}): ${parsed.error.issues.map((x) => `${x.path.join('.')}: ${x.message}`).join('; ')}`); continue; }

  const dir = join(LISTINGS_DIR, regionSlug, slugify(city));
  mkdirSync(dir, { recursive: true });
  const out = join(dir, `${slug}.json`);
  if (existsSync(out)) { errors.push(`line ${line}: ${out} already exists`); continue; }
  writeFileSync(out, JSON.stringify(data, null, 2) + '\n');
  seen.add(k); slugs.add(slug); added++;
}

console.log(`Added ${added}, skipped ${skipped} duplicate(s), ${errors.length} error(s).`);
for (const e of errors) console.log('  ' + e);
if (errors.length) process.exitCode = 1;
