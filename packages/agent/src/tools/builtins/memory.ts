import fs from 'node:fs/promises';
import { z } from 'zod';
import { ingest as ingestWorkflow } from '@fzagent/memory';
import type { EmbeddingsService, QdrantWrapper, WikiIndexer } from '@fzagent/memory';
import type { ProviderRouter } from '@fzagent/providers';

import { defineTool } from '../types.js';

const MemoryRecordInput = z.object({
  fact: z.string().min(1).describe('O fato ou informação importante a ser memorizado.'),
});

export const memoryRecord = defineTool({
  name: 'memory.record',
  description:
    'Grava um fato importante na memoria longa do agente (MEMORY.md) e indexa no sqlite3.',
  inputSchema: MemoryRecordInput,
  permissions: 'low',
  async run(ctx, input) {
    const filePath = 'MEMORY.md';
    const timestamp = new Date().toISOString();
    const entry = `- [${timestamp}] ${input.fact}\n`;

    // 1. Grava no arquivo MEMORY.md
    await fs.appendFile(filePath, entry, 'utf-8');

    // 2. Tenta reindexar usando o workflow de ingest do wiki (sqlite3 / qdrant)
    const indexer = ctx.indexer as WikiIndexer | undefined;
    const qdrant = ctx.qdrant as QdrantWrapper | undefined;
    const embeddings = ctx.embeddings as EmbeddingsService | undefined;

    let dbStatus = '';

    if (indexer && qdrant && embeddings) {
      const router = ctx.router as ProviderRouter | undefined;
      try {
        const event = await ingestWorkflow(
          filePath,
          {
            indexer,
            qdrant,
            embeddings,
            ...(router !== undefined && { router }),
            ...(ctx.logger !== undefined && { logger: ctx.logger }),
          },
          {
            collection: 'fzagent_kb', // Coleção padrão
            summarize: false,
          },
        );
        dbStatus = ` Indexado no sqlite3 (page=${event.pageId}).`;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        dbStatus = ` [Erro ao indexar: ${msg}]`;
      }
    } else {
      dbStatus = ` (Apenas em disco. Componentes de memoria nao injetados para indexacao SQLite.)`;
    }

    // TODO: Preparado para integrar um cache (ex: gptcache) no futuro.
    // if (ctx.cache) {
    //   await ctx.cache.set(`fact:${Date.now()}`, input.fact);
    // }

    return `Fato gravado com sucesso em ${filePath}.${dbStatus}`;
  },
});
