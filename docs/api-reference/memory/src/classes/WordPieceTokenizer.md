[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [memory/src](../README.md) / WordPieceTokenizer

# Class: WordPieceTokenizer

Defined in: memory/src/embeddings/tokenizer.ts:44

## Constructors

### Constructor

> **new WordPieceTokenizer**(`opts`): `WordPieceTokenizer`

Defined in: memory/src/embeddings/tokenizer.ts:53

#### Parameters

##### opts

[`TokenizerOptions`](../interfaces/TokenizerOptions.md)

#### Returns

`WordPieceTokenizer`

## Properties

### clsId

> `readonly` **clsId**: `number`

Defined in: memory/src/embeddings/tokenizer.ts:47

---

### doLowerCase

> `readonly` **doLowerCase**: `boolean`

Defined in: memory/src/embeddings/tokenizer.ts:51

---

### maxLength

> `readonly` **maxLength**: `number`

Defined in: memory/src/embeddings/tokenizer.ts:46

---

### padId

> `readonly` **padId**: `number`

Defined in: memory/src/embeddings/tokenizer.ts:49

---

### sepId

> `readonly` **sepId**: `number`

Defined in: memory/src/embeddings/tokenizer.ts:48

---

### unkId

> `readonly` **unkId**: `number`

Defined in: memory/src/embeddings/tokenizer.ts:50

## Methods

### encode()

> **encode**(`text`): [`Encoded`](../interfaces/Encoded.md)

Defined in: memory/src/embeddings/tokenizer.ts:77

#### Parameters

##### text

`string`

#### Returns

[`Encoded`](../interfaces/Encoded.md)
