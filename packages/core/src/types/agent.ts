// State machine + AgentConfig do nucleo OpenClaw-style.
// AgentState replica o ciclo THINK -> ACT -> OBSERVE -> REFLECT do plano,
// com estados terminais paused/failed para o circuit breaker (FASE 5).

import { z } from 'zod';

export const AgentStateSchema = z.enum([
  'idle',
  'thinking',
  'acting',
  'observing',
  'reflecting',
  'paused',
  'failed',
]);
export type AgentState = z.infer<typeof AgentStateSchema>;

// AgentConfig: parametros operacionais do loop agentico.
// Todos derivados de fzagent.conf no carregamento.
export const AgentConfigSchema = z.object({
  maxIterations: z.number().int().positive(),
  tokenBudget: z.number().int().positive(),
  circuitBreakerMaxFailures: z.number().int().positive(),
  circuitBreakerCooldownMs: z.number().int().nonnegative(),
  heartbeatIntervalMs: z.number().int().nonnegative(),
  historyTurns: z.number().int().positive(),
  compactionThresholdPct: z.number().min(0).max(100),
  defaultModel: z.string().min(1),
  maxConcurrencyPerAgent: z.number().int().positive(),
});
export type AgentConfig = z.infer<typeof AgentConfigSchema>;

// Resultado de uma iteracao do loop. Util para streaming/logs estruturados.
export const AgentStepSchema = z.object({
  iteration: z.number().int().nonnegative(),
  state: AgentStateSchema,
  tokensUsed: z.number().int().nonnegative(),
  toolCalls: z.number().int().nonnegative(),
  notes: z.string().optional(),
  timestamp: z.number().int(),
});
export type AgentStep = z.infer<typeof AgentStepSchema>;
