[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [agent/src](../README.md) / AgentEvent

# Type Alias: AgentEvent

> **AgentEvent** = \{ `sessionId`: `string`; `type`: `"session-started"`; \} \| \{ `n`: `number`; `type`: `"iteration"`; \} \| \{ `type`: `"thinking"`; \} \| \{ `message`: `Message`; `tokensIn`: `number`; `tokensOut`: `number`; `type`: `"assistant"`; \} \| \{ `call`: `ToolCall`; `type`: `"tool-call"`; \} \| \{ `call`: `ToolCall`; `durationMs`: `number`; `ok`: `boolean`; `output`: `string`; `type`: `"tool-result"`; \} \| \{ `error`: `string`; `type`: `"iteration-error"`; \} \| \{ `iterations`: `number`; `reason`: `"max-iterations"` \| `"token-budget"`; `tokensUsed`: `number`; `type`: `"budget-exceeded"`; \} \| \{ `failures`: `number`; `type`: `"circuit-breaker-tripped"`; \} \| \{ `type`: `"aborted"`; \} \| \{ `iterations`: `number`; `stopReason`: `string`; `tokensUsed`: `number`; `type`: `"end"`; \} \| \{ `iteration`: `number`; `reminderTokens`: `number`; `tokensUsed`: `number`; `type`: `"context-reinjected"`; \} \| \{ `reason`: `"token-threshold"`; `tokensBefore`: `number`; `type`: `"compaction-triggered"`; \} \| \{ `messagesAfter`: `number`; `messagesBefore`: `number`; `tokensSaved`: `number`; `type`: `"compaction-completed"`; \}

Defined in: agent/src/agent.ts:28
