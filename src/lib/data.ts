import { getCollection } from 'astro:content';
import { buildModel, type Model } from './model';

let cached: Promise<Model> | undefined;

/** The site model, built once per build from the listing files. */
export function getModel() {
  cached ??= getCollection('listings').then((entries) => buildModel(entries));
  return cached;
}

export async function placeIntro(region: string, city: string) {
  const places = await getCollection('places');
  return places.find((p) => p.id === `${region}/${city}`)?.data?.intro ?? null;
}
