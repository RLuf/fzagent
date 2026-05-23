// Tipos para o cerebro secundario (Karpathy LLM Wiki).
// WikiPage espelha as colunas da tabela `pages` do indexador SQLite (FASE 4c).

import { z } from 'zod';

export const WikiPageTypeSchema = z.enum(['source', 'concept', 'analysis', 'index', 'log']);
export type WikiPageType = z.infer<typeof WikiPageTypeSchema>;

export const WikiPageSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  title: z.string().min(1),
  type: WikiPageTypeSchema,
  slug: z.string().min(1),
  frontmatter: z.record(z.string(), z.unknown()).default({}),
  body: z.string().default(''),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  sourceCount: z.number().int().nonnegative().default(0),
});
export type WikiPage = z.infer<typeof WikiPageSchema>;

// Evento emitido pelo workflow ingest (FASE 4d).
export const IngestEventSchema = z.object({
  rawPath: z.string().min(1),
  pageId: z.string().optional(),
  sha256: z.string().min(1),
  ingestedAt: z.number().int(),
  bytes: z.number().int().nonnegative(),
});
export type IngestEvent = z.infer<typeof IngestEventSchema>;

// Resultado individual de uma busca semantica (Qdrant) ou textual (FTS5).
export const QueryResultSchema = z.object({
  pageId: z.string().min(1),
  source: z.enum(['fts5', 'qdrant', 'hybrid']),
  score: z.number(),
  excerpt: z.string(),
});
export type QueryResult = z.infer<typeof QueryResultSchema>;

// Evento emitido pelo workflow query (FASE 4d).
export const QueryEventSchema = z.object({
  query: z.string().min(1),
  topK: z.number().int().positive(),
  threshold: z.number().min(0).max(1),
  results: z.array(QueryResultSchema),
  timestamp: z.number().int(),
});
export type QueryEvent = z.infer<typeof QueryEventSchema>;
