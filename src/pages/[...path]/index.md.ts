// Markdown twin of every HTML page, at {url}index.md.
import type { APIRoute, GetStaticPaths } from 'astro';
import { site } from '../../../site.config';
import { getModel, placeIntro } from '../../lib/data';
import * as md from '../../lib/markdown';

export const getStaticPaths: GetStaticPaths = async () => {
  const m = await getModel();
  const pages: { path: string | undefined; render: () => Promise<string> | string }[] = [
    { path: undefined, render: () => md.homeMd(m) },
    { path: site.hub, render: () => md.sectionMd(m, 'hub') },
    ...(m.terms.length ? [{ path: site.taxonomy.segment, render: () => md.sectionMd(m, 'taxonomy') }] : []),
    ...m.regions.map((r) => ({ path: `${site.hub}/${r.slug}`, render: () => md.regionMd(r) })),
    ...m.terms.map((t) => ({ path: `${site.taxonomy.segment}/${t.slug}`, render: () => md.termMd(t) })),
    ...m.cities.map((c) => {
      const r = m.findRegion(c.regionSlug)!;
      return { path: `${site.hub}/${r.slug}/${c.slug}`, render: async () => md.cityMd(m, r, c, await placeIntro(r.slug, c.slug)) };
    }),
    ...m.published.map((l) => ({ path: l.url.slice(1, -1), render: () => md.listingMd(m, l) })),
    { path: 'listing-plans', render: () => md.plansMd() },
    { path: 'about', render: () => md.aboutMd() },
    { path: 'privacy', render: () => md.privacyMd() },
    { path: 'add-your-business', render: () => md.formMd() },
  ];
  return pages.map((p) => ({ params: { path: p.path }, props: { render: p.render } }));
};

export const GET: APIRoute = async ({ props }) =>
  new Response(await (props as { render: () => Promise<string> | string }).render(), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
