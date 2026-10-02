import type { APIRoute } from 'astro';
import { dataReadme } from '../../lib/markdown';
export const GET: APIRoute = () => new Response(dataReadme(), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
