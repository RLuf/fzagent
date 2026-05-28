// packages/tui/src/commands/sessions.ts

import type { CommandModule } from './types.js';

const mod: CommandModule = {
  meta: { name: '/sessions', desc: 'lista N sessões recentes (default 10)', type: 'local' },
  async run(ctx, args) {
    const n = args[0] ? Number(args[0]) : 10;
    const list = ctx.runtime.sessionStore.listSessions('fzagent', n);
    if (list.length === 0) return { type: 'text', content: 'nenhuma sessão encontrada.' };
    const lines = list.map((s) => {
      const date = new Date(s.startedAt).toISOString().replace('T', ' ').slice(0, 19);
      const task = s.task ? s.task.slice(0, 60) : '(sem task)';
      const isCurrent = ctx.getSessionId() === s.id ? ' ← atual' : '';
      return `  ${s.id.slice(0, 8)}  ${date}  ${task}${isCurrent}`;
    });
    return { type: 'text', content: 'sessões recentes:\n' + lines.join('\n') };
  },
};
export default mod;
