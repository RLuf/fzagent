// SkillManifest: contrato declarativo para skills auto-discovery.
// Modelo inspirado no SKILL.md do openclaw + reversa, mas com schemas Zod
// para inputs/outputs (ao inves de exemplos puramente em prosa).

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

// O manifesto e validado em runtime; o SkillRegistry (FASE 6) le o arquivo
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
});
export type SkillManifest = z.infer<typeof SkillManifestSchema>;
