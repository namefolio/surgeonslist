// Everything niche-specific lives here (plus src/theme.css, docs/BRIEF.md and the listing files).
// The engine in src/ reads this file and holds no niche words of its own.
import { z } from 'zod';

// ---- Placeholders: replace before launch (npm run check warns while any remain) ----
export const PLACEHOLDER = 'PLACEHOLDER';
const FOR_SALE_CONTACT = 'https://www.domainmarket.com/buynow/surgeonslist.com';
const SUBMISSIONS_EMAIL = 'PLACEHOLDER-submissions@example.com';
const VERIFIED_PRICE = 'PLACEHOLDER price';
const VERIFIED_PAYMENT_LINK = 'https://example.com/PLACEHOLDER-payment-link';

const yesNo = z.boolean().nullable().default(null);

/** Niche attributes stored in each listing's `attributes`. */
export const attributesSchema = z
  .object({
    specialties: z.array(z.string()).min(1),
    degree: z.enum(['MD', 'DO', 'DDS', 'DMD']).nullable().default(null),
    boardCertifications: z.array(z.string().max(120)).default([]),
    hospitalAffiliations: z.array(z.string().max(120)).default([]),
    acceptingNewPatients: yesNo,
    acceptsMedicare: yesNo,
    acceptsMedicaid: yesNo,
    virtualConsultations: yesNo,
    wheelchairAccessible: yesNo,
    languages: z.array(z.string().max(40)).default([]),
    npi: z.string().regex(/^\d{10}$/).nullable().default(null),
  })
  .strict();
export type Attributes = z.infer<typeof attributesSchema>;

type Term = { slug: string; label: string; plural: string };
const specialties: Term[] = [
  { slug: 'general-surgery', label: 'General surgery', plural: 'General surgeons' },
  { slug: 'plastic-surgery', label: 'Plastic surgery', plural: 'Plastic surgeons' },
  { slug: 'orthopedic-surgery', label: 'Orthopedic surgery', plural: 'Orthopedic surgeons' },
  { slug: 'neurosurgery', label: 'Neurosurgery', plural: 'Neurosurgeons' },
  { slug: 'cardiothoracic-surgery', label: 'Cardiothoracic surgery', plural: 'Cardiothoracic surgeons' },
  { slug: 'vascular-surgery', label: 'Vascular surgery', plural: 'Vascular surgeons' },
  { slug: 'colorectal-surgery', label: 'Colon and rectal surgery', plural: 'Colorectal surgeons' },
  { slug: 'bariatric-surgery', label: 'Bariatric surgery', plural: 'Bariatric surgeons' },
  { slug: 'hand-surgery', label: 'Hand surgery', plural: 'Hand surgeons' },
  { slug: 'oral-maxillofacial-surgery', label: 'Oral and maxillofacial surgery', plural: 'Oral and maxillofacial surgeons' },
  { slug: 'otolaryngology', label: 'Ear, nose and throat surgery', plural: 'ENT surgeons' },
  { slug: 'facial-plastic-surgery', label: 'Facial plastic surgery', plural: 'Facial plastic surgeons' },
  { slug: 'urology', label: 'Urologic surgery', plural: 'Urologic surgeons' },
  { slug: 'pediatric-surgery', label: 'Pediatric surgery', plural: 'Pediatric surgeons' },
  { slug: 'surgical-oncology', label: 'Surgical oncology', plural: 'Surgical oncologists' },
];

const regions: Record<string, { name: string; code: string }> = Object.fromEntries(
  (
    [
      ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
      ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'],
      ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'],
      ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'],
      ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'],
      ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'],
      ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'],
      ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'],
      ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'],
      ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'],
      ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
    ] as const
  ).map(([code, name]) => [name.toLowerCase().replace(/\s+/g, '-'), { name, code }]),
);

const yn = (v: boolean | null) => (v === null ? null : v ? 'Yes' : 'No');
const list = (v: string[]) => (v.length ? v.join(', ') : null);
const termLabel = (slug: string) => specialties.find((t) => t.slug === slug)?.label ?? slug;

export type Fact = { key: string; label: string; value: (a: Attributes) => string | null };

export const site = {
  domain: 'surgeonslist.com',
  url: 'https://surgeonslist.com',
  name: 'SurgeonsList',
  lang: 'en-US',
  locale: 'en_US',
  country: 'US',
  countryName: 'United States',
  operator: 'SurgeonsList', // who runs it (shown on About)
  forSaleContact: FOR_SALE_CONTACT,
  submissionsEmail: SUBMISSIONS_EMAIL,
  formFromEmail: 'forms@surgeonslist.com', // sender on the site's own domain (Email Routing)
  turnstileSiteKey: '', // set after creating the Turnstile widget; empty = form shows a fallback note

  // Words
  entity: { one: 'surgeon', many: 'surgeons', One: 'Surgeon', Many: 'Surgeons', a: 'a surgeon' },
  hub: 'surgeons', // /surgeons/{region}/{city}/{slug}/
  regionWord: 'state',
  formLabels: { name: 'Surgeon or practice name', postal: 'ZIP code', customer: 'Patient or member of the public' },
  schemaType: 'Physician',

  taxonomy: {
    segment: 'specialty', // /specialty/{term}/
    label: 'Specialty',
    pluralLabel: 'specialties',
    attribute: 'specialties' as const,
    terms: specialties,
    termLabel,
  },
  regions,

  tiers: {
    price: VERIFIED_PRICE,
    paymentLink: VERIFIED_PAYMENT_LINK,
    credential: 'board certification and state medical license',
    credentialCheck:
      "we check the surgeon's board certification with the certifying board (through ABMS Certification Matters or the specialty board) and their active license with the state medical board",
    checkedShort: 'credential-checked',
  },

  // Facts table: same labels on every listing. First `cardFacts` keys show on cards.
  facts: [
    { key: 'specialties', label: 'Specialty', value: (a) => list(a.specialties.map(termLabel)) },
    { key: 'degree', label: 'Degree', value: (a) => a.degree },
    { key: 'boardCertifications', label: 'Board certification', value: (a) => list(a.boardCertifications) },
    { key: 'acceptingNewPatients', label: 'Accepting new patients', value: (a) => yn(a.acceptingNewPatients) },
    { key: 'insurance', label: 'Medicare / Medicaid', value: (a) =>
        a.acceptsMedicare === null && a.acceptsMedicaid === null
          ? null
          : `Medicare: ${yn(a.acceptsMedicare) ?? 'Unknown'}; Medicaid: ${yn(a.acceptsMedicaid) ?? 'Unknown'}` },
    { key: 'virtualConsultations', label: 'Virtual consultations', value: (a) => yn(a.virtualConsultations) },
    { key: 'hospitalAffiliations', label: 'Hospital affiliations', value: (a) => list(a.hospitalAffiliations) },
    { key: 'languages', label: 'Languages', value: (a) => list(a.languages) },
    { key: 'wheelchairAccessible', label: 'Wheelchair accessible', value: (a) => yn(a.wheelchairAccessible) },
    { key: 'npi', label: 'NPI number', value: (a) => a.npi },
  ] satisfies Fact[],
  cardFacts: ['specialties', 'boardCertifications', 'acceptingNewPatients', 'insurance', 'virtualConsultations'],

  // "Best for" groups on location pages, built from yes/no attributes.
  bestFor: [
    { key: 'acceptingNewPatients', label: 'Accepting new patients', short: 'New patients' },
    { key: 'acceptsMedicare', label: 'Accepts Medicare', short: 'Medicare' },
    { key: 'acceptsMedicaid', label: 'Accepts Medicaid', short: 'Medicaid' },
    { key: 'virtualConsultations', label: 'Offers virtual consultations', short: 'Virtual consults' },
    { key: 'wheelchairAccessible', label: 'Wheelchair accessible', short: 'Wheelchair access' },
  ] as { key: keyof Attributes; label: string; short: string }[],

  // Profile sections built from list attributes (shown only when the list has entries).
  profileLists: [
    { key: 'hospitalAffiliations', title: 'Hospital affiliations', icon: 'hospital', note: null },
    { key: 'boardCertifications', title: 'Board certification', icon: 'doc', note: 'As listed by the source. You can check any certification with the certifying board.' },
    { key: 'languages', title: 'Languages spoken', icon: null, note: null },
  ] as { key: 'hospitalAffiliations' | 'boardCertifications' | 'languages'; title: string; icon: 'hospital' | 'doc' | null; note: string | null }[],
  // Attribute used for the "institution" line on cards and profile headers.
  institutionKey: 'hospitalAffiliations' as const,
  // Public registry lookups shown in a listing's "About this listing" panel.
  lookups: {
    npi: (npi: string) => `https://npiregistry.cms.hhs.gov/provider-view/${npi}`,
    credential: { label: 'Check board certification (ABMS)', url: 'https://www.certificationmatters.org/' },
    license: { label: 'Check a medical license (DocInfo)', url: 'https://www.docinfo.org/' },
  },

  // Form: niche fields shown under "More details (optional)".
  formFields: [
    { name: 'specialties', label: 'Specialties', type: 'multi', options: specialties.map((t) => [t.slug, t.label]) },
    { name: 'degree', label: 'Degree', type: 'select', options: [['MD', 'MD'], ['DO', 'DO'], ['DDS', 'DDS'], ['DMD', 'DMD']] },
    { name: 'boardCertifications', label: 'Board certifications (one per line)', type: 'lines' },
    { name: 'hospitalAffiliations', label: 'Hospital affiliations (one per line)', type: 'lines' },
    { name: 'languages', label: 'Languages spoken (comma separated)', type: 'csv' },
    { name: 'npi', label: 'NPI number', type: 'text' },
    { name: 'acceptingNewPatients', label: 'Accepting new patients', type: 'bool' },
    { name: 'acceptsMedicare', label: 'Accepts Medicare', type: 'bool' },
    { name: 'acceptsMedicaid', label: 'Accepts Medicaid', type: 'bool' },
    { name: 'virtualConsultations', label: 'Offers virtual consultations', type: 'bool' },
    { name: 'wheelchairAccessible', label: 'Wheelchair accessible', type: 'bool' },
  ] as { name: string; label: string; type: 'multi' | 'select' | 'lines' | 'csv' | 'text' | 'bool'; options?: string[][] }[],

  copy: {
    independence: 'It is not affiliated with any hospital, medical board or professional society.',
    homeTitle: 'Find a surgeon by specialty and location',
    heroEyebrow: 'An independent US directory',
    heroTitle: 'Find a surgeon',
    footerNote: 'Listings are for research and are not medical advice or a referral.',
    heroIntro:
      'Search US surgeons by name, specialty, hospital or location, and compare the facts patients ask about before a referral or consult.',
    searchPlaceholder: 'Name, specialty, hospital or city',
    searchHint: 'Try a surgeon’s name, “plastic surgery”, a hospital or a city.',
    trust: [
      { title: 'Facts, not ratings', text: 'Specialty, board certification, hospitals, insurance and new-patient status. No star ratings or reviews.' },
      { title: 'Sourced and dated', text: 'Every listing names where its details came from and when they were last updated.' },
      { title: 'Paid placement labelled', text: 'Verified listings are paid and say so. Paying never changes the facts we publish.' },
    ],
    homeIntro:
      'An independent list of US surgeons with the facts patients ask about: specialty, board certification, hospital affiliations, insurance and whether they take new patients. No ratings, no reviews.',
    homeDescription:
      'Find a US surgeon by specialty, state and city. Board certification, hospitals, Medicare and Medicaid, and new-patient status on every listing.',
    checkingNote:
      "Before booking, you can check any surgeon's board certification at certificationmatters.org (ABMS) and their license with your state medical board.",
    regionTitle: (r: string, n: number) => `Surgeons in ${r}: ${n} listed`,
    cityTitle: (c: string, code: string, n: number) => `Surgeons in ${c}, ${code}: ${n} listed`,
    termTitle: (plural: string, n: number) => `${plural} in the US: ${n} listed`,
    listingTitle: (name: string, spec: string, city: string, code: string) => `${name}, ${spec} in ${city}, ${code}`,
    placeDescription: (place: string, n: number, specs: string[]) =>
      `${n} surgeon${n === 1 ? '' : 's'} in ${place}${specs.length ? ` (${specs.slice(0, 3).join(', ').toLowerCase()})` : ''}. Board certification, hospitals, insurance and new-patient status.`,
    termDescription: (plural: string, n: number) =>
      `${n} ${plural.toLowerCase()} listed by state and city, with board certification, hospital affiliations, insurance and new-patient status.`,
    listingDescription: (name: string, spec: string, place: string) =>
      `${name}, ${spec.toLowerCase()} in ${place}: address, phone, hours, board certification, hospital affiliations and insurance accepted.`,
    placeFaqs: [
      {
        q: "How do I check a surgeon's board certification?",
        a: 'Search the surgeon on certificationmatters.org, run by the American Board of Medical Specialties, or on the specialty board\'s own lookup. State medical boards (listed at docinfo.org) show license status and public actions.',
      },
    ],
  },
} as const;

/** FAQs for a listing, only where the data answers them. */
export function listingFaqs(name: string, a: Attributes, hoursText: string | null, address: string) {
  const faqs: { q: string; a: string }[] = [];
  faqs.push({ q: `Where is ${name}?`, a: `${name} is at ${address}.` });
  if (hoursText) faqs.push({ q: `What are ${name}'s office hours?`, a: hoursText });
  if (a.acceptingNewPatients !== null)
    faqs.push({ q: `Is ${name} accepting new patients?`, a: a.acceptingNewPatients ? 'Yes, according to the latest details we have.' : 'No, according to the latest details we have.' });
  if (a.acceptsMedicare !== null)
    faqs.push({ q: `Does ${name} accept Medicare?`, a: a.acceptsMedicare ? 'Yes.' : 'No.' });
  if (a.acceptsMedicaid !== null)
    faqs.push({ q: `Does ${name} accept Medicaid?`, a: a.acceptsMedicaid ? 'Yes.' : 'No.' });
  if (a.boardCertifications.length)
    faqs.push({ q: `Is ${name} board certified?`, a: `Listed certification: ${a.boardCertifications.join(', ')}. You can check it at certificationmatters.org.` });
  if (a.hospitalAffiliations.length)
    faqs.push({ q: `Which hospitals is ${name} affiliated with?`, a: a.hospitalAffiliations.join(', ') + '.' });
  if (a.languages.length) faqs.push({ q: `What languages are spoken?`, a: a.languages.join(', ') + '.' });
  return faqs;
}

export type SiteConfig = typeof site;
export const isMailto = (s: string) => s.startsWith('mailto:');
