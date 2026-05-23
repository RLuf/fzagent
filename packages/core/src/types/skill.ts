// SkillManifest: contrato declarativo para skills auto-discovery.
// Modelo inspirado no SKILL.md do openclaw + reversa, mas com schemas Zod
// para inputs/outputs (ao inves de exemplos puramente em prosa).
//
// Manifest v1 (L99): tres campos extras governam o protocolo cerebro<->corpo.
//   - target_domain: subsistema logico tocado pela skill.
//   - requires_confirmation: gate explicito independente de `permissions`.
//   - is_destructive: hint declarativo para auditoria/UI/planejamento.

import { z } from 'zod';

// Permissoes proporcionais ao risco. HIGH exige confirmacao do usuario
// quando SKILL_HIGH_PERMISSION_REQUIRES_CONFIRM=true.
export const SkillPermissionSchema = z.enum(['low', 'medium', 'high']);
export type SkillPermission = z.infer<typeof SkillPermissionSchema>;

export const SkillCategorySchema = z.enum([
  'system',
  'agent',
  'wiki',
  'web',
  'code',
  'memory',
  'custom',
]);
export type SkillCategory = z.infer<typeof SkillCategorySchema>;

// Subsistema logico tocado pela skill — identifica QUAL parte do corpo
// (ou de sistemas externos) o cerebro toca quando invoca esta skill.
// Usado para agrupar consequencias em auditoria e governance.
export const SkillTargetDomainSchema = z.enum([
  'system',
  'kb',
  'bridge',
  'introspect',
  'external',
  'custom',
]);
export type SkillTargetDomain = z.infer<typeof SkillTargetDomainSchema>;

// O manifesto e validado em runtime; o SkillRegistry le o arquivo
// .genai.mjs e extrai este shape.
export const SkillManifestSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  triggers: z.array(z.string()).default([]),
  // inputs/outputs sao mantidos como `unknown` aqui — o SkillRegistry valida
  // que sao instancias z.ZodType durante o carregamento.
  inputs: z.unknown(),
  outputs: z.unknown(),
  permissions: SkillPermissionSchema.default('low'),
  category: SkillCategorySchema.default('custom'),
  // caminho absoluto para o arquivo de origem; usado em logs e debug.
  filePath: z.string().min(1),
  version: z.string().default('0.1.0'),
  // L99 manifest extensions ---------------------------------------------
  targetDomain: SkillTargetDomainSchema.default('custom'),
  // Override explicito do gate de confirmacao. Quando undefined, o registry
  // deriva de `permissions === 'high'`. Permite (a) MEDIUM exigir confirm,
  // ou (b) HIGH ser whitelisted como nao-confirmavel (dry-run, read-only).
  requiresConfirmation: z.boolean().optional(),
  // Hint declarativo: a skill realiza mudanca de estado nao trivialmente
  // reversivel. Usado por auditoria/UI e pelo proprio cerebro ao planejar.
  isDestructive: z.boolean().default(false),
});
export type SkillManifest = z.infer<typeof SkillManifestSchema>;
