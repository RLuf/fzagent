// packages/tui/src/commands/clear.ts

import type { CommandModule } from './types.js';

const mod: CommandModule = {
  meta: {
    name: '/clear',
    desc: 'limpa conversa em memória (mantém sessão persistida)',
    type: 'local',
    aliases: ['/reset'],
  },
  async run(ctx) {
    ctx.setMessages([
      {
        role: 'system',
        content: 'history zerada. próxima msg inicia sessao nova.',
        timestamp: Date.now(),
      },
    ]);
    ctx.setSessionId(undefined);
    return { type: 'skip' };
  },
};
export default mod;
