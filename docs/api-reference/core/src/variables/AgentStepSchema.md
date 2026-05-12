[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [core/src](../README.md) / AgentStepSchema

# Variable: AgentStepSchema

> `const` **AgentStepSchema**: `ZodObject`\<\{ `iteration`: `ZodNumber`; `notes`: `ZodOptional`\<`ZodString`\>; `state`: `ZodEnum`\<\[`"idle"`, `"thinking"`, `"acting"`, `"observing"`, `"reflecting"`, `"paused"`, `"failed"`\]\>; `timestamp`: `ZodNumber`; `tokensUsed`: `ZodNumber`; `toolCalls`: `ZodNumber`; \}, `"strip"`, `ZodTypeAny`, \{ `iteration`: `number`; `notes?`: `string`; `state`: `"idle"` \| `"thinking"` \| `"acting"` \| `"observing"` \| `"reflecting"` \| `"paused"` \| `"failed"`; `timestamp`: `number`; `tokensUsed`: `number`; `toolCalls`: `number`; \}, \{ `iteration`: `number`; `notes?`: `string`; `state`: `"idle"` \| `"thinking"` \| `"acting"` \| `"observing"` \| `"reflecting"` \| `"paused"` \| `"failed"`; `timestamp`: `number`; `tokensUsed`: `number`; `toolCalls`: `number`; \}\>

Defined in: core/src/types/agent.ts:34
