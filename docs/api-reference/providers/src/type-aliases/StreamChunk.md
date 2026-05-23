[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [providers/src](../README.md) / StreamChunk

# Type Alias: StreamChunk

> **StreamChunk** = \{ `textDelta`: `string`; `type`: `"text-delta"`; \} \| \{ `toolCallId`: `string`; `toolName`: `string`; `type`: `"tool-call-start"`; \} \| \{ `inputJsonDelta`: `string`; `toolCallId`: `string`; `type`: `"tool-call-delta"`; \} \| \{ `input`: `Record`\<`string`, `unknown`\>; `toolCallId`: `string`; `type`: `"tool-call-end"`; \} \| \{ `type`: `"usage"`; `usage`: [`Usage`](../interfaces/Usage.md); \} \| \{ `stopReason`: [`StopReason`](StopReason.md); `type`: `"stop"`; \}

Defined in: providers/src/types.ts:58
