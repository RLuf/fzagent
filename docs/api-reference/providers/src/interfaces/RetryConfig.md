[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [providers/src](../README.md) / RetryConfig

# Interface: RetryConfig

Defined in: providers/src/router/retry.ts:7

## Properties

### baseDelayMs

> **baseDelayMs**: `number`

Defined in: providers/src/router/retry.ts:9

---

### factor?

> `optional` **factor?**: `number`

Defined in: providers/src/router/retry.ts:11

---

### isRetryable?

> `optional` **isRetryable?**: (`error`) => `boolean`

Defined in: providers/src/router/retry.ts:13

#### Parameters

##### error

`unknown`

#### Returns

`boolean`

---

### jitter?

> `optional` **jitter?**: `boolean`

Defined in: providers/src/router/retry.ts:12

---

### maxAttempts

> **maxAttempts**: `number`

Defined in: providers/src/router/retry.ts:8

---

### maxDelayMs

> **maxDelayMs**: `number`

Defined in: providers/src/router/retry.ts:10

---

### random?

> `optional` **random?**: () => `number`

Defined in: providers/src/router/retry.ts:16

#### Returns

`number`

---

### sleep?

> `optional` **sleep?**: (`ms`) => `Promise`\<`void`\>

Defined in: providers/src/router/retry.ts:15

#### Parameters

##### ms

`number`

#### Returns

`Promise`\<`void`\>
