// Workflow ingest(rawPath): le fonte bruta, parsea frontmatter, sanitiza,
// gera embedding, upserta em Qdrant e indexer SQLite.
//
// Para sintese (resumo + extracao de entidades), usa o ProviderRouter
// quando disponivel. Sem router: armazena conteudo bruto + frontmatter so.

import { readFileSync, statSync } from 'node:fs';
import { basename, extname, relative } from 'node:path';

import type { FzagentLogger, IngestEvent } from '@fzagent/core';
import type { ProviderRouter } from '@fzagent/providers';
import grayMatter from 'gray-matter';

import { sanitizePayload } from '../ascii-sanitizer.js';
import type { EmbeddingsService } from '../embeddings/index.js';
import { WikiIndexer } from '../indexer/indexer.js';
import type { QdrantWrapper } from '../qdrant/client.js';

export interface IngestOptions {
  // diretorio raiz do wiki (default: 'wiki').
  // Usado para calcular path relativo da pagina criada.
  wikiRoot?: string;
  // collection alvo no Qdrant (default 'fzagent_kb').
  collection?: string;
  // tipo da pagina (default 'source').
  pageType?: 'source' | 'concept' | 'analysis' | 'index' | 'log';
  // Se true e router presente, gera resumo via LLM.
  summarize?: boolean;
}

export interface IngestDeps {
  indexer: WikiIndexer;
  qdrant: QdrantWrapper;
  embeddings: EmbeddingsService;
  router?: ProviderRouter;
  logger?: FzagentLogger;
}

export async function ingest(
  rawPath: string,
  deps: IngestDeps,
  opts: IngestOptions = {},
): Promise<IngestEvent> {
  const log = deps.logger?.child({ scope: 'ingest', file: basename(rawPath) });
  const wikiRoot = opts.wikiRoot ?? 'wiki';
  const collection = opts.collection ?? 'fzagent_kb';
  const pageType = opts.pageType ?? 'source';

  const stat = statSync(rawPath);
  const buf = readFileSync(rawPath);
  const sha256 = WikiIndexer.sha256(buf);

  const { data: frontmatter, content: body } = grayMatter(buf.toString('utf8'));

  const titleRaw = (frontmatter['title'] as string) ?? deriveTitle(rawPath);
  const slug = WikiIndexer.slugify(titleRaw);
  const ext = extname(rawPath) || '.md';
  const targetPath = `${wikiRoot}/sources/${slug}${ext}`;

  let summary: string | null = null;
  if (opts.summarize && deps.router) {
    try {
      const result = await deps.router.complete(
        [
          {
            role: 'user',
            content:
              'Resuma o seguinte conteudo em 3-5 bullet points concisos, em portugues:\n\n' +
              body.slice(0, 8000),
          },
        ],
        { model: 'claude-haiku-4-5', maxTokens: 512 },
      );
      summary = result.content;
    } catch (err) {
      log?.warn(
        { error: err instanceof Error ? err.message : String(err) },
        'summarize failed; continuing without',
      );
    }
  }

  const page = deps.indexer.upsertPage({
    path: targetPath,
    title: titleRaw,
    type: pageType,
    slug,
    frontmatter,
    body,
    tags: extractTags(frontmatter),
  });

  deps.indexer.recordSource(rawPath, sha256, page.id);

  // Embedding: usa titulo + body (truncado para nao explodir tokens).
  const embedText = `${titleRaw}\n\n${body.slice(0, 4000)}`;
  const vector = await deps.embeddings.embed(embedText);

  await deps.qdrant.upsertPoint(collection, {
    id: page.id,
    vector,
    payload: sanitizePayload({
      title: titleRaw,
      slug,
      path: targetPath,
      type: pageType,
      ...(summary !== null && { summary }),
      raw_path: relative(process.cwd(), rawPath),
      sha256,
      ingested_at: Date.now(),
    }),
  });

  deps.indexer.log('ingest', { rawPath, pageId: page.id, sha256 });

  log?.info({ pageId: page.id, slug, bytes: stat.size, summarized: summary !== null }, 'ingested');

  return {
    rawPath,
    pageId: page.id,
    sha256,
    ingestedAt: Date.now(),
    bytes: stat.size,
  };
}

function deriveTitle(path: string): string {
  const base = basename(path);
  const noExt = base.replace(/\.[^.]+$/, '');
  return noExt.replace(/[-_]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function extractTags(fm: Record<string, unknown>): string[] {
  const v = fm['tags'];
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (typeof v === 'string')
    return v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  return [];
}
