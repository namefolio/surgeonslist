import { describe, expect, it, vi } from 'vitest';
import { handleSubmission, mimeMessage, RESULT, verifyTurnstile } from '../src/form/handler';
import { listingSchema } from '../src/lib/schema';

function form(over: Record<string, string | string[]> = {}) {
  const f = new FormData();
  const base: Record<string, string | string[]> = {
    tier: 'basic', listing: '', name: 'Example Surgical Group', streetAddress: '10 Main St', locality: 'Austin',
    region: 'TX', postalCode: '78701', phone: '+1 512 555 0100', website: 'https://example.com/', sameAs: '',
    hours_monday: '08:00-17:00', hours_tuesday: '9-5', specialties: ['general-surgery'], acceptsMedicare: 'yes',
    description: 'We moved last month.', submitterName: 'Pat Doe', submitterEmail: 'pat@example.com',
    relationship: 'owner', consent: 'yes', fax: '', 'cf-turnstile-response': 'tok', ...over,
  };
  for (const [k, v] of Object.entries(base)) for (const x of [v].flat()) f.append(k, x);
  return f;
}

function deps(turnstileOk = true) {
  const sent: { subject: string; text: string }[] = [];
  return { sent, d: { verifyTurnstile: vi.fn(async () => turnstileOk), sendEmail: vi.fn(async (m) => { sent.push(m); }), today: '2026-10-02' } };
}

const jsonBlock = (text: string) => JSON.parse(text.split('```json\n')[1]!.split('\n```')[0]!);

describe('form handler', () => {
  it('emails a valid Basic submission shaped like a listing file', async () => {
    const { sent, d } = deps();
    expect(await handleSubmission(form(), '1.2.3.4', d)).toBe(RESULT.thanks);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.subject).toBe('[surgeonslist.com] Basic · New listing: Example Surgical Group');
    const text = sent[0]!.text;
    expect(text.split('\n')[0]).toBe('Add this listing per UPDATING.md.');
    const json = jsonBlock(text);
    expect(json.tier).toBe('basic');
    expect(json.source).toBe('submission');
    expect(json.slug).toBe('example-surgical-group');
    expect(json.summary).toBeNull();
    expect(json.hours.monday).toBe('08:00-17:00');
    expect(json.hours.tuesday).toBeNull(); // unparseable, reported below
    expect(text).toContain('tuesday: 9-5');
    expect(json.attributes.acceptsMedicare).toBe(true);
    expect(json.attributes.acceptsMedicaid).toBeNull();
    expect(JSON.stringify(json)).not.toContain('pat@example.com');
    expect(text).toContain('Tier requested: Basic');
    // Once an agent writes a summary, it is a valid listing file.
    expect(listingSchema.safeParse({ ...json, summary: 'Example Surgical Group is a general surgery practice in Austin.' }).success).toBe(true);
  });

  it('handles a Verified request as Basic until payment and ownership are confirmed', async () => {
    const { sent, d } = deps();
    const loc = await handleSubmission(form({ tier: 'verified', listing: 'example-surgical-group' }), null, { ...d, verifiedOpen: true });
    expect(loc).toBe('/add-your-business/thanks-verified/?ref=Example%20Surgical%20Group');
    expect(sent[0]!.subject).toBe('[surgeonslist.com] Verified request · Update: example-surgical-group');
    expect(sent[0]!.text.split('\n')[0]).toMatch(/as Basic now\. Do not upgrade it to Verified until the site owner confirms payment and ownership\./);
    expect(jsonBlock(sent[0]!.text).tier).toBe('basic');
    expect(sent[0]!.text).toContain('Tier requested: Verified');
  });

  it('handles a Verified request as plain Basic while Verified is coming soon', async () => {
    const { sent, d } = deps();
    expect(await handleSubmission(form({ tier: 'verified' }), null, { ...d, verifiedOpen: false })).toBe(RESULT.thanks);
    expect(sent[0]!.subject).toBe('[surgeonslist.com] Basic · New listing: Example Surgical Group');
    expect(sent[0]!.text).toContain('Tier requested: Basic');
  });

  it('never lets a customer request Verified', async () => {
    const { sent, d } = deps();
    expect(await handleSubmission(form({ tier: 'verified', relationship: 'customer' }), null, { ...d, verifiedOpen: true })).toBe(RESULT.thanks);
    expect(sent[0]!.text).toContain('Tier requested: Basic');
  });

  it('drops honeypot submissions silently', async () => {
    const { sent, d } = deps();
    expect(await handleSubmission(form({ fax: 'spam' }), null, d)).toBe(RESULT.thanks);
    expect(sent).toHaveLength(0);
    expect(d.verifyTurnstile).not.toHaveBeenCalled();
  });

  it('rejects a bad Turnstile token', async () => {
    const { sent, d } = deps(false);
    expect(await handleSubmission(form(), null, d)).toBe(RESULT.error);
    expect(sent).toHaveLength(0);
  });

  it('rejects invalid fields and missing consent', async () => {
    const { d } = deps();
    expect(await handleSubmission(form({ submitterEmail: 'nope' }), null, d)).toBe(RESULT.error);
    expect(await handleSubmission(form({ consent: '' }), null, d)).toBe(RESULT.error);
    expect(await handleSubmission(form({ name: 'x'.repeat(500) }), null, d)).toBe(RESULT.error);
    expect(await handleSubmission(form({ specialties: ['not-a-specialty'] }), null, d)).toBe(RESULT.error);
  });

  it('returns the error page when sending fails', async () => {
    const { d } = deps();
    d.sendEmail = vi.fn(async () => { throw new Error('no route'); });
    expect(await handleSubmission(form(), null, d)).toBe(RESULT.error);
  });

  it('fails closed without a Turnstile secret', async () => {
    const fetcher = vi.fn();
    expect(await verifyTurnstile(undefined, 'tok', null, fetcher as unknown as typeof fetch)).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('builds a UTF-8 MIME message', () => {
    const raw = mimeMessage('forms@surgeonslist.com', 'in@example.com', 'Basic · New listing: É', 'héllo');
    expect(raw).toContain('Subject: =?UTF-8?B?');
    expect(raw).toContain('Content-Transfer-Encoding: base64');
  });
});
