[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [core/src](../README.md) / ProviderConfigSchema

# Variable: ProviderConfigSchema

> `const` **ProviderConfigSchema**: `ZodObject`\<\{ `apiKey`: `ZodOptional`\<`ZodString`\>; `baseUrl`: `ZodOptional`\<`ZodString`\>; `models`: `ZodDefault`\<`ZodArray`\<`ZodString`, `"many"`\>\>; `name`: `ZodEnum`\<\[`"anthropic"`, `"openai"`, `"google"`, `"openrouter"`, `"ollama"`\]\>; `referer`: `ZodOptional`\<`ZodString`\>; `title`: `ZodOptional`\<`ZodString`\>; \}, `"strip"`, `ZodTypeAny`, \{ `apiKey?`: `string`; `baseUrl?`: `string`; `models`: `string`[]; `name`: `"anthropic"` \| `"openai"` \| `"google"` \| `"openrouter"` \| `"ollama"`; `referer?`: `string`; `title?`: `string`; \}, \{ `apiKey?`: `string`; `baseUrl?`: `string`; `models?`: `string`[]; `name`: `"anthropic"` \| `"openai"` \| `"google"` \| `"openrouter"` \| `"ollama"`; `referer?`: `string`; `title?`: `string`; \}\>

Defined in: core/src/types/provider.ts:16
