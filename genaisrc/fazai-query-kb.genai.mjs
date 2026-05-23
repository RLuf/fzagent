// fazai-query-kb — query read-only contra collections fazai_* do Qdrant.
//
// Ensaio do contrato cerebro<->corpo para targetDomain='kb':
// quando o L99 for plugado, esta skill continua falando o mesmo protocolo;
// o cerebro nao precisa aprender uma nova forma de consultar a base.

import { z } from 'zod';
import { defineSkill } from '@fzagent/skills';

const ALLOWED_COLLECTIONS = [
  'fazai_kb',
  'fazai_memory',
  'fazai_learning',
  'fazai_personality',
  'fazai_inference',
  'fazai_semantic_cache',
  'fazai_context_memory',
  'fazai_source',
];

export default defineSkill({
  name: 'fazai-query-kb',
  description:
    'Busca semantica read-only em uma collection fazai_* do Qdrant. Nao escreve, nao apaga.',
  triggers: ['buscar na kb do fazai', 'fazai kb query'],
  permissions: 'low',
  category: 'memory',
  targetDomain: 'kb',
  isDestructive: false,
  requiresConfirmation: false,
  version: '0.1.0',
  inputSchema: z.object({
    collection: z.enum(ALLOWED_COLLECTIONS).describe('collection alvo (somente fazai_* permitido)'),
    query: z.string().min(1).describe('texto da consulta semantica'),
    topK: z.number().int().min(1).max(20).default(5),
  }),
  async run(ctx, input) {
    if (!ctx.qdrant || !ctx.embeddings) {
      return {
        ok: false,
        reason: 'qdrant ou embeddings nao injetados no contexto',
        collection: input.collection,
        topK: input.topK,
      };
    }
    const qdrant =
      /** @type {{ search: (c: string, v: number[], k: number) => Promise<unknown[]> }} */ (
        ctx.qdrant
      );
    const embeddings = /** @type {{ embed: (t: string) => Promise<number[]> }} */ (ctx.embeddings);
    const vector = await embeddings.embed(input.query);
    const hits = await qdrant.search(input.collection, vector, input.topK);
    return {
      ok: true,
      collection: input.collection,
      query: input.query,
      hits,
    };
  },
});
