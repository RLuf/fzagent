// Tipos publicos do SkillRegistry.

import type { FzagentLogger, SkillCategory, SkillPermission } from '@fzagent/core';
import type { z } from 'zod';

export interface SkillContext {
  agentId?: string;
  sessionId?: string;
  cwd: string;
  logger: FzagentLogger;
  signal?: AbortSignal;
  // injecoes opcionais (router, indexer, etc.) — skill resolve no proprio run.
  router?: unknown;
  indexer?: unknown;
  qdrant?: unknown;
  embeddings?: unknown;
}

export interface SkillSpec<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  triggers?: string[];
  inputSchema: z.ZodTypeAny;
  outputSchema?: z.ZodTypeAny;
  permissions?: SkillPermission;
  category?: SkillCategory;
  version?: string;
  run(ctx: SkillContext, input: TInput): Promise<TOutput>;
}

export interface LoadedSkill extends SkillSpec {
  // caminho absoluto do arquivo .genai.mjs
  filePath: string;
  // hash do conteudo do arquivo (para deteccao de mudancas)
  fileHash: string;
}

export function defineSkill<TSchema extends z.ZodTypeAny, TOutput>(spec: {
  name: string;
  description: string;
  triggers?: string[];
  inputSchema: TSchema;
  outputSchema?: z.ZodTypeAny;
  permissions?: SkillPermission;
  category?: SkillCategory;
  version?: string;
  run(ctx: SkillContext, input: z.output<TSchema>): Promise<TOutput>;
}): SkillSpec<z.output<TSchema>, TOutput> {
  return {
    name: spec.name,
    description: spec.description,
    inputSchema: spec.inputSchema,
    run: spec.run,
    ...(spec.triggers !== undefined && { triggers: spec.triggers }),
    ...(spec.outputSchema !== undefined && { outputSchema: spec.outputSchema }),
    ...(spec.permissions !== undefined && { permissions: spec.permissions }),
    ...(spec.category !== undefined && { category: spec.category }),
    ...(spec.version !== undefined && { version: spec.version }),
  };
}
