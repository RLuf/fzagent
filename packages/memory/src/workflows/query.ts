// Workflow query(q): busca hibrida FTS5 + Qdrant, merge por pageId.
//
// Quando o ProviderRouter esta presente, sintetiza uma resposta com
// citacoes [[slug]]. Sem router: retorna apenas resultados brutos.

import type { FzagentLogger, QueryEvent, QueryResult } from '@fzagent/core';
import type { ProviderRouter } from '@fzagent/providers';

import { sanitizeForEmbedding } from '../ascii-sanitizer.js';
import type { EmbeddingsService } from '../embeddings/index.js';
import type { WikiIndexer } from '../indexer/indexer.js';
import type { QdrantWrapper } from '../qdrant/client.js';

export interface QueryOptions {
  topK?: number;
  threshold?: number;
  collection?: string;
  // gera sintese textual via LLM (precisa de router).
  synthesize?: boolean;
  // modelo para sintese (default claude-sonnet-4-5).
  synthesisModel?: string;
}

export interface QueryDeps {
  indexer: WikiIndexer;
  qdrant: QdrantWrapper;
  embeddings: EmbeddingsService;
  router?: ProviderRouter;
  logger?: FzagentLogger;
}

export interface QueryAnswer extends QueryEvent {
  // texto sintetizado (quando synthesize=true e router presente).
  synthesis: string | null;
}

export async function query(
  q: string,
  deps: QueryDeps,
  opts: QueryOptions = {},
): Promise<QueryAnswer> {
  const topK = opts.topK ?? 5;
  const threshold = opts.threshold ?? deps.qdrant.threshold;
  const collection = opts.collection ?? 'fzagent_kb';
  const log = deps.logger?.child({ scope: 'query' });

  const sanitized = sanitizeForEmbedding(q);

  // 1. FTS5 textual
  const fts = deps.indexer.search(q, topK).map<QueryResult>((r) => ({
    pageId: r.pageId,
    source: 'fts5',
    score: -r.rank, // bm25 e rank menor=melhor; invertemos para score maior=melhor
    excerpt: r.snippet,
  }));

  // 2. Qdrant semantico
  let vec: number[] | null = null;
  let qdrantHits: QueryResult[] = [];
  try {
    vec = await deps.embeddings.embed(sanitized || q);
    const hits = await deps.qdrant.search(collection, vec, { limit: topK, threshold });
    qdrantHits = hits.map<QueryResult>((h) => ({
      pageId: String(h.id),
      source: 'qdrant',
      score: h.score,
      excerpt:
        typeof h.payload['summary'] === 'string'
          ? (h.payload['summary'] as string)
          : typeof h.payload['title'] === 'string'
            ? (h.payload['title'] as string)
            : '',
    }));
  } catch (err) {
    log?.warn(
      { error: err instanceof Error ? err.message : String(err) },
      'qdrant search failed; continuing with FTS only',
    );
  }

  // 3. merge por pageId, marcando hibridos.
  const byId = new Map<string, QueryResult>();
  for (const r of fts) byId.set(r.pageId, r);
  for (const r of qdrantHits) {
    const prev = byId.get(r.pageId);
    if (prev) {
      byId.set(r.pageId, {
        pageId: r.pageId,
        source: 'hybrid',
        score: prev.score + r.score,
        excerpt: prev.excerpt || r.excerpt,
      });
    } else {
      byId.set(r.pageId, r);
    }
  }
  const results = Array.from(byId.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // 4. sintese opcional via LLM
  let synthesis: string | null = null;
  if (opts.synthesize && deps.router && results.length > 0) {
    const ctx = results
      .map((r, i) => {
        const page = deps.indexer.getPage(r.pageId);
        const title = page?.title ?? r.pageId;
        const slug = page?.slug ?? r.pageId;
        return `[${i + 1}] ${title} (cite como [[${slug}]])\n${r.excerpt}`;
      })
      .join('\n\n');
    try {
      const result = await deps.router.complete(
        [
          {
            role: 'system',
            content:
              'Voce sintetiza respostas usando o contexto fornecido. Cite fontes inline com [[slug]].',
          },
          {
            role: 'user',
            content: `Pergunta: ${q}\n\nContexto:\n${ctx}\n\nResponda em 2-3 paragrafos curtos.`,
          },
        ],
        { model: opts.synthesisModel ?? 'claude-sonnet-4-5', maxTokens: 1024 },
      );
      synthesis = result.content;
    } catch (err) {
      log?.warn({ error: err instanceof Error ? err.message : String(err) }, 'synthesis failed');
    }
  }

  const ts = Date.now();
  const event: QueryAnswer = {
    query: q,
    topK,
    threshold,
    results,
    timestamp: ts,
    synthesis,
  };
  deps.indexer.log('query', { q, hits: results.length, synthesized: synthesis !== null });
  return event;
}
