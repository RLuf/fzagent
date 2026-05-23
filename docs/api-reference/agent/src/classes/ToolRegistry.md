[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [agent/src](../README.md) / ToolRegistry

# Class: ToolRegistry

Defined in: agent/src/tools/registry.ts:27

## Constructors

### Constructor

> **new ToolRegistry**(`opts?`): `ToolRegistry`

Defined in: agent/src/tools/registry.ts:32

#### Parameters

##### opts?

`ToolRegistryOptions` = `{}`

#### Returns

`ToolRegistry`

## Properties

### highRequiresConfirm

> `readonly` **highRequiresConfirm**: `boolean`

Defined in: agent/src/tools/registry.ts:29

---

### onHighConfirm

> `readonly` **onHighConfirm**: ((`toolName`) => `boolean` \| `Promise`\<`boolean`\>) \| `undefined`

Defined in: agent/src/tools/registry.ts:30

## Methods

### execute()

> **execute**(`name`, `rawInput`, `ctx`): `Promise`\<[`ExecuteResult`](../interfaces/ExecuteResult.md)\>

Defined in: agent/src/tools/registry.ts:71

#### Parameters

##### name

`string`

##### rawInput

`unknown`

##### ctx

[`ToolContext`](../interfaces/ToolContext.md)

#### Returns

`Promise`\<[`ExecuteResult`](../interfaces/ExecuteResult.md)\>

---

### get()

> **get**(`name`): [`Tool`](../interfaces/Tool.md)\<`unknown`, `unknown`\> \| `undefined`

Defined in: agent/src/tools/registry.ts:50

#### Parameters

##### name

`string`

#### Returns

[`Tool`](../interfaces/Tool.md)\<`unknown`, `unknown`\> \| `undefined`

---

### has()

> **has**(`name`): `boolean`

Defined in: agent/src/tools/registry.ts:54

#### Parameters

##### name

`string`

#### Returns

`boolean`

---

### list()

> **list**(): [`Tool`](../interfaces/Tool.md)\<`unknown`, `unknown`\>[]

Defined in: agent/src/tools/registry.ts:58

#### Returns

[`Tool`](../interfaces/Tool.md)\<`unknown`, `unknown`\>[]

---

### register()

> **register**\<`TIn`, `TOut`\>(`tool`): `this`

Defined in: agent/src/tools/registry.ts:37

#### Type Parameters

##### TIn

`TIn`

##### TOut

`TOut`

#### Parameters

##### tool

[`Tool`](../interfaces/Tool.md)\<`TIn`, `TOut`\>

#### Returns

`this`

---

### registerMany()

> **registerMany**(`tools`): `this`

Defined in: agent/src/tools/registry.ts:45

#### Parameters

##### tools

[`Tool`](../interfaces/Tool.md)\<`unknown`, `unknown`\>[]

#### Returns

`this`

---

### toLLMTools()

> **toLLMTools**(): `ToolDefinition`[]

Defined in: agent/src/tools/registry.ts:63

#### Returns

`ToolDefinition`[]
