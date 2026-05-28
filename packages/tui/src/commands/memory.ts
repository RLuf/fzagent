// packages/tui/src/commands/memory.ts — exibe ~/.fzagent-tui/memory.md (livre pra anotações do user).

import { readMemory } from '../utils/paths.js';
import type { CommandModule } from './types.js';

const mod: CommandModule = {
  meta: {
    name: '/memory',
    desc: 'mostra memória local do TUI (~/.fzagent-tui/memory.md)',
    type: 'local',
  },
  async run() {
    return { type: 'text', content: '── memory.md ──\n' + readMemory().trimEnd() };
  },
};
export default mod;
