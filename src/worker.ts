// The only server code. Handles POST /add-your-business/ and fills in the form/thanks pages
// from their query strings (so the pages need no client JS). Everything else is static assets.
import { EmailMessage } from 'cloudflare:email';
import { site } from '../site.config';
import { handleSubmission, mimeMessage, verifyTurnstile, RESULT } from './form/handler';
import { paymentHref } from './lib/tiers';

interface Env {
  ASSETS: Fetcher;
  SUBMISSIONS: SendEmail;
  TURNSTILE_SECRET?: string;
}

const FORM = '/add-your-business/';
const redirect = (url: URL, path: string) => Response.redirect(new URL(path, url).href, 303);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === FORM && request.method === 'POST') {
      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        return redirect(url, RESULT.error);
      }
      const location = await handleSubmission(form, request.headers.get('CF-Connecting-IP'), {
        verifyTurnstile: (token, ip) => verifyTurnstile(env.TURNSTILE_SECRET, token, ip),
        sendEmail: async ({ subject, text }) => {
          const raw = mimeMessage(site.formFromEmail, site.submissionsEmail, subject, text);
          await env.SUBMISSIONS.send(new EmailMessage(site.formFromEmail, site.submissionsEmail, raw));
        },
      });
      return redirect(url, location);
    }

    const res = await env.ASSETS.fetch(request);

    if (url.pathname === FORM && request.method === 'GET') {
      const slug = url.searchParams.get('listing');
      const verified = url.searchParams.get('tier') === 'verified';
      if (!slug && !verified) return res;
      let name: string | null = null;
      if (slug && /^[a-z0-9-]{1,120}$/.test(slug)) {
        const data = await env.ASSETS.fetch(new URL('/data/listings.json', url)).then((r) => r.json() as Promise<{ listings: { slug: string; name: string }[] }>).catch(() => null);
        name = data?.listings.find((l) => l.slug === slug)?.name ?? null;
      }
      let rw = new HTMLRewriter();
      if (name) {
        rw = rw
          .on('input[name="listing"]', { element: (el) => { el.setAttribute('value', slug!); } })
          .on('#update-note', { element: (el) => { el.removeAttribute('hidden'); } })
          .on('#update-name', { element: (el) => { el.setInnerContent(name!); } })
          .on('#f-name', { element: (el) => { el.setAttribute('value', name!); } });
      }
      if (verified) {
        rw = rw
          .on('input[name="tier"][value="basic"]', { element: (el) => { el.removeAttribute('checked'); } })
          .on('input[name="tier"][value="verified"]', { element: (el) => { el.setAttribute('checked', ''); } });
      }
      return rw.transform(res);
    }

    if (url.pathname === RESULT.thanksVerified && url.searchParams.get('ref')) {
      const ref = url.searchParams.get('ref')!.slice(0, 120);
      return new HTMLRewriter().on('#pay', { element: (el) => { el.setAttribute('href', paymentHref(ref)); } }).transform(res);
    }

    return res;
  },
} satisfies ExportedHandler<Env>;
