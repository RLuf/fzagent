// Circuit breaker classico de tres estados. Decisoes:
// - closed:    operacao normal; falhas incrementam contador.
// - open:      bloqueia ate cooldownUntil; canExecute() retorna false.
// - half-open: depois do cooldown, deixa UMA tentativa passar; sucesso volta
//              ao closed, falha re-abre por outro periodo de cooldown.
// Now() injetavel facilita testes deterministicos.

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  maxFailures: number;
  cooldownMs: number;
  // Injecao de relogio para testes.
  now?: () => number;
}

export interface CircuitBreakerSnapshot {
  state: CircuitBreakerState;
  consecutiveFailures: number;
  cooldownUntil: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private consecutiveFailures = 0;
  private cooldownUntil = 0;
  private readonly now: () => number;

  constructor(private readonly config: CircuitBreakerConfig) {
    this.now = config.now ?? Date.now;
  }

  canExecute(): boolean {
    if (this.state === 'closed') return true;
    if (this.state === 'open') {
      if (this.now() >= this.cooldownUntil) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }
    return true;
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = 'closed';
    this.cooldownUntil = 0;
  }

  recordFailure(): void {
    this.consecutiveFailures += 1;
    if (this.state === 'half-open' || this.consecutiveFailures >= this.config.maxFailures) {
      this.state = 'open';
      this.cooldownUntil = this.now() + this.config.cooldownMs;
    }
  }

  reset(): void {
    this.state = 'closed';
    this.consecutiveFailures = 0;
    this.cooldownUntil = 0;
  }

  snapshot(): CircuitBreakerSnapshot {
    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      cooldownUntil: this.cooldownUntil,
    };
  }
}
