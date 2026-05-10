// @fzagent/memory — superficie publica.
export const FZAGENT_MEMORY_VERSION = '0.1.0';

export {
  getNonAsciiChars,
  isAsciiOnly,
  sanitizeBatch,
  sanitizeForEmbedding,
  sanitizePayload,
} from './ascii-sanitizer.js';

export { LRUCache } from './lru-cache.js';

export { WikiIndexer } from './indexer/indexer.js';
export type {
  InsertPageInput,
  LintReport,
  SearchResult as WikiSearchResult,
  Stats as WikiIndexerStats,
  WikiIndexerOptions,
} from './indexer/indexer.js';
export { SCHEMA_DDL } from './indexer/schema.js';

export {
  DEFAULT_SIMILARITY_THRESHOLD,
  EMBEDDING_DIM as QDRANT_EMBEDDING_DIM,
  FZAGENT_COLLECTIONS,
  QdrantWrapper,
} from './qdrant/client.js';
export type {
  CollectionStats,
  FzagentCollection,
  QdrantWrapperOptions,
  SearchResult as QdrantSearchResult,
  UpsertInput,
} from './qdrant/client.js';

export {
  defaultCacheDir,
  EmbeddingsService,
  ensureBgeAssets,
  EMBEDDING_DIM,
  meanPoolNormalize,
  readVocabIfPresent,
  WordPieceTokenizer,
} from './embeddings/index.js';
export type {
  BgeAssets,
  BgeLoaderOptions,
  Encoded,
  EmbeddingsServiceOptions,
  TokenizerOptions,
} from './embeddings/index.js';

export { ingest, lint, query } from './workflows/index.js';
export type {
  IngestDeps,
  IngestOptions,
  LintDeps,
  LintIssue,
  LintResult,
  QueryAnswer,
  QueryDeps,
  QueryOptions,
} from './workflows/index.js';
