import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { listingSchema } from './lib/schema';

const listings = defineCollection({
  // id = "{region}/{city}/{slug}" so the folders define regions and cities
  loader: glob({ pattern: '**/*.json', base: './src/content/listings', generateId: ({ entry }) => entry.replace(/\.json$/, '') }),
  schema: listingSchema,
});

const places = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/places', generateId: ({ entry }) => entry.replace(/\.md$/, '') }),
  schema: z.object({ intro: z.string().max(600).optional() }).optional(),
});

export const collections = { listings, places };
