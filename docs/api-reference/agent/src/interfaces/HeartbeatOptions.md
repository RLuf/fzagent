[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [agent/src](../README.md) / HeartbeatOptions

# Interface: HeartbeatOptions

Defined in: agent/src/heartbeat.ts:21

## Properties

### eventBus?

> `optional` **eventBus?**: `FzagentEventBus`

Defined in: agent/src/heartbeat.ts:24

---

### heapStats?

> `optional` **heapStats?**: () => `MemoryUsage`

Defined in: agent/src/heartbeat.ts:27

#### Returns

`MemoryUsage`

---

### intervalMs

> **intervalMs**: `number`

Defined in: agent/src/heartbeat.ts:22

---

### logger?

> `optional` **logger?**: `FzagentLogger`

Defined in: agent/src/heartbeat.ts:23

---

### now?

> `optional` **now?**: () => `number`

Defined in: agent/src/heartbeat.ts:26

#### Returns

`number`
