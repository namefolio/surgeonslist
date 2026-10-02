import type { APIRoute } from 'astro';
import { site } from '../../site.config';
const bots = ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot', 'Claude-User', 'Google-Extended', 'Applebot'];
export const GET: APIRoute = () =>
  new Response(
    [...bots.flatMap((b) => [`User-agent: ${b}`, 'Allow: /', '']), 'User-agent: *', 'Allow: /', 'Disallow: /add-your-business/thanks/', 'Disallow: /add-your-business/thanks-verified/', 'Disallow: /add-your-business/error/', '', `Sitemap: ${site.url}/sitemap-index.xml`, ''].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
