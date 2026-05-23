[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [agent/src](../README.md) / SessionStore

# Class: SessionStore

Defined in: agent/src/session/store.ts:43

## Constructors

### Constructor

> **new SessionStore**(`opts`): `SessionStore`

Defined in: agent/src/session/store.ts:47

#### Parameters

##### opts

[`SessionStoreOptions`](../interfaces/SessionStoreOptions.md)

#### Returns

`SessionStore`

## Methods

### close()

> **close**(): `void`

Defined in: agent/src/session/store.ts:53

#### Returns

`void`

---

### closeSession()

> **closeSession**(`sessionId`, `status`): `void`

Defined in: agent/src/session/store.ts:78

#### Parameters

##### sessionId

`string`

##### status

[`SessionStatus`](../type-aliases/SessionStatus.md)

#### Returns

`void`

---

### countTurns()

> **countTurns**(`sessionId`): `number`

Defined in: agent/src/session/store.ts:147

#### Parameters

##### sessionId

`string`

#### Returns

`number`

---

### createSession()

> **createSession**(`input`): [`SessionRow`](../interfaces/SessionRow.md)

Defined in: agent/src/session/store.ts:57

#### Parameters

##### input

[`CreateSessionInput`](../interfaces/CreateSessionInput.md)

#### Returns

[`SessionRow`](../interfaces/SessionRow.md)

---

### getRecentTurns()

> **getRecentTurns**(`sessionId`, `limit?`): `object`[]

Defined in: agent/src/session/store.ts:138

#### Parameters

##### sessionId

`string`

##### limit?

`number` = `200`

#### Returns

`object`[]

---

### getSession()

> **getSession**(`sessionId`): [`SessionRow`](../interfaces/SessionRow.md) \| `null`

Defined in: agent/src/session/store.ts:84

#### Parameters

##### sessionId

`string`

#### Returns

[`SessionRow`](../interfaces/SessionRow.md) \| `null`

---

### recordToolCall()

> **recordToolCall**(`turnId`, `call`, `output`, `durationMs`, `ok`): `void`

Defined in: agent/src/session/store.ts:114

#### Parameters

##### turnId

`number`

##### call

##### output

`unknown`

##### durationMs

`number`

##### ok

`boolean`

#### Returns

`void`

---

### recordTurn()

> **recordTurn**(`sessionId`, `message`, `usage?`): `number`

Defined in: agent/src/session/store.ts:94

#### Parameters

##### sessionId

`string`

##### message

##### usage?

###### tokensIn?

`number`

###### tokensOut?

`number`

#### Returns

`number`

---

### totalTokens()

> **totalTokens**(`sessionId`): `object`

Defined in: agent/src/session/store.ts:155

#### Parameters

##### sessionId

`string`

#### Returns

`object`

##### in

> **in**: `number`

##### out

> **out**: `number`
