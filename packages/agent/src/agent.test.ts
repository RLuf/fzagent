// Integration test do Agent com MockProvider e SessionStore real.

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createLogger } from '@fzagent/core';
import { MockProvider, ProviderRouter } from '@fzagent/providers';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { Agent, type AgentEvent } from './agent.js';
import { SessionStore } from './session/store.js';
import { ToolRegistry, defineTool } from './tools/index.js';

const silent = createLogger({ format: 'silent', level: 'silent' });

let dir: string;
let store: SessionStore;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'fz-agent-'));
  store = new SessionStore({ dbPath: join(dir, 'sessions.sqlite') });
});

afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

const echoTool = defineTool({
  name: 'echo',
  description: 'echoes input',
  inputSchema: z.object({ text: z.string() }),
  permissions: 'low',
  async run(_ctx, input) {
    return `ECHO: ${input.text}`;
  },
});

function makeAgent(provider: MockProvider): Agent {
  const router = new ProviderRouter({
    providers: [provider],
    fallbackOrder: [provider.name],
    logger: silent,
    maxAttemptsPerProvider: 1,
  });
  return new Agent({
    agentId: 'tester',
    router,
    tools: new ToolRegistry().register(echoTool),
    sessionStore: store,
    config: {
      maxIterations: 5,
      tokenBudget: 10_000,
      circuitBreakerMaxFailures: 3,
      circuitBreakerCooldownMs: 1000,
      defaultModel: 'mock',
    },
    logger: silent,
    contextLayers: {
      identity: { name: 'fzagent-test', description: 'test agent' },
    },
  });
}

async function collect(it: AsyncIterable<AgentEvent>): Promise<AgentEvent[]> {
  const out: AgentEvent[] = [];
  for await (const e of it) out.push(e);
  return out;
}

describe('Agent.run', () => {
  it('completes single-turn interaction (no tool calls)', async () => {
    const provider = new MockProvider('anthropic', ['mock'], {
      responses: [
        {
          content: 'hello',
          toolCalls: [],
          stopReason: 'end_turn',
          usage: { inputTokens: 5, outputTokens: 5 },
          model: 'mock',
          provider: 'anthropic',
        },
      ],
    });
    const agent = makeAgent(provider);
    const events = await collect(agent.run({ task: 'say hi' }));
    const types = events.map((e) => e.type);
    expect(types).toContain('session-started');
    expect(types).toContain('iteration');
    expect(types).toContain('assistant');
    expect(types).toContain('end');
  });

  it('executes a tool call and re-iterates', async () => {
    const provider = new MockProvider('anthropic', ['mock'], {
      fn: (_msgs) => {
        // primeira chamada: pede tool. segunda chamada: termina.
        if (provider.callCount === 1) {
          return {
            content: 'will use tool',
            toolCalls: [{ id: 't1', name: 'echo', input: { text: 'hi' } }],
            stopReason: 'tool_use',
            usage: { inputTokens: 5, outputTokens: 5 },
            model: 'mock',
            provider: 'anthropic',
          };
        }
        return {
          content: 'done',
          toolCalls: [],
          stopReason: 'end_turn',
          usage: { inputTokens: 5, outputTokens: 5 },
          model: 'mock',
          provider: 'anthropic',
        };
      },
    });
    const agent = makeAgent(provider);
    const events = await collect(agent.run({ task: 'echo hi' }));
    const toolCallEv = events.find((e) => e.type === 'tool-call');
    const toolResultEv = events.find((e) => e.type === 'tool-result');
    expect(toolCallEv).toBeDefined();
    expect(toolResultEv).toBeDefined();
    if (toolResultEv?.type === 'tool-result') {
      expect(toolResultEv.output).toContain('ECHO: hi');
      expect(toolResultEv.ok).toBe(true);
    }
  });

  it('respects maxIterations budget', async () => {
    const provider = new MockProvider('anthropic', ['mock'], {
      fn: () => ({
        content: '',
        toolCalls: [{ id: 't1', name: 'echo', input: { text: 'loop' } }],
        stopReason: 'tool_use',
        usage: { inputTokens: 5, outputTokens: 5 },
        model: 'mock',
        provider: 'anthropic',
      }),
    });
    const router = new ProviderRouter({
      providers: [provider],
      fallbackOrder: [provider.name],
      logger: silent,
      maxAttemptsPerProvider: 1,
    });
    const agent = new Agent({
      agentId: 'tester',
      router,
      tools: new ToolRegistry().register(echoTool),
      sessionStore: store,
      config: {
        maxIterations: 2,
        tokenBudget: 1_000_000,
        circuitBreakerMaxFailures: 5,
        circuitBreakerCooldownMs: 1000,
        defaultModel: 'mock',
      },
      logger: silent,
      contextLayers: { identity: { name: 'a', description: 'b' } },
    });
    const events = await collect(agent.run({ task: 'loop' }));
    const budget = events.find((e) => e.type === 'budget-exceeded');
    expect(budget).toBeDefined();
    if (budget?.type === 'budget-exceeded') {
      expect(budget.reason).toBe('max-iterations');
    }
  });

  it('reinjeta tarefa a cada N iteracoes (FCC fix) — emite context-reinjected', async () => {
    let calls = 0;
    const provider = new MockProvider('anthropic', ['mock'], {
      fn: () => {
        calls += 1;
        // 8 iters de tool_use seguidas, depois fim (forca passar de iter=5).
        if (calls < 6) {
          return {
            content: '',
            toolCalls: [{ id: `t${calls}`, name: 'echo', input: { text: `n${calls}` } }],
            stopReason: 'tool_use' as const,
            usage: { inputTokens: 5, outputTokens: 5 },
            model: 'mock',
            provider: 'anthropic' as const,
          };
        }
        return {
          content: 'done',
          toolCalls: [],
          stopReason: 'end_turn' as const,
          usage: { inputTokens: 5, outputTokens: 5 },
          model: 'mock',
          provider: 'anthropic' as const,
        };
      },
    });
    const router = new ProviderRouter({
      providers: [provider],
      fallbackOrder: [provider.name],
      logger: silent,
      maxAttemptsPerProvider: 1,
    });
    const agent = new Agent({
      agentId: 'tester',
      router,
      tools: new ToolRegistry().register(echoTool),
      sessionStore: store,
      config: {
        maxIterations: 10,
        tokenBudget: 1_000_000,
        circuitBreakerMaxFailures: 5,
        circuitBreakerCooldownMs: 1000,
        defaultModel: 'mock',
        // FCC: reinjeta a cada 3 iters para o teste ser rapido.
        reinjectEvery: 3,
        taskPinningEnabled: true,
      },
      logger: silent,
      contextLayers: { identity: { name: 'a', description: 'b' } },
    });
    const events = await collect(agent.run({ task: 'loop teste reinjecao' }));
    const reinjects = events.filter((e) => e.type === 'context-reinjected');
    // Em 6 iters efetivas, esperamos reinjecao em iter=3 e iter=6.
    expect(reinjects.length).toBeGreaterThanOrEqual(1);
    if (reinjects[0]?.type === 'context-reinjected') {
      expect(reinjects[0].iteration % 3).toBe(0);
      expect(reinjects[0].reminderTokens).toBeGreaterThan(0);
    }
  });

  it('legacy: reinjectEvery ausente NAO injeta lembretes (retrocompat)', async () => {
    const provider = new MockProvider('anthropic', ['mock'], {
      fn: () => {
        if (provider.callCount < 4) {
          return {
            content: '',
            toolCalls: [{ id: `t${provider.callCount}`, name: 'echo', input: { text: 'x' } }],
            stopReason: 'tool_use' as const,
            usage: { inputTokens: 5, outputTokens: 5 },
            model: 'mock',
            provider: 'anthropic' as const,
          };
        }
        return {
          content: 'done',
          toolCalls: [],
          stopReason: 'end_turn' as const,
          usage: { inputTokens: 5, outputTokens: 5 },
          model: 'mock',
          provider: 'anthropic' as const,
        };
      },
    });
    const agent = makeAgent(provider);
    const events = await collect(agent.run({ task: 'legacy run' }));
    const reinjects = events.filter((e) => e.type === 'context-reinjected');
    expect(reinjects.length).toBe(0);
  });

  it('trips circuit breaker after consecutive failures', async () => {
    const provider = new MockProvider('anthropic', ['mock'], {
      error: { status: 401 }, // nao retentavel pelo router; vira FZ_PROVIDER
    });
    const router = new ProviderRouter({
      providers: [provider],
      fallbackOrder: [provider.name],
      logger: silent,
      maxAttemptsPerProvider: 1,
    });
    const agent = new Agent({
      agentId: 'tester',
      router,
      tools: new ToolRegistry().register(echoTool),
      sessionStore: store,
      config: {
        maxIterations: 10,
        tokenBudget: 1_000_000,
        circuitBreakerMaxFailures: 2,
        circuitBreakerCooldownMs: 100_000,
        defaultModel: 'mock',
      },
      logger: silent,
      contextLayers: { identity: { name: 'a', description: 'b' } },
    });
    const events = await collect(agent.run({ task: 'fail' }));
    const trip = events.find((e) => e.type === 'circuit-breaker-tripped');
    expect(trip).toBeDefined();
  });

  it('dispara compactacao de contexto quando ultrapassa o threshold de tokens', async () => {
    const provider = new MockProvider('anthropic', ['mock'], {
      fn: () => {
        return {
          content: 'Resumo da conversa anterior',
          toolCalls: [],
          stopReason: 'end_turn' as const,
          usage: { inputTokens: 5, outputTokens: 5 },
          model: 'mock',
          provider: 'anthropic' as const,
        };
      },
    });

    const router = new ProviderRouter({
      providers: [provider],
      fallbackOrder: [provider.name],
      logger: silent,
      maxAttemptsPerProvider: 1,
    });

    const agent = new Agent({
      agentId: 'tester',
      router,
      tools: new ToolRegistry().register(echoTool),
      sessionStore: store,
      config: {
        maxIterations: 5,
        tokenBudget: 100, // Very low token budget to trigger compaction
        compactionThresholdPct: 50, // 50% threshold = 50 tokens
        compactionKeepRecent: 1,
        circuitBreakerMaxFailures: 5,
        circuitBreakerCooldownMs: 1000,
        defaultModel: 'mock',
      },
      logger: silent,
      contextLayers: { identity: { name: 'a', description: 'b' } },
    });

    // We pass a long history to exceed the token budget threshold: 300 chars is ~75 tokens > 50 tokens threshold.
    const longHistory = [
      {
        role: 'user' as const,
        content:
          'This is a long user message that has many characters and exceeds the threshold of fifty tokens easily when counted by character count division by four.',
        timestamp: Date.now(),
      },
      {
        role: 'assistant' as const,
        content:
          'Another long assistant response that also has many characters to make sure we hit the compaction limit and trigger summarization.',
        timestamp: Date.now(),
      },
    ];

    const events = await collect(agent.run({ task: 'Say something short', history: longHistory }));

    const trigger = events.find((e) => e.type === 'compaction-triggered');
    const completed = events.find((e) => e.type === 'compaction-completed');

    expect(trigger).toBeDefined();
    expect(completed).toBeDefined();
  });
});
