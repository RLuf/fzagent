import { createEventBus, createLogger } from '@fzagent/core';
import { describe, expect, it } from 'vitest';

import { MockProvider } from '../adapters/mock.js';
import type { CompleteResult } from '../types.js';
import { ProviderRouter } from './index.js';

const silentLogger = createLogger({ format: 'silent', level: 'silent' });

function mkResult(overrides: Partial<CompleteResult> = {}): CompleteResult {
  return {
    content: 'ok',
    toolCalls: [],
    stopReason: 'end_turn',
    usage: { inputTokens: 10, outputTokens: 5 },
    model: 'mock-model',
    provider: 'anthropic',
    ...overrides,
  };
}

describe('ProviderRouter.complete', () => {
  it('calls the first provider that succeeds', async () => {
    const a = new MockProvider('anthropic', ['m'], { responses: [mkResult({ content: 'A' })] });
    const b = new MockProvider('openai', ['m'], { responses: [mkResult({ content: 'B' })] });
    const router = new ProviderRouter({
      providers: [a, b],
      fallbackOrder: ['anthropic', 'openai'],
      logger: silentLogger,
      maxAttemptsPerProvider: 1,
    });
    const r = await router.complete([{ role: 'user', content: 'hi' }], { model: 'm' });
    expect(r.content).toBe('A');
    expect(a.callCount).toBe(1);
    expect(b.callCount).toBe(0);
  });

  it('falls back to next provider on non-retryable error', async () => {
    const a = new MockProvider('anthropic', ['m'], { error: { status: 401 } });
    const b = new MockProvider('openai', ['m'], { responses: [mkResult({ content: 'B' })] });
    const router = new ProviderRouter({
      providers: [a, b],
      fallbackOrder: ['anthropic', 'openai'],
      logger: silentLogger,
      maxAttemptsPerProvider: 1,
    });
    const r = await router.complete([{ role: 'user', content: 'hi' }], { model: 'm' });
    expect(r.content).toBe('B');
    expect(a.callCount).toBe(1);
    expect(b.callCount).toBe(1);
  });

  it('retries retryable errors before falling back', async () => {
    let attempts = 0;
    const a = new MockProvider('anthropic', ['m'], {
      fn: () => {
        attempts += 1;
        if (attempts < 2) throw { status: 503 };
        return mkResult({ content: 'A-retried' });
      },
    });
    const router = new ProviderRouter({
      providers: [a],
      fallbackOrder: ['anthropic'],
      logger: silentLogger,
      maxAttemptsPerProvider: 3,
      baseDelayMs: 1,
      maxDelayMs: 5,
    });
    const r = await router.complete([{ role: 'user', content: 'hi' }], { model: 'm' });
    expect(r.content).toBe('A-retried');
    expect(attempts).toBe(2);
  });

  it('orders providers per fallbackOrder regardless of array order', async () => {
    const a = new MockProvider('anthropic', ['m'], { responses: [mkResult({ content: 'A' })] });
    const b = new MockProvider('openai', ['m'], { responses: [mkResult({ content: 'B' })] });
    const router = new ProviderRouter({
      providers: [a, b],
      fallbackOrder: ['openai', 'anthropic'],
      logger: silentLogger,
      maxAttemptsPerProvider: 1,
    });
    const r = await router.complete([{ role: 'user', content: 'hi' }], { model: 'm' });
    expect(r.content).toBe('B');
    expect(b.callCount).toBe(1);
    expect(a.callCount).toBe(0);
  });

  it('opens circuit breaker after maxFailures and skips provider', async () => {
    const a = new MockProvider('anthropic', ['m'], { error: { status: 500 } });
    const b = new MockProvider('openai', ['m'], { responses: [mkResult({ content: 'B' })] });
    const now = 0;
    const router = new ProviderRouter({
      providers: [a, b],
      fallbackOrder: ['anthropic', 'openai'],
      logger: silentLogger,
      maxAttemptsPerProvider: 1,
      circuitBreakerMaxFailures: 2,
      circuitBreakerCooldownMs: 1000,
      now: () => now,
      baseDelayMs: 1,
      maxDelayMs: 5,
    });

    await router.complete([{ role: 'user', content: 'x' }], { model: 'm' });
    await router.complete([{ role: 'user', content: 'y' }], { model: 'm' });
    // a is now open. b serves all subsequent calls.
    a.callCount = 0;
    b.callCount = 0;
    await router.complete([{ role: 'user', content: 'z' }], { model: 'm' });
    expect(a.callCount).toBe(0);
    expect(b.callCount).toBe(1);
    const snap = router.getCircuitBreakerSnapshots();
    expect(snap['anthropic']?.state).toBe('open');
  });

  it('emits provider.success and provider.failure events', async () => {
    const bus = createEventBus();
    const events: string[] = [];
    bus.on('provider.success', (e) => events.push(`ok:${e.provider}`));
    bus.on('provider.failure', (e) => events.push(`fail:${e.provider}`));
    const a = new MockProvider('anthropic', ['m'], { error: { status: 401 } });
    const b = new MockProvider('openai', ['m'], { responses: [mkResult()] });
    const router = new ProviderRouter({
      providers: [a, b],
      fallbackOrder: ['anthropic', 'openai'],
      logger: silentLogger,
      eventBus: bus,
      maxAttemptsPerProvider: 1,
    });
    await router.complete([{ role: 'user', content: 'hi' }], { model: 'm' });
    expect(events).toEqual(['fail:anthropic', 'ok:openai']);
  });

  it('throws CircuitBreakerError when all providers are circuit-broken', async () => {
    const a = new MockProvider('anthropic', ['m'], { error: { status: 500 } });
    const now = 0;
    const router = new ProviderRouter({
      providers: [a],
      fallbackOrder: ['anthropic'],
      logger: silentLogger,
      maxAttemptsPerProvider: 1,
      circuitBreakerMaxFailures: 1,
      circuitBreakerCooldownMs: 1000,
      now: () => now,
      baseDelayMs: 1,
      maxDelayMs: 5,
    });
    await expect(
      router.complete([{ role: 'user', content: 'x' }], { model: 'm' }),
    ).rejects.toBeDefined();
    // a is open now
    await expect(
      router.complete([{ role: 'user', content: 'y' }], { model: 'm' }),
    ).rejects.toMatchObject({ code: 'FZ_CIRCUIT_BREAKER' });
  });

  it('throws ProviderError when all providers fail without circuit breaker', async () => {
    const a = new MockProvider('anthropic', ['m'], { error: { status: 401 } });
    const b = new MockProvider('openai', ['m'], { error: { status: 401 } });
    const router = new ProviderRouter({
      providers: [a, b],
      fallbackOrder: ['anthropic', 'openai'],
      logger: silentLogger,
      maxAttemptsPerProvider: 1,
    });
    await expect(
      router.complete([{ role: 'user', content: 'x' }], { model: 'm' }),
    ).rejects.toMatchObject({ code: 'FZ_PROVIDER' });
  });

  it('orders unmentioned providers at the end', async () => {
    const a = new MockProvider('anthropic', ['m'], { responses: [mkResult({ content: 'A' })] });
    const b = new MockProvider('openai', ['m'], { responses: [mkResult({ content: 'B' })] });
    const router = new ProviderRouter({
      providers: [a, b],
      // mencione apenas openai; anthropic deve ir para o fim
      fallbackOrder: ['openai'],
      logger: silentLogger,
      maxAttemptsPerProvider: 1,
    });
    expect(router.getProviderNames()).toEqual(['openai', 'anthropic']);
  });
});
