[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [core/src](../README.md) / FzagentError

# Class: FzagentError

Defined in: core/src/errors/index.ts:4

## Extends

- `Error`

## Extended by

- [`ConfigError`](ConfigError.md)
- [`ValidationError`](ValidationError.md)
- [`ProviderError`](ProviderError.md)
- [`CircuitBreakerError`](CircuitBreakerError.md)
- [`BudgetExceededError`](BudgetExceededError.md)

## Constructors

### Constructor

> **new FzagentError**(`message`, `code?`, `options?`): `FzagentError`

Defined in: core/src/errors/index.ts:8

#### Parameters

##### message

`string`

##### code?

`string` = `'FZ_GENERIC'`

##### options?

###### cause?

`unknown`

#### Returns

`FzagentError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: `string`

Defined in: core/src/errors/index.ts:6

---

### name

> `readonly` **name**: `string` = `'FzagentError'`

Defined in: core/src/errors/index.ts:5

#### Overrides

`Error.name`
