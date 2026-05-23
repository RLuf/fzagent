// Context Assembler — monta o system prompt em camadas, ao estilo
// openclaw step 13 (multi-layer prompts), com camada extra de memoria (RAG).
//
// Camadas (ordem) com task pinning sandwich (FCC fix):
//   0. Tarefa atual (topo)     — se taskPinningEnabled (default true)
//   1. Identity                — quem o agente e
//   2. Personality             — tom, restricoes (opcional)
//   3. Safety                  — guardrails (sempre presente)
//   4. Bootstrap               — contexto operacional (workspace, tools)
//   5. Tools disponiveis       — lista de tools + instrucao imperativa
//   6. Memory (RAG)            — top-k de cada collection Qdrant
//   7. Runtime                 — timestamp, agent_id, session_id, channel
//   8. Tarefa atual (final)    — reforco no fim, sempre que `task` presente
//
// Sandwich: tarefa aparece em #0 e #8 simultaneamente quando pinning ON.
// Mitiga "lost in the middle" (Liu et al 2023) — attention nas duas pontas.
// A montagem acontece UMA vez por agent.run(); nao re-RAGea a cada iteracao.

import type { FzagentLogger } from '@fzagent/core';

import type { ToolRegistry } from './tools/index.js';

export interface IdentityLayer {
  name: string;
  description: string;
}

export interface PersonalityLayer {
  text: string;
}

export interface RAGSource {
  collection: string;
  // funcao que recebe queryText e retorna trechos relevantes ja formatados.
  search: (q: string) => Promise<string[]>;
}

export interface AssembleInput {
  identity: IdentityLayer;
  personality?: PersonalityLayer;
  safety?: string;
  bootstrap?: string;
  task?: string;
  agentId: string;
  sessionId: string;
  channel?: string;
  ragSources?: RAGSource[];
  ragTopK?: number;
  tools: ToolRegistry;
  logger?: FzagentLogger;
  // FCC fix — quando true (default), tarefa aparece no TOPO E no fim do
  // system prompt (sandwich). Quando false, comportamento legado (so no fim).
  taskPinningEnabled?: boolean;
}

const DEFAULT_SAFETY = `Voce nunca expoe credenciais. Voce nao executa comandos destrutivos sem confirmacao explicita do usuario. Quando estiver inseguro, peca esclarecimento.`;

const DEFAULT_BOOTSTRAP = `## Politica de encoding e ambiente

REGRA ABSOLUTA: codigo gerado, comentarios, prints, mensagens e nomes de arquivo devem usar APENAS ASCII. Sem acentos, sem caracteres especiais. Isso elimina classe inteira de bugs de encoding e mantem compatibilidade entre interpreters.

Em Python especificamente: como nao havera caracteres nao-ASCII, o encoding header (# -*- coding: utf-8 -*-) NAO eh necessario. Nao adicione.

## Ambiente alvo: Linux (Ubuntu/Debian/pop_OS)

Sempre invoque python como \`python3\` explicito; NUNCA \`python\` (em muitos sistemas /usr/bin/python aponta para Python 2 ou nao existe).

Antes de invocar scripts com dependencias, verifique:
1. \`which python3\` para confirmar existencia
2. \`python3 -m pip --version\` para confirmar pip disponivel
3. Se pip ausente: instrua \`python3 -m ensurepip --upgrade\` ou \`sudo apt install python3-pip\` em vez de assumir

Para instalar dependencias de scripts Python ad-hoc gerados pelo proprio agente: prefira venv local ao workspace (\`python3 -m venv .venv && .venv/bin/pip install ...\`) ao inves de instalar global. Evita conflito com pacotes do sistema.`;

export async function assembleSystemPrompt(input: AssembleInput): Promise<string> {
  const parts: string[] = [];
  const taskPinningEnabled = input.taskPinningEnabled ?? true;

  // 0. Tarefa atual (topo) — sandwich FCC fix.
  // Aparece no topo apos toggle (default ON). Bloco final no fim reforca.
  if (taskPinningEnabled && input.task) {
    parts.push(
      `# Tarefa atual (referencia primaria)\n${input.task}\n\nMantenha este objetivo em mente em todas as iteracoes. A descricao completa aparece tambem no fim deste prompt como reforco.`,
    );
  }

  // 1. Identity
  parts.push(`# Identity\nVoce e ${input.identity.name}. ${input.identity.description}`);

  // 2. Personality (opcional)
  if (input.personality) {
    parts.push(`# Personality\n${input.personality.text}`);
  }

  // 3. Safety
  parts.push(`# Safety\n${input.safety ?? DEFAULT_SAFETY}`);

  // 4. Bootstrap (sempre presente — engloba politicas ambientais default)
  parts.push(`# Bootstrap\n${input.bootstrap ?? DEFAULT_BOOTSTRAP}`);

  // Tools disponiveis (parte de Bootstrap)
  const toolsList = input.tools
    .list()
    .map((t) => `- ${t.name} [${t.permissions}]: ${t.description}`)
    .join('\n');
  if (toolsList) {
    parts.push(
      `# Tools disponiveis\nVoce TEM acesso direto as ferramentas abaixo no proprio workspace do usuario. Para qualquer pedido que envolva CRIAR/EDITAR arquivos, EXECUTAR comandos, BUSCAR informacao ou INVOCAR skills, USE estas ferramentas. NAO descreva passos manuais ao usuario e NAO diga 'nao consigo' enquanto houver uma tool aplicavel — chame-as.\n\n${toolsList}`,
    );
  }

  // 5. Memory (RAG) — opcional
  if (input.ragSources && input.ragSources.length > 0 && input.task) {
    const memoryParts: string[] = [];
    for (const src of input.ragSources) {
      try {
        const hits = await src.search(input.task);
        if (hits.length > 0) {
          memoryParts.push(`## ${src.collection}\n${hits.join('\n---\n')}`);
        }
      } catch (err) {
        input.logger?.warn(
          { collection: src.collection, error: err instanceof Error ? err.message : String(err) },
          'rag source failed',
        );
      }
    }
    if (memoryParts.length > 0) {
      parts.push(`# Memory (RAG)\n${memoryParts.join('\n\n')}`);
    }
  }

  // 6. Runtime
  const now = new Date().toISOString();
  const channel = input.channel ?? 'cli';
  parts.push(
    `# Runtime\n- timestamp: ${now}\n- agent: ${input.agentId}\n- session: ${input.sessionId}\n- channel: ${channel}`,
  );

  // Tarefa atual (opcional)
  if (input.task) {
    parts.push(`# Tarefa atual\n${input.task}`);
  }

  return parts.join('\n\n');
}
