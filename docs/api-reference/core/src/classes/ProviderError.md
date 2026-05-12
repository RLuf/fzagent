[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [core/src](../README.md) / ProviderError

# Class: ProviderError

Defined in: core/src/errors/index.ts:28

## Extends

- [`FzagentError`](FzagentError.md)

## Constructors

### Constructor

> **new ProviderError**(`message`, `provider`, `options?`): `ProviderError`

Defined in: core/src/errors/index.ts:31

#### Parameters

##### message

`string`

##### provider

`string`

##### options?

###### cause?

`unknown`

#### Returns

`ProviderError`

#### Overrides

[`FzagentError`](FzagentError.md).[`constructor`](FzagentError.md#constructor)

## Properties

### code

> `readonly` **code**: `string`

Defined in: core/src/errors/index.ts:6

#### Inherited from

[`FzagentError`](FzagentError.md).[`code`](FzagentError.md#code)

---

### name

> `readonly` **name**: `"ProviderError"` = `'ProviderError'`

Defined in: core/src/errors/index.ts:29

#### Overrides

[`FzagentError`](FzagentError.md).[`name`](FzagentError.md#name)

---

### provider

> `readonly` **provider**: `string`

Defined in: core/src/errors/index.ts:30
