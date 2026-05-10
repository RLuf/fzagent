// Qdrant client wrapper.
//
// Decisoes:
// 1. 6 collections oficiais (FzagentCollection): kb, memory, learning,
//    personality, inference, semantic_cache. Todas 768d Cosine (BGE-base).
// 2. upsertPoint() exige vetor com dimensao exata — falha cedo se vier
//    diferente, prevenindo corrupcao silenciosa do indice.
// 3. search() default threshold 0.6 (RAG_SIMILARITY_THRESHOLD do conf).
// 4. validate() varre as collections, valida dim, conta pontos.
// 5. recreate() apaga e recria collection com schema padrao.

import type { FzagentLogger } from '@fzagent/core';
import { QdrantClient } from '@qdrant/js-client-rest';

export const FZAGENT_COLLECTIONS = [
  'fzagent_kb',
  'fzagent_memory',
  'fzagent_learning',
  'fzagent_personality',
  'fzagent_inference',
  'fzagent_semantic_cache',
] as const;
export type FzagentCollection = (typeof FZAGENT_COLLECTIONS)[number];

export const EMBEDDING_DIM = 768;
export const DEFAULT_SIMILARITY_THRESHOLD = 0.6;

export interface QdrantWrapperOptions {
  url: string;
  apiKey?: string;
  logger?: FzagentLogger;
  // Override do dim (default = 768 para BGE-base).
  dim?: number;
  // Override do threshold (default = 0.6).
  threshold?: number;
}

export interface SearchResult {
  id: string | number;
  score: number;
  payload: Record<string, unknown>;
}

export interface CollectionStats {
  name: string;
  exists: boolean;
  vectorsCount: number;
  pointsCount: number;
  dim?: number;
  ok: boolean;
  error?: string;
}

export interface UpsertInput {
  id: string | number;
  vector: number[];
  payload?: Record<string, unknown>;
}

export class QdrantWrapper {
  private readonly client: QdrantClient;
  private readonly logger: FzagentLogger | undefined;
  readonly dim: number;
  readonly threshold: number;

  constructor(opts: QdrantWrapperOptions) {
    this.client = new QdrantClient({
      url: opts.url,
      ...(opts.apiKey !== undefined && { apiKey: opts.apiKey }),
      // checkCompatibility=false evita warning ao construir sem servidor
      // (testes unitarios). Quando o Qdrant esta presente, o erro real
      // aparece nas chamadas de operacao.
      checkCompatibility: false,
    });
    this.logger = opts.logger?.child({ scope: 'qdrant' });
    this.dim = opts.dim ?? EMBEDDING_DIM;
    this.threshold = opts.threshold ?? DEFAULT_SIMILARITY_THRESHOLD;
  }

  // Cria as 6 collections caso nao existam. Idempotente.
  async ensureCollections(collections: readonly string[] = FZAGENT_COLLECTIONS): Promise<void> {
    const existing = await this.listCollectionNames();
    for (const name of collections) {
      if (existing.has(name)) continue;
      await this.client.createCollection(name, {
        vectors: { size: this.dim, distance: 'Cosine' },
      });
      this.logger?.info({ collection: name }, 'collection created');
    }
  }

  // Apaga e recria uma collection (uso destrutivo — para CLI vector recreate).
  async recreateCollection(name: string): Promise<void> {
    try {
      await this.client.deleteCollection(name);
    } catch {
      // tolera quando a collection nao existe
    }
    await this.client.createCollection(name, {
      vectors: { size: this.dim, distance: 'Cosine' },
    });
    this.logger?.info({ collection: name }, 'collection recreated');
  }

  async listCollectionNames(): Promise<Set<string>> {
    const list = await this.client.getCollections();
    return new Set(list.collections.map((c) => c.name));
  }

  // Upsert com validacao de dimensao.
  async upsertPoint(collection: FzagentCollection | string, input: UpsertInput): Promise<void> {
    if (!Array.isArray(input.vector) || input.vector.length !== this.dim) {
      throw new Error(
        `QdrantWrapper.upsertPoint: vector dimension ${input.vector?.length} != expected ${this.dim} for ${collection}`,
      );
    }
    await this.client.upsert(collection, {
      points: [
        {
          id: input.id,
          vector: input.vector,
          payload: input.payload ?? {},
        },
      ],
    });
  }

  async upsertBatch(collection: FzagentCollection | string, inputs: UpsertInput[]): Promise<void> {
    for (const inp of inputs) {
      if (!Array.isArray(inp.vector) || inp.vector.length !== this.dim) {
        throw new Error(
          `QdrantWrapper.upsertBatch: invalid dim ${inp.vector?.length} (expected ${this.dim})`,
        );
      }
    }
    await this.client.upsert(collection, {
      points: inputs.map((i) => ({
        id: i.id,
        vector: i.vector,
        payload: i.payload ?? {},
      })),
    });
  }

  async search(
    collection: FzagentCollection | string,
    vector: number[],
    opts: { limit?: number; threshold?: number; filter?: Record<string, unknown> } = {},
  ): Promise<SearchResult[]> {
    if (vector.length !== this.dim) {
      throw new Error(`QdrantWrapper.search: query dim ${vector.length} != expected ${this.dim}`);
    }
    const result = await this.client.search(collection, {
      vector,
      limit: opts.limit ?? 5,
      score_threshold: opts.threshold ?? this.threshold,
      ...(opts.filter !== undefined && { filter: opts.filter }),
      with_payload: true,
    });
    return result.map((r) => ({
      id: r.id,
      score: r.score,
      payload: (r.payload ?? {}) as Record<string, unknown>,
    }));
  }

  async deletePoint(collection: FzagentCollection | string, id: string | number): Promise<void> {
    await this.client.delete(collection, { points: [id] });
  }

  // Diagnostico para CLI vector validate.
  async validate(): Promise<CollectionStats[]> {
    const existing = await this.listCollectionNames();
    const out: CollectionStats[] = [];
    for (const name of FZAGENT_COLLECTIONS) {
      if (!existing.has(name)) {
        out.push({ name, exists: false, vectorsCount: 0, pointsCount: 0, ok: false });
        continue;
      }
      try {
        const info = (await this.client.getCollection(name)) as unknown as {
          vectors_count?: number;
          points_count?: number;
          config?: { params?: { vectors?: { size?: number } } };
        };
        const dim = info.config?.params?.vectors?.size;
        const ok = dim === this.dim;
        out.push({
          name,
          exists: true,
          vectorsCount: info.vectors_count ?? 0,
          pointsCount: info.points_count ?? 0,
          ok,
          ...(dim !== undefined && { dim }),
          ...(!ok && {
            error: `dim mismatch: collection=${dim ?? '?'} expected=${this.dim}`,
          }),
        });
      } catch (err) {
        out.push({
          name,
          exists: true,
          vectorsCount: 0,
          pointsCount: 0,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return out;
  }
}
