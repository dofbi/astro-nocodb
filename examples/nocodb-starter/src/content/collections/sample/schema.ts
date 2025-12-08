import { z } from 'astro/zod';

export const sampleSchema = z.object({
  Id: z.string().optional(),
  Album: z.string().optional(),
  Thumbnail: z.array(z.object({
    url: z.string(),
    signedUrl: z.string().optional(),
    title: z.string().optional(),
    mimetype: z.string().optional()
  })).optional(),
  Platform: z.string().optional(),
  Budget: z.number().optional()
});

export type PaysEntry = z.infer<typeof sampleSchema>;