// Circuit breaker do nivel de Agent (separado do CB de Provider).
//
// Conta falhas CONSECUTIVAS de iteracao do loop. Sucesso reseta. Quando
// atinge maxFailures, abre a sessao e o agent.run() retorna evento
// 'circuit-breaker-tripped' e finaliza.

export interface AgentCircuitBreakerConfig {
  maxFailures: number;
  cooldownMs: number;
  now?: () => number;
}

export type CircuitState = 'closed' | 'open';

export interface AgentCircuitBreakerSnapshot {
  state: CircuitState;
  consecutiveFailures: number;
  cooldownUntil: number;
}

export class AgentCircuitBreaker {
  private state: CircuitState = 'closed';
  private consecutiveFailures = 0;
  private cooldownUntil = 0;
  private readonly now: () => number;

  constructor(private readonly config: AgentCircuitBreakerConfig) {
    this.now = config.now ?? Date.now;
  }

  canProceed(): boolean {
    if (this.state === 'open' && this.now() < this.cooldownUntil) return false;
    if (this.state === 'open') {
      // cooldown expirou — fecha automaticamente.
      this.state = 'closed';
      this.consecutiveFailures = 0;
      this.cooldownUntil = 0;
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
    if (this.consecutiveFailures >= this.config.maxFailures) {
      this.state = 'open';
      this.cooldownUntil = this.now() + this.config.cooldownMs;
    }
  }

  snapshot(): AgentCircuitBreakerSnapshot {
    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      cooldownUntil: this.cooldownUntil,
    };
  }
}
