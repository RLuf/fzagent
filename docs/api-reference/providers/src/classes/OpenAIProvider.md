[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [providers/src](../README.md) / OpenAIProvider

# Class: OpenAIProvider

Defined in: providers/src/adapters/openai.ts:184

## Extends

- `OpenAIProtocolProvider`

## Constructors

### Constructor

> **new OpenAIProvider**(`opts`): `OpenAIProvider`

Defined in: providers/src/adapters/openai.ts:189

#### Parameters

##### opts

[`BaseProviderOptions`](../interfaces/BaseProviderOptions.md)

#### Returns

`OpenAIProvider`

#### Overrides

`OpenAIProtocolProvider.constructor`

## Properties

### client

> `protected` `readonly` **client**: `OpenAI`

Defined in: providers/src/adapters/openai.ts:187

#### Overrides

`OpenAIProtocolProvider.client`

---

### config

> `protected` `readonly` **config**: `object`

Defined in: providers/src/base.ts:25

#### Inherited from

`OpenAIProtocolProvider.config`

---

### defaultTimeoutMs

> `protected` `readonly` **defaultTimeoutMs**: `number`

Defined in: providers/src/base.ts:27

#### Inherited from

`OpenAIProtocolProvider.defaultTimeoutMs`

---

### logger

> `protected` `readonly` **logger**: `FzagentLogger`

Defined in: providers/src/base.ts:26

#### Inherited from

`OpenAIProtocolProvider.logger`

---

### models

> `readonly` **models**: readonly `string`[]

Defined in: providers/src/adapters/openai.ts:186

#### Overrides

`OpenAIProtocolProvider.models`

---

### name

> `readonly` **name**: `"openai"`

Defined in: providers/src/adapters/openai.ts:185

#### Overrides

`OpenAIProtocolProvider.name`

---

### supportsTools

> `readonly` **supportsTools**: `boolean` = `true`

Defined in: providers/src/base.ts:23

#### Inherited from

`OpenAIProtocolProvider.supportsTools`

## Methods

### complete()

> **complete**(`messages`, `options`): `Promise`\<[`CompleteResult`](../interfaces/CompleteResult.md)\>

Defined in: providers/src/adapters/openai.ts:35

#### Parameters

##### messages

`object`[]

##### options

[`CompleteOptions`](../interfaces/CompleteOptions.md)

#### Returns

`Promise`\<[`CompleteResult`](../interfaces/CompleteResult.md)\>

#### Inherited from

`OpenAIProtocolProvider.complete`

---

### stream()

> **stream**(`messages`, `options`): `AsyncIterable`\<[`StreamChunk`](../type-aliases/StreamChunk.md)\>

Defined in: providers/src/adapters/openai.ts:98

#### Parameters

##### messages

`object`[]

##### options

[`CompleteOptions`](../interfaces/CompleteOptions.md)

#### Returns

`AsyncIterable`\<[`StreamChunk`](../type-aliases/StreamChunk.md)\>

#### Inherited from

`OpenAIProtocolProvider.stream`
