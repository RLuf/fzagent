// packages/tui/src/commands/tools.ts

import type { CommandModule } from './types.js';

const mod: CommandModule = {
  meta: { name: '/tools', desc: 'lista tools registradas', type: 'local' },
  async run(ctx) {
    const list = ctx.runtime.tools.list();
    if (list.length === 0) return { type: 'text', content: 'nenhuma tool registrada.' };
    const lines = list.map((t) => `  ${t.name.padEnd(20)} ${t.description}`);
    return { type: 'text', content: 'tools:\n' + lines.join('\n') };
  },
};
export default mod;
