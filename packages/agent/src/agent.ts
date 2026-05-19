// Agent — nucleo OpenClaw-style com budget loop.
//
// State machine implicita: THINK (provider.complete) -> ACT (executar
// tool_calls retornadas) -> OBSERVE (anexar tool_result ao historico) ->
// REFLECT (proxima iteracao com historico atualizado).
//
// Para por:
//   - stopReason 'end_turn' (modelo terminou naturalmente)
//   - tool_calls vazias na resposta (mesma coisa, defensivo)
//   - maxIterations atingido
//   - tokenBudget excedido
//   - circuit breaker aberto (3 falhas consecutivas default)
//   - signal abortado pelo usuario
//
// Saida via async iterator AgentEvent — facilita streaming na CLI/UI sem
// acumular tudo em memoria.

import { randomUUID } from 'node:crypto';

import type { FzagentEventBus, FzagentLogger, Message, ToolCall, ToolResult } from '@fzagent/core';
import type { CompleteOptions, ProviderRouter } from '@fzagent/providers';

import { AgentCircuitBreaker } from './circuit-breaker.js';
import { assembleSystemPrompt, type AssembleInput } from './context-assembler.js';
import type { SessionStore } from './session/store.js';
import type { ToolContext, ToolRegistry } from './tools/index.js';

export type AgentEvent =
  | { type: 'session-started'; sessionId: string }
  | { type: 'iteration'; n: number }
  | { type: 'thinking' }
  | { type: 'assistant'; message: Message; tokensIn: number; tokensOut: number }
  | { type: 'tool-call'; call: ToolCall }
  | { type: 'tool-result'; call: ToolCall; output: string; ok: boolean; durationMs: number }
  | { type: 'iteration-error'; error: string }
  | {
      type: 'budget-exceeded';
      reason: 'max-iterations' | 'token-budget';
      iterations: number;
      tokensUsed: number;
    }
  | { type: 'circuit-breaker-tripped'; failures: number }
  | { type: 'aborted' }
  | { type: 'end'; stopReason: string; iterations: number; tokensUsed: number }
  // FCC fix — reinjecao periodica da tarefa para mitigar dilucao de atencao.
  | {
      type: 'context-reinjected';
      iteration: number;
      tokensUsed: number;
      reminderTokens: number;
    }
  // Compaction LLM (sub-sessao 2 do plano FCC). Eventos declarados ja para
  // observability futura; emissao implementada em sub-sessao 2.
  | { type: 'compaction-triggered'; reason: 'token-threshold'; tokensBefore: number }
  | {
      type: 'compaction-completed';
      messagesBefore: number;
      messagesAfter: number;
      tokensSaved: number;
    };

export interface AgentRunConfig {
  maxIterations: number;
  tokenBudget: number;
  circuitBreakerMaxFailures: number;
  circuitBreakerCooldownMs: number;
  defaultModel: string;
  // FCC fix — opcionais, defaults seguros (legacy off) quando ausentes.
  // Factory sempre passa explicitamente em producao; tests podem omitir.
  historyTurns?: number;
  compactionThresholdPct?: number;
  reinjectEvery?: number;
  taskPinningEnabled?: boolean;
  compactionKeepRecent?: number;
}

export interface AgentOptions {
  agentId: string;
  router: ProviderRouter;
  tools: ToolRegistry;
  sessionStore: SessionStore;
  config: AgentRunConfig;
  logger: FzagentLogger;
  eventBus?: FzagentEventBus;
  // builder de system prompt (caller pode customizar layers).
  contextLayers: Omit<AssembleInput, 'agentId' | 'sessionId' | 'task' | 'tools' | 'logger'>;
  // injecoes opcionais — ficam disponiveis para tools.
  toolDeps?: {
    indexer?: unknown;
    qdrant?: unknown;
    embeddings?: unknown;
    skillRegistry?: unknown;
  };
}

export interface RunInput {
  task: string;
  // history previa (opcional); se nao houver, comeca do zero.
  history?: Message[];
  signal?: AbortSignal;
  // override do model (default = config.defaultModel).
  model?: string;
  channel?: string;
}

export class Agent {
  private readonly opts: AgentOptions;

  constructor(opts: AgentOptions) {
    this.opts = opts;
  }

  async *run(input: RunInput): AsyncIterable<AgentEvent> {
    const session = this.opts.sessionStore.createSession({
      agentId: this.opts.agentId,
      task: input.task,
    });
    yield { type: 'session-started', sessionId: session.id };

    const messages: Message[] = [...(input.history ?? [])];
    // mensagem inicial do usuario (a tarefa) se nao estiver no historico.
    if (messages.length === 0 || messages[messages.length - 1]?.role !== 'user') {
      const userMsg: Message = { role: 'user', content: input.task, timestamp: Date.now() };
      messages.push(userMsg);
      this.opts.sessionStore.recordTurn(session.id, userMsg);
    }
    // FCC fix — captura o index da tarefa "ancora" NO MOMENTO do push.
    // Necessario porque input.history pode pre-popular messages com user msgs
    // anteriores; tarefa nao eh sempre index 0. Compaction (sub-sessao 2) usa
    // para preservar a tarefa ao comprimir o meio do historico.
    const _taskMessageIndex = messages.length - 1;

    const systemPrompt = await assembleSystemPrompt({
      ...this.opts.contextLayers,
      agentId: this.opts.agentId,
      sessionId: session.id,
      task: input.task,
      tools: this.opts.tools,
      ...(this.opts.config.taskPinningEnabled !== undefined && {
        taskPinningEnabled: this.opts.config.taskPinningEnabled,
      }),
      ...(input.channel !== undefined && { channel: input.channel }),
      ...(this.opts.logger !== undefined && { logger: this.opts.logger }),
    });

    const cb = new AgentCircuitBreaker({
      maxFailures: this.opts.config.circuitBreakerMaxFailures,
      cooldownMs: this.opts.config.circuitBreakerCooldownMs,
    });

    let iter = 0;
    let tokensUsed = 0;
    let stopReason = 'end_turn';

    while (true) {
      if (!cb.canProceed()) {
        this.opts.eventBus?.emit('agent.circuit-breaker-tripped', {
          agentId: this.opts.agentId,
          sessionId: session.id,
          failures: cb.snapshot().consecutiveFailures,
        });
        yield { type: 'circuit-breaker-tripped', failures: cb.snapshot().consecutiveFailures };
        this.opts.sessionStore.closeSession(session.id, 'failed');
        return;
      }

      if (input.signal?.aborted) {
        yield { type: 'aborted' };
        this.opts.sessionStore.closeSession(session.id, 'aborted');
        return;
      }

      if (iter >= this.opts.config.maxIterations) {
        this.opts.eventBus?.emit('agent.budget-exceeded', {
          agentId: this.opts.agentId,
          sessionId: session.id,
          tokensUsed,
        });
        yield {
          type: 'budget-exceeded',
          reason: 'max-iterations',
          iterations: iter,
          tokensUsed,
        };
        this.opts.sessionStore.closeSession(session.id, 'aborted');
        return;
      }

      if (tokensUsed >= this.opts.config.tokenBudget) {
        this.opts.eventBus?.emit('agent.budget-exceeded', {
          agentId: this.opts.agentId,
          sessionId: session.id,
          tokensUsed,
        });
        yield {
          type: 'budget-exceeded',
          reason: 'token-budget',
          iterations: iter,
          tokensUsed,
        };
        this.opts.sessionStore.closeSession(session.id, 'aborted');
        return;
      }

      iter += 1;
      yield { type: 'iteration', n: iter };
      this.opts.eventBus?.emit('agent.iteration', {
        agentId: this.opts.agentId,
        sessionId: session.id,
        iteration: iter,
        tokensUsed,
      });
      yield { type: 'thinking' };

      // FCC fix — reinjecao periodica da tarefa. A cada N iteracoes (config
      // AGENTIC_REINJECT_EVERY, default 5), injeta mensagem user sintetica
      // lembrando o objetivo, posicao atual e orcamento. Mitiga "lost in the
      // middle" reforcando a task imediatamente antes da chamada LLM.
      // Skip iter=1 (a tarefa acabou de ser pushada, redundante).
      // Default legacy (sem reinjecao) quando config.reinjectEvery undefined.
      const reinjectEvery = this.opts.config.reinjectEvery ?? 0;
      if (reinjectEvery > 0 && iter > 1 && iter % reinjectEvery === 0) {
        const reminder = `[LEMBRETE] Tarefa original: ${input.task}. Iteracao ${iter}/${this.opts.config.maxIterations}. Tokens usados: ${tokensUsed}/${this.opts.config.tokenBudget}. Mantenha o foco no objetivo acima.`;
        const reminderMsg: Message = {
          role: 'user',
          content: reminder,
          timestamp: Date.now(),
        };
        messages.push(reminderMsg);
        this.opts.sessionStore.recordTurn(session.id, reminderMsg);
        // Estimativa grosseira de tokens do reminder (~4 chars/token).
        const reminderTokens = Math.ceil(reminder.length / 4);
        this.opts.eventBus?.emit('agent.context-reinjected', {
          agentId: this.opts.agentId,
          sessionId: session.id,
          iteration: iter,
          tokensUsed,
          reminderTokens,
        });
        yield {
          type: 'context-reinjected',
          iteration: iter,
          tokensUsed,
          reminderTokens,
        };
      }

      const completeOpts: CompleteOptions = {
        model: input.model ?? this.opts.config.defaultModel,
        systemPrompt,
        tools: this.opts.tools.toLLMTools(),
        ...(input.signal !== undefined && { signal: input.signal }),
      };

      let resp;
      try {
        resp = await this.opts.router.complete(messages, completeOpts);
      } catch (err) {
        cb.recordFailure();
        const msg = err instanceof Error ? err.message : String(err);
        this.opts.logger.warn({ iter, error: msg }, 'iteration failed');
        yield { type: 'iteration-error', error: msg };
        continue;
      }
      cb.recordSuccess();
      tokensUsed += resp.usage.inputTokens + resp.usage.outputTokens;

      const asstMsg: Message = {
        role: 'assistant',
        content: resp.content,
        ...(resp.toolCalls.length > 0 && { tool_calls: resp.toolCalls }),
        timestamp: Date.now(),
      };
      messages.push(asstMsg);
      const turnId = this.opts.sessionStore.recordTurn(session.id, asstMsg, {
        tokensIn: resp.usage.inputTokens,
        tokensOut: resp.usage.outputTokens,
      });
      yield {
        type: 'assistant',
        message: asstMsg,
        tokensIn: resp.usage.inputTokens,
        tokensOut: resp.usage.outputTokens,
      };

      if (resp.toolCalls.length === 0 || resp.stopReason === 'end_turn') {
        stopReason = resp.stopReason;
        break;
      }

      // Executa cada tool_call sequencialmente. Resultados viram tool messages.
      for (const tc of resp.toolCalls) {
        yield { type: 'tool-call', call: tc };
        this.opts.eventBus?.emit('agent.tool-call', {
          agentId: this.opts.agentId,
          sessionId: session.id,
          toolCall: tc,
        });

        const toolCtx: ToolContext = this.makeToolCtx(session.id, messages, input.signal);
        const exec = await this.opts.tools.execute(tc.name, tc.input, toolCtx);
        const outputStr = stringifyOutput(exec.output);
        const result: ToolResult = {
          tool_call_id: tc.id,
          content: outputStr,
          is_error: !exec.ok,
        };
        this.opts.sessionStore.recordToolCall(turnId, tc, exec.output, exec.durationMs, exec.ok);
        this.opts.eventBus?.emit('agent.tool-result', {
          agentId: this.opts.agentId,
          sessionId: session.id,
          result,
        });
        yield {
          type: 'tool-result',
          call: tc,
          output: outputStr,
          ok: exec.ok,
          durationMs: exec.durationMs,
        };

        const toolMsg: Message = {
          role: 'tool',
          content: outputStr,
          tool_call_id: tc.id,
          timestamp: Date.now(),
        };
        messages.push(toolMsg);
        this.opts.sessionStore.recordTurn(session.id, toolMsg);
      }

      stopReason = resp.stopReason;
      if (resp.stopReason === 'tool_use') continue;
      // Para evitar loop em caso de stopReason 'error': falha registrada acima.
    }

    yield { type: 'end', stopReason, iterations: iter, tokensUsed };
    this.opts.sessionStore.closeSession(session.id, 'completed');
  }

  // Util para tools que precisam dos servicos compartilhados.
  private makeToolCtx(
    sessionId: string,
    history: Message[],
    signal: AbortSignal | undefined,
  ): ToolContext {
    const ctx: ToolContext = {
      agentId: this.opts.agentId,
      sessionId,
      cwd: process.cwd(),
      logger: this.opts.logger.child({ sessionId }),
      history,
    };
    if (signal !== undefined) ctx.signal = signal;
    if (this.opts.router !== undefined) ctx.router = this.opts.router;
    if (this.opts.toolDeps?.indexer !== undefined) ctx.indexer = this.opts.toolDeps.indexer;
    if (this.opts.toolDeps?.qdrant !== undefined) ctx.qdrant = this.opts.toolDeps.qdrant;
    if (this.opts.toolDeps?.embeddings !== undefined) {
      ctx.embeddings = this.opts.toolDeps.embeddings;
    }
    if (this.opts.toolDeps?.skillRegistry !== undefined) {
      ctx.skillRegistry = this.opts.toolDeps.skillRegistry;
    }
    return ctx;
  }
}

function stringifyOutput(out: unknown): string {
  if (typeof out === 'string') return out;
  try {
    return JSON.stringify(out, null, 2);
  } catch {
    return String(out);
  }
}

// Util para callers gerarem ids consistentes em testes.
export const generateSessionId = (): string => randomUUID();
