// Auditoria de skills: cobre JsonlSkillAuditor + MemorySkillAuditor +
// integracao com SkillRegistry (eventos auto/confirmed/denied).

import { readFileSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createLogger } from '@fzagent/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { JsonlSkillAuditor, MemorySkillAuditor, hashPayload } from './audit.js';
import { SkillRegistry } from './registry.js';
import { defineSkill } from './types.js';

const silent = createLogger({ format: 'silent', level: 'silent' });

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'fz-audit-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function ctx() {
  return { cwd: dir, logger: silent, agentId: 'a1', sessionId: 's1' } as const;
}

function readonlySkill() {
  return defineSkill({
    name: 'r1',
    description: 'read-only',
    permissions: 'low',
    targetDomain: 'kb',
    inputSchema: z.object({ q: z.string() }),
    async run(_c, input) {
      return { echoed: input.q };
    },
  });
}

function highSkill() {
  return defineSkill({
    name: 'destructive-1',
    description: 'destructive',
    permissions: 'high',
    targetDomain: 'system',
    isDestructive: true,
    inputSchema: z.object({}),
    async run() {
      return 'done';
    },
  });
}

describe('hashPayload', () => {
  it('e deterministico para o mesmo input', () => {
    expect(hashPayload({ a: 1 })).toBe(hashPayload({ a: 1 }));
  });

  it('muda quando o input muda', () => {
    expect(hashPayload({ a: 1 })).not.toBe(hashPayload({ a: 2 }));
  });

  it('aceita null e undefined sem lancar', () => {
    expect(hashPayload(null)).toBeTruthy();
    expect(hashPayload(undefined)).toBeTruthy();
  });
});

describe('MemorySkillAuditor + SkillRegistry', () => {
  it('registra evento auto/ok em invocacao bem-sucedida de skill LOW', async () => {
    const mem = new MemorySkillAuditor();
    const reg = new SkillRegistry({ dir, auditor: mem });
    reg.registerProgrammatic(readonlySkill());
    await reg.invoke('r1', { q: 'hello' }, ctx());
    expect(mem.events).toHaveLength(1);
    const ev = mem.events[0]!;
    expect(ev.skill).toBe('r1');
    expect(ev.targetDomain).toBe('kb');
    expect(ev.permissions).toBe('low');
    expect(ev.decision).toBe('auto');
    expect(ev.outcome).toBe('ok');
    expect(ev.error).toBeNull();
    expect(ev.outputHash).toBeTruthy();
    expect(ev.agentId).toBe('a1');
    expect(ev.sessionId).toBe('s1');
  });

  it('registra evento confirmed/ok quando HIGH e callback aceita', async () => {
    const mem = new MemorySkillAuditor();
    const reg = new SkillRegistry({ dir, auditor: mem, onHighConfirm: () => true });
    reg.registerProgrammatic(highSkill());
    await reg.invoke('destructive-1', {}, ctx());
    expect(mem.events).toHaveLength(1);
    expect(mem.events[0]!.decision).toBe('confirmed');
    expect(mem.events[0]!.outcome).toBe('ok');
    expect(mem.events[0]!.isDestructive).toBe(true);
  });

  it('registra evento denied/error quando callback nega', async () => {
    const mem = new MemorySkillAuditor();
    const reg = new SkillRegistry({ dir, auditor: mem, onHighConfirm: () => false });
    reg.registerProgrammatic(highSkill());
    await expect(reg.invoke('destructive-1', {}, ctx())).rejects.toThrow(/confirmation/);
    expect(mem.events).toHaveLength(1);
    expect(mem.events[0]!.decision).toBe('denied');
    expect(mem.events[0]!.outcome).toBe('error');
    expect(mem.events[0]!.error).toMatch(/denied/);
  });

  it('registra evento error quando skill nao existe', async () => {
    const mem = new MemorySkillAuditor();
    const reg = new SkillRegistry({ dir, auditor: mem });
    await expect(reg.invoke('ghost', {}, ctx())).rejects.toThrow(/not found/);
    expect(mem.events).toHaveLength(1);
    expect(mem.events[0]!.skill).toBe('ghost');
    expect(mem.events[0]!.outcome).toBe('error');
    expect(mem.events[0]!.error).toMatch(/not found/);
  });

  it('registra evento error quando run lanca', async () => {
    const mem = new MemorySkillAuditor();
    const reg = new SkillRegistry({ dir, auditor: mem });
    reg.registerProgrammatic(
      defineSkill({
        name: 'boom',
        description: 'always throws',
        permissions: 'low',
        inputSchema: z.object({}),
        async run() {
          throw new Error('kaboom');
        },
      }),
    );
    await expect(reg.invoke('boom', {}, ctx())).rejects.toThrow(/kaboom/);
    expect(mem.events).toHaveLength(1);
    expect(mem.events[0]!.outcome).toBe('error');
    expect(mem.events[0]!.error).toMatch(/kaboom/);
  });

  it('nao registra evento se auditor nao foi configurado', async () => {
    const reg = new SkillRegistry({ dir });
    reg.registerProgrammatic(readonlySkill());
    await reg.invoke('r1', { q: 'x' }, ctx());
    // Sem auditor: nada falha, nada registra. Cobertura por ausencia.
    expect(reg.list()).toHaveLength(1);
  });
});

describe('JsonlSkillAuditor', () => {
  it('appenda JSONL com uma linha por invocacao', async () => {
    const file = join(dir, 'subdir', 'audit.jsonl');
    const auditor = new JsonlSkillAuditor({ filePath: file, logger: silent });
    const reg = new SkillRegistry({ dir, auditor });
    reg.registerProgrammatic(readonlySkill());
    await reg.invoke('r1', { q: 'one' }, ctx());
    await reg.invoke('r1', { q: 'two' }, ctx());
    const content = readFileSync(file, 'utf8').trim().split('\n');
    expect(content).toHaveLength(2);
    const ev1 = JSON.parse(content[0]!) as { skill: string; inputHash: string };
    const ev2 = JSON.parse(content[1]!) as { skill: string; inputHash: string };
    expect(ev1.skill).toBe('r1');
    expect(ev2.skill).toBe('r1');
    expect(ev1.inputHash).not.toBe(ev2.inputHash);
  });

  it('cria diretorio recursivamente se nao existe', () => {
    const file = join(dir, 'a', 'b', 'c', 'audit.jsonl');
    const auditor = new JsonlSkillAuditor({ filePath: file, logger: silent });
    auditor.record({
      timestamp: new Date().toISOString(),
      skill: 'x',
      targetDomain: undefined,
      permissions: undefined,
      isDestructive: undefined,
      inputHash: 'h',
      outputHash: null,
      decision: 'auto',
      outcome: 'ok',
      durationMs: 1,
      error: null,
      agentId: undefined,
      sessionId: undefined,
    });
    expect(readFileSync(file, 'utf8')).toContain('"skill":"x"');
  });
});
