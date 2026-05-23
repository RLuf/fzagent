[**fzagent API Reference**](../../README.md)

---

[fzagent API Reference](../../README.md) / memory/src

# memory/src

## Classes

- [EmbeddingsService](classes/EmbeddingsService.md)
- [LRUCache](classes/LRUCache.md)
- [QdrantWrapper](classes/QdrantWrapper.md)
- [WikiIndexer](classes/WikiIndexer.md)
- [WordPieceTokenizer](classes/WordPieceTokenizer.md)

## Interfaces

- [BgeAssets](interfaces/BgeAssets.md)
- [BgeLoaderOptions](interfaces/BgeLoaderOptions.md)
- [CollectionStats](interfaces/CollectionStats.md)
- [EmbeddingsServiceOptions](interfaces/EmbeddingsServiceOptions.md)
- [Encoded](interfaces/Encoded.md)
- [IngestDeps](interfaces/IngestDeps.md)
- [IngestOptions](interfaces/IngestOptions.md)
- [InsertPageInput](interfaces/InsertPageInput.md)
- [LintDeps](interfaces/LintDeps.md)
- [LintIssue](interfaces/LintIssue.md)
- [LintReport](interfaces/LintReport.md)
- [LintResult](interfaces/LintResult.md)
- [QdrantSearchResult](interfaces/QdrantSearchResult.md)
- [QdrantWrapperOptions](interfaces/QdrantWrapperOptions.md)
- [QueryAnswer](interfaces/QueryAnswer.md)
- [QueryDeps](interfaces/QueryDeps.md)
- [QueryOptions](interfaces/QueryOptions.md)
- [TokenizerOptions](interfaces/TokenizerOptions.md)
- [UpsertInput](interfaces/UpsertInput.md)
- [WikiIndexerOptions](interfaces/WikiIndexerOptions.md)
- [WikiIndexerStats](interfaces/WikiIndexerStats.md)
- [WikiSearchResult](interfaces/WikiSearchResult.md)

## Type Aliases

- [FzagentCollection](type-aliases/FzagentCollection.md)

## Variables

- [DEFAULT_SIMILARITY_THRESHOLD](variables/DEFAULT_SIMILARITY_THRESHOLD.md)
- [EMBEDDING_DIM](variables/EMBEDDING_DIM.md)
- [FZAGENT_COLLECTIONS](variables/FZAGENT_COLLECTIONS.md)
- [FZAGENT_MEMORY_VERSION](variables/FZAGENT_MEMORY_VERSION.md)
- [QDRANT_EMBEDDING_DIM](variables/QDRANT_EMBEDDING_DIM.md)
- [SCHEMA_DDL](variables/SCHEMA_DDL.md)

## Functions

- [defaultCacheDir](functions/defaultCacheDir.md)
- [ensureBgeAssets](functions/ensureBgeAssets.md)
- [getNonAsciiChars](functions/getNonAsciiChars.md)
- [ingest](functions/ingest.md)
- [isAsciiOnly](functions/isAsciiOnly.md)
- [lint](functions/lint.md)
- [meanPoolNormalize](functions/meanPoolNormalize.md)
- [query](functions/query.md)
- [readVocabIfPresent](functions/readVocabIfPresent.md)
- [sanitizeBatch](functions/sanitizeBatch.md)
- [sanitizeForEmbedding](functions/sanitizeForEmbedding.md)
- [sanitizePayload](functions/sanitizePayload.md)
