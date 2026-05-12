[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [skills/src](../README.md) / MemorySkillAuditor

# Class: MemorySkillAuditor

Defined in: skills/src/audit.ts:73

## Implements

- [`SkillAuditor`](../interfaces/SkillAuditor.md)

## Constructors

### Constructor

> **new MemorySkillAuditor**(): `MemorySkillAuditor`

#### Returns

`MemorySkillAuditor`

## Properties

### events

> `readonly` **events**: [`SkillAuditEvent`](../interfaces/SkillAuditEvent.md)[] = `[]`

Defined in: skills/src/audit.ts:74

## Methods

### clear()

> **clear**(): `void`

Defined in: skills/src/audit.ts:78

#### Returns

`void`

---

### record()

> **record**(`event`): `void`

Defined in: skills/src/audit.ts:75

#### Parameters

##### event

[`SkillAuditEvent`](../interfaces/SkillAuditEvent.md)

#### Returns

`void`

#### Implementation of

[`SkillAuditor`](../interfaces/SkillAuditor.md).[`record`](../interfaces/SkillAuditor.md#record)
