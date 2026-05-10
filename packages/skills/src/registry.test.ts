import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createLogger } from '@fzagent/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SkillRegistry } from './registry.js';
import { cleanerSkill, registerBuiltinSkills } from './builtins.js';

const silent = createLogger({ format: 'silent', level: 'silent' });

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'fz-skills-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function ctx() {
  return { cwd: dir, logger: silent } as const;
}

describe('SkillRegistry programmatic', () => {
  it('registers and invokes built-in skills', async () => {
    const reg = registerBuiltinSkills(new SkillRegistry({ dir }));
    expect(reg.list().length).toBeGreaterThan(0);
    expect(reg.has('cleaner')).toBe(true);
    const out = (await reg.invoke('cleaner', { dryRun: true }, ctx())) as { dryRun: boolean };
    expect(out.dryRun).toBe(true);
  });

  it('throws when invoking missing skill', async () => {
    const reg = new SkillRegistry({ dir });
    await expect(reg.invoke('nope', {}, ctx())).rejects.toThrow(/not found/);
  });

  it('flags HIGH skills as requiring confirmation when callback present', () => {
    const reg = registerBuiltinSkills(new SkillRegistry({ dir, onHighConfirm: () => true }));
    expect(reg.requiresConfirmation('cleaner')).toBe(true);
    expect(reg.requiresConfirmation('reflect')).toBe(false);
  });

  it('asks confirm callback for HIGH skills', async () => {
    const calls: string[] = [];
    const reg = registerBuiltinSkills(
      new SkillRegistry({
        dir,
        onHighConfirm: (n) => {
          calls.push(n);
          return false;
        },
      }),
    );
    await expect(reg.invoke('cleaner', { dryRun: true }, ctx())).rejects.toThrow(/confirmation/);
    expect(calls).toEqual(['cleaner']);
  });

  it('proceeds when confirm returns true', async () => {
    const reg = registerBuiltinSkills(new SkillRegistry({ dir, onHighConfirm: () => true }));
    const out = (await reg.invoke('cleaner', { dryRun: true }, ctx())) as { dryRun: boolean };
    expect(out.dryRun).toBe(true);
  });
});

describe('SkillRegistry file loader', () => {
  it('skips when dir does not exist', async () => {
    const reg = new SkillRegistry({ dir: join(dir, 'nope') });
    await reg.loadAll();
    expect(reg.list()).toHaveLength(0);
  });

  it('loads valid .genai.mjs files', async () => {
    const skillFile = join(dir, 'echo.genai.mjs');
    writeFileSync(
      skillFile,
      `import { z } from 'zod';
export default {
  name: 'echo-loaded',
  description: 'echoes',
  inputSchema: z.object({ msg: z.string() }),
  permissions: 'low',
  category: 'custom',
  async run(_ctx, input) { return 'loaded: ' + input.msg; },
};
`,
    );
    const reg = new SkillRegistry({ dir });
    await reg.loadAll();
    expect(reg.has('echo-loaded')).toBe(true);
    const out = await reg.invoke('echo-loaded', { msg: 'hi' }, ctx());
    expect(out).toBe('loaded: hi');
  });

  it('ignores files without default export', async () => {
    writeFileSync(join(dir, 'broken.genai.mjs'), 'export const x = 1;');
    const reg = new SkillRegistry({ dir });
    await reg.loadAll();
    expect(reg.list()).toHaveLength(0);
  });
});

describe('cleanerSkill smoke', () => {
  it('returns dry-run summary', async () => {
    const out = (await cleanerSkill.run(ctx(), { dryRun: true, paths: ['.cache'] })) as {
      candidates: string[];
    };
    expect(out.candidates).toEqual(['.cache']);
  });
});
