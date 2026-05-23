import { describe, expect, it } from 'vitest';

import { CircuitBreaker } from './circuit-breaker.js';

describe('CircuitBreaker', () => {
  it('starts closed and allows execution', () => {
    const cb = new CircuitBreaker({ maxFailures: 3, cooldownMs: 1000 });
    expect(cb.canExecute()).toBe(true);
    expect(cb.snapshot().state).toBe('closed');
  });

  it('opens after maxFailures consecutive failures', () => {
    const now = 0;
    const cb = new CircuitBreaker({ maxFailures: 3, cooldownMs: 1000, now: () => now });
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.canExecute()).toBe(true);
    cb.recordFailure();
    expect(cb.canExecute()).toBe(false);
    expect(cb.snapshot().state).toBe('open');
  });

  it('transitions to half-open after cooldown', () => {
    let now = 1000;
    const cb = new CircuitBreaker({ maxFailures: 1, cooldownMs: 500, now: () => now });
    cb.recordFailure();
    expect(cb.canExecute()).toBe(false);
    now = 1499;
    expect(cb.canExecute()).toBe(false);
    now = 1500;
    expect(cb.canExecute()).toBe(true);
    expect(cb.snapshot().state).toBe('half-open');
  });

  it('half-open success closes circuit', () => {
    let now = 0;
    const cb = new CircuitBreaker({ maxFailures: 1, cooldownMs: 100, now: () => now });
    cb.recordFailure();
    now = 100;
    cb.canExecute(); // moves to half-open
    cb.recordSuccess();
    expect(cb.snapshot().state).toBe('closed');
    expect(cb.snapshot().consecutiveFailures).toBe(0);
  });

  it('half-open failure re-opens circuit', () => {
    let now = 0;
    const cb = new CircuitBreaker({ maxFailures: 1, cooldownMs: 100, now: () => now });
    cb.recordFailure();
    now = 100;
    cb.canExecute(); // half-open
    cb.recordFailure();
    expect(cb.snapshot().state).toBe('open');
    expect(cb.canExecute()).toBe(false);
  });

  it('reset clears state', () => {
    const cb = new CircuitBreaker({ maxFailures: 1, cooldownMs: 1000 });
    cb.recordFailure();
    cb.reset();
    expect(cb.canExecute()).toBe(true);
    expect(cb.snapshot().state).toBe('closed');
    expect(cb.snapshot().consecutiveFailures).toBe(0);
  });

  it('success resets failure counter without opening', () => {
    const cb = new CircuitBreaker({ maxFailures: 3, cooldownMs: 1000 });
    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess();
    expect(cb.snapshot().consecutiveFailures).toBe(0);
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.canExecute()).toBe(true); // ainda nao atingiu maxFailures
  });
});
