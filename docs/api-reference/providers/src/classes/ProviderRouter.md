[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [providers/src](../README.md) / ProviderRouter

# Class: ProviderRouter

Defined in: providers/src/router/index.ts:37

## Constructors

### Constructor

> **new ProviderRouter**(`config`): `ProviderRouter`

Defined in: providers/src/router/index.ts:46

#### Parameters

##### config

[`ProviderRouterConfig`](../interfaces/ProviderRouterConfig.md)

#### Returns

`ProviderRouter`

## Methods

### complete()

> **complete**(`messages`, `options`): `Promise`\<[`CompleteResult`](../interfaces/CompleteResult.md)\>

Defined in: providers/src/router/index.ts:78

#### Parameters

##### messages

`object`[]

##### options

[`CompleteOptions`](../interfaces/CompleteOptions.md)

#### Returns

`Promise`\<[`CompleteResult`](../interfaces/CompleteResult.md)\>

---

### getCircuitBreakerSnapshots()

> **getCircuitBreakerSnapshots**(): `Record`\<`string`, `ReturnType`\<[`CircuitBreaker`](CircuitBreaker.md)\[`"snapshot"`\]\>\>

Defined in: providers/src/router/index.ts:70

#### Returns

`Record`\<`string`, `ReturnType`\<[`CircuitBreaker`](CircuitBreaker.md)\[`"snapshot"`\]\>\>

---

### getProviderNames()

> **getProviderNames**(): (`"anthropic"` \| `"openai"` \| `"google"` \| `"openrouter"` \| `"ollama"`)[]

Defined in: providers/src/router/index.ts:66

#### Returns

(`"anthropic"` \| `"openai"` \| `"google"` \| `"openrouter"` \| `"ollama"`)[]

---

### stream()

> **stream**(`messages`, `options`): `AsyncIterable`\<[`StreamChunk`](../type-aliases/StreamChunk.md)\>

Defined in: providers/src/router/index.ts:155

#### Parameters

##### messages

`object`[]

##### options

[`CompleteOptions`](../interfaces/CompleteOptions.md)

#### Returns

`AsyncIterable`\<[`StreamChunk`](../type-aliases/StreamChunk.md)\>
