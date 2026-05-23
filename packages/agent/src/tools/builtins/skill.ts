// skill.invoke — invoca skill auto-discovery do SkillRegistry.
//
// FASE 5: stub. Quando ctx.skillRegistry for fornecido (FASE 6+), o stub
// delega para o registry real. Sem registry: retorna mensagem informativa.

import { z } from 'zod';

import { defineTool } from '../types.js';

interface MinimalSkillRegistry {
  invoke(name: string, input: unknown, ctx: unknown): Promise<unknown>;
  list(): Array<{ name: string; description: string }>;
}

const SkillInvokeInput = z.object({
  name: z.string().min(1).describe('nome da skill a invocar'),
  input: z.record(z.string(), z.unknown()).default({}),
});

export const skillInvoke = defineTool({
  name: 'skill.invoke',
  description: 'Invoca uma skill registrada (auto-discovery via genaisrc/*.genai.mjs).',
  inputSchema: SkillInvokeInput,
  permissions: 'medium',
  async run(ctx, input) {
    const reg = ctx.skillRegistry as MinimalSkillRegistry | undefined;
    if (!reg) {
      return 'skill.invoke indisponivel: SkillRegistry nao injetado (FASE 6 wiring pendente)';
    }
    const out = await reg.invoke(input.name, input.input, ctx);
    return typeof out === 'string' ? out : JSON.stringify(out, null, 2);
  },
});
