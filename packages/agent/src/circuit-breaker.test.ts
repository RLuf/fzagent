import { describe, expect, it } from 'vitest';

import { AgentCircuitBreaker } from './circuit-breaker.js';

describe('AgentCircuitBreaker', () => {
  it('starts closed and allows execution', () => {
    const cb = new AgentCircuitBreaker({ maxFailures: 3, cooldownMs: 1000 });
    expect(cb.canProceed()).toBe(true);
    expect(cb.snapshot().state).toBe('closed');
  });

  it('opens after maxFailures and blocks during cooldown', () => {
    let now = 0;
    const cb = new AgentCircuitBreaker({ maxFailures: 2, cooldownMs: 1000, now: () => now });
    cb.recordFailure();
    expect(cb.canProceed()).toBe(true);
    cb.recordFailure();
    expect(cb.canProceed()).toBe(false);
    expect(cb.snapshot().state).toBe('open');
    now = 999;
    expect(cb.canProceed()).toBe(false);
  });

  it('auto-closes after cooldown expires', () => {
    let now = 0;
    const cb = new AgentCircuitBreaker({ maxFailures: 1, cooldownMs: 100, now: () => now });
    cb.recordFailure();
    expect(cb.canProceed()).toBe(false);
    now = 100;
    expect(cb.canProceed()).toBe(true);
    expect(cb.snapshot().state).toBe('closed');
  });

  it('success resets counter', () => {
    const cb = new AgentCircuitBreaker({ maxFailures: 3, cooldownMs: 1000 });
    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess();
    expect(cb.snapshot().consecutiveFailures).toBe(0);
  });
});
