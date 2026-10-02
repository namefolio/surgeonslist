import { site } from '../../site.config';
import { fullAddress, openingHoursSpec, type Listing } from './model';

const abs = (p: string) => new URL(p, site.url).href;

export type Crumb = { name: string; path: string };

export function breadcrumbLd(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.path) })),
  };
}

export function itemListLd(name: string, listings: Listing[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: listings.length,
    itemListElement: listings.map((l, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(l.url), name: l.name })),
  };
}

export function listingLd(l: Listing) {
  const a = l.address;
  return {
    '@context': 'https://schema.org',
    '@type': site.schemaType,
    '@id': abs(l.url) + '#entity',
    name: l.name,
    url: l.website ?? abs(l.url),
    mainEntityOfPage: abs(l.url),
    description: l.summary,
    address: {
      '@type': 'PostalAddress',
      ...(a.streetAddress && { streetAddress: a.streetAddress }),
      addressLocality: a.locality,
      addressRegion: a.region,
      ...(a.postalCode && { postalCode: a.postalCode }),
      addressCountry: site.country,
    },
    ...(l.lat != null && l.lng != null && { geo: { '@type': 'GeoCoordinates', latitude: l.lat, longitude: l.lng } }),
    ...(l.phone && { telephone: l.phone }),
    ...(l.sameAs.length && { sameAs: l.sameAs }),
    ...(l.hours && { openingHoursSpecification: openingHoursSpec(l) }),
    medicalSpecialty: l.attributes.specialties.map((s) => site.taxonomy.termLabel(s)),
    dateModified: l.lastUpdated,
  };
}

export function faqLd(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

export function homeLd() {
  return [
    { '@context': 'https://schema.org', '@type': 'Organization', name: site.name, url: site.url, logo: abs('/favicon.svg') },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, url: site.url, inLanguage: site.lang },
  ];
}

export { fullAddress };
