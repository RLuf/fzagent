[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [agent/src](../README.md) / Tool

# Interface: Tool\<TInput, TOutput\>

Defined in: agent/src/tools/types.ts:33

## Type Parameters

### TInput

`TInput` = `unknown`

### TOutput

`TOutput` = `unknown`

## Properties

### description

> **description**: `string`

Defined in: agent/src/tools/types.ts:35

---

### inputSchema

> **inputSchema**: `ZodTypeAny`

Defined in: agent/src/tools/types.ts:36

---

### name

> **name**: `string`

Defined in: agent/src/tools/types.ts:34

---

### permissions

> **permissions**: [`ToolPermission`](../type-aliases/ToolPermission.md)

Defined in: agent/src/tools/types.ts:37

## Methods

### run()

> **run**(`ctx`, `input`): `Promise`\<`TOutput`\>

Defined in: agent/src/tools/types.ts:38

#### Parameters

##### ctx

[`ToolContext`](ToolContext.md)

##### input

`TInput`

#### Returns

`Promise`\<`TOutput`\>
