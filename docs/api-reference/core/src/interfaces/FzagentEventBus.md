[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [core/src](../README.md) / FzagentEventBus

# Interface: FzagentEventBus

Defined in: core/src/events/index.ts:75

## Properties

### all

> `readonly` **all**: `Map`\<keyof FzagentEventMap \| `"*"`, ([`EventHandler`](../type-aliases/EventHandler.md)\<`unknown`\> \| [`WildcardHandler`](../type-aliases/WildcardHandler.md)\<[`FzagentEventMap`](../type-aliases/FzagentEventMap.md)\>)[]\>

Defined in: core/src/events/index.ts:76

## Methods

### clear()

> **clear**(): `void`

Defined in: core/src/events/index.ts:85

#### Returns

`void`

---

### emit()

> **emit**\<`K`\>(`event`, `payload`): `void`

Defined in: core/src/events/index.ts:84

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

Defined in: core/src/events/index.ts:82

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

Defined in: core/src/events/index.ts:83

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

Defined in: core/src/events/index.ts:80

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

Defined in: core/src/events/index.ts:81

##### Parameters

###### event

`"*"`

###### handler

[`WildcardHandler`](../type-aliases/WildcardHandler.md)\<[`FzagentEventMap`](../type-aliases/FzagentEventMap.md)\>

##### Returns

`void`
