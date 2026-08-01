import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "zod";

const pages = defineCollection({
  loader: glob({ pattern: "**/index.mdx", base: "./content/pages" }),
  schema: z.object({
    title: z.string().min(1),
    slug: z.string().regex(/^\/[a-z0-9-]+$/),
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: "**/index.mdx", base: "./content/posts" }),
  schema: z.object({
    title: z.string().min(1),
    date: z.coerce.date(),
    description: z.string().optional(),
    slug: z
      .string()
      .regex(/^\/[a-z0-9-]+$/)
      .optional(),
    tags: z.array(z.string().min(1)).default([]),
  }),
});

export const collections = { pages, posts };
