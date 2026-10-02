// Markdown twins of every page (served at {url}index.md) and the llms.txt files.
import { site, listingFaqs } from '../../site.config';
import {
  factRows, formatDate, fullAddress, hoursRows, hoursSentence, mapsUrl, MIN_INDEXABLE,
  type City, type Listing, type Model, type Region, type Term,
} from './model';
import { plansFaqs, tierCopy, tierLabel, paymentHref } from './tiers';

const abs = (p: string) => site.url + p;
const e = site.entity;
const cell = (s: string | null | undefined) => (s ?? 'Unknown').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const doc = (title: string, path: string, body: string[]) =>
  [`# ${title}`, '', `Canonical: ${abs(path)}`, '', ...body].join('\n').replace(/\n{3,}/g, '\n\n') + '\n';

function listingTable(list: Listing[]) {
  const keys = site.cardFacts as readonly string[];
  const cols = site.facts.filter((f) => keys.includes(f.key));
  return [
    `| Name | Tier | Address | Phone | ${cols.map((c) => c.label).join(' | ')} | Last updated | URL |`,
    `|${' --- |'.repeat(cols.length + 6)}`,
    ...list.map((l) =>
      `| ${cell(l.name)} | ${tierLabel(l.isVerified)} | ${cell(fullAddress(l))} | ${cell(l.phone)} | ${cols.map((c) => cell(c.value(l.attributes))).join(' | ')} | ${l.lastUpdated} | ${abs(l.url)} |`,
    ),
  ].join('\n');
}

const faqMd = (faqs: { q: string; a: string }[]) => (faqs.length ? ['## Questions', '', ...faqs.flatMap((f) => [`### ${f.q}`, '', f.a, ''])] : []);

export function homeMd(m: Model) {
  return doc(site.copy.homeTitle, '/', [
    site.copy.homeIntro,
    '',
    ...(m.terms.length ? [`## Browse by ${site.taxonomy.label.toLowerCase()}`, '', ...m.terms.map((t) => `- [${t.plural}](${abs(t.url)}) (${t.listings.length})`), ''] : []),
    `## Browse by ${site.regionWord}`,
    '',
    ...m.regions.map((r) => `- [${r.name}](${abs(r.url)}) (${r.listings.length})`),
    '',
    '## How listings work',
    '',
    tierCopy.summary,
    '',
    site.copy.checkingNote,
  ]);
}

export function sectionMd(m: Model, kind: 'hub' | 'taxonomy') {
  if (kind === 'taxonomy')
    return doc(`${e.Many} by ${site.taxonomy.label.toLowerCase()}`, `/${site.taxonomy.segment}/`, m.terms.map((t) => `- [${t.plural}](${abs(t.url)}) (${t.listings.length})`));
  return doc(`${e.Many} by ${site.regionWord}`, `/${site.hub}/`, m.regions.flatMap((r) => [
    `## [${r.name}](${abs(r.url)})`, '', ...r.cities.map((c) => `- [${c.name}](${abs(c.url)}) (${c.listings.length})`), '',
  ]));
}

function listSection(list: Listing[]) {
  return [`## All ${list.length} listed`, '', `${tierCopy.disclosure} Listing plans: ${abs('/listing-plans/')}`, '', listingTable(list), ''];
}

export function regionMd(r: Region) {
  return doc(`${e.Many} in ${r.name}`, r.url, [
    `${r.listings.length} listed in ${r.cities.length} cities.`, '',
    `## Cities`, '', ...r.cities.map((c) => `- [${c.name}](${abs(c.url)}) (${c.listings.length})`), '',
    ...listSection(r.listings), ...faqMd([...site.copy.placeFaqs, tierCopy.orderingFaq]),
  ]);
}

export function termMd(t: Term) {
  return doc(`${t.plural} in the ${site.countryName}`, t.url, [...listSection(t.listings), ...faqMd([...site.copy.placeFaqs, tierCopy.orderingFaq])]);
}

export function cityMd(m: Model, r: Region, c: City, intro: string | null) {
  const near = m.nearbyCities(c);
  return doc(`${e.Many} in ${c.name}, ${r.code}`, c.url, [
    intro ?? `${c.listings.length} listed in ${c.name}.`, '',
    ...listSection(c.listings),
    ...(near.length ? ['## Nearby cities', '', ...near.map((x) => `- [${x.name}](${abs(x.url)})`), ''] : []),
    ...faqMd([...site.copy.placeFaqs, tierCopy.orderingFaq]),
  ]);
}

export function listingMd(m: Model, l: Listing) {
  const hours = hoursRows(l);
  const faqs = listingFaqs(l.name, l.attributes, hoursSentence(l), fullAddress(l));
  return doc(l.name, l.url, [
    `Tier: ${tierLabel(l.isVerified)}${l.isVerified ? ` (${tierCopy.ownerConfirmed.toLowerCase().replace(/^verified: /, '')}, until ${l.verifiedUntil})` : ''}`,
    `Last updated: ${l.lastUpdated}`,
    `Source: ${l.source}`,
    '',
    l.summary,
    '',
    ...(l.isVerified && l.description ? ['## From the owner', '', l.description, '', ...(l.bookingUrl ? [`Booking: ${l.bookingUrl}`, ''] : [])] : []),
    '## Contact and location',
    '',
    `- Address: ${fullAddress(l)}`,
    `- Phone: ${l.phone ?? 'Unknown'}`,
    `- Website: ${l.website ?? 'Unknown'}`,
    ...(l.sameAs.length ? [`- Other profiles: ${l.sameAs.join(', ')}`] : []),
    ...(l.lat != null ? [`- Coordinates: ${l.lat}, ${l.lng}`] : []),
    `- Google Maps: ${mapsUrl(l)}`,
    '',
    '## Details',
    '',
    '| Fact | Value |',
    '| --- | --- |',
    ...factRows(l).map((f) => `| ${f.label} | ${cell(f.value)} |`),
    '',
    '## Hours',
    '',
    ...(hours ? hours.map((h) => `- ${h.day}: ${h.text}`) : ['Unknown']),
    '',
    ...faqMd(faqs),
    ...(m.nearbyListings(l).length ? [`## Nearby ${e.many}`, '', ...m.nearbyListings(l).map((x) => `- [${x.name}](${abs(x.url)})`), ''] : []),
  ]);
}

export function plansMd() {
  const t = site.tiers;
  return doc(`List your ${e.one}: Basic or Verified`, '/listing-plans/', [
    tierCopy.summary, '',
    '## Basic: Free', '', '- Core facts, hours and contact details', `- Listed on city, ${site.regionWord} and ${site.taxonomy.label.toLowerCase()} pages`, '- Update any time via the form', '',
    `## Verified: ${t.price}`, '', '- Everything in Basic', `- A check of the ${t.credential}, plus owner confirmation`, '- The Verified label everywhere', '- Shown first, above Basic listings', '- Rechecked at each renewal', '',
    '## How to get a Verified listing', '',
    `1. Send your details with the form (${abs('/add-your-business/?tier=verified')}) and choose "Verified".`,
    `2. Pay ${t.price}: ${paymentHref()}`,
    `3. ${t.credentialCheck[0]!.toUpperCase() + t.credentialCheck.slice(1)}, and confirm the details with you. If the check fails we refund you and the listing stays Basic.`,
    '4. The listing gets the Verified label and moves above Basic listings, is rechecked at renewal, and returns to Basic if not renewed.',
    '',
    ...faqMd(plansFaqs()),
  ]);
}

export function aboutMd() {
  return doc(`About ${site.name}`, '/about/', [
    `${site.name} is an independent directory of ${e.many} in the ${site.countryName}, run by ${site.operator}. ${site.copy.independence}`, '',
    '## Where the details come from', '',
    'Basic listings are built from public sources and from form submissions. Each listing names its source and the date its details were last updated. No ratings, reviews or referral fees.', '',
    '## Basic and Verified listings', '', tierCopy.summary,
  ]);
}

export function privacyMd() {
  return doc('Privacy', '/privacy/', [
    `${site.name} sets no cookies and runs no analytics. Form submissions are emailed, not stored. Turnstile (Cloudflare) protects the form. Contact: ${site.submissionsEmail}.`,
  ]);
}

export function formMd() {
  return doc('Add or update a listing', '/add-your-business/', [
    `Use the form at ${abs('/add-your-business/')} (an HTML form with Turnstile). Choose Basic (free) or Verified (${site.tiers.price}, owners and staff only). Add ?listing={slug} to update an existing listing.`,
    '', `Plans: ${abs('/listing-plans/')}`,
  ]);
}

export function llmsTxt(m: Model) {
  return [
    `# ${site.name}`,
    '',
    `> ${site.copy.homeIntro}`,
    '',
    `${site.name} is an independent directory of ${e.many} in the ${site.countryName}. ${m.published.length} listings in ${m.regions.length} ${site.regionWord}s.`,
    '',
    '## How data is sourced',
    '',
    'Listing details come from public sources and from submissions sent with the site form, checked by hand. Every listing has a source and a lastUpdated date. Unknown facts are null. There are no ratings, reviews or referral fees.',
    '',
    '## Basic and Verified',
    '',
    tierCopy.summary,
    '',
    `- Basic: free. Details from public sources or a submission. No owner check.`,
    `- Verified: paid (${site.tiers.price}). ${site.tiers.credentialCheck[0]!.toUpperCase() + site.tiers.credentialCheck.slice(1)}; the owner confirms the details. Shown first in lists. A listing whose verifiedUntil date has passed is Basic.`,
    '',
    '## Location indexes',
    '',
    `- [${e.Many} by ${site.regionWord}](${abs(`/${site.hub}/`)}): [markdown](${abs(`/${site.hub}/index.md`)})`,
    ...m.regions.map((r) => `- [${r.name}](${abs(r.url)}): [markdown](${abs(r.url + 'index.md')})`),
    ...(m.terms.length ? ['', `## ${site.taxonomy.label} indexes`, '', ...m.terms.map((t) => `- [${t.plural}](${abs(t.url)}): [markdown](${abs(t.url + 'index.md')})`)] : []),
    '',
    '## Data files',
    '',
    `- [All listings (JSON)](${abs('/data/listings.json')})`,
    `- Per city: ${abs('/data/{region}/{city}.json')}`,
    `- [Field reference](${abs('/data/README.md')})`,
    `- [All listings as text](${abs('/llms-full.txt')})`,
    `- Every page has a markdown twin at {url}index.md`,
    '',
    '## Optional',
    '',
    `- [Listing plans](${abs('/listing-plans/')})`,
    `- [About and sources](${abs('/about/')})`,
    `- [Add or update a listing](${abs('/add-your-business/')})`,
    '',
  ].join('\n');
}

export function llmsFullTxt(m: Model) {
  const out = [`# ${site.name}: all published listings`, '', `${tierCopy.disclosure} Generated ${m.on}.`, ''];
  for (const r of m.regions) {
    out.push(`## ${r.name}`, '');
    for (const c of r.cities) {
      out.push(`### ${c.name}, ${r.code}`, '');
      for (const l of c.listings) {
        out.push(`#### ${l.name}`, '', `- URL: ${abs(l.url)}`, `- Tier: ${tierLabel(l.isVerified)}`, `- Address: ${fullAddress(l)}`, `- Phone: ${l.phone ?? 'Unknown'}`, `- Website: ${l.website ?? 'Unknown'}`);
        for (const f of factRows(l)) if (f.value !== null) out.push(`- ${f.label}: ${f.value}`);
        out.push(`- Last updated: ${l.lastUpdated}`, '', l.summary, '');
      }
    }
  }
  return out.join('\n');
}

export function dataReadme() {
  return `# ${site.name} data files

Read-only, regenerated on every build. Canonical pages: ${site.url}.

- \`/data/listings.json\`: all published listings.
- \`/data/{region}/{city}.json\`: listings in one city.

Lists are ordered Verified first, then Basic; within each, most complete first, then A to Z.

## Fields

- \`name\`, \`slug\`, \`url\` (canonical page)
- \`tier\`: \`basic\` (free, from public sources or a submission) or \`verified\` (paid; ${site.tiers.credentialCheck}, and the owner confirmed the details)
- \`verifiedUntil\`: date the paid Verified status runs to (null for Basic). Expired listings are published as Basic.
- \`region\`, \`city\`: URL slugs; \`address\` (streetAddress, locality, region, postalCode)
- \`lat\`, \`lng\`, \`phone\`, \`website\`, \`sameAs\` (profile links)
- \`hours\`: per weekday, "HH:MM-HH:MM" ranges (comma separated), "closed", or null (unknown)
- \`summary\`: 1–2 factual sentences
- \`attributes\`: ${site.facts.map((f) => f.label.toLowerCase()).join(', ')} (null = unknown)
- \`description\`, \`bookingUrl\`: owner-supplied, Verified only
- \`lastUpdated\`: date the details were last checked or changed
- \`source\`: where the details came from
`;
}

export { MIN_INDEXABLE, formatDate };
