[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [providers/src](../README.md) / TimeoutError

# Class: TimeoutError

Defined in: providers/src/utils/fetch.ts:29

## Extends

- `Error`

## Constructors

### Constructor

> **new TimeoutError**(`provider`, `timeoutMs`): `TimeoutError`

Defined in: providers/src/utils/fetch.ts:35

#### Parameters

##### provider

`string`

##### timeoutMs

`number`

#### Returns

`TimeoutError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: `"ETIMEDOUT"` = `'ETIMEDOUT'`

Defined in: providers/src/utils/fetch.ts:31

---

### name

> `readonly` **name**: `"TimeoutError"` = `'TimeoutError'`

Defined in: providers/src/utils/fetch.ts:30

#### Overrides

`Error.name`

---

### provider

> `readonly` **provider**: `string`

Defined in: providers/src/utils/fetch.ts:32

---

### timeoutMs

> `readonly` **timeoutMs**: `number`

Defined in: providers/src/utils/fetch.ts:33
