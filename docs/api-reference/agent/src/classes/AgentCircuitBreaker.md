[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [agent/src](../README.md) / AgentCircuitBreaker

# Class: AgentCircuitBreaker

Defined in: agent/src/circuit-breaker.ts:21

## Constructors

### Constructor

> **new AgentCircuitBreaker**(`config`): `AgentCircuitBreaker`

Defined in: agent/src/circuit-breaker.ts:27

#### Parameters

##### config

[`AgentCircuitBreakerConfig`](../interfaces/AgentCircuitBreakerConfig.md)

#### Returns

`AgentCircuitBreaker`

## Methods

### canProceed()

> **canProceed**(): `boolean`

Defined in: agent/src/circuit-breaker.ts:31

#### Returns

`boolean`

---

### recordFailure()

> **recordFailure**(): `void`

Defined in: agent/src/circuit-breaker.ts:48

#### Returns

`void`

---

### recordSuccess()

> **recordSuccess**(): `void`

Defined in: agent/src/circuit-breaker.ts:42

#### Returns

`void`

---

### snapshot()

> **snapshot**(): [`AgentCircuitBreakerSnapshot`](../interfaces/AgentCircuitBreakerSnapshot.md)

Defined in: agent/src/circuit-breaker.ts:56

#### Returns

[`AgentCircuitBreakerSnapshot`](../interfaces/AgentCircuitBreakerSnapshot.md)
