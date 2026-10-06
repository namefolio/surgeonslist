// All Basic/Verified wording lives here (and in the listing-plans, form and thanks pages),
// so the "no stray verified wording" test can allow exactly these strings.
import { site, isMailto } from '../../site.config';

const e = site.entity;
const t = site.tiers;

/** false while the paid tier is "Coming soon" (site.config.ts): all copy below then describes free listings only. */
export const verifiedOpen = t.open;
export const comingSoon = 'Coming soon';

export const tierCopy = {
  disclosure: verifiedOpen
    ? 'Verified listings are paid, checked and shown first.'
    : 'Every listing is free. The most complete listings come first, then A to Z.',
  badge: 'Verified',
  orderingFaq: verifiedOpen
    ? {
        q: `How are ${e.many} ordered on this page?`,
        a: 'Verified listings first, then Basic. Within each, the most complete listings come first, then A to Z. Verified listings are paid; paying never changes the facts shown.',
      }
    : {
        q: `How are ${e.many} ordered on this page?`,
        a: 'The most complete listings come first, then A to Z. Every listing is free, and nobody pays for a place.',
      },
  verifiedFooter: `Verified listings are paid, ${t.checkedShort}, labelled and shown first.`,
  ownerConfirmed: 'Verified: details confirmed by the owner',
  ownerConfirmedShort: 'Details confirmed by the owner. Paid listing.',
  basicCta: verifiedOpen ? 'Is this your business? Get it Verified or send a correction' : 'Is this your business? Send a correction',
  verifiedCta: 'Update this listing',
  summary: verifiedOpen
    ? `Basic listings are free and built from public sources or submissions. Verified listings are paid: ${t.credentialCheck}, confirm the details with the owner, label the listing Verified and show it first in its city and ${site.taxonomy.label.toLowerCase()} lists. Verified is not a rating, and paying never changes the facts we publish.`
    : `Every listing is free and built from public sources or submissions. A paid Verified option is coming soon. Before a listing is labelled Verified, ${t.credentialCheck}, and the owner confirms the details. Verified will never be a rating, and paying will never change the facts we publish.`,
  /** One line for site footers. */
  footer: verifiedOpen
    ? `Basic listings are free. Verified listings are paid, ${t.checkedShort}, labelled and shown first. No ratings, reviews or referral fees.`
    : 'Every listing is free. Verified listings are coming soon. No ratings, reviews or referral fees.',
  payLabel: isMailto(t.paymentLink) ? 'Email us to pay' : 'Pay now',
};

export const tierLabel = (verified: boolean) => (verified ? 'Verified' : 'Basic');

export function plansFaqs() {
  if (!verifiedOpen)
    return [
      { q: 'Is listing really free?', a: `Yes. Every ${e.one} can be listed for free, and listings stay free.` },
      { q: 'What is Verified?', a: `A paid option that is coming soon. Before a listing is labelled Verified, ${t.credentialCheck}, and the owner confirms the details.` },
      { q: 'How are listings ordered?', a: 'The most complete listings come first, then A to Z.' },
      { q: 'Will paying change what you publish?', a: 'No. Verified will never buy a rating, a review or changed facts.' },
    ];
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
