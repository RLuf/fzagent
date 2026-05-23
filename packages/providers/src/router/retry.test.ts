import { describe, expect, it } from 'vitest';

import { defaultIsRetryable, retry } from './retry.js';

describe('defaultIsRetryable', () => {
  it('retries 429 and 5xx', () => {
    expect(defaultIsRetryable({ status: 429 })).toBe(true);
    expect(defaultIsRetryable({ status: 500 })).toBe(true);
    expect(defaultIsRetryable({ status: 503 })).toBe(true);
    expect(defaultIsRetryable({ status: 408 })).toBe(true);
  });

  it('does not retry 4xx (except 408/429)', () => {
    expect(defaultIsRetryable({ status: 400 })).toBe(false);
    expect(defaultIsRetryable({ status: 401 })).toBe(false);
    expect(defaultIsRetryable({ status: 404 })).toBe(false);
  });

  it('retries network error codes', () => {
    expect(defaultIsRetryable({ code: 'ECONNRESET' })).toBe(true);
    expect(defaultIsRetryable({ code: 'ETIMEDOUT' })).toBe(true);
  });

  it('does not retry AbortError', () => {
    expect(defaultIsRetryable({ name: 'AbortError' })).toBe(false);
  });

  it('does not retry plain Error', () => {
    expect(defaultIsRetryable(new Error('boom'))).toBe(false);
  });

  it('does not retry non-objects', () => {
    expect(defaultIsRetryable('string')).toBe(false);
    expect(defaultIsRetryable(null)).toBe(false);
  });
});

describe('retry()', () => {
  it('returns on first success', async () => {
    let calls = 0;
    const result = await retry(
      async () => {
        calls += 1;
        return 'ok';
      },
      { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 10, sleep: async () => {} },
    );
    expect(result).toBe('ok');
    expect(calls).toBe(1);
  });

  it('retries on retryable error and succeeds eventually', async () => {
    let calls = 0;
    const slept: number[] = [];
    const result = await retry(
      async () => {
        calls += 1;
        if (calls < 3) throw { status: 500 };
        return 'ok';
      },
      {
        maxAttempts: 5,
        baseDelayMs: 10,
        maxDelayMs: 100,
        sleep: async (ms) => {
          slept.push(ms);
        },
        random: () => 1, // sem jitter aleatorio
      },
    );
    expect(result).toBe('ok');
    expect(calls).toBe(3);
    expect(slept.length).toBe(2);
  });

  it('throws after maxAttempts', async () => {
    let calls = 0;
    await expect(
      retry(
        async () => {
          calls += 1;
          throw { status: 500 };
        },
        {
          maxAttempts: 3,
          baseDelayMs: 1,
          maxDelayMs: 10,
          sleep: async () => {},
        },
      ),
    ).rejects.toEqual({ status: 500 });
    expect(calls).toBe(3);
  });

  it('does not retry non-retryable errors', async () => {
    let calls = 0;
    await expect(
      retry(
        async () => {
          calls += 1;
          throw { status: 400 };
        },
        {
          maxAttempts: 5,
          baseDelayMs: 1,
          maxDelayMs: 10,
          sleep: async () => {},
        },
      ),
    ).rejects.toBeDefined();
    expect(calls).toBe(1);
  });

  it('respects custom isRetryable', async () => {
    let calls = 0;
    await expect(
      retry(
        async () => {
          calls += 1;
          throw new Error('always retry me');
        },
        {
          maxAttempts: 3,
          baseDelayMs: 1,
          maxDelayMs: 10,
          isRetryable: () => true,
          sleep: async () => {},
        },
      ),
    ).rejects.toBeDefined();
    expect(calls).toBe(3);
  });

  it('applies exponential delays', async () => {
    const slept: number[] = [];
    let calls = 0;
    await retry(
      async () => {
        calls += 1;
        if (calls < 4) throw { status: 503 };
        return 'ok';
      },
      {
        maxAttempts: 5,
        baseDelayMs: 100,
        maxDelayMs: 10000,
        factor: 2,
        jitter: false,
        sleep: async (ms) => {
          slept.push(ms);
        },
      },
    );
    expect(slept).toEqual([100, 200, 400]);
  });
});
