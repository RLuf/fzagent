// Retry com backoff exponencial + jitter. Decisoes:
// - delay = min(baseDelayMs * factor^(attempt-1), maxDelayMs).
// - jitter (default true): multiplica por random(0.5..1.0) — evita thundering
//   herd quando varios clientes retentam ao mesmo tempo apos uma falha global.
// - isRetryable padrao reconhece HTTP 429/5xx e codes de erro de rede.

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  factor?: number;
  jitter?: boolean;
  isRetryable?: (error: unknown) => boolean;
  // Injecoes para teste deterministico.
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

const NETWORK_ERROR_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
  'EHOSTUNREACH',
]);

export function defaultIsRetryable(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as { status?: number; code?: string; name?: string };

  if (typeof e.status === 'number') {
    if (e.status === 408 || e.status === 429) return true;
    if (e.status >= 500 && e.status < 600) return true;
    return false;
  }

  if (typeof e.code === 'string' && NETWORK_ERROR_CODES.has(e.code)) {
    return true;
  }

  // fetch AbortError — geralmente NAO queremos retentar; e intencional.
  if (e.name === 'AbortError') return false;

  return false;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export async function retry<T>(
  fn: (attempt: number) => Promise<T>,
  config: RetryConfig,
): Promise<T> {
  const factor = config.factor ?? 2;
  const useJitter = config.jitter ?? true;
  const sleep = config.sleep ?? defaultSleep;
  const random = config.random ?? Math.random;
  const isRetryable = config.isRetryable ?? defaultIsRetryable;

  let lastError: unknown;
  for (let attempt = 1; attempt <= config.maxAttempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === config.maxAttempts) {
        throw err;
      }
      let delay = Math.min(config.baseDelayMs * Math.pow(factor, attempt - 1), config.maxDelayMs);
      if (useJitter) {
        delay = delay * (0.5 + random() * 0.5);
      }
      await sleep(delay);
    }
  }
  // unreachable, mas TS exige.
  throw lastError;
}
