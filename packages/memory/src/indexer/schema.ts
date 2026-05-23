// Schema SQL do Wiki Indexer (SQLite + FTS5).
//
// Decisoes:
// 1. pages.id e UUID gerado em JS (nao auto-increment).
// 2. pages_fts e tabela virtual FTS5 espelhando title+body, mantida via triggers.
// 3. tags + page_tags (many-to-many).
// 4. links rastreia [[wikilinks]] entre paginas para deteccao de orfas.
// 5. sources guarda fontes brutas (raw/) com sha256 para detectar mudancas.
// 6. log e append-only de eventos (ingest, query, lint, errors).
// 7. Foreign keys ON DELETE CASCADE quando faz sentido.
// 8. PRAGMA foreign_keys=ON e PRAGMA journal_mode=WAL aplicados na abertura.

export const SCHEMA_DDL = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS pages (
  id              TEXT PRIMARY KEY,
  path            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('source','concept','analysis','index','log')),
  slug            TEXT NOT NULL,
  frontmatter_json TEXT NOT NULL DEFAULT '{}',
  body            TEXT NOT NULL DEFAULT '',
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  source_count    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_pages_type ON pages(type);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);

CREATE TABLE IF NOT EXISTS tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS page_tags (
  page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (page_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_page_tags_tag ON page_tags(tag_id);

CREATE TABLE IF NOT EXISTS links (
  src_page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  dst_page_id TEXT,
  anchor_text TEXT NOT NULL,
  -- dst pode ser NULL quando o link aponta para slug que ainda nao existe
  PRIMARY KEY (src_page_id, anchor_text)
);
CREATE INDEX IF NOT EXISTS idx_links_dst ON links(dst_page_id);

CREATE TABLE IF NOT EXISTS sources (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_path     TEXT NOT NULL,
  ingested_at  INTEGER NOT NULL,
  page_id      TEXT REFERENCES pages(id) ON DELETE SET NULL,
  sha256       TEXT NOT NULL,
  UNIQUE(raw_path, sha256)
);
CREATE INDEX IF NOT EXISTS idx_sources_page ON sources(page_id);

CREATE TABLE IF NOT EXISTS log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ts           INTEGER NOT NULL,
  kind         TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_log_ts ON log(ts);
CREATE INDEX IF NOT EXISTS idx_log_kind ON log(kind);

-- FTS5 virtual table espelha title + body. content='pages' faz com que seja
-- "external content" (so guarda o indice; conteudo fica em pages).
CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
  title,
  body,
  content='pages',
  content_rowid='rowid',
  tokenize='unicode61 remove_diacritics 2'
);

-- Triggers para manter pages_fts sincronizado com pages.
CREATE TRIGGER IF NOT EXISTS pages_ai AFTER INSERT ON pages BEGIN
  INSERT INTO pages_fts(rowid, title, body) VALUES (new.rowid, new.title, new.body);
END;
CREATE TRIGGER IF NOT EXISTS pages_ad AFTER DELETE ON pages BEGIN
  INSERT INTO pages_fts(pages_fts, rowid, title, body) VALUES ('delete', old.rowid, old.title, old.body);
END;
CREATE TRIGGER IF NOT EXISTS pages_au AFTER UPDATE ON pages BEGIN
  INSERT INTO pages_fts(pages_fts, rowid, title, body) VALUES ('delete', old.rowid, old.title, old.body);
  INSERT INTO pages_fts(rowid, title, body) VALUES (new.rowid, new.title, new.body);
END;
`;
