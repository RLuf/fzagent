// packages/tui/src/commands/exit.ts

import type { CommandModule } from './types.js';

const mod: CommandModule = {
  meta: { name: '/exit', desc: 'sai do REPL', type: 'local', aliases: ['/quit'] },
  async run(ctx) {
    ctx.exit();
    return { type: 'skip' };
  },
};
export default mod;
