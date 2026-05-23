[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [skills/src](../README.md) / SkillRegistryOptions

# Interface: SkillRegistryOptions

Defined in: skills/src/registry.ts:23

## Properties

### auditor?

> `optional` **auditor?**: [`SkillAuditor`](SkillAuditor.md)

Defined in: skills/src/registry.ts:34

---

### dir

> **dir**: `string`

Defined in: skills/src/registry.ts:25

---

### highRequiresConfirm?

> `optional` **highRequiresConfirm?**: `boolean`

Defined in: skills/src/registry.ts:30

---

### logger?

> `optional` **logger?**: `FzagentLogger`

Defined in: skills/src/registry.ts:26

---

### onHighConfirm?

> `optional` **onHighConfirm?**: (`name`) => `boolean` \| `Promise`\<`boolean`\>

Defined in: skills/src/registry.ts:32

#### Parameters

##### name

`string`

#### Returns

`boolean` \| `Promise`\<`boolean`\>

---

### watch?

> `optional` **watch?**: `boolean`

Defined in: skills/src/registry.ts:28
