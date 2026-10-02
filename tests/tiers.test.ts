import { describe, expect, it } from 'vitest';
import { buildModel, effectiveVerified, sortListings, type RawEntry } from '../src/lib/model';
import { listingMd, llmsFullTxt } from '../src/lib/markdown';
import { listingSchema } from '../src/lib/schema';

const entry = (slug: string, over: Record<string, unknown> = {}): RawEntry => ({
  id: `texas/austin/${slug}`,
  data: listingSchema.parse({
    name: slug.replace(/-/g, ' '), slug, address: { locality: 'Austin', region: 'TX' },
    summary: 'A test listing used by the unit tests.', attributes: { specialties: ['general-surgery'] },
    lastUpdated: '2026-01-01', source: 'test', description: 'Owner text', bookingUrl: 'https://example.com/book', ...over,
  }),
});

describe('Verified tier', () => {
  it('treats an expired verifiedUntil as Basic', () => {
    expect(effectiveVerified({ tier: 'verified', verifiedUntil: '2026-10-01' }, '2026-10-02')).toBe(false);
    expect(effectiveVerified({ tier: 'verified', verifiedUntil: '2026-10-02' }, '2026-10-02')).toBe(true);
    expect(effectiveVerified({ tier: 'verified', verifiedUntil: null }, '2026-10-02')).toBe(false);
  });

  it('renders an expired listing as Basic everywhere', () => {
    const m = buildModel([entry('expired', { tier: 'verified', verifiedUntil: '2026-01-01' }), entry('current', { tier: 'verified', verifiedUntil: '2027-01-01' })], { on: '2026-10-02', demo: true });
    const expired = m.published.find((l) => l.slug === 'expired')!;
    expect(expired.isVerified).toBe(false);
    expect(expired.description).toBeNull(); // Verified-only fields dropped
    expect(expired.bookingUrl).toBeNull();
    expect(listingMd(m, expired)).toContain('Tier: Basic');
    expect(listingMd(m, expired)).not.toContain('Owner text');
    expect(llmsFullTxt(m)).toMatch(/#### expired\n\n[^#]*- Tier: Basic/);
    expect(m.published[0]!.slug).toBe('current'); // Verified first
  });

  it('orders Verified first, then completeness, then name', () => {
    const m = buildModel([
      entry('b-basic'), entry('a-basic'), entry('z-rich', { phone: '1', website: 'https://x.com/' }),
      entry('vv', { tier: 'verified', verifiedUntil: '2099-01-01' }),
    ], { on: '2026-10-02' });
    expect(sortListings(m.published).map((l) => l.slug)).toEqual(['vv', 'z-rich', 'a-basic', 'b-basic']);
  });

  it('excludes demo listings unless asked', () => {
    const list = [entry('demo-1', { demo: true }), entry('real')];
    expect(buildModel(list, { demo: false }).published.map((l) => l.slug)).toEqual(['real']);
    expect(buildModel(list, { demo: true }).published).toHaveLength(2);
  });

  it('rejects duplicate slugs', () => {
    expect(() => buildModel([entry('dup'), { ...entry('dup'), id: 'texas/dallas/dup' }])).toThrow(/Duplicate/);
  });
});
