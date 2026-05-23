[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [providers/src](../README.md) / CircuitBreaker

# Class: CircuitBreaker

Defined in: providers/src/router/circuit-breaker.ts:23

## Constructors

### Constructor

> **new CircuitBreaker**(`config`): `CircuitBreaker`

Defined in: providers/src/router/circuit-breaker.ts:29

#### Parameters

##### config

[`CircuitBreakerConfig`](../interfaces/CircuitBreakerConfig.md)

#### Returns

`CircuitBreaker`

## Methods

### canExecute()

> **canExecute**(): `boolean`

Defined in: providers/src/router/circuit-breaker.ts:33

#### Returns

`boolean`

---

### recordFailure()

> **recordFailure**(): `void`

Defined in: providers/src/router/circuit-breaker.ts:51

#### Returns

`void`

---

### recordSuccess()

> **recordSuccess**(): `void`

Defined in: providers/src/router/circuit-breaker.ts:45

#### Returns

`void`

---

### reset()

> **reset**(): `void`

Defined in: providers/src/router/circuit-breaker.ts:59

#### Returns

`void`

---

### snapshot()

> **snapshot**(): [`CircuitBreakerSnapshot`](../interfaces/CircuitBreakerSnapshot.md)

Defined in: providers/src/router/circuit-breaker.ts:65

#### Returns

[`CircuitBreakerSnapshot`](../interfaces/CircuitBreakerSnapshot.md)
