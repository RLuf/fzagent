// WikiIndexer — SQLite better-sqlite3 + FTS5.
//
// CRUD basico de paginas, tags, links, sources, log. Busca textual via FTS5
// (`pages_fts MATCH ?`). Lint detecta:
// - paginas orfas (sem links de entrada).
// - links quebrados (dst_page_id NULL).
// - fontes sem pagina associada.

import { createHash, randomUUID } from 'node:crypto';

import type { FzagentLogger, WikiPage } from '@fzagent/core';
import Database from 'better-sqlite3';

import { SCHEMA_DDL } from './schema.js';

export interface WikiIndexerOptions {
  dbPath: string;
  logger?: FzagentLogger;
}

export interface InsertPageInput {
  path: string;
  title: string;
  type: WikiPage['type'];
  slug: string;
  frontmatter?: Record<string, unknown>;
  body?: string;
  tags?: string[];
}

export interface SearchResult {
  pageId: string;
  title: string;
  path: string;
  slug: string;
  snippet: string;
  rank: number;
}

export interface LintReport {
  orphans: Array<{ id: string; title: string; path: string }>;
  brokenLinks: Array<{ srcId: string; srcTitle: string; anchorText: string }>;
  unattachedSources: Array<{ rawPath: string; sha256: string }>;
}

export interface Stats {
  pages: number;
  tags: number;
  links: number;
  sources: number;
  logEntries: number;
}

export class WikiIndexer {
  private readonly db: Database.Database;
  private readonly logger: FzagentLogger | undefined;

  constructor(opts: WikiIndexerOptions) {
    this.logger = opts.logger?.child({ scope: 'wiki-indexer' });
    this.db = new Database(opts.dbPath);
    this.db.exec(SCHEMA_DDL);
  }

  close(): void {
    this.db.close();
  }

  upsertPage(input: InsertPageInput): WikiPage {
    const now = Date.now();
    const existing = this.db
      .prepare('SELECT id, created_at FROM pages WHERE path = ?')
      .get(input.path) as { id: string; created_at: number } | undefined;

    const id = existing?.id ?? randomUUID();
    const createdAt = existing?.created_at ?? now;
    const frontmatterJson = JSON.stringify(input.frontmatter ?? {});

    this.db
      .prepare(
        `INSERT INTO pages (id, path, title, type, slug, frontmatter_json, body, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(path) DO UPDATE SET
           title=excluded.title,
           type=excluded.type,
           slug=excluded.slug,
           frontmatter_json=excluded.frontmatter_json,
           body=excluded.body,
           updated_at=excluded.updated_at`,
      )
      .run(
        id,
        input.path,
        input.title,
        input.type,
        input.slug,
        frontmatterJson,
        input.body ?? '',
        createdAt,
        now,
      );

    if (input.tags && input.tags.length > 0) {
      this.replaceTags(id, input.tags);
    }

    this.logger?.debug({ id, path: input.path }, 'page upserted');

    return {
      id,
      path: input.path,
      title: input.title,
      type: input.type,
      slug: input.slug,
      frontmatter: input.frontmatter ?? {},
      body: input.body ?? '',
      createdAt,
      updatedAt: now,
      sourceCount: 0,
    };
  }

  getPage(id: string): WikiPage | null {
    const row = this.db.prepare('SELECT * FROM pages WHERE id = ?').get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? this.rowToPage(row) : null;
  }

  getPageByPath(path: string): WikiPage | null {
    const row = this.db.prepare('SELECT * FROM pages WHERE path = ?').get(path) as
      | Record<string, unknown>
      | undefined;
    return row ? this.rowToPage(row) : null;
  }

  getPageBySlug(slug: string): WikiPage | null {
    const row = this.db.prepare('SELECT * FROM pages WHERE slug = ?').get(slug) as
      | Record<string, unknown>
      | undefined;
    return row ? this.rowToPage(row) : null;
  }

  deletePage(id: string): boolean {
    return this.db.prepare('DELETE FROM pages WHERE id = ?').run(id).changes > 0;
  }

  replaceTags(pageId: string, tags: string[]): void {
    const tx = this.db.transaction((pid: string, ts: string[]) => {
      this.db.prepare('DELETE FROM page_tags WHERE page_id = ?').run(pid);
      const insertTag = this.db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
      const lookupTag = this.db.prepare('SELECT id FROM tags WHERE name = ?');
      const insertPageTag = this.db.prepare(
        'INSERT OR IGNORE INTO page_tags (page_id, tag_id) VALUES (?, ?)',
      );
      for (const t of ts) {
        const name = t.trim().toLowerCase();
        if (!name) continue;
        insertTag.run(name);
        const row = lookupTag.get(name) as { id: number } | undefined;
        if (row) insertPageTag.run(pid, row.id);
      }
    });
    tx(pageId, tags);
  }

  getTags(pageId: string): string[] {
    return this.db
      .prepare(
        `SELECT t.name FROM tags t JOIN page_tags pt ON pt.tag_id=t.id WHERE pt.page_id = ? ORDER BY t.name`,
      )
      .all(pageId)
      .map((r) => (r as { name: string }).name);
  }

  // Adiciona link [[anchorText]] partindo de srcPageId.
  // Resolve destino por slug igual a anchorText (case-insensitive).
  addLink(srcPageId: string, anchorText: string): void {
    const dst = this.db
      .prepare('SELECT id FROM pages WHERE LOWER(slug) = LOWER(?)')
      .get(anchorText) as { id: string } | undefined;
    this.db
      .prepare(
        'INSERT OR REPLACE INTO links (src_page_id, dst_page_id, anchor_text) VALUES (?, ?, ?)',
      )
      .run(srcPageId, dst?.id ?? null, anchorText);
  }

  clearLinksOf(srcPageId: string): void {
    this.db.prepare('DELETE FROM links WHERE src_page_id = ?').run(srcPageId);
  }

  // sources: ingestao de fonte bruta com sha256 unico.
  recordSource(rawPath: string, sha256: string, pageId: string | null): number {
    const result = this.db
      .prepare(
        'INSERT OR IGNORE INTO sources (raw_path, ingested_at, page_id, sha256) VALUES (?, ?, ?, ?)',
      )
      .run(rawPath, Date.now(), pageId, sha256);
    return Number(result.lastInsertRowid);
  }

  log(kind: string, payload: Record<string, unknown> = {}): void {
    this.db
      .prepare('INSERT INTO log (ts, kind, payload_json) VALUES (?, ?, ?)')
      .run(Date.now(), kind, JSON.stringify(payload));
  }

  search(query: string, limit = 20): SearchResult[] {
    if (!query.trim()) return [];
    const rows = this.db
      .prepare(
        `SELECT p.id as pageId, p.title, p.path, p.slug,
                snippet(pages_fts, 1, '<mark>', '</mark>', '...', 24) as snippet,
                bm25(pages_fts) as rank
         FROM pages_fts
         JOIN pages p ON p.rowid = pages_fts.rowid
         WHERE pages_fts MATCH ?
         ORDER BY rank
         LIMIT ?`,
      )
      .all(query, limit) as Array<{
      pageId: string;
      title: string;
      path: string;
      slug: string;
      snippet: string;
      rank: number;
    }>;
    return rows;
  }

  lint(): LintReport {
    const orphans = this.db
      .prepare(
        `SELECT p.id, p.title, p.path FROM pages p
         WHERE p.type IN ('source','concept','analysis')
           AND NOT EXISTS (SELECT 1 FROM links l WHERE l.dst_page_id = p.id)
         ORDER BY p.path`,
      )
      .all() as Array<{ id: string; title: string; path: string }>;

    const broken = this.db
      .prepare(
        `SELECT l.src_page_id as srcId, p.title as srcTitle, l.anchor_text as anchorText
         FROM links l JOIN pages p ON p.id = l.src_page_id
         WHERE l.dst_page_id IS NULL
         ORDER BY p.path`,
      )
      .all() as Array<{ srcId: string; srcTitle: string; anchorText: string }>;

    const unattached = this.db
      .prepare(
        `SELECT raw_path as rawPath, sha256 FROM sources WHERE page_id IS NULL ORDER BY ingested_at DESC`,
      )
      .all() as Array<{ rawPath: string; sha256: string }>;

    return { orphans, brokenLinks: broken, unattachedSources: unattached };
  }

  stats(): Stats {
    const count = (sql: string): number => (this.db.prepare(sql).get() as { c: number }).c;
    return {
      pages: count('SELECT COUNT(*) as c FROM pages'),
      tags: count('SELECT COUNT(*) as c FROM tags'),
      links: count('SELECT COUNT(*) as c FROM links'),
      sources: count('SELECT COUNT(*) as c FROM sources'),
      logEntries: count('SELECT COUNT(*) as c FROM log'),
    };
  }

  // Helpers exportados.
  static slugify(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9-]+/g, '-')
      .replace(/-+/g, '-') // colapsa hifens consecutivos (ex: "foo--bar" -> "foo-bar")
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
  }

  static sha256(content: string | Buffer): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private rowToPage(row: Record<string, unknown>): WikiPage {
    return {
      id: row['id'] as string,
      path: row['path'] as string,
      title: row['title'] as string,
      type: row['type'] as WikiPage['type'],
      slug: row['slug'] as string,
      frontmatter: JSON.parse(row['frontmatter_json'] as string) as Record<string, unknown>,
      body: row['body'] as string,
      createdAt: row['created_at'] as number,
      updatedAt: row['updated_at'] as number,
      sourceCount: row['source_count'] as number,
    };
  }
}
