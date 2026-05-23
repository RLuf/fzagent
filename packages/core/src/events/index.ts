// Event bus tipado proprio. Decisoes:
// 1. Mitt 3.0.1 tem incompatibilidade com NodeNext + verbatimModuleSyntax
//    (o tipo do default export e tratado como namespace). Como o pacote tem
//    ~200 bytes em JS, vendoramos uma versao tipada propria — zero dep e
//    tipos especificos para as nossas chaves de evento.
// 2. Sem persistencia. FASE 5+ adiciona pending/atomic-rename quando precisarmos
//    do padrao do openclaw step 09 para canais com delivery garantida.
// 3. createEventBus() retorna instancia nova; nao impomos singleton.

import type { AgentState, ToolCall, ToolResult, IngestEvent, QueryEvent } from '../types/index.js';

// Mapa canonico de eventos. Augmentation: consumidores podem extender em
// modulo proprio se precisarem chaves novas (typescript declaration merging).
export type FzagentEventMap = {
  'config.reloaded': { reason: string; ts: number };
  'agent.state-changed': {
    agentId: string;
    sessionId: string;
    from: AgentState;
    to: AgentState;
    ts: number;
  };
  'agent.tool-call': { agentId: string; sessionId: string; toolCall: ToolCall };
  'agent.tool-result': { agentId: string; sessionId: string; result: ToolResult };
  'agent.iteration': {
    agentId: string;
    sessionId: string;
    iteration: number;
    tokensUsed: number;
  };
  'agent.budget-exceeded': { agentId: string; sessionId: string; tokensUsed: number };
  'agent.circuit-breaker-tripped': {
    agentId: string;
    sessionId: string;
    failures: number;
  };
  // FCC fix events (sub-sessao 1 + 2)
  'agent.context-reinjected': {
    agentId: string;
    sessionId: string;
    iteration: number;
    tokensUsed: number;
    reminderTokens: number;
  };
  'agent.compaction-triggered': {
    agentId: string;
    sessionId: string;
    tokensBefore: number;
  };
  'agent.compaction-completed': {
    agentId: string;
    sessionId: string;
    messagesBefore: number;
    messagesAfter: number;
    tokensSaved: number;
  };
  'provider.failure': { provider: string; error: string; ts: number };
  'provider.success': { provider: string; latencyMs: number };
  'wiki.ingest': IngestEvent;
  'wiki.query': QueryEvent;
  'skill.invoked': { skillName: string; durationMs: number; ok: boolean };
  'heartbeat.tick': { ts: number; heapUsedMb: number };
};

export type FzagentEventName = keyof FzagentEventMap;

export type EventHandler<E> = (event: E) => void | Promise<void>;
export type WildcardHandler<M> = <K extends keyof M>(
  name: K,
  payload: M[K],
) => void | Promise<void>;

// Interface publica do bus. Tem `on`, `off`, `emit`, `all` (registry interno
// exposto para inspecao em testes e ferramentas), `clear`.
export interface FzagentEventBus {
  readonly all: Map<
    FzagentEventName | '*',
    Array<EventHandler<unknown> | WildcardHandler<FzagentEventMap>>
  >;
  on<K extends FzagentEventName>(event: K, handler: EventHandler<FzagentEventMap[K]>): void;
  on(event: '*', handler: WildcardHandler<FzagentEventMap>): void;
  off<K extends FzagentEventName>(event: K, handler: EventHandler<FzagentEventMap[K]>): void;
  off(event: '*', handler: WildcardHandler<FzagentEventMap>): void;
  emit<K extends FzagentEventName>(event: K, payload: FzagentEventMap[K]): void;
  clear(): void;
}

export function createEventBus(): FzagentEventBus {
  const all = new Map<
    FzagentEventName | '*',
    Array<EventHandler<unknown> | WildcardHandler<FzagentEventMap>>
  >();

  function on(
    event: FzagentEventName | '*',
    handler: EventHandler<unknown> | WildcardHandler<FzagentEventMap>,
  ): void {
    const list = all.get(event) ?? [];
    list.push(handler);
    all.set(event, list);
  }

  function off(
    event: FzagentEventName | '*',
    handler: EventHandler<unknown> | WildcardHandler<FzagentEventMap>,
  ): void {
    const list = all.get(event);
    if (!list) return;
    const i = list.indexOf(handler);
    if (i !== -1) list.splice(i, 1);
  }

  function emit<K extends FzagentEventName>(event: K, payload: FzagentEventMap[K]): void {
    const list = all.get(event);
    if (list) {
      for (const h of list) {
        try {
          (h as EventHandler<FzagentEventMap[K]>)(payload);
        } catch {
          // listeners nao devem afetar uns aos outros — engole erros sincronos.
          // Promise rejections sao deixadas para o sistema de unhandledRejection.
        }
      }
    }
    const wild = all.get('*');
    if (wild) {
      for (const h of wild) {
        try {
          (h as WildcardHandler<FzagentEventMap>)(event, payload);
        } catch {
          // mesmo motivo do bloco acima.
        }
      }
    }
  }

  function clear(): void {
    all.clear();
  }

  return { all, on, off, emit, clear };
}
