[**fzagent API Reference**](../../../README.md)

---

[fzagent API Reference](../../../README.md) / [core/src](../README.md) / SkillManifestSchema

# Variable: SkillManifestSchema

> `const` **SkillManifestSchema**: `ZodObject`\<\{ `category`: `ZodDefault`\<`ZodEnum`\<\[`"system"`, `"agent"`, `"wiki"`, `"web"`, `"code"`, `"memory"`, `"custom"`\]\>\>; `description`: `ZodString`; `filePath`: `ZodString`; `inputs`: `ZodUnknown`; `isDestructive`: `ZodDefault`\<`ZodBoolean`\>; `name`: `ZodString`; `outputs`: `ZodUnknown`; `permissions`: `ZodDefault`\<`ZodEnum`\<\[`"low"`, `"medium"`, `"high"`\]\>\>; `requiresConfirmation`: `ZodOptional`\<`ZodBoolean`\>; `targetDomain`: `ZodDefault`\<`ZodEnum`\<\[`"system"`, `"kb"`, `"bridge"`, `"introspect"`, `"external"`, `"custom"`\]\>\>; `triggers`: `ZodDefault`\<`ZodArray`\<`ZodString`, `"many"`\>\>; `version`: `ZodDefault`\<`ZodString`\>; \}, `"strip"`, `ZodTypeAny`, \{ `category`: `"system"` \| `"code"` \| `"custom"` \| `"agent"` \| `"wiki"` \| `"web"` \| `"memory"`; `description`: `string`; `filePath`: `string`; `inputs?`: `unknown`; `isDestructive`: `boolean`; `name`: `string`; `outputs?`: `unknown`; `permissions`: `"low"` \| `"medium"` \| `"high"`; `requiresConfirmation?`: `boolean`; `targetDomain`: `"system"` \| `"custom"` \| `"kb"` \| `"bridge"` \| `"introspect"` \| `"external"`; `triggers`: `string`[]; `version`: `string`; \}, \{ `category?`: `"system"` \| `"code"` \| `"custom"` \| `"agent"` \| `"wiki"` \| `"web"` \| `"memory"`; `description`: `string`; `filePath`: `string`; `inputs?`: `unknown`; `isDestructive?`: `boolean`; `name`: `string`; `outputs?`: `unknown`; `permissions?`: `"low"` \| `"medium"` \| `"high"`; `requiresConfirmation?`: `boolean`; `targetDomain?`: `"system"` \| `"custom"` \| `"kb"` \| `"bridge"` \| `"introspect"` \| `"external"`; `triggers?`: `string`[]; `version?`: `string`; \}\>

Defined in: core/src/types/skill.ts:43
