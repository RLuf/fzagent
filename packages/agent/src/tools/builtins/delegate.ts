// agent.delegate — delega tarefa a um sub-agente.
//
// Implementacao simples (FASE 5): cria uma sessao filha do mesmo Agent e
// roda ate end_turn. Coleta o output como string. Sem EventBus assincrono;
// se precisar de fan-out, FASE 8+ pode adicionar.

import { z } from 'zod';

import { defineTool } from '../types.js';

interface DelegateOpts {
  task: string;
  systemHint?: string;
  model?: string;
  maxIterations?: number;
}

interface AgentLike {
  run(input: { task: string; model?: string; channel?: string }): AsyncIterable<unknown>;
}

const DelegateInput = z.object({
  task: z.string().min(1),
  systemHint: z.string().optional(),
  model: z.string().optional(),
});

export const agentDelegate = defineTool({
  name: 'agent.delegate',
  description: 'Delega uma sub-tarefa a um sub-agente filho (mesmo workspace).',
  inputSchema: DelegateInput,
  permissions: 'medium',
  async run(ctx, input) {
    // Atualmente o agent factory e injetado via toolDeps.skillRegistry slot
    // (provisoriamente). Em FASE 7+, criar um AgentFactory dedicado.
    const factory = (ctx as { agentFactory?: (opts: DelegateOpts) => Promise<AgentLike> })
      .agentFactory;
    if (!factory) {
      return 'agent.delegate stub: agentFactory nao injetado. Forneca via ctx.agentFactory para habilitar sub-agentes.';
    }
    const child = await factory({
      task: input.task,
      ...(input.systemHint !== undefined && { systemHint: input.systemHint }),
      ...(input.model !== undefined && { model: input.model }),
    });
    let lastAssistant = '';
    for await (const ev of child.run({
      task: input.task,
      ...(input.model !== undefined && { model: input.model }),
    })) {
      const e = ev as { type?: string; message?: { content?: string } };
      if (e.type === 'assistant' && typeof e.message?.content === 'string') {
        lastAssistant = e.message.content;
      }
    }
    return lastAssistant || '(sub-agente nao produziu output)';
  },
});
