[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [memory/src](../README.md) / QdrantWrapper

# Class: QdrantWrapper

Defined in: memory/src/qdrant/client.ts:60

## Constructors

### Constructor

> **new QdrantWrapper**(`opts`): `QdrantWrapper`

Defined in: memory/src/qdrant/client.ts:66

#### Parameters

##### opts

[`QdrantWrapperOptions`](../interfaces/QdrantWrapperOptions.md)

#### Returns

`QdrantWrapper`

## Properties

### dim

> `readonly` **dim**: `number`

Defined in: memory/src/qdrant/client.ts:63

---

### threshold

> `readonly` **threshold**: `number`

Defined in: memory/src/qdrant/client.ts:64

## Methods

### deletePoint()

> **deletePoint**(`collection`, `id`): `Promise`\<`void`\>

Defined in: memory/src/qdrant/client.ts:167

#### Parameters

##### collection

`string`

##### id

`string` \| `number`

#### Returns

`Promise`\<`void`\>

---

### ensureCollections()

> **ensureCollections**(`collections?`): `Promise`\<`void`\>

Defined in: memory/src/qdrant/client.ts:81

#### Parameters

##### collections?

readonly `string`[] = `FZAGENT_COLLECTIONS`

#### Returns

`Promise`\<`void`\>

---

### listCollectionNames()

> **listCollectionNames**(): `Promise`\<`Set`\<`string`\>\>

Defined in: memory/src/qdrant/client.ts:105

#### Returns

`Promise`\<`Set`\<`string`\>\>

---

### recreateCollection()

> **recreateCollection**(`name`): `Promise`\<`void`\>

Defined in: memory/src/qdrant/client.ts:93

#### Parameters

##### name

`string`

#### Returns

`Promise`\<`void`\>

---

### search()

> **search**(`collection`, `vector`, `opts?`): `Promise`\<[`QdrantSearchResult`](../interfaces/QdrantSearchResult.md)[]\>

Defined in: memory/src/qdrant/client.ts:145

#### Parameters

##### collection

`string`

##### vector

`number`[]

##### opts?

###### filter?

`Record`\<`string`, `unknown`\>

###### limit?

`number`

###### threshold?

`number`

#### Returns

`Promise`\<[`QdrantSearchResult`](../interfaces/QdrantSearchResult.md)[]\>

---

### upsertBatch()

> **upsertBatch**(`collection`, `inputs`): `Promise`\<`void`\>

Defined in: memory/src/qdrant/client.ts:128

#### Parameters

##### collection

`string`

##### inputs

[`UpsertInput`](../interfaces/UpsertInput.md)[]

#### Returns

`Promise`\<`void`\>

---

### upsertPoint()

> **upsertPoint**(`collection`, `input`): `Promise`\<`void`\>

Defined in: memory/src/qdrant/client.ts:111

#### Parameters

##### collection

`string`

##### input

[`UpsertInput`](../interfaces/UpsertInput.md)

#### Returns

`Promise`\<`void`\>

---

### validate()

> **validate**(): `Promise`\<[`CollectionStats`](../interfaces/CollectionStats.md)[]\>

Defined in: memory/src/qdrant/client.ts:172

#### Returns

`Promise`\<[`CollectionStats`](../interfaces/CollectionStats.md)[]\>
