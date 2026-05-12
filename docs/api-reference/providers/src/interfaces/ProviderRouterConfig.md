[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [providers/src](../README.md) / ProviderRouterConfig

# Interface: ProviderRouterConfig

Defined in: providers/src/router/index.ts:19

## Properties

### baseDelayMs?

> `optional` **baseDelayMs?**: `number`

Defined in: providers/src/router/index.ts:28

---

### circuitBreakerCooldownMs?

> `optional` **circuitBreakerCooldownMs?**: `number`

Defined in: providers/src/router/index.ts:32

---

### circuitBreakerMaxFailures?

> `optional` **circuitBreakerMaxFailures?**: `number`

Defined in: providers/src/router/index.ts:31

---

### eventBus?

> `optional` **eventBus?**: `FzagentEventBus`

Defined in: providers/src/router/index.ts:25

---

### fallbackOrder

> **fallbackOrder**: (`"anthropic"` \| `"openai"` \| `"google"` \| `"openrouter"` \| `"ollama"`)[]

Defined in: providers/src/router/index.ts:22

---

### logger

> **logger**: `FzagentLogger`

Defined in: providers/src/router/index.ts:23

---

### maxAttemptsPerProvider?

> `optional` **maxAttemptsPerProvider?**: `number`

Defined in: providers/src/router/index.ts:27

---

### maxDelayMs?

> `optional` **maxDelayMs?**: `number`

Defined in: providers/src/router/index.ts:29

---

### now?

> `optional` **now?**: () => `number`

Defined in: providers/src/router/index.ts:34

#### Returns

`number`

---

### providers

> **providers**: [`LLMProvider`](LLMProvider.md)[]

Defined in: providers/src/router/index.ts:20
