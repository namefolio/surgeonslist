import type { APIRoute } from 'astro';
import { getModel } from '../lib/data';
import { llmsFullTxt } from '../lib/markdown';
export const GET: APIRoute = async () => new Response(llmsFullTxt(await getModel()), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
