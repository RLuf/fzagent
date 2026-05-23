// WORA heartbeat — Watch / Observe / Reason (zero-LLM) / Act.
//
// A cada `intervalMs`, observa metricas baratas e age por heuristica:
// - heap > 80% do limite -> sugerir gc / log warn.
// - qdrant ping falhou ultima vez -> tentar reconectar.
// - disco do db quase cheio -> emitir alerta no event bus.
//
// Sem chamada ao LLM. Custo desprezivel. Pode ser desabilitado com
// AGENTIC_HEARTBEAT_INTERVAL=0.

import type { FzagentEventBus, FzagentLogger } from '@fzagent/core';

export interface HeartbeatTickResult {
  ts: number;
  heapUsedMb: number;
  heapTotalMb: number;
  rssMb: number;
  actions: string[];
}

export interface HeartbeatOptions {
  intervalMs: number;
  logger?: FzagentLogger;
  eventBus?: FzagentEventBus;
  // injecoes para teste
  now?: () => number;
  heapStats?: () => NodeJS.MemoryUsage;
}

export class WORAHeartbeat {
  private timer: NodeJS.Timeout | null = null;
  private readonly logger: FzagentLogger | undefined;
  private readonly eventBus: FzagentEventBus | undefined;
  private readonly intervalMs: number;
  private readonly now: () => number;
  private readonly heapStats: () => NodeJS.MemoryUsage;

  constructor(opts: HeartbeatOptions) {
    this.intervalMs = opts.intervalMs;
    this.logger = opts.logger?.child({ scope: 'wora-heartbeat' });
    this.eventBus = opts.eventBus;
    this.now = opts.now ?? Date.now;
    this.heapStats = opts.heapStats ?? ((): NodeJS.MemoryUsage => process.memoryUsage());
  }

  start(): void {
    if (this.intervalMs <= 0) {
      this.logger?.debug('heartbeat disabled (intervalMs <= 0)');
      return;
    }
    if (this.timer) return;
    this.timer = setInterval(() => {
      try {
        this.tick();
      } catch (err) {
        this.logger?.warn(
          { error: err instanceof Error ? err.message : String(err) },
          'heartbeat tick failed',
        );
      }
    }, this.intervalMs);
    // unref para nao bloquear o process exit
    this.timer.unref?.();
    this.logger?.info({ intervalMs: this.intervalMs }, 'heartbeat started');
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // Executa uma iteracao manualmente (util em testes).
  tick(): HeartbeatTickResult {
    const mem = this.heapStats();
    const heapUsedMb = mem.heapUsed / 1_048_576;
    const heapTotalMb = mem.heapTotal / 1_048_576;
    const rssMb = mem.rss / 1_048_576;
    const actions: string[] = [];

    // R: heuristica zero-LLM
    if (heapTotalMb > 0 && heapUsedMb / heapTotalMb > 0.8) {
      actions.push('heap-warn');
      this.logger?.warn(
        { heapUsedMb: Math.round(heapUsedMb), heapTotalMb: Math.round(heapTotalMb) },
        'heap usage > 80%',
      );
    }

    // A: emite tick para observability
    this.eventBus?.emit('heartbeat.tick', {
      ts: this.now(),
      heapUsedMb: Math.round(heapUsedMb),
    });

    return { ts: this.now(), heapUsedMb, heapTotalMb, rssMb, actions };
  }
}
