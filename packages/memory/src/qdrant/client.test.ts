// Testes da QdrantWrapper sem Qdrant rodando — validamos apenas a logica
// de validacao de dimensao e contrato. Testes de integracao (com Qdrant
// real) ficam para a FASE 10.

import { describe, expect, it } from 'vitest';

import { EMBEDDING_DIM, FZAGENT_COLLECTIONS, QdrantWrapper } from './client.js';

describe('QdrantWrapper constants', () => {
  it('exports the 6 canonical collections', () => {
    expect(FZAGENT_COLLECTIONS).toEqual([
      'fzagent_kb',
      'fzagent_memory',
      'fzagent_learning',
      'fzagent_personality',
      'fzagent_inference',
      'fzagent_semantic_cache',
    ]);
  });

  it('default dim is 768 (BGE-base)', () => {
    expect(EMBEDDING_DIM).toBe(768);
  });
});

describe('QdrantWrapper dimension validation (no network)', () => {
  it('rejects upsertPoint with wrong dim', async () => {
    const w = new QdrantWrapper({ url: 'http://localhost:1' });
    await expect(w.upsertPoint('fzagent_kb', { id: 'a', vector: [1, 2, 3] })).rejects.toThrow(
      /dimension/,
    );
  });

  it('rejects upsertBatch with mismatched dim', async () => {
    const w = new QdrantWrapper({ url: 'http://localhost:1' });
    const tooSmall = Array.from({ length: 100 }, () => 0);
    await expect(w.upsertBatch('fzagent_kb', [{ id: 'a', vector: tooSmall }])).rejects.toThrow(
      /dim/,
    );
  });

  it('rejects search with wrong dim', async () => {
    const w = new QdrantWrapper({ url: 'http://localhost:1' });
    await expect(w.search('fzagent_kb', [0])).rejects.toThrow(/dim/);
  });

  it('threshold default is 0.6', () => {
    const w = new QdrantWrapper({ url: 'http://localhost:1' });
    expect(w.threshold).toBe(0.6);
  });

  it('respects custom dim and threshold', () => {
    const w = new QdrantWrapper({ url: 'http://localhost:1', dim: 384, threshold: 0.8 });
    expect(w.dim).toBe(384);
    expect(w.threshold).toBe(0.8);
  });
});
