// The listing card's markup, shared by the static pages (ListingCard.astro) and the search page's
// client script, so a card looks the same wherever it is drawn. Pure: no site config, no Astro.
import { iconSvg } from './icons';

export type CardView = {
  name: string;
  url: string;
  monogram: string;
  /** e.g. "MD · General surgery" */
  subtitle: string;
  /** Extra specialties beyond the first, shown as "+n more". */
  more: number;
  place: string;
  institution: string | null;
  chips: { key: string; label: string }[];
  verified: boolean;
  verifiedLabel: string;
  /** data-* attributes for the static pages' filters */
  data?: Record<string, string>;
  heading?: 'h2' | 'h3';
};

/** Two-letter monogram for a name, skipping honorifics. Decorative only. */
export function initials(name: string) {
  const words = name.replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, '').split(/[\s-]+/).filter((w) => /^[A-Za-z]/.test(w));
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? words.at(-1)![0] : '')).toUpperCase();
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function cardHtml(v: CardView) {
  const h = v.heading ?? 'h3';
  const data = Object.entries(v.data ?? {}).map(([k, val]) => ` data-${k}="${esc(val)}"`).join('');
  return `<li class="card${v.verified ? ' is-verified' : ''}"${data}>
<div class="card-head">
<span class="monogram" aria-hidden="true">${esc(v.monogram)}</span>
<div class="card-titles">
<${h} class="card-title"><a class="card-link" href="${esc(v.url)}">${esc(v.name)}</a></${h}>
<p class="card-sub">${esc(v.subtitle)}${v.more > 0 ? ` <span class="more">+${v.more} more</span>` : ''}</p>
</div>
${v.verified ? `<span class="badge badge-tier">${iconSvg('checkCircle', 'icon icon-sm')}${esc(v.verifiedLabel)}</span>` : ''}
</div>
<ul class="card-meta">
<li>${iconSvg('pin', 'icon icon-sm')}<span>${esc(v.place)}</span></li>
${v.institution ? `<li>${iconSvg('hospital', 'icon icon-sm')}<span>${esc(v.institution)}</span></li>` : ''}
</ul>
${v.chips.length ? `<ul class="chips" aria-label="Accepts or offers">${v.chips.map((c) => `<li class="chip chip-yes">${iconSvg('check', 'icon icon-xs')}${esc(c.label)}</li>`).join('')}</ul>` : ''}
<span class="card-cta" aria-hidden="true">View profile ${iconSvg('arrow', 'icon icon-sm')}</span>
</li>`;
}
