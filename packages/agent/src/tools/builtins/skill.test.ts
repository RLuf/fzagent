// Cobertura do builtin skill.invoke contra um SkillRegistry real (programmatic).
// Garante o contrato cerebro<->skills: descoberta, validacao de input,
// execucao, erro estruturado quando skill nao existe ou falha.

import { createLogger } from '@fzagent/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ToolRegistry } from '../registry.js';
import type { ToolContext } from '../types.js';
import { skillInvoke } from './skill.js';

const silent = createLogger({ format: 'silent', level: 'silent' });

interface MinimalReg {
  invoke(name: string, input: unknown, ctx: unknown): Promise<unknown>;
  list(): Array<{ name: string; description: string }>;
}

function makeCtx(reg?: MinimalReg): ToolContext {
  const ctx: ToolContext = {
    agentId: 'test',
    sessionId: 'sess-1',
    cwd: process.cwd(),
    logger: silent,
  };
  if (reg) ctx.skillRegistry = reg;
  return ctx;
}

describe('skill.invoke builtin', () => {
  it('retorna mensagem informativa quando registry nao foi injetado', async () => {
    const reg = new ToolRegistry().register(skillInvoke);
    const result = await reg.execute('skill.invoke', { name: 'whatever', input: {} }, makeCtx());
    expect(result.ok).toBe(true);
    expect(String(result.output)).toContain('SkillRegistry nao injetado');
  });

  it('delega para o registry real quando injetado e devolve output stringificado', async () => {
    const fakeReg: MinimalReg = {
      async invoke(name, input) {
        return { echoed: name, input };
      },
      list() {
        return [{ name: 'echo', description: 'echoes' }];
      },
    };
    const reg = new ToolRegistry().register(skillInvoke);
    const result = await reg.execute(
      'skill.invoke',
      { name: 'echo', input: { hello: 'world' } },
      makeCtx(fakeReg),
    );
    expect(result.ok).toBe(true);
    const parsed = JSON.parse(String(result.output)) as {
      echoed: string;
      input: { hello: string };
    };
    expect(parsed.echoed).toBe('echo');
    expect(parsed.input.hello).toBe('world');
  });

  it('preserva output string sem JSON-encode quando skill devolve string', async () => {
    const fakeReg: MinimalReg = {
      async invoke() {
        return 'ja sou string';
      },
      list() {
        return [];
      },
    };
    const reg = new ToolRegistry().register(skillInvoke);
    const result = await reg.execute('skill.invoke', { name: 'any', input: {} }, makeCtx(fakeReg));
    expect(result.ok).toBe(true);
    expect(result.output).toBe('ja sou string');
  });

  it('marca ok=false quando o registry lanca (skill nao encontrada ou erro de execucao)', async () => {
    const fakeReg: MinimalReg = {
      async invoke(name) {
        throw new Error(`Skill not found: ${name}`);
      },
      list() {
        return [];
      },
    };
    const reg = new ToolRegistry().register(skillInvoke);
    const result = await reg.execute(
      'skill.invoke',
      { name: 'missing', input: {} },
      makeCtx(fakeReg),
    );
    expect(result.ok).toBe(false);
    expect(String(result.output)).toMatch(/Skill not found/);
  });

  it('rejeita input invalido via Zod (name obrigatorio nao-vazio)', async () => {
    const reg = new ToolRegistry().register(skillInvoke);
    const result = await reg.execute('skill.invoke', { name: '', input: {} }, makeCtx());
    expect(result.ok).toBe(false);
    expect(String(result.output)).toMatch(/Invalid input/);
  });

  it('aceita ausencia do campo input (default vazio)', async () => {
    let received: unknown = null;
    const fakeReg: MinimalReg = {
      async invoke(_name, input) {
        received = input;
        return 'done';
      },
      list() {
        return [];
      },
    };
    const reg = new ToolRegistry().register(skillInvoke);
    const result = await reg.execute('skill.invoke', { name: 'foo' }, makeCtx(fakeReg));
    expect(result.ok).toBe(true);
    expect(received).toEqual({});
  });

  it('aceita input com schema arbitrario (z.record dinamico)', async () => {
    let captured: unknown = null;
    const fakeReg: MinimalReg = {
      async invoke(_name, input) {
        captured = input;
        return 'ok';
      },
      list() {
        return [];
      },
    };
    const reg = new ToolRegistry().register(skillInvoke);
    const payload = { foo: 1, bar: 'two', nested: { deep: [true, false] } };
    const result = await reg.execute(
      'skill.invoke',
      { name: 'x', input: payload },
      makeCtx(fakeReg),
    );
    expect(result.ok).toBe(true);
    expect(captured).toEqual(payload);
    // referencia para z (preservar import sem warning)
    expect(typeof z.string).toBe('function');
  });
});
