// Integration: auto-discovery do SkillRegistry carrega as 3 skills demo de
// genaisrc/ na raiz do workspace. Valida que o ensaio do contrato L99 e
// um round-trip real (manifest -> registry -> invocacao).

import { resolve } from 'node:path';

import { createLogger } from '@fzagent/core';
import { SkillRegistry } from '@fzagent/skills';
import { describe, expect, it } from 'vitest';

const silent = createLogger({ format: 'silent', level: 'silent' });

const GENAISRC = resolve(import.meta.dirname ?? __dirname, '..', 'genaisrc');

describe('genaisrc/ auto-discovery (Bloco C — ensaio L99)', () => {
  it('carrega as 3 skills demo (kb, bridge, introspect)', async () => {
    const reg = new SkillRegistry({ dir: GENAISRC, logger: silent });
    await reg.loadAll();
    const names = reg.list().map((s) => s.name);
    expect(names).toContain('fazai-query-kb');
    expect(names).toContain('fazai-bridge-ping');
    expect(names).toContain('fazai-introspect');
  });

  it('manifests declaram targetDomain correto', async () => {
    const reg = new SkillRegistry({ dir: GENAISRC, logger: silent });
    await reg.loadAll();
    expect(reg.get('fazai-query-kb')?.targetDomain).toBe('kb');
    expect(reg.get('fazai-bridge-ping')?.targetDomain).toBe('bridge');
    expect(reg.get('fazai-introspect')?.targetDomain).toBe('introspect');
  });

  it('todas read-only e nao destrutivas', async () => {
    const reg = new SkillRegistry({ dir: GENAISRC, logger: silent });
    await reg.loadAll();
    for (const name of ['fazai-query-kb', 'fazai-bridge-ping', 'fazai-introspect']) {
      const s = reg.get(name);
      expect(s?.permissions).toBe('low');
      expect(s?.isDestructive).toBe(false);
    }
  });

  it('fazai-bridge-ping invoca local e devolve echo estruturado', async () => {
    const reg = new SkillRegistry({ dir: GENAISRC, logger: silent });
    await reg.loadAll();
    const out = (await reg.invoke(
      'fazai-bridge-ping',
      { payload: { hello: 'L99' }, channel: 'test', simulateLatencyMs: 0 },
      { cwd: process.cwd(), logger: silent },
    )) as { ok: boolean; bridge: string; channel: string; echo: unknown; roundTripMs: number };
    expect(out.ok).toBe(true);
    expect(out.bridge).toBe('mock-local');
    expect(out.channel).toBe('test');
    expect(out.echo).toEqual({ hello: 'L99' });
    expect(typeof out.roundTripMs).toBe('number');
  });

  it('fazai-query-kb rejeita collection fora da whitelist', async () => {
    const reg = new SkillRegistry({ dir: GENAISRC, logger: silent });
    await reg.loadAll();
    await expect(
      reg.invoke(
        'fazai-query-kb',
        { collection: 'random_unsafe', query: 'x', topK: 1 },
        { cwd: process.cwd(), logger: silent },
      ),
    ).rejects.toThrow();
  });

  it('fazai-query-kb sem qdrant injetado devolve estado not-ok explicito', async () => {
    const reg = new SkillRegistry({ dir: GENAISRC, logger: silent });
    await reg.loadAll();
    const out = (await reg.invoke(
      'fazai-query-kb',
      { collection: 'fazai_kb', query: 'hello', topK: 3 },
      { cwd: process.cwd(), logger: silent },
    )) as { ok: boolean; reason: string };
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/qdrant/i);
  });

  it('fazai-introspect devolve snapshot dos skills registrados', async () => {
    const reg = new SkillRegistry({ dir: GENAISRC, logger: silent });
    await reg.loadAll();
    const out = (await reg.invoke('fazai-introspect', { scope: 'skills' }, {
      cwd: process.cwd(),
      logger: silent,
      skillRegistry: reg,
    } as unknown as Parameters<typeof reg.invoke>[2])) as {
      ok: boolean;
      scope: string;
      skills?: Array<{ name: string; targetDomain: string }>;
    };
    expect(out.ok).toBe(true);
    expect(out.scope).toBe('skills');
    expect(out.skills?.some((s) => s.name === 'fazai-bridge-ping')).toBe(true);
  });
});
