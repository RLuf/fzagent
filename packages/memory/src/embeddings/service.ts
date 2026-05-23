// EmbeddingsService — gera vetor 768d via BGE-base-en-v1.5 (ONNX runtime).
//
// Pipeline:
//  1. ascii-sanitize (NFD + remover diacriticos + non-ASCII).
//  2. tokenize WordPiece (max 512 tokens).
//  3. ONNX inference: outputs.last_hidden_state shape [1, seq, 768].
//  4. mean-pool sobre seq usando attention_mask.
//  5. L2-normalize -> vetor unitario, pronto para Cosine.
//  6. Cache LRU 100k pelo hash do texto sanitizado.
//
// Init e lazy: ensureReady() baixa o modelo + vocab e cria a InferenceSession
// na primeira chamada de embed().

import { createHash } from 'node:crypto';

import type { FzagentLogger } from '@fzagent/core';

import { sanitizeForEmbedding } from '../ascii-sanitizer.js';
import { LRUCache } from '../lru-cache.js';
import { ensureBgeAssets } from './bge-loader.js';
import { WordPieceTokenizer } from './tokenizer.js';

export interface EmbeddingsServiceOptions {
  cacheSize?: number;
  cacheDir?: string;
  logger?: FzagentLogger;
  // injecoes de teste
  modelUrl?: string;
  vocabUrl?: string;
}

export const EMBEDDING_DIM = 768;

export class EmbeddingsService {
  private session: unknown | null = null;
  private tokenizer: WordPieceTokenizer | null = null;
  private readonly cache: LRUCache<string, number[]>;
  private readonly logger: FzagentLogger | undefined;
  private readonly cacheDir: string | undefined;
  private readonly modelUrl: string | undefined;
  private readonly vocabUrl: string | undefined;
  private initPromise: Promise<void> | null = null;

  constructor(opts: EmbeddingsServiceOptions = {}) {
    this.cache = new LRUCache<string, number[]>(opts.cacheSize ?? 100_000);
    this.logger = opts.logger?.child({ scope: 'embeddings' });
    this.cacheDir = opts.cacheDir;
    this.modelUrl = opts.modelUrl;
    this.vocabUrl = opts.vocabUrl;
  }

  // Carrega modelo + tokenizer. Idempotente.
  async ensureReady(): Promise<void> {
    if (this.session && this.tokenizer) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInit();
    await this.initPromise;
  }

  private async doInit(): Promise<void> {
    const assets = await ensureBgeAssets({
      ...(this.cacheDir !== undefined && { cacheDir: this.cacheDir }),
      ...(this.modelUrl !== undefined && { modelUrl: this.modelUrl }),
      ...(this.vocabUrl !== undefined && { vocabUrl: this.vocabUrl }),
      ...(this.logger !== undefined && { logger: this.logger }),
    });
    this.tokenizer = new WordPieceTokenizer({
      vocabPath: assets.vocabPath,
      maxLength: 512,
    });
    // import dinamico para nao carregar onnxruntime-node em testes que so
    // usam ascii-sanitizer ou indexer.
    const ort = await import('onnxruntime-node');
    this.session = await ort.InferenceSession.create(assets.modelPath);
    this.logger?.info('embeddings service ready');
  }

  async embed(text: string): Promise<number[]> {
    const sanitized = sanitizeForEmbedding(text);
    if (!sanitized) return new Array(EMBEDDING_DIM).fill(0);

    const key = createHash('sha1').update(sanitized).digest('hex');
    const cached = this.cache.get(key);
    if (cached) return cached;

    await this.ensureReady();
    if (!this.tokenizer || !this.session) {
      throw new Error('EmbeddingsService not initialized');
    }

    const enc = this.tokenizer.encode(sanitized);
    const ort = await import('onnxruntime-node');
    const inputs = {
      input_ids: new ort.Tensor('int64', enc.inputIds, [1, enc.length]),
      attention_mask: new ort.Tensor('int64', enc.attentionMask, [1, enc.length]),
      token_type_ids: new ort.Tensor('int64', enc.tokenTypeIds, [1, enc.length]),
    };
    const session = this.session as { run: (inp: unknown) => Promise<Record<string, unknown>> };
    const outputs = await session.run(inputs);
    const lastHidden = (outputs['last_hidden_state'] ?? outputs['logits']) as
      | { data: Float32Array; dims: number[] }
      | undefined;
    if (!lastHidden) {
      throw new Error('ONNX output missing last_hidden_state');
    }
    const vec = meanPoolNormalize(lastHidden.data, lastHidden.dims, enc.attentionMask);
    this.cache.set(key, vec);
    return vec;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const out: number[][] = [];
    for (const t of texts) out.push(await this.embed(t));
    return out;
  }

  cacheStats(): { size: number; maxSize: number } {
    return { size: this.cache.size, maxSize: this.cache.maxSize };
  }
}

// Mean-pooling com attention mask + L2 normalize.
// dims = [1, seq, 768]; mask = BigInt64Array length=seq.
export function meanPoolNormalize(
  hidden: Float32Array,
  dims: number[],
  mask: BigInt64Array,
): number[] {
  const [batch, seq, dim] = dims as [number, number, number];
  if (batch !== 1) throw new Error('meanPoolNormalize: only batch=1 supported');
  const out = new Float32Array(dim);
  let count = 0;
  for (let i = 0; i < seq; i += 1) {
    if (mask[i] === 0n) continue;
    count += 1;
    const base = i * dim;
    for (let j = 0; j < dim; j += 1) {
      out[j]! += hidden[base + j]!;
    }
  }
  if (count === 0) return Array.from(out) as number[];
  for (let j = 0; j < dim; j += 1) {
    out[j]! /= count;
  }
  let norm = 0;
  for (let j = 0; j < dim; j += 1) {
    norm += out[j]! * out[j]!;
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let j = 0; j < dim; j += 1) {
      out[j]! /= norm;
    }
  }
  return Array.from(out);
}
