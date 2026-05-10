// Tool primitives. Decisoes:
// 1. Input validado por Zod schema; conversao para JSON Schema (LLM tools)
//    feita em registry.ts via converter minimalista (~80 LOC, sem dep extra).
// 2. ToolContext carrega dependencias injetadas (router, indexer, qdrant,
//    embeddings, signal) — tools nao tem que conhecer DI propria.
// 3. permissions: 'low' executa sem confirmacao; 'medium' loga; 'high' deve
//    pedir confirmacao do usuario quando SKILL_HIGH_PERMISSION_REQUIRES_CONFIRM=true.
// 4. defineTool usa z.output<TSchema> no run() — defaults ja aplicados,
//    tipos sem `undefined` indesejado.

import type { FzagentLogger, Message } from '@fzagent/core';
import type { z } from 'zod';

export type ToolPermission = 'low' | 'medium' | 'high';

export interface ToolContext {
  agentId: string;
  sessionId: string;
  cwd: string;
  logger: FzagentLogger;
  signal?: AbortSignal;
  // injecoes opcionais — tools usam o que precisarem.
  router?: unknown;
  indexer?: unknown;
  qdrant?: unknown;
  embeddings?: unknown;
  skillRegistry?: unknown;
  agentFactory?: unknown;
  // historico atual da sessao (read-only) — util para tools refletivas.
  history?: readonly Message[];
}

export interface Tool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  permissions: ToolPermission;
  run(ctx: ToolContext, input: TInput): Promise<TOutput>;
}

// Helper que usa z.output<TSchema> para o run() — defaults ja aplicados.
export function defineTool<TSchema extends z.ZodTypeAny, TOutput>(spec: {
  name: string;
  description: string;
  inputSchema: TSchema;
  permissions: ToolPermission;
  run: (ctx: ToolContext, input: z.output<TSchema>) => Promise<TOutput>;
}): Tool<z.output<TSchema>, TOutput> {
  return {
    name: spec.name,
    description: spec.description,
    inputSchema: spec.inputSchema,
    permissions: spec.permissions,
    run: spec.run,
  };
}
