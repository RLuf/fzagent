// fetchWithTimeout — replicado do padrao fazai-ng v3.21.0 (config/timeouts.ts).
// Decisoes:
// 1. Combina AbortSignal externo (do caller) com AbortSignal interno (timeout).
//    Usa AbortSignal.any (Node 20.3+) para mesclar.
// 2. Erros de timeout viram TimeoutError com code=ETIMEDOUT (retentavel pelo router).
// 3. Timeouts default por provider — ajuste se necessario via API_TIMEOUTS.

export const API_TIMEOUTS = {
  anthropic: 120_000, // 2 min — streaming pode ser longo
  openai: 180_000, // 3 min
  openrouter: 120_000,
  ollama: 180_000, // local, mas primeira carga e lenta
  google: 90_000,
  default: 60_000,
} as const;

export type TimeoutProvider = keyof typeof API_TIMEOUTS;

export function getTimeout(provider: TimeoutProvider | string): number {
  if (provider in API_TIMEOUTS) return API_TIMEOUTS[provider as TimeoutProvider];
  return API_TIMEOUTS.default;
}

export interface FetchWithTimeoutOptions extends RequestInit {
  // override do provider lookup
  timeoutMs?: number;
}

export class TimeoutError extends Error {
  override readonly name = 'TimeoutError';
  readonly code = 'ETIMEDOUT';
  readonly provider: string;
  readonly timeoutMs: number;

  constructor(provider: string, timeoutMs: number) {
    super(`Request timeout for ${provider} after ${timeoutMs}ms`);
    this.provider = provider;
    this.timeoutMs = timeoutMs;
  }
}

export async function fetchWithTimeout(
  url: string,
  init: FetchWithTimeoutOptions = {},
  provider: TimeoutProvider | string = 'default',
): Promise<Response> {
  const timeoutMs = init.timeoutMs ?? getTimeout(provider);
  const { timeoutMs: _omit, signal: externalSignal, ...rest } = init;
  void _omit;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Combina sinais (Node 20.3+ tem AbortSignal.any).
  let signal: AbortSignal = controller.signal;
  if (externalSignal) {
    signal = AbortSignal.any([controller.signal, externalSignal]);
    if (externalSignal.aborted) controller.abort();
  }

  try {
    return await fetch(url, { ...rest, signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      // Distingue timeout interno de cancelamento externo.
      if (externalSignal?.aborted) throw err;
      throw new TimeoutError(provider, timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
