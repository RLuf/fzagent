// packages/tui/src/commands/skills.ts

import type { CommandModule } from './types.js';

const mod: CommandModule = {
  meta: { name: '/skills', desc: 'lista skills registradas', type: 'local' },
  async run(ctx) {
    const list = ctx.runtime.skills.list();
    if (list.length === 0) return { type: 'text', content: 'nenhuma skill carregada.' };
    const lines = list.map((s) => `  ${s.name.padEnd(20)} ${s.description}`);
    return { type: 'text', content: 'skills:\n' + lines.join('\n') };
  },
};
export default mod;
