import { z } from 'zod';
import { attributesSchema } from '../../site.config';

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type Day = (typeof DAYS)[number];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD');
// "09:00-17:00", "08:00-12:00,13:00-17:00" or "closed"; null = unknown
const dayHours = z
  .string()
  .regex(/^(closed|\d{2}:\d{2}-\d{2}:\d{2}(,\d{2}:\d{2}-\d{2}:\d{2})*)$/)
  .nullable()
  .default(null);

export const listingSchema = z
  .object({
    name: z.string().min(2).max(120),
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    status: z.enum(['published', 'closed']).default('published'),
    tier: z.enum(['basic', 'verified']).default('basic'),
    verifiedUntil: isoDate.nullable().default(null),
    demo: z.boolean().default(false),
    address: z.object({
      streetAddress: z.string().nullable().default(null),
      locality: z.string().min(1),
      region: z.string().min(2).max(3),
      postalCode: z.string().nullable().default(null),
    }),
    lat: z.number().min(-90).max(90).nullable().default(null),
    lng: z.number().min(-180).max(180).nullable().default(null),
    phone: z.string().max(40).nullable().default(null),
    website: z.url().nullable().default(null),
    sameAs: z.array(z.url()).default([]),
    hours: z.object(Object.fromEntries(DAYS.map((d) => [d, dayHours])) as Record<Day, typeof dayHours>).nullable().default(null),
    summary: z.string().min(10).max(400),
    attributes: attributesSchema,
    lastUpdated: isoDate,
    source: z.string().min(2).max(200),
    // Verified-only (ignored on Basic)
    description: z.string().max(1200).nullable().default(null),
    bookingUrl: z.url().nullable().default(null),
  })
  .strict();

export type ListingData = z.infer<typeof listingSchema>;
export type ListingInput = z.input<typeof listingSchema>;
