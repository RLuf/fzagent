// Erros estruturados com codigos discriminantes. Um codigo 'FZ_*'
// permite filtragem em logs e tratamento downstream sem instanceof.

export class FzagentError extends Error {
  override readonly name: string = 'FzagentError';
  readonly code: string;

  constructor(message: string, code = 'FZ_GENERIC', options?: { cause?: unknown }) {
    super(message, options as ErrorOptions | undefined);
    this.code = code;
  }
}

export class ConfigError extends FzagentError {
  override readonly name = 'ConfigError';
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'FZ_CONFIG', options);
  }
}

export class ValidationError extends FzagentError {
  override readonly name = 'ValidationError';
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'FZ_VALIDATION', options);
  }
}

export class ProviderError extends FzagentError {
  override readonly name = 'ProviderError';
  readonly provider: string;
  constructor(message: string, provider: string, options?: { cause?: unknown }) {
    super(message, 'FZ_PROVIDER', options);
    this.provider = provider;
  }
}

export class CircuitBreakerError extends FzagentError {
  override readonly name = 'CircuitBreakerError';
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'FZ_CIRCUIT_BREAKER', options);
  }
}

export class BudgetExceededError extends FzagentError {
  override readonly name = 'BudgetExceededError';
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'FZ_BUDGET_EXCEEDED', options);
  }
}
