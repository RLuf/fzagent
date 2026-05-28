// packages/tui/src/commands/load.ts

import type { Message } from '@fzagent/core';
import type { CommandModule } from './types.js';

const mod: CommandModule = {
  meta: { name: '/load', desc: 'carrega sessão antiga (/load <id-parcial>)', type: 'local' },
  async run(ctx, args) {
    if (!args[0]) return { type: 'text', content: 'uso: /load <id-parcial>' };
    const prefix = args[0];
    const list = ctx.runtime.sessionStore.listSessions('fzagent', 200);
    const match = list.find((s) => s.id.startsWith(prefix));
    if (!match) return { type: 'text', content: `sessão não encontrada (prefixo ${prefix}).` };
    const turns = ctx.runtime.sessionStore.getRecentTurns(
      match.id,
      ctx.runtime.conf.AGENTIC_HISTORY_TURNS,
    ) as Message[];
    ctx.setMessages(turns);
    ctx.setSessionId(match.id);
    return { type: 'text', content: `carregada: ${match.id.slice(0, 8)} (${turns.length} turnos)` };
  },
};
export default mod;
