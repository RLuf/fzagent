// fazai-introspect — leitura read-only do estado interno do fzagent.
//
// O cerebro chama esta skill antes de planejar acoes destrutivas para
// confirmar capacidades disponiveis e estado de governanca.

import { z } from 'zod';
import { defineSkill } from '@fzagent/skills';

const ScopeSchema = z.enum(['all', 'providers', 'skills', 'governance']);

export default defineSkill({
  name: 'fazai-introspect',
  description:
    'Snapshot read-only do estado interno: providers disponiveis, skills registradas, gates de governanca.',
  triggers: ['fazai status', 'introspect', 'snapshot estado'],
  permissions: 'low',
  category: 'agent',
  targetDomain: 'introspect',
  isDestructive: false,
  requiresConfirmation: false,
  version: '0.1.0',
  inputSchema: z.object({
    scope: ScopeSchema.default('all'),
  }),
  async run(ctx, input) {
    const out = {
      ok: true,
      scope: input.scope,
      agentId: ctx.agentId ?? null,
      sessionId: ctx.sessionId ?? null,
      timestamp: new Date().toISOString(),
    };
    const reg =
      /** @type {{ list: () => Array<{name: string; permissions?: string; targetDomain?: string; isDestructive?: boolean}> } | undefined} */ (
        ctx.skillRegistry
      );
    if ((input.scope === 'all' || input.scope === 'skills') && reg) {
      out.skills = reg.list().map((s) => ({
        name: s.name,
        permissions: s.permissions ?? 'low',
        targetDomain: s.targetDomain ?? 'custom',
        isDestructive: s.isDestructive ?? false,
      }));
    }
    if (input.scope === 'all' || input.scope === 'providers') {
      const router = /** @type {{ availableProviders?: () => string[] } | undefined} */ (
        ctx.router
      );
      out.providers =
        typeof router?.availableProviders === 'function' ? router.availableProviders() : null;
    }
    if (input.scope === 'all' || input.scope === 'governance') {
      out.governance = {
        hasHighConfirmCallback: Boolean(reg && 'onHighConfirm' in reg && reg.onHighConfirm),
      };
    }
    return out;
  },
});
