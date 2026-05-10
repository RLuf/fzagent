# fzagent

> Superagente OpenClaw-style em TypeScript/Node.js ESM puro, com cerebro
> secundario (Wiki SQLite + FTS5 + Qdrant), multi-provider LLM com fallback,
> skills auto-discovery e budget loop com circuit breaker.

[![Node.js](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
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

- **Multi-provider LLM com fallback**: Anthropic, OpenAI, Google, OpenRouter, Ollama. Circuit breaker por provider e retry com backoff exponencial.
- **Cerebro secundario hibrido**: Wiki markdown indexado (`SQLite + FTS5`) + 6 collections vetoriais (`Qdrant`, BGE-base 768d via ONNX local).
- **Budget loop**: state machine `THINK -> ACT -> OBSERVE -> REFLECT` com `maxIterations` + `tokenBudget` + circuit breaker.
- **Skills auto-discovery**: scan periodico de `genaisrc/*.genai.mjs` (formato OpenClaw `SKILL.md`); permissoes proporcionais ao risco (low/medium/**high** com confirmacao).
- **WORA heartbeat opcional**: observa heap, qdrant, disco a cada 30s; raciocinio zero-LLM por heuristica; age (gc, reconnect, alert).
- **Sub-agentes via dispatch**: `agent.delegate` via event bus interno, no espirito do step 15 do OpenClaw.
- **CLI ergonomico**: `fzagent "<prompt>"`, `fzagent --cli` (interativo), `fzagent agent loop "<task>"`, `fzagent wiki ingest <path>`.
- **Site Astro** (FASE 8) replica visualmente o tutorial OpenClaw com a marca fzagent e textos reescritos.

## Stack

| Camada       | Tecnologia                    |
| ------------ | ----------------------------- |
| Runtime      | Node 18+ ESM puro             |
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
|   |-- agent/        # nucleo OpenClaw-style (~500 LOC), tools nativas
|   `-- cli/          # binario fzagent (commander)
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
|-- tests/            # testes E2E
`-- docs/
```

## Instalacao

Pre-requisitos:

- **Node 18+** (testado com 22 LTS)
- **Qdrant** local ou cloud (FASE 4 em diante)
- API keys para os providers que voce usar (apenas Anthropic e suficiente)

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

# orcamento ajustado
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
```

## Status

| Fase | Escopo                            | Status |
| ---- | --------------------------------- | ------ |
| 0    | Bootstrap + dossies de referencia | ✅     |
| 1    | Workspace npm + configs base      | 🚧     |
| 2    | `packages/core`                   | ⬜     |
| 3    | `packages/providers`              | ⬜     |
| 4    | `packages/memory`                 | ⬜     |
| 5    | `packages/agent`                  | ⬜     |
| 6    | `packages/skills`                 | ⬜     |
| 7    | `packages/cli`                    | ⬜     |
| 8    | site Astro                        | ⬜     |
| 9    | skills para Claude.ai             | ⬜     |
| 10   | testes + CI                       | ⬜     |

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
