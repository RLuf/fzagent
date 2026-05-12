// Context Assembler — monta o system prompt em camadas, ao estilo
// openclaw step 13 (multi-layer prompts), com camada extra de memoria (RAG).
//
// Camadas (ordem):
//   1. Identity   — quem o agente e
//   2. Personality— tom, restricoes (opcional)
//   3. Safety     — guardrails (sempre presente)
//   4. Bootstrap  — contexto operacional (workspace, tools)
//   5. Memory     — RAG: top-k de cada collection Qdrant relevante a tarefa
//   6. Runtime    — timestamp, agent_id, session_id, channel
//
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
}

const DEFAULT_SAFETY = `Voce nunca expoe credenciais. Voce nao executa comandos destrutivos sem confirmacao explicita do usuario. Quando estiver inseguro, peca esclarecimento.`;

export async function assembleSystemPrompt(input: AssembleInput): Promise<string> {
  const parts: string[] = [];

  // 1. Identity
  parts.push(`# Identity\nVoce e ${input.identity.name}. ${input.identity.description}`);

  // 2. Personality (opcional)
  if (input.personality) {
    parts.push(`# Personality\n${input.personality.text}`);
  }

  // 3. Safety
  parts.push(`# Safety\n${input.safety ?? DEFAULT_SAFETY}`);

  // 4. Bootstrap (opcional, ex: estrutura do workspace)
  if (input.bootstrap) {
    parts.push(`# Bootstrap\n${input.bootstrap}`);
  }

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
