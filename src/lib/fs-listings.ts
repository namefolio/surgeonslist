// Read listing files straight from disk (for astro.config.ts and scripts, where astro:content is unavailable).
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { listingSchema } from './schema';
import type { RawEntry } from './model';

export const LISTINGS_DIR = 'src/content/listings';

export function listingFiles(dir = LISTINGS_DIR): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.json'))
    .map((f) => join(dir, f));
}

export function readListings(dir = LISTINGS_DIR): RawEntry[] {
  return listingFiles(dir).map((file) => ({
    id: relative(dir, file).replace(/\\/g, '/').replace(/\.json$/, ''),
    data: listingSchema.parse(JSON.parse(readFileSync(file, 'utf8'))),
  }));
}
