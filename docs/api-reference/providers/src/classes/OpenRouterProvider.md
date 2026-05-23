[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [providers/src](../README.md) / OpenRouterProvider

# Class: OpenRouterProvider

Defined in: providers/src/adapters/openrouter.ts:37

## Extends

- `OpenAIProtocolProvider`

## Constructors

### Constructor

> **new OpenRouterProvider**(`opts`): `OpenRouterProvider`

Defined in: providers/src/adapters/openrouter.ts:44

#### Parameters

##### opts

[`BaseProviderOptions`](../interfaces/BaseProviderOptions.md)

#### Returns

`OpenRouterProvider`

#### Overrides

`OpenAIProtocolProvider.constructor`

## Properties

### client

> `protected` `readonly` **client**: `OpenAI`

Defined in: providers/src/adapters/openrouter.ts:40

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

Defined in: providers/src/adapters/openrouter.ts:39

#### Overrides

`OpenAIProtocolProvider.models`

---

### name

> `readonly` **name**: `"openrouter"`

Defined in: providers/src/adapters/openrouter.ts:38

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

Defined in: providers/src/adapters/openai.ts:36

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

### listAllModels()

> **listAllModels**(`signal?`): `Promise`\<`OpenRouterModelEntry`[]\>

Defined in: providers/src/adapters/openrouter.ts:66

#### Parameters

##### signal?

`AbortSignal`

#### Returns

`Promise`\<`OpenRouterModelEntry`[]\>

---

### listFreeModels()

> **listFreeModels**(`signal?`): `Promise`\<`string`[]\>

Defined in: providers/src/adapters/openrouter.ts:81

#### Parameters

##### signal?

`AbortSignal`

#### Returns

`Promise`\<`string`[]\>

---

### stream()

> **stream**(`messages`, `options`): `AsyncIterable`\<[`StreamChunk`](../type-aliases/StreamChunk.md)\>

Defined in: providers/src/adapters/openai.ts:105

#### Parameters

##### messages

`object`[]

##### options

[`CompleteOptions`](../interfaces/CompleteOptions.md)

#### Returns

`AsyncIterable`\<[`StreamChunk`](../type-aliases/StreamChunk.md)\>

#### Inherited from

`OpenAIProtocolProvider.stream`
