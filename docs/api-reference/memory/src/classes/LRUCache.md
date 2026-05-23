[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [memory/src](../README.md) / LRUCache

# Class: LRUCache\<K, V\>

Defined in: memory/src/lru-cache.ts:7

## Type Parameters

### K

`K`

### V

`V`

## Constructors

### Constructor

> **new LRUCache**\<`K`, `V`\>(`maxSize`): `LRUCache`\<`K`, `V`\>

Defined in: memory/src/lru-cache.ts:10

#### Parameters

##### maxSize

`number`

#### Returns

`LRUCache`\<`K`, `V`\>

## Properties

### maxSize

> `readonly` **maxSize**: `number`

Defined in: memory/src/lru-cache.ts:10

## Accessors

### size

#### Get Signature

> **get** **size**(): `number`

Defined in: memory/src/lru-cache.ts:48

##### Returns

`number`

## Methods

### clear()

> **clear**(): `void`

Defined in: memory/src/lru-cache.ts:44

#### Returns

`void`

---

### delete()

> **delete**(`key`): `boolean`

Defined in: memory/src/lru-cache.ts:40

#### Parameters

##### key

`K`

#### Returns

`boolean`

---

### get()

> **get**(`key`): `V` \| `undefined`

Defined in: memory/src/lru-cache.ts:16

#### Parameters

##### key

`K`

#### Returns

`V` \| `undefined`

---

### has()

> **has**(`key`): `boolean`

Defined in: memory/src/lru-cache.ts:25

#### Parameters

##### key

`K`

#### Returns

`boolean`

---

### set()

> **set**(`key`, `value`): `void`

Defined in: memory/src/lru-cache.ts:29

#### Parameters

##### key

`K`

##### value

`V`

#### Returns

`void`
