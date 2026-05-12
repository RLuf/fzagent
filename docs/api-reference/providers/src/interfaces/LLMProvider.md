[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [providers/src](../README.md) / LLMProvider

# Interface: LLMProvider

Defined in: providers/src/types.ts:66

## Properties

### models

> `readonly` **models**: readonly `string`[]

Defined in: providers/src/types.ts:68

---

### name

> `readonly` **name**: `"anthropic"` \| `"openai"` \| `"google"` \| `"openrouter"` \| `"ollama"`

Defined in: providers/src/types.ts:67

---

### supportsTools

> `readonly` **supportsTools**: `boolean`

Defined in: providers/src/types.ts:73

## Methods

### complete()

> **complete**(`messages`, `options`): `Promise`\<[`CompleteResult`](CompleteResult.md)\>

Defined in: providers/src/types.ts:74

#### Parameters

##### messages

`object`[]

##### options

[`CompleteOptions`](CompleteOptions.md)

#### Returns

`Promise`\<[`CompleteResult`](CompleteResult.md)\>

---

### stream()

> **stream**(`messages`, `options`): `AsyncIterable`\<[`StreamChunk`](../type-aliases/StreamChunk.md)\>

Defined in: providers/src/types.ts:75

#### Parameters

##### messages

`object`[]

##### options

[`CompleteOptions`](CompleteOptions.md)

#### Returns

`AsyncIterable`\<[`StreamChunk`](../type-aliases/StreamChunk.md)\>
