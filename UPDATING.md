# Updating listings (for AI agents)

Listings are JSON files at `src/content/listings/{state}/{city}/{slug}.json` (state = full name slug, e.g. `texas`; city = slug, e.g. `san-antonio`). The schema is `src/lib/schema.ts`; attributes are in `site.config.ts`. Unknown values are `null` (lists `[]`). Never invent facts, hours, prices, ratings or reviews.

- **Add:** copy an existing file, set every field, `slug` unique site-wide (lowercase-hyphens, same as the file name), `tier: "basic"`, `lastUpdated` = today, `source` = where the facts came from. `summary` is 1–2 factual third-person sentences.
- **Edit:** change the fields, set `lastUpdated` to today, update `source` if new.
- **Close:** set `"status": "closed"` (page and lists drop it; keep the file for history).
- **Remove:** delete the file (only when asked, or for duplicates/fakes).
- **Bulk:** `npm run import:csv -- file.csv --source "..."`. **Demo data:** `npm run demo:remove`.

## Handling a submission email

1. Find an existing listing by name + postcode + phone (`grep -ril "<phone digits>" src/content/listings`). Update means "Update: {slug}".
2. Use the JSON block as the starting point. Fill `summary` from the facts given; leave unknowns `null`; add `lat`/`lng` only from a reliable source.
3. Never copy the submitter's name, email or relationship into the public file.
4. Keep `tier: "basic"` even for a "Verified request", until the site owner confirms payment and ownership.

## Upgrading to Verified (only when the site owner says payment is received and ownership is confirmed)

1. Set `"tier": "verified"` and `"verifiedUntil"` to one year from today (unless told otherwise).
2. Add the owner's `description` (≤150 words, their words) and `bookingUrl` if given.
3. Set `lastUpdated` to today.
- **Downgrade:** set `"tier": "basic"`, `"verifiedUntil": null`, `description`/`bookingUrl` to `null`. Expired listings show as Basic automatically after the daily rebuild.

## Check, commit, push

```sh
npm run check     # types + content schema (a bad edit fails here, never on the live site)
npm run build     # production build, demo listings excluded
npm test          # needs a build in dist/
git add -A && git commit -m "Listings: <what changed>" && git push   # push to main deploys
```
