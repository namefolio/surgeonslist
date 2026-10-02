// All Basic/Verified wording lives here (and in the listing-plans, form and thanks pages),
// so the "no stray verified wording" test can allow exactly these strings.
import { site, isMailto } from '../../site.config';

const e = site.entity;
const t = site.tiers;

export const tierCopy = {
  disclosure: 'Verified listings are paid, checked and shown first.',
  badge: 'Verified',
  orderingFaq: {
    q: `How are ${e.many} ordered on this page?`,
    a: 'Verified listings first, then Basic. Within each, the most complete listings come first, then A to Z. Verified listings are paid; paying never changes the facts shown.',
  },
  verifiedFooter: `Verified listings are paid, ${t.checkedShort}, labelled and shown first.`,
  ownerConfirmed: 'Verified: details confirmed by the owner',
  basicCta: 'Is this your business? Get it Verified or send a correction',
  verifiedCta: 'Update this listing',
  summary: `Basic listings are free and built from public sources or submissions. Verified listings are paid: ${t.credentialCheck}, confirm the details with the owner, label the listing Verified and show it first in its city and ${site.taxonomy.label.toLowerCase()} lists. Verified is not a rating, and paying never changes the facts we publish.`,
  payLabel: isMailto(t.paymentLink) ? 'Email us to pay' : 'Pay now',
};

export const tierLabel = (verified: boolean) => (verified ? 'Verified' : 'Basic');

export function plansFaqs() {
  return [
    { q: 'Is a Basic listing really free?', a: `Yes. Basic listings are free, and we never hide a correct Basic listing because a nearby ${e.one} paid.` },
    { q: 'Does paying change what you publish?', a: 'No. Verified buys the label, the check and a place above Basic listings. It never buys a rating, a review or changed facts.' },
    { q: 'How are listings ordered?', a: 'Verified first, then Basic. Within each, the most complete listings come first, then A to Z.' },
    { q: 'How much does Verified cost?', a: `${t.price}.` },
  ];
}

/** Payment link with the business name as a reference, where the provider supports it. */
export function paymentHref(name?: string) {
  const link = t.paymentLink;
  if (!name) return link;
  if (isMailto(link)) return `${link}${link.includes('?') ? '&' : '?'}subject=${encodeURIComponent(`Verified listing: ${name}`)}`;
  if (/buy\.stripe\.com/.test(link)) return `${link}?client_reference_id=${encodeURIComponent(name.replace(/[^\w-]/g, '_').slice(0, 200))}`;
  return link;
}
