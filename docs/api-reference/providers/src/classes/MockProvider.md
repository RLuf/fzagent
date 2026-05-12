[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [providers/src](../README.md) / MockProvider

# Class: MockProvider

Defined in: providers/src/adapters/mock.ts:22

## Implements

- [`LLMProvider`](../interfaces/LLMProvider.md)

## Constructors

### Constructor

> **new MockProvider**(`name`, `models?`, `behavior?`): `MockProvider`

Defined in: providers/src/adapters/mock.ts:30

#### Parameters

##### name

`"anthropic"` \| `"openai"` \| `"google"` \| `"openrouter"` \| `"ollama"`

##### models?

readonly `string`[] = `...`

##### behavior?

[`MockBehavior`](../interfaces/MockBehavior.md) = `{}`

#### Returns

`MockProvider`

## Properties

### callCount

> **callCount**: `number` = `0`

Defined in: providers/src/adapters/mock.ts:26

---

### lastMessages

> **lastMessages**: `object`[] = `[]`

Defined in: providers/src/adapters/mock.ts:27

---

### lastOptions

> **lastOptions**: [`CompleteOptions`](../interfaces/CompleteOptions.md) \| `undefined`

Defined in: providers/src/adapters/mock.ts:28

---

### models

> `readonly` **models**: readonly `string`[]

Defined in: providers/src/adapters/mock.ts:24

#### Implementation of

[`LLMProvider`](../interfaces/LLMProvider.md).[`models`](../interfaces/LLMProvider.md#models)

---

### name

> `readonly` **name**: `"anthropic"` \| `"openai"` \| `"google"` \| `"openrouter"` \| `"ollama"`

Defined in: providers/src/adapters/mock.ts:23

#### Implementation of

[`LLMProvider`](../interfaces/LLMProvider.md).[`name`](../interfaces/LLMProvider.md#name)

---

### supportsTools

> `readonly` **supportsTools**: `boolean`

Defined in: providers/src/adapters/mock.ts:25

#### Implementation of

[`LLMProvider`](../interfaces/LLMProvider.md).[`supportsTools`](../interfaces/LLMProvider.md#supportstools)

## Methods

### complete()

> **complete**(`messages`, `options`): `Promise`\<[`CompleteResult`](../interfaces/CompleteResult.md)\>

Defined in: providers/src/adapters/mock.ts:40

#### Parameters

##### messages

`object`[]

##### options

[`CompleteOptions`](../interfaces/CompleteOptions.md)

#### Returns

`Promise`\<[`CompleteResult`](../interfaces/CompleteResult.md)\>

#### Implementation of

[`LLMProvider`](../interfaces/LLMProvider.md).[`complete`](../interfaces/LLMProvider.md#complete)

---

### stream()

> **stream**(`_messages`, `_options`): `AsyncIterable`\<[`StreamChunk`](../type-aliases/StreamChunk.md)\>

Defined in: providers/src/adapters/mock.ts:57

#### Parameters

##### \_messages

`object`[]

##### \_options

[`CompleteOptions`](../interfaces/CompleteOptions.md)

#### Returns

`AsyncIterable`\<[`StreamChunk`](../type-aliases/StreamChunk.md)\>

#### Implementation of

[`LLMProvider`](../interfaces/LLMProvider.md).[`stream`](../interfaces/LLMProvider.md#stream)
