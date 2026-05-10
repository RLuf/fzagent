import { defineCollection, z } from 'astro:content';

const steps = defineCollection({
  type: 'content',
  schema: z.object({
    // 'slug' e reservado pelo Astro; usamos 'n' para ordem e o id do
    // arquivo (ex: 00, 01) como o slug efetivo da rota.
    n: z.number().int(),
    title: z.string(),
    summary: z.string(),
    phase: z.string(),
    date: z.coerce.date().optional(),
  }),
});

export const collections = { steps };
