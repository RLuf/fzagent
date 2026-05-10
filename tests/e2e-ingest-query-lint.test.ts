// E2E round-trip: ingest -> query (FTS5 only) -> lint.
//
// Sem Qdrant nem ONNX: usamos in-memory SQLite + EmbeddingsService stubada
// (zero-vector). O objetivo e provar o fluxo SQLite + frontmatter +
// hyperlink + lint sem dependencias externas.

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createLogger } from '@fzagent/core';
import { EmbeddingsService, ingest, lint, WikiIndexer } from '@fzagent/memory';
import { QdrantWrapper } from '@fzagent/memory';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const silent = createLogger({ format: 'silent', level: 'silent' });

let dir: string;
let indexer: WikiIndexer;
let stubEmbeddings: EmbeddingsService;
let stubQdrant: QdrantWrapper;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'fz-e2e-'));
  indexer = new WikiIndexer({ dbPath: join(dir, 'wiki.sqlite') });
  // EmbeddingsService stub: substitui embed por zero-vector sem carregar ONNX.
  stubEmbeddings = new EmbeddingsService({ cacheSize: 10 });
  stubEmbeddings.embed = async () => Array.from({ length: 768 }, () => 0);
  // Qdrant stub: subsitui upsertPoint/search para nao precisar de servidor.
  stubQdrant = new QdrantWrapper({ url: 'http://localhost:1' });
  stubQdrant.upsertPoint = async () => {};
  stubQdrant.search = async () => [];
});

afterEach(() => {
  indexer.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('E2E: ingest -> query -> lint round-trip', () => {
  it('full round-trip without external services', async () => {
    // 1. Cria fonte bruta com frontmatter.
    const rawPath = join(dir, 'raw-attention.md');
    writeFileSync(
      rawPath,
      `---
title: Attention Is All You Need
tags: [transformer, attention, deep-learning]
---

# Attention Is All You Need

Vaswani et al 2017. Apresenta a arquitetura Transformer baseada apenas
em mecanismos de atencao, sem recorrencia ou convolucao. Usa self-attention
e multi-head attention.
`,
    );

    // 2. Ingest
    const ev = await ingest(
      rawPath,
      { indexer, qdrant: stubQdrant, embeddings: stubEmbeddings, logger: silent },
      { collection: 'fzagent_kb' },
    );
    expect(ev.pageId).toBeTruthy();
    expect(ev.bytes).toBeGreaterThan(0);

    // 3. Verifica indexador SQLite
    const page = indexer.getPage(ev.pageId!);
    expect(page).toBeTruthy();
    expect(page?.title).toBe('Attention Is All You Need');
    expect(page?.frontmatter['tags']).toEqual(['transformer', 'attention', 'deep-learning']);

    // 4. FTS5 query encontra o conteudo
    const ftsHits = indexer.search('Transformer');
    expect(ftsHits.length).toBeGreaterThan(0);
    expect(ftsHits[0]?.title).toBe('Attention Is All You Need');

    // 5. Stats refletem
    const stats = indexer.stats();
    expect(stats.pages).toBe(1);
    expect(stats.tags).toBe(3);
    expect(stats.sources).toBe(1);

    // 6. Lint inicial: pagina e orfa (nao tem links de entrada)
    const r1 = lint({ indexer, logger: silent });
    expect(r1.totalIssues).toBeGreaterThan(0);
    expect(r1.byKind['orphan']).toBe(1);

    // 7. Adiciona uma segunda pagina que linka para a primeira
    const page2 = indexer.upsertPage({
      path: 'wiki/concepts/transformer.md',
      title: 'Transformer architecture',
      type: 'concept',
      slug: 'transformer-arch',
      body: 'See [[attention-is-all-you-need]] for the original paper.',
    });
    indexer.addLink(page2.id, page!.slug);

    // 8. Lint final: zero orfa para a pagina original (tem link de entrada)
    const r2 = lint({ indexer, logger: silent });
    const orphansForOriginal = r2.issues.filter(
      (i) => i.kind === 'orphan' && i.pageId === page!.id,
    );
    expect(orphansForOriginal).toHaveLength(0);
    // Mas a nova pagina e orfa (ninguem linka para ela)
    const orphansForNew = r2.issues.filter((i) => i.kind === 'orphan' && i.pageId === page2.id);
    expect(orphansForNew).toHaveLength(1);
  });

  it('detects broken links during lint', async () => {
    const a = indexer.upsertPage({
      path: 'wiki/concepts/a.md',
      title: 'A',
      type: 'concept',
      slug: 'a',
    });
    indexer.addLink(a.id, 'does-not-exist');
    const r = lint({ indexer, logger: silent });
    expect(r.byKind['broken-link']).toBe(1);
  });
});
