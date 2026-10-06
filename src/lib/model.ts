// Pure data model: listing files in, everything the pages need out. No Astro imports,
// so astro.config.ts (sitemap filter), scripts and tests can use it too.
import { site, attributesSchema } from '../../site.config';
import { DAYS, type ListingData } from './schema';
import { initials, type CardView } from './card';
import { tierCopy } from './tiers';

export type RawEntry = { id: string; data: ListingData };

export type Listing = ListingData & {
  regionSlug: string;
  citySlug: string;
  isVerified: boolean; // effective: paid tier and not expired
  url: string;
  completeness: number;
};

export type City = { slug: string; name: string; regionSlug: string; url: string; listings: Listing[]; lat: number | null; lng: number | null };
export type Region = { slug: string; name: string; code: string; url: string; cities: City[]; listings: Listing[] };
export type Term = { slug: string; label: string; plural: string; url: string; listings: Listing[] };

export const MIN_INDEXABLE = 3;

export const today = () => new Date().toISOString().slice(0, 10);

export function includeDemo() {
  return process.env.INCLUDE_DEMO === '1';
}

/** A Verified listing whose verifiedUntil has passed, or any listing while Verified is closed, is treated as Basic. */
export function effectiveVerified(d: Pick<ListingData, 'tier' | 'verifiedUntil'>, on = today(), open: boolean = site.tiers.open) {
  return open && d.tier === 'verified' && !!d.verifiedUntil && d.verifiedUntil >= on;
}

const contactFields = (d: ListingData): unknown[] => [d.address.streetAddress, d.address.postalCode, d.lat, d.phone, d.website, d.hours, d.sameAs.length || null];
/** How many details completeness() can count: contact fields plus every niche attribute. */
export const COMPLETENESS_MAX = 7 + Object.keys(attributesSchema.shape).length;

function completeness(d: ListingData) {
  let n = 0;
  for (const v of [...contactFields(d), ...Object.values(d.attributes)]) {
    if (v === null || v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    n++;
  }
  return n;
}

/** Verified first, then most complete, then A–Z. */
export function sortListings(list: Listing[]) {
  return [...list].sort(
    (a, b) => Number(b.isVerified) - Number(a.isVerified) || b.completeness - a.completeness || a.name.localeCompare(b.name),
  );
}

export function toListing(e: RawEntry, on = today(), open: boolean = site.tiers.open): Listing {
  const [regionSlug, citySlug] = e.id.split('/');
  if (!regionSlug || !citySlug) throw new Error(`Listing ${e.id} must live at listings/{region}/{city}/{slug}.json`);
  if (!site.regions[regionSlug]) throw new Error(`Listing ${e.id}: unknown region folder "${regionSlug}"`);
  const isVerified = effectiveVerified(e.data, on, open);
  const d: ListingData = isVerified ? e.data : { ...e.data, description: null, bookingUrl: null };
  return {
    ...d,
    regionSlug,
    citySlug,
    isVerified,
    url: `/${site.hub}/${regionSlug}/${citySlug}/${d.slug}/`,
    completeness: completeness(d),
  };
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function distanceKm(a: { lat: number | null; lng: number | null }, b: { lat: number | null; lng: number | null }) {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return Infinity;
  const r = Math.PI / 180;
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r);
  const y = (b.lat - a.lat) * r;
  return Math.sqrt(x * x + y * y) * 6371;
}

export function buildModel(entries: RawEntry[], opts: { on?: string; demo?: boolean; open?: boolean } = {}) {
  const on = opts.on ?? today();
  const demo = opts.demo ?? includeDemo();
  const all = entries.map((e) => toListing(e, on, opts.open)).filter((l) => demo || !l.demo);

  const seen = new Map<string, string>();
  for (const l of all) {
    const prev = seen.get(l.slug);
    if (prev) throw new Error(`Duplicate listing slug "${l.slug}" (${prev} and ${l.url}); slugs must be unique site-wide`);
    seen.set(l.slug, l.url);
  }

  const published = sortListings(all.filter((l) => l.status === 'published'));

  const regionMap = new Map<string, Region>();
  for (const l of published) {
    let r = regionMap.get(l.regionSlug);
    if (!r) {
      const info = site.regions[l.regionSlug]!;
      r = { slug: l.regionSlug, name: info.name, code: info.code, url: `/${site.hub}/${l.regionSlug}/`, cities: [], listings: [] };
      regionMap.set(l.regionSlug, r);
    }
    r.listings.push(l);
    let c = r.cities.find((x) => x.slug === l.citySlug);
    if (!c) {
      c = { slug: l.citySlug, name: l.address.locality, regionSlug: r.slug, url: `${r.url}${l.citySlug}/`, listings: [], lat: null, lng: null };
      r.cities.push(c);
    }
    c.listings.push(l);
  }
  const regions = [...regionMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  for (const r of regions) {
    r.cities.sort((a, b) => a.name.localeCompare(b.name));
    for (const c of r.cities) {
      c.lat = mean(c.listings.flatMap((l) => (l.lat == null ? [] : [l.lat])));
      c.lng = mean(c.listings.flatMap((l) => (l.lng == null ? [] : [l.lng])));
    }
  }
  const cities = regions.flatMap((r) => r.cities);

  const key = site.taxonomy.attribute;
  const terms: Term[] = site.taxonomy.terms
    .map((t) => ({ ...t, url: `/${site.taxonomy.segment}/${t.slug}/`, listings: published.filter((l) => l.attributes[key].includes(t.slug)) }))
    .filter((t) => t.listings.length >= MIN_INDEXABLE);

  const findRegion = (slug: string) => regionMap.get(slug);
  const findCity = (l: Listing) => findRegion(l.regionSlug)!.cities.find((c) => c.slug === l.citySlug)!;

  function nearbyListings(l: Listing, n = 4) {
    const sameCity = findCity(l).listings.filter((x) => x.slug !== l.slug);
    const others = findRegion(l.regionSlug)!.listings
      .filter((x) => x.citySlug !== l.citySlug)
      .sort((a, b) => distanceKm(l, a) - distanceKm(l, b));
    return [...sameCity, ...others].slice(0, n);
  }

  function nearbyCities(c: City, n = 6) {
    return findRegion(c.regionSlug)!.cities
      .filter((x) => x.slug !== c.slug)
      .sort((a, b) => distanceKm(c, a) - distanceKm(c, b) || a.name.localeCompare(b.name))
      .slice(0, n);
  }

  /** URLs that render noindex (fewer than MIN_INDEXABLE listings). Used by the sitemap filter. */
  const noindexUrls = new Set<string>([
    ...regions.filter((r) => r.listings.length < MIN_INDEXABLE).map((r) => r.url),
    ...cities.filter((c) => c.listings.length < MIN_INDEXABLE).map((c) => c.url),
  ]);

  return { all, published, regions, cities, terms, findRegion, findCity, nearbyListings, nearbyCities, noindexUrls, on };
}
export type Model = ReturnType<typeof buildModel>;

// ---- Formatting helpers shared by HTML and markdown ----

const DAY_LABEL: Record<string, string> = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' };

export function hoursRows(l: Listing) {
  if (!l.hours) return null;
  return DAYS.map((d) => {
    const v = l.hours![d];
    return { day: DAY_LABEL[d]!, text: v === null ? 'Unknown' : v === 'closed' ? 'Closed' : v.split(',').map((r) => r.replace('-', '–')).join(', ') };
  });
}

export function hoursSentence(l: Listing) {
  const rows = hoursRows(l);
  if (!rows) return null;
  return rows.map((r) => `${r.day}: ${r.text}`).join('; ') + '.';
}

export function openingHoursSpec(l: Listing) {
  if (!l.hours) return undefined;
  return DAYS.flatMap((d) => {
    const v = l.hours![d];
    if (!v || v === 'closed') return [];
    return v.split(',').map((r) => {
      const [opens, closes] = r.split('-');
      return { '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${DAY_LABEL[d]}`, opens, closes };
    });
  });
}

export function fullAddress(l: Listing) {
  const a = l.address;
  return [a.streetAddress, a.locality, [a.region, a.postalCode].filter(Boolean).join(' ')].filter(Boolean).join(', ');
}

export function mapsUrl(l: Listing) {
  const q = l.lat != null && l.lng != null && !l.address.streetAddress ? `${l.lat},${l.lng}` : `${l.name}, ${fullAddress(l)}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function factRows(l: Listing) {
  return site.facts.map((f) => ({ key: f.key, label: f.label, value: f.value(l.attributes) }));
}

export function cardFacts(l: Listing) {
  return factRows(l).filter((f) => (site.cardFacts as readonly string[]).includes(f.key) && f.value !== null);
}

export function primaryTermLabel(l: Listing) {
  return site.taxonomy.termLabel(l.attributes[site.taxonomy.attribute][0]!);
}

/** Short "yes" chips for cards: only attributes that are true, never unknowns. */
export function cardChips(l: Listing) {
  return site.bestFor.filter((b) => l.attributes[b.key] === true).map((b) => ({ key: b.key as string, label: b.short }));
}

/** Space-separated keys of true yes/no attributes, used by the client-side filters. */
export function flagKeys(l: Listing) {
  return site.bestFor.filter((b) => l.attributes[b.key] === true).map((b) => b.key).join(' ');
}

export function institution(l: Listing) {
  return l.attributes[site.institutionKey][0] ?? null;
}

export function termLabels(l: Listing) {
  return l.attributes[site.taxonomy.attribute].map(site.taxonomy.termLabel);
}

/** Everything a listing card shows (rendered by src/lib/card.ts). */
export function cardView(l: Listing, heading: 'h2' | 'h3' = 'h3'): CardView {
  const specs = termLabels(l);
  return {
    name: l.name,
    url: l.url,
    monogram: initials(l.name),
    subtitle: [l.attributes.degree, specs[0]].filter(Boolean).join(' · '),
    more: specs.length - 1,
    place: `${l.address.locality}, ${site.regions[l.regionSlug]!.code}`,
    institution: institution(l),
    chips: cardChips(l),
    verified: l.isVerified,
    verifiedLabel: tierCopy.badge,
    data: { flags: flagKeys(l), terms: l.attributes[site.taxonomy.attribute].join(' '), city: l.citySlug },
    heading,
  };
}

/** Compact record for the client-side search index (/data/search.json). */
export function searchRecord(l: Listing) {
  return {
    n: l.name,
    u: l.url,
    d: l.attributes.degree,
    s: l.attributes[site.taxonomy.attribute],
    c: l.address.locality,
    r: l.regionSlug,
    z: l.address.postalCode,
    h: l.attributes[site.institutionKey],
    x: [...l.attributes.boardCertifications, ...l.attributes.languages],
    f: site.bestFor.filter((b) => l.attributes[b.key] === true).map((b) => b.key),
    p: l.isVerified ? 1 : 0,
  };
}

export function bestFor(list: Listing[]) {
  return site.bestFor
    .map((b) => ({ label: b.label, listings: list.filter((l) => l.attributes[b.key] === true) }))
    .filter((g) => g.listings.length > 0);
}

export function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/** Public listing record for data files and markdown (no internal fields). */
export function publicRecord(l: Listing) {
  return {
    name: l.name,
    slug: l.slug,
    url: site.url + l.url,
    tier: l.isVerified ? 'verified' : 'basic',
    verifiedUntil: l.isVerified ? l.verifiedUntil : null,
    region: l.regionSlug,
    city: l.citySlug,
    address: l.address,
    lat: l.lat,
    lng: l.lng,
    phone: l.phone,
    website: l.website,
    sameAs: l.sameAs,
    hours: l.hours,
    summary: l.summary,
    attributes: l.attributes,
    description: l.description,
    bookingUrl: l.bookingUrl,
    lastUpdated: l.lastUpdated,
    source: l.source,
  };
}
