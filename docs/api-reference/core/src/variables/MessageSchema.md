[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [core/src](../README.md) / MessageSchema

# Variable: MessageSchema

> `const` **MessageSchema**: `ZodObject`\<\{ `content`: `ZodString`; `role`: `ZodEnum`\<\[`"system"`, `"user"`, `"assistant"`, `"tool"`\]\>; `timestamp`: `ZodOptional`\<`ZodNumber`\>; `tool_call_id`: `ZodOptional`\<`ZodString`\>; `tool_calls`: `ZodOptional`\<`ZodArray`\<`ZodObject`\<\{ `id`: `ZodString`; `input`: `ZodRecord`\<`ZodString`, `ZodUnknown`\>; `name`: `ZodString`; \}, `"strip"`, `ZodTypeAny`, \{ `id`: `string`; `input`: `Record`\<`string`, `unknown`\>; `name`: `string`; \}, \{ `id`: `string`; `input`: `Record`\<`string`, `unknown`\>; `name`: `string`; \}\>, `"many"`\>\>; \}, `"strip"`, `ZodTypeAny`, \{ `content`: `string`; `role`: `"system"` \| `"user"` \| `"assistant"` \| `"tool"`; `timestamp?`: `number`; `tool_call_id?`: `string`; `tool_calls?`: `object`[]; \}, \{ `content`: `string`; `role`: `"system"` \| `"user"` \| `"assistant"` \| `"tool"`; `timestamp?`: `number`; `tool_call_id?`: `string`; `tool_calls?`: `object`[]; \}\>

Defined in: core/src/types/message.ts:30
