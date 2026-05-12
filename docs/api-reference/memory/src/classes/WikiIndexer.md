[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [memory/src](../README.md) / WikiIndexer

# Class: WikiIndexer

Defined in: memory/src/indexer/indexer.ts:54

## Constructors

### Constructor

> **new WikiIndexer**(`opts`): `WikiIndexer`

Defined in: memory/src/indexer/indexer.ts:58

#### Parameters

##### opts

[`WikiIndexerOptions`](../interfaces/WikiIndexerOptions.md)

#### Returns

`WikiIndexer`

## Methods

### addLink()

> **addLink**(`srcPageId`, `anchorText`): `void`

Defined in: memory/src/indexer/indexer.ts:177

#### Parameters

##### srcPageId

`string`

##### anchorText

`string`

#### Returns

`void`

---

### clearLinksOf()

> **clearLinksOf**(`srcPageId`): `void`

Defined in: memory/src/indexer/indexer.ts:188

#### Parameters

##### srcPageId

`string`

#### Returns

`void`

---

### close()

> **close**(): `void`

Defined in: memory/src/indexer/indexer.ts:64

#### Returns

`void`

---

### deletePage()

> **deletePage**(`id`): `boolean`

Defined in: memory/src/indexer/indexer.ts:143

#### Parameters

##### id

`string`

#### Returns

`boolean`

---

### getPage()

> **getPage**(`id`): \{ \} \| `null`

Defined in: memory/src/indexer/indexer.ts:122

#### Parameters

##### id

`string`

#### Returns

\{ \} \| `null`

---

### getPageByPath()

> **getPageByPath**(`path`): \{ \} \| `null`

Defined in: memory/src/indexer/indexer.ts:129

#### Parameters

##### path

`string`

#### Returns

\{ \} \| `null`

---

### getPageBySlug()

> **getPageBySlug**(`slug`): \{ \} \| `null`

Defined in: memory/src/indexer/indexer.ts:136

#### Parameters

##### slug

`string`

#### Returns

\{ \} \| `null`

---

### getTags()

> **getTags**(`pageId`): `string`[]

Defined in: memory/src/indexer/indexer.ts:166

#### Parameters

##### pageId

`string`

#### Returns

`string`[]

---

### lint()

> **lint**(): [`LintReport`](../interfaces/LintReport.md)

Defined in: memory/src/indexer/indexer.ts:232

#### Returns

[`LintReport`](../interfaces/LintReport.md)

---

### log()

> **log**(`kind`, `payload?`): `void`

Defined in: memory/src/indexer/indexer.ts:202

#### Parameters

##### kind

`string`

##### payload?

`Record`\<`string`, `unknown`\> = `{}`

#### Returns

`void`

---

### recordSource()

> **recordSource**(`rawPath`, `sha256`, `pageId`): `number`

Defined in: memory/src/indexer/indexer.ts:193

#### Parameters

##### rawPath

`string`

##### sha256

`string`

##### pageId

`string` \| `null`

#### Returns

`number`

---

### replaceTags()

> **replaceTags**(`pageId`, `tags`): `void`

Defined in: memory/src/indexer/indexer.ts:147

#### Parameters

##### pageId

`string`

##### tags

`string`[]

#### Returns

`void`

---

### search()

> **search**(`query`, `limit?`): [`WikiSearchResult`](../interfaces/WikiSearchResult.md)[]

Defined in: memory/src/indexer/indexer.ts:208

#### Parameters

##### query

`string`

##### limit?

`number` = `20`

#### Returns

[`WikiSearchResult`](../interfaces/WikiSearchResult.md)[]

---

### stats()

> **stats**(): [`WikiIndexerStats`](../interfaces/WikiIndexerStats.md)

Defined in: memory/src/indexer/indexer.ts:260

#### Returns

[`WikiIndexerStats`](../interfaces/WikiIndexerStats.md)

---

### upsertPage()

> **upsertPage**(`input`): `object`

Defined in: memory/src/indexer/indexer.ts:68

#### Parameters

##### input

[`InsertPageInput`](../interfaces/InsertPageInput.md)

#### Returns

`object`

---

### sha256()

> `static` **sha256**(`content`): `string`

Defined in: memory/src/indexer/indexer.ts:282

#### Parameters

##### content

`string` \| `Buffer`\<`ArrayBufferLike`\>

#### Returns

`string`

---

### slugify()

> `static` **slugify**(`text`): `string`

Defined in: memory/src/indexer/indexer.ts:272

#### Parameters

##### text

`string`

#### Returns

`string`
