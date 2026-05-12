[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [skills/src](../README.md) / LoadedSkill

# Interface: LoadedSkill

Defined in: skills/src/types.ts:43

## Extends

- [`SkillSpec`](SkillSpec.md)

## Properties

### category?

> `optional` **category?**: `"system"` \| `"agent"` \| `"wiki"` \| `"web"` \| `"code"` \| `"memory"` \| `"custom"`

Defined in: skills/src/types.ts:31

#### Inherited from

[`SkillSpec`](SkillSpec.md).[`category`](SkillSpec.md#category)

---

### description

> **description**: `string`

Defined in: skills/src/types.ts:26

#### Inherited from

[`SkillSpec`](SkillSpec.md).[`description`](SkillSpec.md#description)

---

### fileHash

> **fileHash**: `string`

Defined in: skills/src/types.ts:47

---

### filePath

> **filePath**: `string`

Defined in: skills/src/types.ts:45

---

### inputSchema

> **inputSchema**: `ZodTypeAny`

Defined in: skills/src/types.ts:28

#### Inherited from

[`SkillSpec`](SkillSpec.md).[`inputSchema`](SkillSpec.md#inputschema)

---

### isDestructive?

> `optional` **isDestructive?**: `boolean`

Defined in: skills/src/types.ts:39

#### Inherited from

[`SkillSpec`](SkillSpec.md).[`isDestructive`](SkillSpec.md#isdestructive)

---

### name

> **name**: `string`

Defined in: skills/src/types.ts:25

#### Inherited from

[`SkillSpec`](SkillSpec.md).[`name`](SkillSpec.md#name)

---

### outputSchema?

> `optional` **outputSchema?**: `ZodTypeAny`

Defined in: skills/src/types.ts:29

#### Inherited from

[`SkillSpec`](SkillSpec.md).[`outputSchema`](SkillSpec.md#outputschema)

---

### permissions?

> `optional` **permissions?**: `"low"` \| `"medium"` \| `"high"`

Defined in: skills/src/types.ts:30

#### Inherited from

[`SkillSpec`](SkillSpec.md).[`permissions`](SkillSpec.md#permissions)

---

### requiresConfirmation?

> `optional` **requiresConfirmation?**: `boolean`

Defined in: skills/src/types.ts:37

#### Inherited from

[`SkillSpec`](SkillSpec.md).[`requiresConfirmation`](SkillSpec.md#requiresconfirmation)

---

### targetDomain?

> `optional` **targetDomain?**: `"system"` \| `"custom"` \| `"kb"` \| `"bridge"` \| `"introspect"` \| `"external"`

Defined in: skills/src/types.ts:34

#### Inherited from

[`SkillSpec`](SkillSpec.md).[`targetDomain`](SkillSpec.md#targetdomain)

---

### triggers?

> `optional` **triggers?**: `string`[]

Defined in: skills/src/types.ts:27

#### Inherited from

[`SkillSpec`](SkillSpec.md).[`triggers`](SkillSpec.md#triggers)

---

### version?

> `optional` **version?**: `string`

Defined in: skills/src/types.ts:32

#### Inherited from

[`SkillSpec`](SkillSpec.md).[`version`](SkillSpec.md#version)

## Methods

### run()

> **run**(`ctx`, `input`): `Promise`\<`unknown`\>

Defined in: skills/src/types.ts:40

#### Parameters

##### ctx

[`SkillContext`](SkillContext.md)

##### input

`unknown`

#### Returns

`Promise`\<`unknown`\>

#### Inherited from

[`SkillSpec`](SkillSpec.md).[`run`](SkillSpec.md#run)
