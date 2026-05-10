// Tools que delegam aos workflows do @fzagent/memory:
//   wiki.ingest, wiki.query, wiki.lint.

import {
  ingest as ingestWorkflow,
  lint as lintWorkflow,
  query as queryWorkflow,
} from '@fzagent/memory';
import type { EmbeddingsService, QdrantWrapper, WikiIndexer } from '@fzagent/memory';
import type { ProviderRouter } from '@fzagent/providers';
import { z } from 'zod';

import { defineTool } from '../types.js';

const WikiIngestInput = z.object({
  rawPath: z.string().min(1).describe('caminho para arquivo bruto (raw/...)'),
  summarize: z.boolean().default(false),
  collection: z.string().default('fzagent_kb'),
});

export const wikiIngest = defineTool({
  name: 'wiki.ingest',
  description: 'Ingere uma fonte bruta no cerebro secundario (wiki + Qdrant + embeddings).',
  inputSchema: WikiIngestInput,
  permissions: 'medium',
  async run(ctx, input) {
    const indexer = ctx.indexer as WikiIndexer | undefined;
    const qdrant = ctx.qdrant as QdrantWrapper | undefined;
    const embeddings = ctx.embeddings as EmbeddingsService | undefined;
    if (!indexer || !qdrant || !embeddings) {
      return 'wiki.ingest indisponivel: memory deps nao injetados (indexer/qdrant/embeddings)';
    }
    const router = ctx.router as ProviderRouter | undefined;
    const event = await ingestWorkflow(
      input.rawPath,
      {
        indexer,
        qdrant,
        embeddings,
        ...(router !== undefined && { router }),
        ...(ctx.logger !== undefined && { logger: ctx.logger }),
      },
      {
        collection: input.collection,
        summarize: input.summarize,
      },
    );
    return `ingested page=${event.pageId} bytes=${event.bytes} sha256=${event.sha256.slice(0, 12)}`;
  },
});

const WikiQueryInput = z.object({
  q: z.string().min(1),
  topK: z.number().int().min(1).max(20).default(5),
  synthesize: z.boolean().default(false),
});

export const wikiQuery = defineTool({
  name: 'wiki.query',
  description: 'Busca hibrida (FTS5 + Qdrant) no cerebro secundario; opcional sintese via LLM.',
  inputSchema: WikiQueryInput,
  permissions: 'low',
  async run(ctx, input) {
    const indexer = ctx.indexer as WikiIndexer | undefined;
    const qdrant = ctx.qdrant as QdrantWrapper | undefined;
    const embeddings = ctx.embeddings as EmbeddingsService | undefined;
    if (!indexer || !qdrant || !embeddings) {
      return 'wiki.query indisponivel: memory deps nao injetados';
    }
    const router = ctx.router as ProviderRouter | undefined;
    const result = await queryWorkflow(
      input.q,
      {
        indexer,
        qdrant,
        embeddings,
        ...(router !== undefined && { router }),
        ...(ctx.logger !== undefined && { logger: ctx.logger }),
      },
      {
        topK: input.topK,
        synthesize: input.synthesize,
      },
    );
    if (result.synthesis) return result.synthesis;
    return result.results
      .map((r, i) => `${i + 1}. [${r.source}] ${r.excerpt} (score=${r.score.toFixed(3)})`)
      .join('\n');
  },
});

const WikiLintInput = z.object({});

export const wikiLint = defineTool({
  name: 'wiki.lint',
  description: 'Roda lint no wiki: orfas, links quebrados, fontes nao-anexadas.',
  inputSchema: WikiLintInput,
  permissions: 'low',
  async run(ctx) {
    const indexer = ctx.indexer as WikiIndexer | undefined;
    if (!indexer) return 'wiki.lint indisponivel: indexer nao injetado';
    const r = lintWorkflow({
      indexer,
      ...(ctx.logger !== undefined && { logger: ctx.logger }),
    });
    if (r.totalIssues === 0) return 'OK: 0 issues.';
    return `Total: ${r.totalIssues}\n${r.issues
      .map((i) => `[${i.kind}] ${i.description}`)
      .join('\n')}`;
  },
});
