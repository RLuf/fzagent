[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [skills/src](../README.md) / SkillSpec

# Interface: SkillSpec\<TInput, TOutput\>

Defined in: skills/src/types.ts:24

## Extended by

- [`LoadedSkill`](LoadedSkill.md)

## Type Parameters

### TInput

`TInput` = `unknown`

### TOutput

`TOutput` = `unknown`

## Properties

### category?

> `optional` **category?**: `"system"` \| `"agent"` \| `"wiki"` \| `"web"` \| `"code"` \| `"memory"` \| `"custom"`

Defined in: skills/src/types.ts:31

---

### description

> **description**: `string`

Defined in: skills/src/types.ts:26

---

### inputSchema

> **inputSchema**: `ZodTypeAny`

Defined in: skills/src/types.ts:28

---

### isDestructive?

> `optional` **isDestructive?**: `boolean`

Defined in: skills/src/types.ts:39

---

### name

> **name**: `string`

Defined in: skills/src/types.ts:25

---

### outputSchema?

> `optional` **outputSchema?**: `ZodTypeAny`

Defined in: skills/src/types.ts:29

---

### permissions?

> `optional` **permissions?**: `"low"` \| `"medium"` \| `"high"`

Defined in: skills/src/types.ts:30

---

### requiresConfirmation?

> `optional` **requiresConfirmation?**: `boolean`

Defined in: skills/src/types.ts:37

---

### targetDomain?

> `optional` **targetDomain?**: `"system"` \| `"custom"` \| `"kb"` \| `"bridge"` \| `"introspect"` \| `"external"`

Defined in: skills/src/types.ts:34

---

### triggers?

> `optional` **triggers?**: `string`[]

Defined in: skills/src/types.ts:27

---

### version?

> `optional` **version?**: `string`

Defined in: skills/src/types.ts:32

## Methods

### run()

> **run**(`ctx`, `input`): `Promise`\<`TOutput`\>

Defined in: skills/src/types.ts:40

#### Parameters

##### ctx

[`SkillContext`](SkillContext.md)

##### input

`TInput`

#### Returns

`Promise`\<`TOutput`\>
