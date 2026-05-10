// ProviderConfig descreve como cada LLM provider e configurado/ativado.
// O ProviderRouter (FASE 3) usa PROVIDER_FALLBACK_ORDER + estes configs
// para tentar providers em sequencia ate um responder com sucesso.

import { z } from 'zod';

export const LLMProviderNameSchema = z.enum([
  'anthropic',
  'openai',
  'google',
  'openrouter',
  'ollama',
]);
export type LLMProviderName = z.infer<typeof LLMProviderNameSchema>;

export const ProviderConfigSchema = z.object({
  name: LLMProviderNameSchema,
  apiKey: z.string().min(1).optional(),
  baseUrl: z.string().url().optional(),
  models: z.array(z.string()).default([]),
  // hint opcional para identificacao em servicos como OpenRouter
  referer: z.string().optional(),
  title: z.string().optional(),
});
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

// Estado por-provider do circuit breaker (FASE 3).
export const ProviderHealthSchema = z.object({
  name: LLMProviderNameSchema,
  consecutiveFailures: z.number().int().nonnegative().default(0),
  cooldownUntil: z.number().int().nonnegative().default(0),
  lastError: z.string().optional(),
});
export type ProviderHealth = z.infer<typeof ProviderHealthSchema>;
