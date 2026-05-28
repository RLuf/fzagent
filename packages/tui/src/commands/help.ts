// packages/tui/src/commands/help.ts

import type { CommandModule } from './types.js';

const mod: CommandModule = {
  meta: { name: '/help', desc: 'lista comandos disponíveis', type: 'local' },
  async run(ctx) {
    const all = await ctx.registry.list();
    const lines = all.map((m) => `  ${m.name.padEnd(11)} ${m.desc}`);
    return { type: 'text', content: 'comandos:\n' + lines.join('\n') };
  },
};
export default mod;
