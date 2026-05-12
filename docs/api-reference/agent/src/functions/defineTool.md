[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [agent/src](../README.md) / defineTool

# Function: defineTool()

> **defineTool**\<`TSchema`, `TOutput`\>(`spec`): [`Tool`](../interfaces/Tool.md)\<`output`\<`TSchema`\>, `TOutput`\>

Defined in: agent/src/tools/types.ts:42

## Type Parameters

### TSchema

`TSchema` _extends_ `ZodTypeAny`

### TOutput

`TOutput`

## Parameters

### spec

#### description

`string`

#### inputSchema

`TSchema`

#### name

`string`

#### permissions

[`ToolPermission`](../type-aliases/ToolPermission.md)

#### run

(`ctx`, `input`) => `Promise`\<`TOutput`\>

## Returns

[`Tool`](../interfaces/Tool.md)\<`output`\<`TSchema`\>, `TOutput`\>
