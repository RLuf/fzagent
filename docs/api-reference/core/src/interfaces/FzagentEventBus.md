[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [core/src](../README.md) / FzagentEventBus

# Interface: FzagentEventBus

Defined in: core/src/events/index.ts:55

## Properties

### all

> `readonly` **all**: `Map`\<keyof FzagentEventMap \| `"*"`, ([`EventHandler`](../type-aliases/EventHandler.md)\<`unknown`\> \| [`WildcardHandler`](../type-aliases/WildcardHandler.md)\<[`FzagentEventMap`](../type-aliases/FzagentEventMap.md)\>)[]\>

Defined in: core/src/events/index.ts:56

## Methods

### clear()

> **clear**(): `void`

Defined in: core/src/events/index.ts:65

#### Returns

`void`

---

### emit()

> **emit**\<`K`\>(`event`, `payload`): `void`

Defined in: core/src/events/index.ts:64

#### Type Parameters

##### K

`K` _extends_ keyof [`FzagentEventMap`](../type-aliases/FzagentEventMap.md)

#### Parameters

##### event

`K`

##### payload

[`FzagentEventMap`](../type-aliases/FzagentEventMap.md)\[`K`\]

#### Returns

`void`

---

### off()

#### Call Signature

> **off**\<`K`\>(`event`, `handler`): `void`

Defined in: core/src/events/index.ts:62

##### Type Parameters

###### K

`K` _extends_ keyof [`FzagentEventMap`](../type-aliases/FzagentEventMap.md)

##### Parameters

###### event

`K`

###### handler

[`EventHandler`](../type-aliases/EventHandler.md)\<[`FzagentEventMap`](../type-aliases/FzagentEventMap.md)\[`K`\]\>

##### Returns

`void`

#### Call Signature

> **off**(`event`, `handler`): `void`

Defined in: core/src/events/index.ts:63

##### Parameters

###### event

`"*"`

###### handler

[`WildcardHandler`](../type-aliases/WildcardHandler.md)\<[`FzagentEventMap`](../type-aliases/FzagentEventMap.md)\>

##### Returns

`void`

---

### on()

#### Call Signature

> **on**\<`K`\>(`event`, `handler`): `void`

Defined in: core/src/events/index.ts:60

##### Type Parameters

###### K

`K` _extends_ keyof [`FzagentEventMap`](../type-aliases/FzagentEventMap.md)

##### Parameters

###### event

`K`

###### handler

[`EventHandler`](../type-aliases/EventHandler.md)\<[`FzagentEventMap`](../type-aliases/FzagentEventMap.md)\[`K`\]\>

##### Returns

`void`

#### Call Signature

> **on**(`event`, `handler`): `void`

Defined in: core/src/events/index.ts:61

##### Parameters

###### event

`"*"`

###### handler

[`WildcardHandler`](../type-aliases/WildcardHandler.md)\<[`FzagentEventMap`](../type-aliases/FzagentEventMap.md)\>

##### Returns

`void`
