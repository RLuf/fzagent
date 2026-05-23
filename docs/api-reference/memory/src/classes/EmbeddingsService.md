[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [memory/src](../README.md) / EmbeddingsService

# Class: EmbeddingsService

Defined in: memory/src/embeddings/service.ts:34

## Constructors

### Constructor

> **new EmbeddingsService**(`opts?`): `EmbeddingsService`

Defined in: memory/src/embeddings/service.ts:44

#### Parameters

##### opts?

[`EmbeddingsServiceOptions`](../interfaces/EmbeddingsServiceOptions.md) = `{}`

#### Returns

`EmbeddingsService`

## Methods

### cacheStats()

> **cacheStats**(): `object`

Defined in: memory/src/embeddings/service.ts:117

#### Returns

`object`

##### maxSize

> **maxSize**: `number`

##### size

> **size**: `number`

---

### embed()

> **embed**(`text`): `Promise`\<`number`[]\>

Defined in: memory/src/embeddings/service.ts:78

#### Parameters

##### text

`string`

#### Returns

`Promise`\<`number`[]\>

---

### embedBatch()

> **embedBatch**(`texts`): `Promise`\<`number`[][]\>

Defined in: memory/src/embeddings/service.ts:111

#### Parameters

##### texts

`string`[]

#### Returns

`Promise`\<`number`[][]\>

---

### ensureReady()

> **ensureReady**(): `Promise`\<`void`\>

Defined in: memory/src/embeddings/service.ts:53

#### Returns

`Promise`\<`void`\>
