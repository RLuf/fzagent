// ProviderRouter — orquestra multiplos LLMProviders com fallback ordenado,
// retry exponencial e circuit breaker por provider.
//
// Fluxo de complete():
// 1. Itera PROVIDER_FALLBACK_ORDER.
// 2. Para cada provider: se circuit breaker permite, tenta com retry.
// 3. Sucesso: registra no breaker, emite 'provider.success', retorna.
// 4. Falha (apos retries): registra no breaker, emite 'provider.failure',
//    avanca para o proximo provider.
// 5. Se todos falharam: lanca CircuitBreakerError com cause = ultimo erro.

import type { FzagentEventBus, FzagentLogger, LLMProviderName, Message } from '@fzagent/core';
import { CircuitBreakerError, ProviderError } from '@fzagent/core';

import type { CompleteOptions, CompleteResult, LLMProvider, StreamChunk } from '../types.js';
import { CircuitBreaker } from './circuit-breaker.js';
import { defaultIsRetryable, retry } from './retry.js';

export interface ProviderRouterConfig {
  providers: LLMProvider[];
  // Ordem preferida; nao listados sao colocados no fim.
  fallbackOrder: LLMProviderName[];
  logger: FzagentLogger;
  // Eventos opcionais — facilita observability sem tightly coupling.
  eventBus?: FzagentEventBus;
  // Retry params.
  maxAttemptsPerProvider?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  // Circuit breaker params.
  circuitBreakerMaxFailures?: number;
  circuitBreakerCooldownMs?: number;
  // Injecoes para teste.
  now?: () => number;
}

export class ProviderRouter {
  private readonly orderedProviders: LLMProvider[];
  private readonly breakers = new Map<LLMProviderName, CircuitBreaker>();
  private readonly logger: FzagentLogger;
  private readonly eventBus: FzagentEventBus | undefined;
  private readonly maxAttemptsPerProvider: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;

  constructor(config: ProviderRouterConfig) {
    this.logger = config.logger.child({ scope: 'provider-router' });
    this.eventBus = config.eventBus;
    this.maxAttemptsPerProvider = config.maxAttemptsPerProvider ?? 3;
    this.baseDelayMs = config.baseDelayMs ?? 500;
    this.maxDelayMs = config.maxDelayMs ?? 8000;

    this.orderedProviders = orderProviders(config.providers, config.fallbackOrder);
    for (const p of this.orderedProviders) {
      this.breakers.set(
        p.name,
        new CircuitBreaker({
          maxFailures: config.circuitBreakerMaxFailures ?? 3,
          cooldownMs: config.circuitBreakerCooldownMs ?? 30_000,
          ...(config.now !== undefined && { now: config.now }),
        }),
      );
    }
  }

  getProviderNames(): LLMProviderName[] {
    return this.orderedProviders.map((p) => p.name);
  }

  getCircuitBreakerSnapshots(): Record<string, ReturnType<CircuitBreaker['snapshot']>> {
    const out: Record<string, ReturnType<CircuitBreaker['snapshot']>> = {};
    for (const [name, cb] of this.breakers) {
      out[name] = cb.snapshot();
    }
    return out;
  }

  async complete(messages: Message[], options: CompleteOptions): Promise<CompleteResult> {
    let lastError: unknown;
    const skipped: string[] = [];

    for (const provider of this.orderedProviders) {
      const cb = this.breakers.get(provider.name);
      if (cb && !cb.canExecute()) {
        this.logger.debug({ provider: provider.name }, 'circuit-breaker open, skipping');
        skipped.push(provider.name);
        continue;
      }

      const start = Date.now();
      const useModel = provider.models.includes(options.model)
        ? options.model
        : provider.models[0] ?? options.model;

      try {
        const result = await retry(
          (attempt) => {
            this.logger.debug(
              { provider: provider.name, attempt, model: useModel, requestedModel: options.model },
              'trying provider',
            );
            return provider.complete(messages, { ...options, model: useModel });
          },
          {
            maxAttempts: this.maxAttemptsPerProvider,
            baseDelayMs: this.baseDelayMs,
            maxDelayMs: this.maxDelayMs,
            isRetryable: defaultIsRetryable,
          },
        );
        cb?.recordSuccess();
        this.eventBus?.emit('provider.success', {
          provider: provider.name,
          latencyMs: Date.now() - start,
        });
        return result;
      } catch (err) {
        cb?.recordFailure();
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.warn({ provider: provider.name, error: errMsg }, 'provider failed');
        this.eventBus?.emit('provider.failure', {
          provider: provider.name,
          error: errMsg,
          ts: Date.now(),
        });
        lastError = err;
      }
    }

    if (skipped.length === this.orderedProviders.length) {
      throw new CircuitBreakerError(`All providers (${skipped.join(', ')}) circuit-broken`);
    }
    throw new ProviderError(
      lastError instanceof Error
        ? `All providers failed; last error: ${lastError.message}`
        : 'All providers failed',
      'router',
      lastError instanceof Error ? { cause: lastError } : undefined,
    );
  }

  async *stream(messages: Message[], options: CompleteOptions): AsyncIterable<StreamChunk> {
    let lastError: unknown;

    for (const provider of this.orderedProviders) {
      const cb = this.breakers.get(provider.name);
      if (cb && !cb.canExecute()) continue;

      const useModel = provider.models.includes(options.model)
        ? options.model
        : provider.models[0] ?? options.model;

      const start = Date.now();
      try {
        let any = false;
        for await (const chunk of provider.stream(messages, { ...options, model: useModel })) {
          any = true;
          yield chunk;
        }
        if (any) cb?.recordSuccess();
        this.eventBus?.emit('provider.success', {
          provider: provider.name,
          latencyMs: Date.now() - start,
        });
        return;
      } catch (err) {
        cb?.recordFailure();
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.warn({ provider: provider.name, error: errMsg }, 'stream failed');
        this.eventBus?.emit('provider.failure', {
          provider: provider.name,
          error: errMsg,
          ts: Date.now(),
        });
        lastError = err;
      }
    }

    throw new ProviderError(
      lastError instanceof Error
        ? `All providers failed (stream); last error: ${lastError.message}`
        : 'All providers failed (stream)',
      'router',
      lastError instanceof Error ? { cause: lastError } : undefined,
    );
  }
}

function orderProviders(providers: LLMProvider[], preferred: LLMProviderName[]): LLMProvider[] {
  const byName = new Map<LLMProviderName, LLMProvider>();
  for (const p of providers) byName.set(p.name, p);

  const ordered: LLMProvider[] = [];
  const seen = new Set<LLMProviderName>();

  for (const name of preferred) {
    const p = byName.get(name);
    if (p && !seen.has(name)) {
      ordered.push(p);
      seen.add(name);
    }
  }
  for (const p of providers) {
    if (!seen.has(p.name)) {
      ordered.push(p);
      seen.add(p.name);
    }
  }
  return ordered;
}
