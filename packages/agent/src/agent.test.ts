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
});
