# SurgeonsList.com

A static, agent-first directory of US surgeons. Astro (static output, zero client JS), hosted on Cloudflare Workers static assets, with one small Worker for the "Add your business" form. Listings are JSON files, so an AI agent can maintain them (see [UPDATING.md](UPDATING.md)). Research and design decisions: [docs/BRIEF.md](docs/BRIEF.md).

## Develop

```sh
npm install
npm run dev            # http://localhost:4321 (demo listings need INCLUDE_DEMO=1)
npm run check          # types + content schema, warns about launch placeholders
npm run build          # production build into dist/ (demo listings excluded)
npm run build:demo     # build including demo listings
npm test               # form handler, tier expiry, "verified" wording (needs dist/)
npm run lighthouse     # mobile Lighthouse for home, a city, a listing and the form; fails below 100
npm run preview        # wrangler dev: the real Worker + assets (copy .dev.vars.example to .dev.vars)
```

`npm run lighthouse` needs Chrome; set `CHROME_PATH` if it isn't found.

## Data

- Listings: `src/content/listings/{state}/{city}/{slug}.json`, schema in `src/lib/schema.ts`, niche attributes in `site.config.ts`.
- Optional city intro: `src/content/places/{state}/{city}.md` (frontmatter `intro:`).
- Import a CSV: `npm run import:csv -- file.csv --source "where it came from"` (dedupes on name + postcode + phone).
- Remove demo data: `npm run demo:remove`.

## Deploy

Cloudflare Workers Builds is connected to this repo and deploys every push to `main`:
- Build command: `npm run build` (optional: `wrangler.jsonc` also runs it before every deploy)
- Deploy command: `npx wrangler deploy`
- Build variable `INCLUDE_DEMO=1` only while there are no real listings.

`.github/workflows/daily-rebuild.yml` calls a Workers Builds deploy hook once a day (repo secret `DEPLOY_HOOK_URL`) so expired Verified listings return to Basic. `.github/workflows/ci.yml` runs check, build and tests on PRs.

One-time Cloudflare setup:
1. Add the custom domain to the Worker (Workers > surgeonslist > Settings > Domains & Routes).
2. Email Routing on the domain, with the submissions inbox added and confirmed as a destination address; the form sends from `forms@<domain>`.
3. Create a Turnstile widget for the domain; put the site key in `site.config.ts` (`turnstileSiteKey`) and the secret with `npx wrangler secret put TURNSTILE_SECRET`. Without both, the form fails closed.
4. Set the payment link's success URL (e.g. `https://<domain>/add-your-business/thanks/`).
5. AI Crawl Control: make sure AI crawlers are allowed. Optionally enable Markdown for Agents.

## Start the next domain from this repo

Copy the repo, then change only:
1. `site.config.ts`: domain, names, entity noun, hub and taxonomy segments, terms, attributes schema, facts, form fields, copy, credential check, placeholders.
2. `src/theme.css`: palette, font, radius, accent.
3. `docs/BRIEF.md`: the new research and design direction.
4. `src/content/listings/` and `src/content/places/`: the new data (or demo listings).
5. `wrangler.jsonc`: the Worker `name`.

The engine (`src/`) holds no niche words; if you find one, move it into `site.config.ts`.
