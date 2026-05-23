---
title: OpenClaw — arquitetura, capítulos e mapeamento para fzagent
type: source-dossier
source: https://build-your-own-openclaw.kiyo-n-zane.com/
mirror: ./external/buildoc/
last_synced: 2026-05-09
status: reference
---

# OpenClaw — Dossiê arquitetural e plano de simplificação

> **Tese**: o tutorial _Build Your Own OpenClaw_ destila um superagente moderno em 18 passos progressivos. Cada passo introduz UM conceito ortogonal. Para o fzagent vamos manter o mesmo esqueleto pedagógico, mas reescrever em TypeScript estrito sobre Node 18+ ESM puro, com ~500 linhas no núcleo do agente e dependências mínimas.

## 1. Visão geral

OpenClaw é um framework educacional para construir um agente capaz de:

- conversar com LLMs via tool use,
- carregar **skills** dinamicamente em tempo de execução,
- persistir histórico,
- aceitar comandos `/slash`,
- compactar contexto quando estoura,
- usar a web,
- escutar múltiplos canais (CLI, Telegram, Discord, WebSocket, HTTP),
- recarregar config a quente,
- rotear mensagens entre múltiplos agentes,
- agendar trabalho via cron e heartbeat,
- compor prompts em camadas,
- enviar mensagens proativas,
- delegar para sub-agentes,
- limitar concorrência,
- e usar memória de longo prazo.

A implementação de referência (pickle-bot) é Python + litellm + pydantic + typer + fastapi + watchdog + croniter + python-telegram-bot + discord.py.

## 2. Tabela de capítulos com equivalente fzagent

| #   | Capítulo OpenClaw      | Conceito-chave                                                                                                                                                           | Equivalente fzagent (TypeScript ESM)                                                                                                                                   |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 00  | Just a Chat Loop       | `ChatLoop` + `Session` + `LLMProvider.chat(messages)`                                                                                                                    | `packages/agent/ChatLoop.ts`, `Session.ts`, `packages/providers/LLMProvider.ts` (interface)                                                                            |
| 01  | Give your agent a tool | `BaseTool` (name/desc/params/execute), loop `while(tool_calls)`                                                                                                          | `packages/agent/Tool.ts` (Zod-validated), `ToolRegistry`, builtins `shell.exec/fs.read/fs.write`                                                                       |
| 02  | Skills                 | `SKILL.md` com YAML frontmatter; descoberta via system prompt **ou** via tool                                                                                            | `packages/skills/SkillRegistry.ts` que varre `genaisrc/*.genai.mjs`, expõe via `skill.invoke` no system prompt                                                         |
| 03  | Persistence            | JSONL em `.history/` — `index.jsonl` + `sessions/<id>.jsonl`                                                                                                             | SQLite (better-sqlite3): `sessions(id, agent_id, created_at)` + `turns(session_id, role, content_json, ts)` + `tool_calls(turn_id, name, input, output)`               |
| 04  | Slash Commands         | `Command` ABC + `CommandRegistry.dispatch(input)`; built-ins `/help`, `/skills`, `/session`                                                                              | `packages/cli/commands/` com mesma forma; comandos não entram no histórico                                                                                             |
| 05  | Compaction             | `ContextGuard` com threshold ~80% do context window, trunca tool results, depois sumariza histórico velho como nova sessão                                               | `packages/agent/ContextGuard.ts` que usa `tiktoken` para contar e dispara LLM-summarize quando atinge 80% do `AGENTIC_TOKEN_BUDGET`                                    |
| 06  | Web Tools              | `WebSearchProvider` + `WebReadProvider` interfaces, tools `websearch` e `webread`                                                                                        | `packages/agent/tools/web.ts` usando Brave Search API + `fetch` nativo + html→md (e.g. `turndown`)                                                                     |
| 07  | Event-Driven           | `EventBus` worker com `asyncio.Queue`, eventos `InboundEvent` e `OutboundEvent`, persistência atômica de outbound                                                        | `packages/core/EventBus.ts` (mitt-style + Promise queue), eventos tipados via Zod, persistência via SQLite quando confiabilidade for crítica                           |
| 08  | Config Hot Reload      | `watchdog` observa `config.user.yaml`, deep-merge com `config.runtime.yaml`                                                                                              | `packages/core/Config.ts` com `chokidar`, valida Zod e emite `config.reloaded` no event bus                                                                            |
| 09  | Channels               | Abstração `Channel.run/reply/stop`; `ChannelWorker` publica InboundEvent, `DeliveryWorker` consome OutboundEvent; mapping `source → session_id` em `config.runtime.yaml` | `packages/agent/channels/{cli,websocket,http}.ts`; mapping em SQLite (`sources(source TEXT PRIMARY KEY, session_id)`)                                                  |
| 10  | WebSocket              | FastAPI `/ws` + `WebSocketWorker` broadcasta eventos                                                                                                                     | `packages/agent/server/ws.ts` com `ws` package, broadcasta eventos do bus                                                                                              |
| 11  | Multi-Agent Routing    | `AgentLoader` lê `agents/<id>/AGENT.md`; `Binding` regex com tier de especificidade (exato>regex>wildcard); `RoutingTable.resolve(source)`                               | `packages/agent/Routing.ts`: bindings em `fzagent.conf`, mesmo algoritmo de tier; default fallback                                                                     |
| 12  | Cron + Heartbeat       | `CronDef` (id/agent/schedule/prompt/one_off), `CronWorker` checa por minuto, publica `DispatchEvent`; heartbeat = 1 ativo por vez, intervalo regular                     | `packages/agent/Cron.ts` com `node-cron`; heartbeat WORA observa heap/qdrant/disco a cada 30s sem chamar LLM                                                           |
| 13  | Multi-Layer Prompts    | `PromptBuilder.build(state)`: identity (AGENT.md) + soul (SOUL.md) + bootstrap (BOOTSTRAP.md) + runtime (timestamp) + channel hint                                       | `packages/agent/PromptBuilder.ts`: identity + personality + safety + RAG (top-k das 5 collections Qdrant) + runtime + channel                                          |
| 14  | Post Message Back      | Tool `post_message` disponível **só dentro de cron**                                                                                                                     | `packages/agent/tools/postMessage.ts`; flag `include_post_message` quando `source.is_cron`                                                                             |
| 15  | Agent Dispatch         | Tool dinâmica `subagent.dispatch(agent_id, task)` que publica `DispatchEvent` no bus, espera `DispatchResultEvent` filtrado por session_id                               | `packages/agent/tools/delegate.ts`; mesmo padrão pub/sub via EventBus interno                                                                                          |
| 16  | Concurrency Control    | `AgentDef.max_concurrency`; `asyncio.Semaphore` por agent_id no `AgentWorker`; opções: por agente, por source, por prioridade                                            | `packages/agent/Concurrency.ts` com `p-limit` por agent_id; futuramente por user/source                                                                                |
| 17  | Memory                 | Agente especializado (**Cookie**) acessado via `dispatch`; arquivos em `memories/{topics,projects,daily-notes}`                                                          | `packages/memory/`: ONNX BGE-base 768d + Qdrant (5 collections) + Wiki SQLite FTS5 — substitui markdown puro por **híbrido vetorial+textual** com lint de contradições |

## 3. Padrões reaproveitáveis (já validados no buildoc)

### 3.1 EventBus com Atomic Persist (step 09)

- Outbound persistido como `tmp` + `fsync` + `rename` em `pending/`. Recovery na inicialização re-publica eventos não-acked.
- `eventbus.ack(event)` deleta o arquivo após delivery confirmado.
- **Adotar** no fzagent para mensagens críticas (cron-driven, delivery cross-channel).

### 3.2 Tool Schema padrão LiteLLM/OpenAI

```ts
{ type: "function", function: { name, description, parameters /* JSONSchema */ } }
```

- Mesmo formato suportado pela Anthropic API (com adapter), OpenAI, Gemini, OpenRouter, Ollama (quando o modelo suporta function calling).
- **Adotar** como contrato canônico em `packages/core/types.ts`.

### 3.3 Skill descoberta via system prompt (alternativa ao "skill tool")

- OpenClaw real injeta lista de skills no system prompt e o agente lê `SKILL.md` com a tool `read` quando precisa.
- **Adotar** essa abordagem por padrão; fallback para `skill.invoke` explícita quando o usuário quiser controle.

### 3.4 Routing por tier

- Tier 0 = match exato → tier 1 = regex específica → tier 2 = wildcard. Sort por (tier, índice). Resolve no primeiro match.
- **Adotar** sem mudanças em `Routing.ts`.

### 3.5 Compaction em duas fases

- Fase A: trunca tool results grandes (cheap).
- Fase B: sumariza histórico antigo como nova session (caro).
- **Adotar** ambas; usar `tiktoken` para estimativa local antes de chamar provider.

### 3.6 Multi-layer prompt

- Camadas explícitas e ordenadas: identity → personality → bootstrap → runtime → channel.
- **Estender** com camada `memory` (RAG das 5 collections Qdrant) entre runtime e channel.

### 3.7 Confidence scale (do reversa)

- 🟢 CONFIRMADO / 🟡 INFERIDO / 🔴 LACUNA.
- **Adotar** em saídas estruturadas e no Wiki Lint.

### 3.8 State machine THINK→ACT→OBSERVE→REFLECT

- Não está explícito em um único capítulo, mas decorre da composição de loops + reflection.
- **Adotar** como contrato do `Agent.run()` no fzagent.

### 3.9 Circuit breaker

- 3 falhas consecutivas → pausa antes de tentar de novo (decisão arquitetural do fzagent, inspirada em fazai-ng).
- Não está no openclaw, **adicionar** porque é barato e evita loops de fogo.

## 4. Mapa de "o que NÃO replicar"

- **Telegram/Discord channels**: deixar para fase futura. Foco no fzagent é CLI + WebSocket + HTTP.
- **FastAPI**: usar Hono ou `node:http` puro. Mais leve para Node.
- **Watchdog**: substituir por `chokidar` (Node nativo).
- **litellm**: cada provider tem sua própria SDK oficial bem mantida em TS; não há equivalente único, montamos `ProviderRouter` próprio.
- **uv/hatch**: trocar por npm workspaces + tsup.

## 5. Decisões arquiteturais que vamos documentar nos arquivos

| Decisão                       | Justificativa                                                                    |
| ----------------------------- | -------------------------------------------------------------------------------- |
| TypeScript estrito + ESM puro | Alinhar com fazai-ng; permite tree-shaking e tipos compartilhados entre packages |
| `.js` em imports relativos    | Requisito do Node ESM; força disciplina de paths                                 |
| Zod como contrato em runtime  | Validação de payloads externos (LLM, file, network); evita corrupção silenciosa  |
| pino como logger              | Estruturado, fast, compatível com OTel                                           |
| better-sqlite3 + FTS5         | Cérebro secundário textual; evita lock-in cloud; embarcado                       |
| Qdrant como vetorial          | Já usado pelo fazai-ng; suporta filters complexos; HNSW                          |
| BGE-base 768d ONNX            | Local, multilingue ok, dimensão padrão de mercado                                |
| Fallback de provider          | Resiliência operacional sem precisar reiniciar                                   |
| Circuit breaker               | Evita loops de queima de orçamento                                               |
| WORA heartbeat zero-LLM       | Manutenção barata; só observa métricas e age                                     |

## 6. Próximos passos

- FASE 1: criar workspace npm e configs base (zod, pino, vitest, tsup, eslint, prettier).
- FASE 2-7: cada uma equivale a 2-4 capítulos do openclaw, cumulativamente.
- FASE 8: site Astro replica visualmente o build-your-own-openclaw, mas com a marca fzagent e textos reescritos.

> Este dossiê deve ser atualizado quando descobrirmos detalhes novos lendo o código de `external/buildoc/`. Ele é a fonte canônica para qualquer dúvida arquitetural durante a implementação.
