[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [skills/src](../README.md) / defineSkill

# Function: defineSkill()

> **defineSkill**\<`TSchema`, `TOutput`\>(`spec`): [`SkillSpec`](../interfaces/SkillSpec.md)\<`output`\<`TSchema`\>, `TOutput`\>

Defined in: skills/src/types.ts:50

## Type Parameters

### TSchema

`TSchema` _extends_ `ZodTypeAny`

### TOutput

`TOutput`

## Parameters

### spec

#### category?

`"system"` \| `"agent"` \| `"wiki"` \| `"web"` \| `"code"` \| `"memory"` \| `"custom"`

#### description

`string`

#### inputSchema

`TSchema`

#### isDestructive?

`boolean`

#### name

`string`

#### outputSchema?

`ZodTypeAny`

#### permissions?

`"low"` \| `"medium"` \| `"high"`

#### requiresConfirmation?

`boolean`

#### targetDomain?

`"system"` \| `"custom"` \| `"kb"` \| `"bridge"` \| `"introspect"` \| `"external"`

#### triggers?

`string`[]

#### version?

`string`

#### run

## Returns

[`SkillSpec`](../interfaces/SkillSpec.md)\<`output`\<`TSchema`\>, `TOutput`\>
