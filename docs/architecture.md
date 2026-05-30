# Arquitetura do fzagent

## Posicionamento

fzagent eh um agente local autonomo. O projeto foi estruturado de
forma independente e a integracao com o fazai-ng (como cerebro do corpo L99)
eh opcional e nao decidida por enquanto.

Analogia operacional (se integrado no futuro):

- **fazai-ng** = corpo overpowered (capacidades destrutivas, processos de
  producao, integracoes profundas) com potencial perigo se mal-arbitrado.
- **fzagent** = cerebro maduro em corpo inofensivo. Pode errar, ser reiniciado,
  ser treinado, sem causar dano fora do proprio workspace.

Cada capacidade externa eh exposta como **skill** com `targetDomain='bridge'`,
e o agente consome via `skill.invoke`. Manifest v1 eh o protocolo estavel.

## Monorepo (6 pacotes)

```
packages/
├── core         — types, config, logger, eventBus, errors (sem deps internas)
├── providers    — LLM adapters (Anthropic, OpenAI, OpenRouter, Google, Ollama) + Router
├── memory       — WikiIndexer (SQLite+FTS5), QdrantWrapper, EmbeddingsService (BGE)
├── agent        — Agent loop, ToolRegistry, builtins (fs/shell/web/wiki/skill/delegate)
├── skills       — SkillRegistry, SkillAuditor, defineSkill, builtins
└── cli          — Factory (buildRuntime/buildAgent) + comandos commander
```

Dependencias internas (sem ciclos):

```
cli  ─┬──> agent ──┬──> providers ──> core
      │            └──> memory ────────^
      └──> skills ──> core
```

## Fluxo de uma iteracao do agent loop

`packages/agent/src/agent.ts` — `Agent.run()`:

```
THINK    provider.complete(messages, {systemPrompt, tools})
   │
   ▼
ACT      para cada tool_call retornado:
         ToolRegistry.execute(name, input, ctx)
            │
            └─ HIGH gate? -> onHighConfirm
            └─ Zod validate input
            └─ tool.run(ctx, parsed)
   │
   ▼
OBSERVE  tool_result anexado ao historico
         turn registrado em sessions.sqlite
   │
   ▼
REFLECT  proxima iteracao com historico atualizado
```

Para por:

- `stopReason='end_turn'` (modelo terminou)
- `toolCalls.length === 0`
- `maxIterations` atingido (default 20)
- `tokenBudget` excedido (default 100k)
- Circuit breaker aberto (3 falhas consecutivas)
- `AbortSignal` disparado

## Camadas do system prompt

Montado UMA vez por `agent.run()` em `packages/agent/src/context-assembler.ts`:

1. **Identity** — quem o agente eh
2. **Personality** (opcional) — tom, restricoes
3. **Safety** — guardrails padrao
4. **Bootstrap** (opcional) — contexto operacional
5. **Tools disponiveis** — lista textual + instrucao imperativa de uso
6. **Memory (RAG)** — top-k de cada collection Qdrant (opcional, por task)
7. **Runtime** — timestamp, agent_id, session_id, channel
8. **Tarefa atual**

## Pontos de extensao

- **Nova capacidade externa** -> crie skill em `genaisrc/*.genai.mjs` com
  `targetDomain='bridge'` ou `'external'`. Veja `wiki/concepts/skill-contract.md`.
- **Novo provider LLM** -> herde `BaseLLMProvider` em `packages/providers/src/adapters/`,
  declare `supportsTools`, implemente `complete()` e `stream()`.
- **Nova tool nativa** -> use `defineTool()` em `packages/agent/src/tools/builtins/`,
  registre via `registerBuiltinTools()`. Declare `permissions` (low/medium/high).

## Decisoes arquiteturais nao-obvias

- **`buildRuntime()` eh async** desde a integracao L99 — `SkillRegistry.loadAll()`
  faz I/O (dynamic import dos `.genai.mjs`). Sincrono seria mentira.
- **SessionStore eh persistido em SQLite** (nao em-memoria). Cada turn e
  tool_call eh gravado. Permite forense post-mortem mesmo em sessoes que
  crasham.
- **Hibrido SQLite + Qdrant** para o cerebro secundario — keyword (FTS5) +
  semantic (vetorial). Detalhes em [data-stores.md](data-stores.md).
- **Capability negotiation** no router — provider sem `supportsTools` eh
  pulado quando a request fornece tools. Evita degradacao silenciosa.
- **Manifest v1** com 3 campos novos (`targetDomain`, `requiresConfirmation`,
  `isDestructive`) — eixos ortogonais de risco vs gate vs dominio.
