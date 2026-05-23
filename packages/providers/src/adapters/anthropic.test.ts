import { createLogger } from '@fzagent/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnthropicProvider } from './anthropic.js';

const silentLogger = createLogger({ format: 'silent', level: 'silent' });

interface MockFetchCall {
  url: string;
  init: RequestInit;
}

function mockFetch(
  response: unknown,
  status = 200,
): { calls: MockFetchCall[]; restore: () => void } {
  const calls: MockFetchCall[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return new Response(JSON.stringify(response), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

const ok = {
  id: 'msg_x',
  model: 'claude-sonnet-4-5',
  content: [{ type: 'text', text: 'hello' }],
  stop_reason: 'end_turn',
  usage: { input_tokens: 10, output_tokens: 5 },
};

let restore: () => void = () => {};
afterEach(() => restore());
beforeEach(() => {
  restore = () => {};
});

describe('AnthropicProvider construction', () => {
  it('throws when no credential is available', () => {
    expect(
      () =>
        new AnthropicProvider({
          config: { name: 'anthropic', models: [] },
          logger: silentLogger,
          env: {},
        }),
    ).toThrow(/CLAUDE_CODE_OAUTH_TOKEN/);
  });

  it('accepts CLAUDE_CODE_OAUTH_TOKEN', () => {
    expect(
      () =>
        new AnthropicProvider({
          config: { name: 'anthropic', models: [] },
          logger: silentLogger,
          env: { CLAUDE_CODE_OAUTH_TOKEN: 'sk-ant-oat-xxx' },
        }),
    ).not.toThrow();
  });

  it('accepts ANTHROPIC_API_KEY', () => {
    expect(
      () =>
        new AnthropicProvider({
          config: { name: 'anthropic', models: [] },
          logger: silentLogger,
          env: { ANTHROPIC_API_KEY: 'sk-ant-api03-xxx' },
        }),
    ).not.toThrow();
  });
});

describe('AnthropicProvider.complete (OAuth path)', () => {
  it('uses Bearer + Claude Code masquerade headers', async () => {
    const m = mockFetch(ok);
    restore = m.restore;
    const provider = new AnthropicProvider({
      config: { name: 'anthropic', models: [] },
      logger: silentLogger,
      env: { CLAUDE_CODE_OAUTH_TOKEN: 'sk-ant-oat-fake' },
    });
    const r = await provider.complete([{ role: 'user', content: 'hi' }], {
      model: 'claude-sonnet-4-5',
      systemPrompt: 'be polite',
    });
    expect(r.content).toBe('hello');
    expect(r.usage.inputTokens).toBe(10);

    const call = m.calls[0]!;
    expect(call.url).toContain('/v1/messages');
    const headers = call.init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer sk-ant-oat-fake');
    expect(headers['anthropic-beta']).toContain('claude-code');
    expect(headers['user-agent']).toContain('claude-cli');
    expect(headers['x-app']).toBe('cli');
    expect(headers['x-api-key']).toBeUndefined();
    expect(headers['anthropic-version']).toBe('2023-06-01');

    const body = JSON.parse(call.init.body as string) as {
      system: Array<{ text: string }>;
      messages: Array<{ content: string }>;
    };
    // OAuth: system field tem o canonico Claude Code
    expect(body.system[0]?.text).toContain('Claude Code');
    // O system real do usuario foi prepended a primeira user message
    expect(body.messages[0]?.content).toContain('be polite');
    expect(body.messages[0]?.content).toContain('hi');
  });
});

describe('AnthropicProvider.complete (api_key path)', () => {
  it('uses x-api-key header without masquerade', async () => {
    const m = mockFetch(ok);
    restore = m.restore;
    const provider = new AnthropicProvider({
      config: { name: 'anthropic', models: [] },
      logger: silentLogger,
      env: { ANTHROPIC_API_KEY: 'sk-ant-api03-real' },
    });
    await provider.complete([{ role: 'user', content: 'hi' }], {
      model: 'claude-sonnet-4-5',
      systemPrompt: 'be polite',
    });

    const headers = m.calls[0]!.init.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('sk-ant-api03-real');
    expect(headers['Authorization']).toBeUndefined();
    expect(headers['anthropic-beta']).toBeUndefined();

    const body = JSON.parse(m.calls[0]!.init.body as string) as {
      system: Array<{ text: string }>;
      messages: Array<{ content: string }>;
    };
    // api_key: system field tem o prompt do usuario
    expect(body.system[0]?.text).toBe('be polite');
    // user content nao recebe prepend
    expect(body.messages[0]?.content).toBe('hi');
  });
});

describe('AnthropicProvider error handling', () => {
  it('throws on HTTP error', async () => {
    const m = mockFetch({ error: { type: 'invalid', message: 'bad' } }, 400);
    restore = m.restore;
    const provider = new AnthropicProvider({
      config: { name: 'anthropic', models: [] },
      logger: silentLogger,
      env: { ANTHROPIC_API_KEY: 'sk-ant-api03-x' },
    });
    await expect(
      provider.complete([{ role: 'user', content: 'hi' }], { model: 'claude-sonnet-4-5' }),
    ).rejects.toMatchObject({ code: 'FZ_PROVIDER', status: 400 });
  });

  it('throws on data.error in 200 response', async () => {
    const m = mockFetch({ error: { type: 'rate_limit', message: 'too many' } });
    restore = m.restore;
    const provider = new AnthropicProvider({
      config: { name: 'anthropic', models: [] },
      logger: silentLogger,
      env: { ANTHROPIC_API_KEY: 'sk-ant-api03-x' },
    });
    await expect(
      provider.complete([{ role: 'user', content: 'hi' }], { model: 'claude-sonnet-4-5' }),
    ).rejects.toMatchObject({ code: 'FZ_PROVIDER' });
  });
});
