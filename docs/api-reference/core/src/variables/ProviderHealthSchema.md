[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [core/src](../README.md) / ProviderHealthSchema

# Variable: ProviderHealthSchema

> `const` **ProviderHealthSchema**: `ZodObject`\<\{ `consecutiveFailures`: `ZodDefault`\<`ZodNumber`\>; `cooldownUntil`: `ZodDefault`\<`ZodNumber`\>; `lastError`: `ZodOptional`\<`ZodString`\>; `name`: `ZodEnum`\<\[`"anthropic"`, `"openai"`, `"google"`, `"openrouter"`, `"ollama"`\]\>; \}, `"strip"`, `ZodTypeAny`, \{ `consecutiveFailures`: `number`; `cooldownUntil`: `number`; `lastError?`: `string`; `name`: `"anthropic"` \| `"openai"` \| `"google"` \| `"openrouter"` \| `"ollama"`; \}, \{ `consecutiveFailures?`: `number`; `cooldownUntil?`: `number`; `lastError?`: `string`; `name`: `"anthropic"` \| `"openai"` \| `"google"` \| `"openrouter"` \| `"ollama"`; \}\>

Defined in: core/src/types/provider.ts:28
