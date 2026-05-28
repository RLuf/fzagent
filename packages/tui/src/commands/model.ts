// packages/tui/src/commands/model.ts

import type { CommandModule } from './types.js';

const mod: CommandModule = {
  meta: { name: '/model', desc: 'mostra/troca modelo (/model <id>)', type: 'local' },
  async run(ctx, args) {
    if (args.length === 0) {
      const lines: string[] = [];
      lines.push(`atual: ${ctx.getModel() ?? ctx.runtime.conf.DEFAULT_MODEL}`);
      lines.push(`MODELS_ANTHROPIC: ${ctx.runtime.conf.MODELS_ANTHROPIC.join(', ')}`);
      lines.push(`MODELS_OLLAMA:    ${ctx.runtime.conf.MODELS_OLLAMA.join(', ')}`);
      const google = ctx.runtime.conf.MODELS_GOOGLE;
      if (google && google.length > 0) {
        lines.push(`MODELS_GOOGLE:    ${google.join(', ')}`);
      }
      const openai = ctx.runtime.conf.MODELS_OPENAI;
      if (openai && openai.length > 0) {
        lines.push(`MODELS_OPENAI:    ${openai.join(', ')}`);
      }
      return { type: 'text', content: lines.join('\n') };
    }
    ctx.setModel(args[0]);
    return { type: 'text', content: `modelo trocado: ${args[0]}` };
  },
};
export default mod;
