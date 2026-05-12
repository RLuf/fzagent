[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [core/src](../README.md) / WikiPageSchema

# Variable: WikiPageSchema

> `const` **WikiPageSchema**: `ZodObject`\<\{ `body`: `ZodDefault`\<`ZodString`\>; `createdAt`: `ZodNumber`; `frontmatter`: `ZodDefault`\<`ZodRecord`\<`ZodString`, `ZodUnknown`\>\>; `id`: `ZodString`; `path`: `ZodString`; `slug`: `ZodString`; `sourceCount`: `ZodDefault`\<`ZodNumber`\>; `title`: `ZodString`; `type`: `ZodEnum`\<\[`"source"`, `"concept"`, `"analysis"`, `"index"`, `"log"`\]\>; `updatedAt`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `body`: `string`; `createdAt`: `number`; `frontmatter`: `Record`\<`string`, `unknown`\>; `id`: `string`; `path`: `string`; `slug`: `string`; `sourceCount`: `number`; `title`: `string`; `type`: `"source"` \| `"concept"` \| `"analysis"` \| `"index"` \| `"log"`; `updatedAt`: `number`; \}, \{ `body?`: `string`; `createdAt`: `number`; `frontmatter?`: `Record`\<`string`, `unknown`\>; `id`: `string`; `path`: `string`; `slug`: `string`; `sourceCount?`: `number`; `title`: `string`; `type`: `"source"` \| `"concept"` \| `"analysis"` \| `"index"` \| `"log"`; `updatedAt`: `number`; \}\>

Defined in: core/src/types/wiki.ts:9
