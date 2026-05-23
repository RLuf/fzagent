[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [core/src](../README.md) / QueryEventSchema

# Variable: QueryEventSchema

> `const` **QueryEventSchema**: `ZodObject`\<\{ `query`: `ZodString`; `results`: `ZodArray`\<`ZodObject`\<\{ `excerpt`: `ZodString`; `pageId`: `ZodString`; `score`: `ZodNumber`; `source`: `ZodEnum`\<\[`"fts5"`, `"qdrant"`, `"hybrid"`\]\>; \}, `"strip"`, `ZodTypeAny`, \{ `excerpt`: `string`; `pageId`: `string`; `score`: `number`; `source`: `"fts5"` \| `"qdrant"` \| `"hybrid"`; \}, \{ `excerpt`: `string`; `pageId`: `string`; `score`: `number`; `source`: `"fts5"` \| `"qdrant"` \| `"hybrid"`; \}\>, `"many"`\>; `threshold`: `ZodNumber`; `timestamp`: `ZodNumber`; `topK`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `query`: `string`; `results`: `object`[]; `threshold`: `number`; `timestamp`: `number`; `topK`: `number`; \}, \{ `query`: `string`; `results`: `object`[]; `threshold`: `number`; `timestamp`: `number`; `topK`: `number`; \}\>

Defined in: core/src/types/wiki.ts:43
