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
  | { type: 'end'; stopReason: string; iterations: number; tokensUsed: number };

export interface AgentRunConfig {
  maxIterations: number;
  tokenBudget: number;
  circuitBreakerMaxFailures: number;
  circuitBreakerCooldownMs: number;
  defaultModel: string;
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

    const systemPrompt = await assembleSystemPrompt({
      ...this.opts.contextLayers,
      agentId: this.opts.agentId,
      sessionId: session.id,
      task: input.task,
      tools: this.opts.tools,
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
