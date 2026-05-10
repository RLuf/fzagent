import { createLogger } from '@fzagent/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { defineTool } from './types.js';
import { ToolRegistry } from './registry.js';

const silent = createLogger({ format: 'silent', level: 'silent' });

const echoTool = defineTool({
  name: 'echo',
  description: 'returns the input verbatim',
  inputSchema: z.object({ msg: z.string() }),
  permissions: 'low',
  async run(_ctx, input) {
    return `echo: ${input.msg}`;
  },
});

const failingTool = defineTool({
  name: 'fail',
  description: 'always throws',
  inputSchema: z.object({}),
  permissions: 'low',
  async run() {
    throw new Error('boom');
  },
});

function ctx() {
  return {
    agentId: 'a',
    sessionId: 's',
    cwd: '/tmp',
    logger: silent,
  } as const;
}

describe('ToolRegistry', () => {
  it('registers and dispatches tools', async () => {
    const reg = new ToolRegistry().register(echoTool);
    expect(reg.has('echo')).toBe(true);
    expect(reg.list()).toHaveLength(1);
    const r = await reg.execute('echo', { msg: 'hi' }, ctx());
    expect(r.ok).toBe(true);
    expect(r.output).toBe('echo: hi');
  });

  it('rejects unknown tool', async () => {
    const reg = new ToolRegistry();
    const r = await reg.execute('missing', {}, ctx());
    expect(r.ok).toBe(false);
    expect(String(r.output)).toContain('Tool not found');
  });

  it('captures tool errors as ok=false', async () => {
    const reg = new ToolRegistry().register(failingTool);
    const r = await reg.execute('fail', {}, ctx());
    expect(r.ok).toBe(false);
    expect(String(r.output)).toContain('boom');
  });

  it('validates input via Zod', async () => {
    const reg = new ToolRegistry().register(echoTool);
    const r = await reg.execute('echo', { msg: 42 }, ctx());
    expect(r.ok).toBe(false);
    expect(String(r.output)).toMatch(/Invalid input/);
  });

  it('refuses duplicate registration', () => {
    const reg = new ToolRegistry().register(echoTool);
    expect(() => reg.register(echoTool)).toThrow(/already registered/);
  });

  it('produces LLM tool definitions', () => {
    const reg = new ToolRegistry().register(echoTool);
    const llm = reg.toLLMTools();
    expect(llm).toHaveLength(1);
    expect(llm[0]?.name).toBe('echo');
    expect(llm[0]?.inputSchema).toMatchObject({
      type: 'object',
      properties: { msg: { type: 'string' } },
      required: ['msg'],
    });
  });
});
