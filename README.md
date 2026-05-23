# fzagent

> Superagente OpenClaw-style em TypeScript/Node.js ESM puro, com cerebro
> secundario (Wiki SQLite + FTS5 + Qdrant), multi-provider LLM com fallback,
> skills auto-discovery e budget loop com circuit breaker.

[![Version](https://img.shields.io/badge/version-0.1.0-informational)](./CHANGELOG.md)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![ESM](https://img.shields.io/badge/module-ESM-F7DF1E)](https://nodejs.org/api/esm.html)
[![Stack](https://img.shields.io/badge/aligned-fazai--ng-6f42c1)](https://fzrepo.rogerluft.com.br/StorageWeb/fazai-ng)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## Por que existe

O **fzagent** replica a essencia do framework educacional
[Build Your Own OpenClaw](https://build-your-own-openclaw.kiyo-n-zane.com/)
em ~500 linhas de TypeScript estrito, alinhado a stack
[fazai-ng](https://fzrepo.rogerluft.com.br/StorageWeb/fazai-ng) para integracao
futura. O cerebro secundario segue o padrao
[LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
de Andrej Karpathy, com indexador SQLite + FTS5 e busca vetorial via Qdrant.

## Caracteristicas

- **Multi-provider LLM com fallback**: Anthropic, OpenAI, Google (SDK `@google/generative-ai`), OpenRouter, Ollama. Circuit breaker por provider, retry com backoff exponencial e **capability negotiation** (`supportsTools`) evita degradacao silenciosa.
- **Cerebro secundario hibrido**: Wiki markdown indexado (`SQLite + FTS5`) + 6 collections vetoriais (`Qdrant`, BGE-base 768d via ONNX local).
- **Budget loop**: state machine `THINK -> ACT -> OBSERVE -> REFLECT` com `maxIterations` + `tokenBudget` (default 200k) + circuit breaker por provider.
- **Skills auto-discovery**: scan periodico de `genaisrc/*.genai.mjs` (formato OpenClaw `SKILL.md`); manifest v1 com `permissions`, `requiresConfirmation`, `isDestructive`, `targetDomain`; auditoria JSONL append-only com `sha256(16)`.
- **HIGH gate para tools nativas**: paridade com skills; bypass via `FZAGENT_AUTO_CONFIRM_HIGH=1` ou `AUTO_CONFIRM_HIGH=true` no conf.
- **FCC fix (mitigacao "lost in the middle")**: task pinning sandwich (topo + fim do system prompt) + reinjecao periodica `[LEMBRETE]` a cada N iteracoes. Mantem coerencia em sessoes longas.
- **Sanitizacao de tool names**: `shell.exec -> shell_exec` no fio (regex Anthropic/OpenAI), desnormalizado no inbound.
- **WORA heartbeat opcional**: observa heap, qdrant, disco a cada 30s; raciocinio zero-LLM por heuristica; age (gc, reconnect, alert).
- **Server HTTP + WebSocket**: Express 5 + Socket.io expoem REST (health, log tail) e namespace `/ws` para stream de eventos do agente.
- **Web UI experimental** (`packages/web-ui`): Vite 8 + React 19 + Tailwind + Zustand consumindo o `/ws`.
- **CLI ergonomico**: `fzagent "<prompt>"`, `fzagent --cli` (interativo), `fzagent agent loop "<task>"`, `fzagent wiki ingest`, `fzagent skill list/describe`.
- **Logging dual sink com split de levels**: console (pino-pretty) + arquivo JSON estruturado (`LOG_FILE`); cada sink com seu proprio level via `LOG_LEVEL_CONSOLE` e `LOG_LEVEL_FILE` (console silent + arquivo debug eh receita comum).
- **API reference auto-gerada** (`docs/api-reference/`) via TypeDoc + plugin markdown.

## Stack

| Camada       | Tecnologia                    |
| ------------ | ----------------------------- |
| Runtime      | Node 22 LTS ESM puro          |
| Linguagem    | TypeScript 5.6 estrito        |
| Validacao    | Zod                           |
| Logger       | pino                          |
| Bundling     | tsup                          |
| Tests        | vitest                        |
| Lint/Format  | ESLint flat config + Prettier |
| Persistencia | better-sqlite3 (FTS5)         |
| Vetorial     | Qdrant + ONNX BGE-base 768d   |
| CLI          | commander                     |
| Site         | Astro + Tailwind + MDX        |

## Estrutura do monorepo

```
fzagent/
|-- packages/
|   |-- core/         # tipos Zod, logger, config loader, event bus
|   |-- providers/    # adapters multi-LLM com fallback router
|   |-- memory/       # embeddings ONNX, qdrant client, wiki SQLite indexer
|   |-- skills/       # SkillRegistry com auto-discovery
|   |-- agent/        # nucleo OpenClaw-style, tools nativas, FCC fix
|   |-- cli/          # binario fzagent (commander) + server Express/Socket.io
|   `-- web-ui/       # frontend Vite + React 19 + Tailwind + Zustand
|-- genaisrc/         # skills do usuario em formato OpenClaw
|-- skills-claude/    # skills para Claude.ai (reversa, fzagent)
|-- wiki/             # cerebro secundario markdown (versionado)
|   |-- sources/      # dossies de fontes externas
|   |-- concepts/
|   `-- analyses/
|-- raw/              # fontes brutas para ingest
|-- db/               # SQLite databases (gitignored)
|-- site/             # site Astro (FASE 8)
|-- external/         # repos clonados read-only (gitignored)
|-- scripts/          # templates operacionais (systemd, etc.)
|-- logging_system/   # prototipo Python paralelo (experimental)
|-- tests/            # testes E2E
`-- docs/             # arquitetura, getting-started, api-reference auto
```

## Instalacao

Pre-requisitos:

- **Node 22 LTS** (engines.node `>=22.0.0`)
- **Qdrant** local ou cloud (FASE 4 em diante)
- API keys para os providers que voce usar (apenas Anthropic ou um Claude Code OAuth token e suficiente)

```bash
# clonar
git clone <url> fzagent
cd fzagent

# dependencias
npm install

# config
cp .env.example .env            # preencha API keys
cp fzagent.conf.example fzagent.conf  # ajuste budgets/fallback se quiser

# build inicial
npm run build

# verificar
npm test
```

## Uso

```bash
# one-shot
fzagent "Resuma o paper em raw/attention.pdf em 3 pontos"

# CLI interativa
fzagent --cli

# loop agentico explicito
fzagent agent loop "Pesquisa sobre RAG hibrido e gera dossie em wiki/concepts/"

# orcamento ajustado (default ja eh 200k)
fzagent agent budget "Implementa CRUD em src/users.ts" -i 30 --token-budget 200000

# ingest de fonte para o wiki
fzagent wiki ingest raw/karpathy-wiki.md

# busca no cerebro secundario
fzagent wiki query "qual e o padrao de compaction do openclaw"

# lint do wiki (detecta orfaos, contradicoes, links quebrados)
fzagent wiki lint

# operacoes do vector store
fzagent vector validate
fzagent vector recreate

# inspecionar skills carregadas
fzagent skill list
fzagent skill describe <nome>

# server HTTP + WebSocket (REST + /ws para stream de eventos)
fzagent server               # default 127.0.0.1:7331

# web-ui (desenvolvimento)
cd packages/web-ui && npm run dev   # consome /ws do server
```

## Status

Veja [CHANGELOG.md](./CHANGELOG.md) para o historico granular por release.

| Fase | Escopo                                               | Status |
| ---- | ---------------------------------------------------- | ------ |
| 0    | Bootstrap + dossies de referencia                    | done   |
| 1    | Workspace npm + configs base                         | done   |
| 2    | `packages/core` (tipos Zod, logger, event bus, conf) | done   |
| 3    | `packages/providers` (router + 5 adapters + capab.)  | done   |
| 4    | `packages/memory` (wiki SQLite + Qdrant)             | done   |
| 5    | `packages/agent` (loop OODA + FCC fix sub-sessao 1)  | done   |
| 6    | `packages/skills` (registry + manifest v1 + auditor) | done   |
| 7    | `packages/cli` (commander + server + factory)        | done   |
| 7+   | Server HTTP + WebSocket (Express + Socket.io)        | done   |
| 7++  | `packages/web-ui` (Vite + React 19 + Tailwind)       | exp    |
| 8    | site Astro                                           | exp    |
| 9    | skills para Claude.ai                                | wip    |
| 10   | testes + CI                                          | wip    |
| L99  | ponte fzagent (cerebro) -> fazai-ng (corpo)          | prep   |

Legenda: `done` entregue, `exp` experimental, `wip` em curso, `prep` preparado
(eventos/config keys presentes; implementacao na proxima sub-sessao).

## Roadmap proximo

- **FCC fix sub-sessao 2**: compaction LLM com `groupAtomicUnits`
  preservando pares `tool_use`/`tool_result`. Eventos
  `agent.compaction-triggered`/`completed` ja no contrato.
- **Skill `fazai-query-kb`**: ponte L99 via `QDRANT_FAZAI_URL` para o
  corpo fazai-ng.
- **Meta-skill `skill.create`**: autoconstrucao a partir do registry.
- **GeminiProxyProvider**: camada OpenAI-compat via Cloudflare Worker
  (remove SDK proprietario do runtime).

## Filosofia

> Replicar o **espirito** do OpenClaw, nao o codigo.
> Codigo enxuto > codigo completo. Tipos estritos > comentarios.
> Hibrido textual + vetorial > vetorial puro.
> Permissoes proporcionais ao risco > tudo aberto.

## Licenca

MIT — veja [LICENSE](LICENSE).

## Referencias

- [Build Your Own OpenClaw](https://build-your-own-openclaw.kiyo-n-zane.com/)
- [LLM Wiki — Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
- [fazai-ng](https://fzrepo.rogerluft.com.br/StorageWeb/fazai-ng)
- [reversa](https://github.com/sandeco/reversa)
- [buildoc](https://github.com/rogerluft/buildoc)
