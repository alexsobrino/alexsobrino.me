import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Content language: see docs/adr/0001-content-language-not-in-urls.md
const lang = z.enum(['es', 'en']).default('es');

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    lang,
  }),
});

const sideProjects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/side-projects' }),
  schema: ({ image }) =>
    z
      .object({
        name: z.string(),
        summary: z.string(),
        image: image(),
        imageAlt: z.string(),
        url: z.url().optional(),
        retired: z.boolean().default(false),
        lang,
      })
      // A running Side Project links out; a Retired one keeps its page but loses the link.
      .refine((p) => (p.retired ? !p.url : !!p.url), {
        message: 'A Side Project needs a url unless it is retired, and a retired one must not have a url',
      }),
});

export const collections = { notes, sideProjects };
