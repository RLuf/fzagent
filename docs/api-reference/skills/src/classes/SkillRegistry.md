[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [skills/src](../README.md) / SkillRegistry

# Class: SkillRegistry

Defined in: skills/src/registry.ts:37

## Constructors

### Constructor

> **new SkillRegistry**(`opts`): `SkillRegistry`

Defined in: skills/src/registry.ts:46

#### Parameters

##### opts

[`SkillRegistryOptions`](../interfaces/SkillRegistryOptions.md)

#### Returns

`SkillRegistry`

## Properties

### auditor

> `readonly` **auditor**: [`SkillAuditor`](../interfaces/SkillAuditor.md) \| `undefined`

Defined in: skills/src/registry.ts:44

---

### highRequiresConfirm

> `readonly` **highRequiresConfirm**: `boolean`

Defined in: skills/src/registry.ts:42

---

### onHighConfirm

> `readonly` **onHighConfirm**: ((`name`) => `boolean` \| `Promise`\<`boolean`\>) \| `undefined`

Defined in: skills/src/registry.ts:43

## Methods

### get()

> **get**(`name`): [`LoadedSkill`](../interfaces/LoadedSkill.md) \| `undefined`

Defined in: skills/src/registry.ts:103

#### Parameters

##### name

`string`

#### Returns

[`LoadedSkill`](../interfaces/LoadedSkill.md) \| `undefined`

---

### has()

> **has**(`name`): `boolean`

Defined in: skills/src/registry.ts:107

#### Parameters

##### name

`string`

#### Returns

`boolean`

---

### invoke()

> **invoke**(`name`, `rawInput`, `ctx`): `Promise`\<`unknown`\>

Defined in: skills/src/registry.ts:126

#### Parameters

##### name

`string`

##### rawInput

`unknown`

##### ctx

[`SkillContext`](../interfaces/SkillContext.md)

#### Returns

`Promise`\<`unknown`\>

---

### list()

> **list**(): [`LoadedSkill`](../interfaces/LoadedSkill.md)[]

Defined in: skills/src/registry.ts:99

#### Returns

[`LoadedSkill`](../interfaces/LoadedSkill.md)[]

---

### loadAll()

> **loadAll**(): `Promise`\<`void`\>

Defined in: skills/src/registry.ts:55

#### Returns

`Promise`\<`void`\>

---

### loadFile()

> **loadFile**(`filePath`): `Promise`\<[`LoadedSkill`](../interfaces/LoadedSkill.md) \| `null`\>

Defined in: skills/src/registry.ts:68

#### Parameters

##### filePath

`string`

#### Returns

`Promise`\<[`LoadedSkill`](../interfaces/LoadedSkill.md) \| `null`\>

---

### registerProgrammatic()

> **registerProgrammatic**(`spec`, `filePath?`): `void`

Defined in: skills/src/registry.ts:94

#### Parameters

##### spec

[`SkillSpec`](../interfaces/SkillSpec.md)

##### filePath?

`string` = `'<programmatic>'`

#### Returns

`void`

---

### requiresConfirmation()

> **requiresConfirmation**(`name`): `boolean`

Defined in: skills/src/registry.ts:111

#### Parameters

##### name

`string`

#### Returns

`boolean`

---

### startWatching()

> **startWatching**(): `void`

Defined in: skills/src/registry.ts:224

#### Returns

`void`

---

### stop()

> **stop**(): `Promise`\<`void`\>

Defined in: skills/src/registry.ts:250

#### Returns

`Promise`\<`void`\>
