import type { APIRoute } from 'astro';
import { site } from '../../../site.config';
import { getModel } from '../../lib/data';
import { searchRecord } from '../../lib/model';
import { tierCopy } from '../../lib/tiers';

// Compact index for the search page's client-side search. Listings keep the site order
// (Verified first, then most complete, then A to Z). Field names are short to keep the file small.
export const GET: APIRoute = async () => {
  const m = await getModel();
  return Response.json({
    generated: m.on,
    badge: tierCopy.badge,
    terms: Object.fromEntries(site.taxonomy.terms.map((t) => [t.slug, [t.label, t.plural]])),
    flags: Object.fromEntries(site.bestFor.map((b) => [b.key, b.short])),
    regions: Object.fromEntries(m.regions.map((r) => [r.slug, [r.name, r.code]])),
    listings: m.published.map(searchRecord),
  });
};
