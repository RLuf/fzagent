[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [agent/src](../README.md) / AgentOptions

# Interface: AgentOptions

Defined in: agent/src/agent.ts:77

## Properties

### agentId

> **agentId**: `string`

Defined in: agent/src/agent.ts:78

---

### config

> **config**: [`AgentRunConfig`](AgentRunConfig.md)

Defined in: agent/src/agent.ts:82

---

### contextLayers

> **contextLayers**: `Omit`\<[`AssembleInput`](AssembleInput.md), `"agentId"` \| `"sessionId"` \| `"task"` \| `"tools"` \| `"logger"`\>

Defined in: agent/src/agent.ts:86

---

### eventBus?

> `optional` **eventBus?**: `FzagentEventBus`

Defined in: agent/src/agent.ts:84

---

### logger

> **logger**: `FzagentLogger`

Defined in: agent/src/agent.ts:83

---

### router

> **router**: `ProviderRouter`

Defined in: agent/src/agent.ts:79

---

### sessionStore

> **sessionStore**: [`SessionStore`](../classes/SessionStore.md)

Defined in: agent/src/agent.ts:81

---

### toolDeps?

> `optional` **toolDeps?**: `object`

Defined in: agent/src/agent.ts:88

#### embeddings?

> `optional` **embeddings?**: `unknown`

#### indexer?

> `optional` **indexer?**: `unknown`

#### qdrant?

> `optional` **qdrant?**: `unknown`

#### skillRegistry?

> `optional` **skillRegistry?**: `unknown`

---

### tools

> **tools**: [`ToolRegistry`](../classes/ToolRegistry.md)

Defined in: agent/src/agent.ts:80
