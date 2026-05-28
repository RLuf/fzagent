// packages/tui/src/commands/model.ts

import type { CommandModule } from './types.js';

const mod: CommandModule = {
  meta: { name: '/model', desc: 'mostra/troca modelo (/model <id>)', type: 'local' },
  async run(ctx, args) {
    if (args.length === 0) {
      const lines: string[] = [];
      lines.push(`atual: ${ctx.getModel() ?? ctx.runtime.conf.DEFAULT_MODEL}`);
      lines.push(`MODELS_ANTHROPIC: ${ctx.runtime.conf.MODELS_ANTHROPIC}`);
      lines.push(`MODELS_OLLAMA:    ${ctx.runtime.conf.MODELS_OLLAMA}`);
      if (ctx.runtime.conf.MODELS_GOOGLE)
        lines.push(`MODELS_GOOGLE:    ${ctx.runtime.conf.MODELS_GOOGLE}`);
      if (ctx.runtime.conf.MODELS_OPENAI)
        lines.push(`MODELS_OPENAI:    ${ctx.runtime.conf.MODELS_OPENAI}`);
      return { type: 'text', content: lines.join('\n') };
    }
    ctx.setModel(args[0]);
    return { type: 'text', content: `modelo trocado: ${args[0]}` };
  },
};
export default mod;
