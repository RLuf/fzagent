[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [providers/src](../README.md) / MockBehavior

# Interface: MockBehavior

Defined in: providers/src/adapters/mock.ts:9

## Properties

### error?

> `optional` **error?**: `unknown`

Defined in: providers/src/adapters/mock.ts:14

---

### fn?

> `optional` **fn?**: (`messages`, `options`) => [`CompleteResult`](CompleteResult.md) \| `Promise`\<[`CompleteResult`](CompleteResult.md)\>

Defined in: providers/src/adapters/mock.ts:12

#### Parameters

##### messages

`object`[]

##### options

[`CompleteOptions`](CompleteOptions.md)

#### Returns

[`CompleteResult`](CompleteResult.md) \| `Promise`\<[`CompleteResult`](CompleteResult.md)\>

---

### responses?

> `optional` **responses?**: [`CompleteResult`](CompleteResult.md)[]

Defined in: providers/src/adapters/mock.ts:11

---

### streamChunks?

> `optional` **streamChunks?**: [`StreamChunk`](../type-aliases/StreamChunk.md)[]

Defined in: providers/src/adapters/mock.ts:16

---

### supportsTools?

> `optional` **supportsTools?**: `boolean`

Defined in: providers/src/adapters/mock.ts:19
