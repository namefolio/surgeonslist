import type { APIRoute } from 'astro';
import { getModel } from '../../lib/data';
import { publicRecord } from '../../lib/model';
export const GET: APIRoute = async () => {
  const m = await getModel();
  return Response.json({ generated: m.on, count: m.published.length, listings: m.published.map(publicRecord) });
};
