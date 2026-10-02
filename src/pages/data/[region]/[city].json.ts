import type { APIRoute, GetStaticPaths } from 'astro';
import { getModel } from '../../../lib/data';
import { publicRecord, type City } from '../../../lib/model';
export const getStaticPaths: GetStaticPaths = async () =>
  (await getModel()).cities.map((c) => ({ params: { region: c.regionSlug, city: c.slug }, props: { city: c } }));
export const GET: APIRoute = async ({ props }) => {
  const c = (props as { city: City }).city;
  return Response.json({ region: c.regionSlug, city: c.slug, name: c.name, count: c.listings.length, listings: c.listings.map(publicRecord) });
};
