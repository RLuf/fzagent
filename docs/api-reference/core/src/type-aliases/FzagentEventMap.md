[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [core/src](../README.md) / FzagentEventMap

# Type Alias: FzagentEventMap

> **FzagentEventMap** = `object`

Defined in: core/src/events/index.ts:14

## Properties

### agent.budget-exceeded

> **agent.budget-exceeded**: `object`

Defined in: core/src/events/index.ts:31

#### agentId

> **agentId**: `string`

#### sessionId

> **sessionId**: `string`

#### tokensUsed

> **tokensUsed**: `number`

---

### agent.circuit-breaker-tripped

> **agent.circuit-breaker-tripped**: `object`

Defined in: core/src/events/index.ts:32

#### agentId

> **agentId**: `string`

#### failures

> **failures**: `number`

#### sessionId

> **sessionId**: `string`

---

### agent.iteration

> **agent.iteration**: `object`

Defined in: core/src/events/index.ts:25

#### agentId

> **agentId**: `string`

#### iteration

> **iteration**: `number`

#### sessionId

> **sessionId**: `string`

#### tokensUsed

> **tokensUsed**: `number`

---

### agent.state-changed

> **agent.state-changed**: `object`

Defined in: core/src/events/index.ts:16

#### agentId

> **agentId**: `string`

#### from

> **from**: [`AgentState`](AgentState.md)

#### sessionId

> **sessionId**: `string`

#### to

> **to**: [`AgentState`](AgentState.md)

#### ts

> **ts**: `number`

---

### agent.tool-call

> **agent.tool-call**: `object`

Defined in: core/src/events/index.ts:23

#### agentId

> **agentId**: `string`

#### sessionId

> **sessionId**: `string`

#### toolCall

> **toolCall**: [`ToolCall`](ToolCall.md)

---

### agent.tool-result

> **agent.tool-result**: `object`

Defined in: core/src/events/index.ts:24

#### agentId

> **agentId**: `string`

#### result

> **result**: [`ToolResult`](ToolResult.md)

#### sessionId

> **sessionId**: `string`

---

### config.reloaded

> **config.reloaded**: `object`

Defined in: core/src/events/index.ts:15

#### reason

> **reason**: `string`

#### ts

> **ts**: `number`

---

### heartbeat.tick

> **heartbeat.tick**: `object`

Defined in: core/src/events/index.ts:42

#### heapUsedMb

> **heapUsedMb**: `number`

#### ts

> **ts**: `number`

---

### provider.failure

> **provider.failure**: `object`

Defined in: core/src/events/index.ts:37

#### error

> **error**: `string`

#### provider

> **provider**: `string`

#### ts

> **ts**: `number`

---

### provider.success

> **provider.success**: `object`

Defined in: core/src/events/index.ts:38

#### latencyMs

> **latencyMs**: `number`

#### provider

> **provider**: `string`

---

### skill.invoked

> **skill.invoked**: `object`

Defined in: core/src/events/index.ts:41

#### durationMs

> **durationMs**: `number`

#### ok

> **ok**: `boolean`

#### skillName

> **skillName**: `string`

---

### wiki.ingest

> **wiki.ingest**: [`IngestEvent`](IngestEvent.md)

Defined in: core/src/events/index.ts:39

---

### wiki.query

> **wiki.query**: [`QueryEvent`](QueryEvent.md)

Defined in: core/src/events/index.ts:40
