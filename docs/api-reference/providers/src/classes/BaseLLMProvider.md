[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [providers/src](../README.md) / BaseLLMProvider

# Abstract Class: BaseLLMProvider

Defined in: providers/src/base.ts:18

## Extended by

- [`AnthropicProvider`](AnthropicProvider.md)
- [`GoogleProvider`](GoogleProvider.md)
- [`OllamaProvider`](OllamaProvider.md)

## Implements

- [`LLMProvider`](../interfaces/LLMProvider.md)

## Constructors

### Constructor

> **new BaseLLMProvider**(`opts`): `BaseLLMProvider`

Defined in: providers/src/base.ts:29

#### Parameters

##### opts

[`BaseProviderOptions`](../interfaces/BaseProviderOptions.md)

#### Returns

`BaseLLMProvider`

## Properties

### config

> `protected` `readonly` **config**: `object`

Defined in: providers/src/base.ts:25

---

### defaultTimeoutMs

> `protected` `readonly` **defaultTimeoutMs**: `number`

Defined in: providers/src/base.ts:27

---

### logger

> `protected` `readonly` **logger**: `FzagentLogger`

Defined in: providers/src/base.ts:26

---

### models

> `abstract` `readonly` **models**: readonly `string`[]

Defined in: providers/src/base.ts:20

#### Implementation of

[`LLMProvider`](../interfaces/LLMProvider.md).[`models`](../interfaces/LLMProvider.md#models)

---

### name

> `abstract` `readonly` **name**: `"anthropic"` \| `"openai"` \| `"google"` \| `"openrouter"` \| `"ollama"`

Defined in: providers/src/base.ts:19

#### Implementation of

[`LLMProvider`](../interfaces/LLMProvider.md).[`name`](../interfaces/LLMProvider.md#name)

---

### supportsTools

> `readonly` **supportsTools**: `boolean` = `true`

Defined in: providers/src/base.ts:23

#### Implementation of

[`LLMProvider`](../interfaces/LLMProvider.md).[`supportsTools`](../interfaces/LLMProvider.md#supportstools)

## Methods

### complete()

> `abstract` **complete**(`messages`, `options`): `Promise`\<[`CompleteResult`](../interfaces/CompleteResult.md)\>

Defined in: providers/src/base.ts:35

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

> `abstract` **stream**(`messages`, `options`): `AsyncIterable`\<[`StreamChunk`](../type-aliases/StreamChunk.md)\>

Defined in: providers/src/base.ts:37

#### Parameters

##### messages

`object`[]

##### options

[`CompleteOptions`](../interfaces/CompleteOptions.md)

#### Returns

`AsyncIterable`\<[`StreamChunk`](../type-aliases/StreamChunk.md)\>

#### Implementation of

[`LLMProvider`](../interfaces/LLMProvider.md).[`stream`](../interfaces/LLMProvider.md#stream)
