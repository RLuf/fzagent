[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [providers/src](../README.md) / AnthropicProvider

# Class: AnthropicProvider

Defined in: providers/src/adapters/anthropic.ts:100

## Extends

- [`BaseLLMProvider`](BaseLLMProvider.md)

## Constructors

### Constructor

> **new AnthropicProvider**(`opts`): `AnthropicProvider`

Defined in: providers/src/adapters/anthropic.ts:106

#### Parameters

##### opts

`AnthropicAdapterOptions`

#### Returns

`AnthropicProvider`

#### Overrides

[`BaseLLMProvider`](BaseLLMProvider.md).[`constructor`](BaseLLMProvider.md#constructor)

## Properties

### config

> `protected` `readonly` **config**: `object`

Defined in: providers/src/base.ts:25

#### Inherited from

[`BaseLLMProvider`](BaseLLMProvider.md).[`config`](BaseLLMProvider.md#config)

---

### defaultTimeoutMs

> `protected` `readonly` **defaultTimeoutMs**: `number`

Defined in: providers/src/base.ts:27

#### Inherited from

[`BaseLLMProvider`](BaseLLMProvider.md).[`defaultTimeoutMs`](BaseLLMProvider.md#defaulttimeoutms)

---

### logger

> `protected` `readonly` **logger**: `FzagentLogger`

Defined in: providers/src/base.ts:26

#### Inherited from

[`BaseLLMProvider`](BaseLLMProvider.md).[`logger`](BaseLLMProvider.md#logger)

---

### models

> `readonly` **models**: readonly `string`[]

Defined in: providers/src/adapters/anthropic.ts:102

#### Overrides

[`BaseLLMProvider`](BaseLLMProvider.md).[`models`](BaseLLMProvider.md#models)

---

### name

> `readonly` **name**: `"anthropic"`

Defined in: providers/src/adapters/anthropic.ts:101

#### Overrides

[`BaseLLMProvider`](BaseLLMProvider.md).[`name`](BaseLLMProvider.md#name)

---

### supportsTools

> `readonly` **supportsTools**: `boolean` = `true`

Defined in: providers/src/base.ts:23

#### Inherited from

[`BaseLLMProvider`](BaseLLMProvider.md).[`supportsTools`](BaseLLMProvider.md#supportstools)

## Methods

### complete()

> **complete**(`messages`, `options`): `Promise`\<[`CompleteResult`](../interfaces/CompleteResult.md)\>

Defined in: providers/src/adapters/anthropic.ts:121

#### Parameters

##### messages

`object`[]

##### options

[`CompleteOptions`](../interfaces/CompleteOptions.md)

#### Returns

`Promise`\<[`CompleteResult`](../interfaces/CompleteResult.md)\>

#### Overrides

[`BaseLLMProvider`](BaseLLMProvider.md).[`complete`](BaseLLMProvider.md#complete)

---

### stream()

> **stream**(`messages`, `options`): `AsyncIterable`\<[`StreamChunk`](../type-aliases/StreamChunk.md)\>

Defined in: providers/src/adapters/anthropic.ts:191

#### Parameters

##### messages

`object`[]

##### options

[`CompleteOptions`](../interfaces/CompleteOptions.md)

#### Returns

`AsyncIterable`\<[`StreamChunk`](../type-aliases/StreamChunk.md)\>

#### Overrides

[`BaseLLMProvider`](BaseLLMProvider.md).[`stream`](BaseLLMProvider.md#stream)
