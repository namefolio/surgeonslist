# SurgeonsList.com brief

**Read:** `surgeons` + `list`, `.com`, no place word → a US-wide directory of surgeons, browsed by specialty and by state/city. Audience: patients and families comparing surgeons before a referral or consult (planned, not urgent). Researched 2026-10-02 with web search; sources inline.

## Keywords and page types

| Cluster | Example queries | Page type | URL |
|---|---|---|---|
| specialty + place | "plastic surgeon in Houston", "orthopedic surgeon Boise", "general surgeon Columbus Ohio" | city page (cards show specialty) | `/surgeons/{state}/{city}/` |
| place only | "surgeons in Texas", "surgeon near me" | state page, city page | `/surgeons/{state}/` |
| specialty only | "find a plastic surgeon", "find a bariatric surgeon" | category page (3+ listings) | `/specialty/{term}/` |
| named surgeon | "Dr Jane Doe surgeon Houston" | listing | `/surgeons/{state}/{city}/{slug}/` |
| credential checks | "is my surgeon board certified", "check surgeon certification" | FAQs on listing/plans/about | n/a |

- **Entity noun:** "surgeon" (people search for a surgeon, not a "surgical practice"; every SERP title above uses "surgeon"). A listing can be one surgeon or a surgical practice. Hub segment `surgeons`, taxonomy segment `specialty`.
- **Location:** "in {city}" and "near me" with city names, sometimes "{city}, {ST}" or "{city} {state}" (SERPs for Houston, Boise, Columbus). Place level that matters most: **city**, grouped by **state**.
- **Specialty** is the main qualifier (WebMD, Vitals and Healthgrades all split by specialty + city; society directories such as [ASPS](https://find.plasticsurgery.org/), [ACS](https://www.facs.org/find-a-surgeon/), [AAFPRS](https://www.aafprs.org/FindASurgeon) are specialty-only).

## Who ranks now (and gaps)

- **Houston, "plastic surgeon"** (large city): nearly all organic results are individual practice sites with self-awarded "best/top/voted" claims ([search, 2026-10-02]). Gap: no neutral side-by-side facts.
- **Boise, "orthopedic surgeon"** (mid city): [WebMD](https://doctor.webmd.com/providers/specialty/orthopedic-surgery/idaho/boise), [Vitals](https://www.vitals.com/orthopedic-surgery/id/boise), hospital and practice sites. Vitals cards show ratings, years in practice, new-patient status, phone; they omit board certification, insurance, languages, hospital affiliations, and show an unlabelled "Featured" block including a non-surgeon (fetched 2026-10-02).
- **Columbus, "general surgeon"**: [WebMD](https://doctor.webmd.com/providers/specialty/surgery/ohio/columbus), [Healthgrades](https://www.healthgrades.com/find-a-doctor/ohio/best-general-surgeons-in-columbus), Vitals, hospital "find a doctor" pages.
- **Our angle:** plain facts the aggregators leave out (board certification, hospital affiliations, insurance, languages, NPI), no ratings, paid placement labelled.

## Attributes (listing `attributes`)

`specialties` (taxonomy, required), `degree` (MD, DO, DDS, DMD), `boardCertifications` (board names), `hospitalAffiliations`, `acceptingNewPatients`, `acceptsMedicare`, `acceptsMedicaid`, `virtualConsultations`, `languages`, `wheelchairAccessible`, `npi` (public [NPPES](https://npiregistry.cms.hhs.gov/) number).

**Card facts (max 5):** specialty, board certification, accepting new patients, Medicare / Medicaid, virtual consultations.

**"Best for" groups on city/state pages:** accepting new patients, accepts Medicare, accepts Medicaid, offers virtual consultations, wheelchair accessible.

## Verified credential check

Board certification checked with the certifying board's public lookup ([ABMS Certification Matters](https://www.certificationmatters.org/), or the specialty board, e.g. [ABS](https://www.absurgery.org/check-a-certification/), [ABPS](https://www.abplasticsurgery.org/public/)), and an active state medical license checked with the state medical board ([FSMB DocInfo](https://www.docinfo.org/) aggregates state boards). Same wording in `site.config.ts`, about, listing plans and `llms.txt`.

## Schema.org

`Physician` (MedicalOrganization subtype, supports `medicalSpecialty`, address, geo, openingHoursSpecification). No rating markup.

## Title / meta templates

- Home: `Find a surgeon by specialty and location | SurgeonsList`
- State: `Surgeons in {State}: {n} listed | SurgeonsList`
- City: `Surgeons in {City}, {ST}: {n} listed | SurgeonsList`
- Specialty: `{Specialty plural} in the US: {n} listed | SurgeonsList`
- Listing: `{Name}, {specialty} in {City}, {ST} | SurgeonsList`
- Meta: one factual sentence with counts, specialties and the facts shown (board certification, insurance, new patients).

## FAQs

From research (questions-to-ask pages by [UChicago AdventHealth](https://www.uchicagomedicineadventhealth.org/blog/essential-questions-ask-surgery), [URMC](https://www.urmc.rochester.edu/encyclopedia/content?contenttypeid=85&contentid=p01409), certification pages by [ABS](https://www.absurgery.org/check-a-certification/)):
- Listing (only when data exists): Is {name} accepting new patients? Does {name} accept Medicare / Medicaid? Which hospitals is {name} affiliated with? Is {name} board certified? What languages are spoken? Where is the office and what are the hours?
- City/state: How do I check a surgeon's board certification? How are surgeons ordered on this page?

## Design direction

- **Home layout: category-led.** Patients start from a specialty or a referral, not urgency. Order: H1 + one-line purpose → specialty tiles → browse by state → how listings work (Basic vs Verified) → short "how to check a surgeon" note.
- **Palette:** ink `#13202B`, secondary ink `#33414F`, deep teal `#0B5563` (links, buttons, Verified), burnt orange `#9A3412` (focus ring only), green `#1D6B40` (only for "yes" checks), warm paper `#F7F6F2`, white surfaces, tint `#ECF3F4`, muted `#4F5A67`. Every text pair is at least 6.2:1. Tokens and measured ratios are in `src/theme.css`.
- **Font:** Atkinson Hyperlegible Next (variable, self-hosted WOFF2, latin), size-adjusted Arial fallback. Body 17px / 1.6, 68ch measure; display headings 700 with slight negative tracking.
- **Feel:** calm, editorial, medium density. 10px card radius, hairline borders, very soft shadows, no photos (cards use a decorative initials monogram). Verified cards carry a teal top rule and a "Verified" badge; facts that are "yes" show a check chip; unknown facts are never shown as "no".
- **Search (redesign, 2026-10-02):** search is the main action. A search form on home, section pages and 404 submits to `/search/`, which filters `/data/search.json` in the browser (name, specialty, hospital, city, state, ZIP, certification, language) and keeps the query in the URL. City, state and specialty pages get filters over their server-rendered cards. Both scripts are small vanilla TS bundled to `/_astro/` (CSP allows only same-origin script files); without JS the static browse pages still reach every listing. `/search/` is `noindex` and out of the sitemap.
- **Profiles:** header with name, degree and specialties, place, hospital and update date, plus Call / Website / Directions (and Book for Verified). Sections only when data exists (about, specialties, at a glance, hospital affiliations, board certification, languages, hours); missing details are named once under "Not on file". A side panel shows contact details and provenance (listing type, last updated, source, NPI with NPPES link, details on file x of 18, public lookups).

## Defaults chosen (change any time)

- Country US; regions are states (`/surgeons/texas/`), cities from folders.
- Demo listings are included only when `INCLUDE_DEMO=1` (the preview deploy and Lighthouse run use it until real data is loaded).
- The `?listing=` and `?tier=verified` prefill on the form is done server-side by the Worker with HTMLRewriter on `GET /add-your-business/`, so the page stays at zero client JS. This is the Worker's only job besides the POST.
- Specialty pages: one per specialty with 3+ listings (no city × specialty pages until data justifies them).
