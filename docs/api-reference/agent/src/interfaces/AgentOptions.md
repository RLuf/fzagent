[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [agent/src](../README.md) / AgentOptions

# Interface: AgentOptions

Defined in: agent/src/agent.ts:54

## Properties

### agentId

> **agentId**: `string`

Defined in: agent/src/agent.ts:55

---

### config

> **config**: [`AgentRunConfig`](AgentRunConfig.md)

Defined in: agent/src/agent.ts:59

---

### contextLayers

> **contextLayers**: `Omit`\<[`AssembleInput`](AssembleInput.md), `"agentId"` \| `"sessionId"` \| `"task"` \| `"tools"` \| `"logger"`\>

Defined in: agent/src/agent.ts:63

---

### eventBus?

> `optional` **eventBus?**: `FzagentEventBus`

Defined in: agent/src/agent.ts:61

---

### logger

> **logger**: `FzagentLogger`

Defined in: agent/src/agent.ts:60

---

### router

> **router**: `ProviderRouter`

Defined in: agent/src/agent.ts:56

---

### sessionStore

> **sessionStore**: [`SessionStore`](../classes/SessionStore.md)

Defined in: agent/src/agent.ts:58

---

### toolDeps?

> `optional` **toolDeps?**: `object`

Defined in: agent/src/agent.ts:65

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

Defined in: agent/src/agent.ts:57
