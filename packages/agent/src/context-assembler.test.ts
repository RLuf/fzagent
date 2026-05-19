// Cobertura do task pinning sandwich (FCC fix) e camadas do system prompt.

import { describe, expect, it } from 'vitest';

import { assembleSystemPrompt } from './context-assembler.js';
import { ToolRegistry } from './tools/index.js';

function makeTools(): ToolRegistry {
  return new ToolRegistry();
}

describe('assembleSystemPrompt — task pinning sandwich (FCC fix)', () => {
  it('quando taskPinningEnabled=true (default), tarefa aparece NO TOPO E no fim', async () => {
    const tools = makeTools();
    const prompt = await assembleSystemPrompt({
      identity: { name: 'fzagent-test', description: 'agent de teste' },
      task: 'instalar e configurar fzagent localmente',
      agentId: 'a1',
      sessionId: 's1',
      tools,
      taskPinningEnabled: true,
    });
    // O bloco "Tarefa atual (referencia primaria)" deve estar no topo
    // (antes de "# Identity").
    const idxTopo = prompt.indexOf('Tarefa atual (referencia primaria)');
    const idxIdentity = prompt.indexOf('# Identity');
    const idxFim = prompt.lastIndexOf('# Tarefa atual');
    expect(idxTopo).toBeGreaterThanOrEqual(0);
    expect(idxIdentity).toBeGreaterThan(idxTopo);
    expect(idxFim).toBeGreaterThan(idxIdentity);
    // Sanity: a string da tarefa aparece pelo menos 2 vezes no prompt.
    const occurrences = prompt.split('instalar e configurar fzagent localmente').length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });

  it('quando taskPinningEnabled=false (legacy), tarefa aparece SO no fim', async () => {
    const tools = makeTools();
    const prompt = await assembleSystemPrompt({
      identity: { name: 'fzagent-test', description: 'agent de teste' },
      task: 'rodar suite de testes',
      agentId: 'a1',
      sessionId: 's1',
      tools,
      taskPinningEnabled: false,
    });
    // Nao deve ter o bloco "Tarefa atual (referencia primaria)" no topo.
    expect(prompt.indexOf('Tarefa atual (referencia primaria)')).toBe(-1);
    // Apenas o bloco final "# Tarefa atual" deve existir.
    const occurrences = prompt.split('rodar suite de testes').length - 1;
    expect(occurrences).toBe(1);
  });

  it('default (sem flag explicita) habilita pinning automaticamente', async () => {
    const tools = makeTools();
    const prompt = await assembleSystemPrompt({
      identity: { name: 'fzagent-test', description: 'agent de teste' },
      task: 'tarefa default',
      agentId: 'a1',
      sessionId: 's1',
      tools,
      // taskPinningEnabled omitido — deve default true.
    });
    expect(prompt.indexOf('Tarefa atual (referencia primaria)')).toBeGreaterThanOrEqual(0);
  });

  it('sem task: nao adiciona blocos de tarefa nem com pinning ON', async () => {
    const tools = makeTools();
    const prompt = await assembleSystemPrompt({
      identity: { name: 'fzagent-test', description: 'agent de teste' },
      agentId: 'a1',
      sessionId: 's1',
      tools,
      taskPinningEnabled: true,
    });
    expect(prompt.indexOf('Tarefa atual (referencia primaria)')).toBe(-1);
    expect(prompt.indexOf('# Tarefa atual')).toBe(-1);
  });
});
