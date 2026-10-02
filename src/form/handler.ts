// "Add your business" form handler. Pure: the Worker supplies Turnstile and email sending,
// so tests can run it without Cloudflare.
import { z } from 'zod';
import { site, attributesSchema } from '../../site.config';
import { DAYS } from '../lib/schema';

export type Deps = {
  verifyTurnstile: (token: string, ip: string | null) => Promise<boolean>;
  sendEmail: (msg: { subject: string; text: string }) => Promise<void>;
  today?: string;
};

export const RESULT = {
  thanks: '/add-your-business/thanks/',
  thanksVerified: '/add-your-business/thanks-verified/',
  error: '/add-your-business/error/',
};

const str = (max: number) => z.string().trim().max(max).transform((s) => (s === '' ? null : s)).nullable();
const HOURS = /^(closed|\d{2}:\d{2}-\d{2}:\d{2}(,\d{2}:\d{2}-\d{2}:\d{2})*)$/;
const termSlugs = site.taxonomy.terms.map((t) => t.slug) as [string, ...string[]];

const submissionSchema = z.object({
  tier: z.enum(['basic', 'verified']),
  listing: z.string().regex(/^[a-z0-9-]{0,120}$/).transform((s) => s || null),
  name: z.string().trim().min(2).max(120),
  streetAddress: str(160),
  locality: z.string().trim().min(1).max(80),
  region: z.string().trim().min(2).max(3),
  postalCode: str(12),
  phone: str(40),
  website: z.union([z.url().max(300), z.literal('')]).transform((s) => s || null),
  sameAs: z.array(z.url().max(300)).max(10),
  hours: z.record(z.string(), z.string().max(40)),
  description: str(1200),
  submitterName: z.string().trim().min(1).max(100),
  submitterEmail: z.email().max(200),
  relationship: z.enum(['owner', 'staff', 'customer']),
  consent: z.literal('yes'),
});

const submittedAttributes = attributesSchema.extend({ specialties: z.array(z.enum(termSlugs)).default([]) });

export function slugify(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

function readAttributes(f: FormData) {
  const out: Record<string, unknown> = {};
  for (const field of site.formFields) {
    const raw = f.getAll(field.name).map((v) => String(v).trim()).filter(Boolean);
    const one = raw[0] ?? null;
    switch (field.type) {
      case 'multi': out[field.name] = raw; break;
      case 'lines': out[field.name] = (one ?? '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, 20); break;
      case 'csv': out[field.name] = (one ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20); break;
      case 'bool': out[field.name] = one === 'yes' ? true : one === 'no' ? false : null; break;
      default: out[field.name] = one;
    }
  }
  return submittedAttributes.safeParse(out);
}

export async function handleSubmission(form: FormData, ip: string | null, deps: Deps): Promise<string> {
  // Honeypot: pretend success, send nothing.
  if (String(form.get('fax') ?? '') !== '') return RESULT.thanks;

  const token = String(form.get('cf-turnstile-response') ?? '');
  if (!token || !(await deps.verifyTurnstile(token, ip).catch(() => false))) return RESULT.error;

  const lines = (k: string) => String(form.get(k) ?? '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const parsed = submissionSchema.safeParse({
    tier: form.get('tier') ?? 'basic',
    listing: form.get('listing') ?? '',
    name: form.get('name') ?? '',
    streetAddress: form.get('streetAddress') ?? '',
    locality: form.get('locality') ?? '',
    region: form.get('region') ?? '',
    postalCode: form.get('postalCode') ?? '',
    phone: form.get('phone') ?? '',
    website: String(form.get('website') ?? '').trim(),
    sameAs: lines('sameAs'),
    hours: Object.fromEntries(DAYS.map((d) => [d, String(form.get(`hours_${d}`) ?? '').trim().toLowerCase().replace(/\s+/g, '')])),
    description: form.get('description') ?? '',
    submitterName: form.get('submitterName') ?? '',
    submitterEmail: String(form.get('submitterEmail') ?? '').trim(),
    relationship: form.get('relationship') ?? '',
    consent: form.get('consent') ?? '',
  });
  const attrs = readAttributes(form);
  if (!parsed.success || !attrs.success) return RESULT.error;
  const s = parsed.data;

  // Only owners and staff can ask for Verified.
  const tier = s.relationship === 'customer' ? 'basic' : s.tier;
  const today = deps.today ?? new Date().toISOString().slice(0, 10);
  const badHours: string[] = [];
  const hours = Object.fromEntries(
    DAYS.map((d) => {
      const v = s.hours[d] ?? '';
      if (v && !HOURS.test(v)) badHours.push(`${d}: ${v}`);
      return [d, v && HOURS.test(v) ? v : null];
    }),
  );
  const anyHours = Object.values(hours).some((v) => v !== null);

  const listing = {
    name: s.name,
    slug: s.listing ?? slugify(s.name),
    status: 'published',
    tier: 'basic', // always: upgrades happen only after payment and ownership are confirmed
    verifiedUntil: null,
    address: { streetAddress: s.streetAddress, locality: s.locality, region: s.region.toUpperCase(), postalCode: s.postalCode },
    lat: null,
    lng: null,
    phone: s.phone,
    website: s.website,
    sameAs: s.sameAs,
    hours: anyHours ? hours : null,
    summary: null,
    attributes: attrs.data,
    lastUpdated: today,
    source: 'submission',
    description: null,
    bookingUrl: null,
  };

  const tierWord = tier === 'verified' ? 'Verified request' : 'Basic';
  const what = s.listing ? `Update: ${s.listing}` : `New listing: ${s.name}`;
  const subject = `[${site.domain}] ${tierWord} · ${what}`;
  const action = s.listing ? `Update the listing "${s.listing}"` : 'Add this listing';
  const instruction =
    tier === 'verified'
      ? `${action} per UPDATING.md as Basic now. Do not upgrade it to Verified until the site owner confirms payment and ownership.`
      : `${action} per UPDATING.md.`;

  const text = [
    instruction,
    '',
    '```json',
    JSON.stringify(listing, null, 2),
    '```',
    '',
    `Tier requested: ${tier === 'verified' ? 'Verified' : 'Basic'}`,
    '',
    'Submitter (do not publish):',
    `- Name: ${s.submitterName}`,
    `- Email: ${s.submitterEmail}`,
    `- Relationship: ${s.relationship}`,
    ...(s.relationship === 'customer' && s.tier === 'verified' ? ['- Asked for Verified, but only owners and staff can, so this is handled as Basic.'] : []),
    '',
    'Free text from the submitter:',
    s.description ?? '(none)',
    ...(badHours.length ? ['', 'Hours that could not be parsed:', ...badHours.map((h) => `- ${h}`)] : []),
    '',
  ].join('\n');

  try {
    await deps.sendEmail({ subject, text });
  } catch {
    return RESULT.error;
  }
  return tier === 'verified' ? `${RESULT.thanksVerified}?ref=${encodeURIComponent(s.name)}` : RESULT.thanks;
}

export async function verifyTurnstile(secret: string | undefined, token: string, ip: string | null, fetcher: typeof fetch = fetch) {
  if (!secret) return false; // fail closed without keys
  const body = new FormData();
  body.set('secret', secret);
  body.set('response', token);
  if (ip) body.set('remoteip', ip);
  const res = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const json = (await res.json()) as { success?: boolean };
  return json.success === true;
}

/** Minimal RFC 5322 message (UTF-8, base64 body) for the send_email binding. */
export function mimeMessage(from: string, to: string, subject: string, text: string, now = new Date()) {
  const b64 = (s: string) => {
    let bin = '';
    for (const byte of new TextEncoder().encode(s)) bin += String.fromCharCode(byte);
    return btoa(bin);
  };
  const body = b64(text).replace(/.{76}/g, '$&\r\n');
  return [
    `From: ${site.name} form <${from}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${b64(subject)}?=`,
    `Date: ${now.toUTCString()}`,
    `Message-ID: <${now.getTime()}.${Math.random().toString(36).slice(2)}@${from.split('@')[1]}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    body,
  ].join('\r\n');
}
