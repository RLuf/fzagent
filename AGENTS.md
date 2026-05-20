# AGENTS.md

> **REGRA ZERO — smoke test OBRIGATORIO depois de cada mudanca.**
> Vitest verde nao prova nada. Toda mudanca em codigo ou config termina
> com `npm run build` + invocacao real do binario (`fzagent skill list`,
> `fzagent tools list`, `fzagent config`, ou qualquer outra). Se o
> output nao for o esperado, a mudanca falhou — mesmo que o vitest
> tenha passado. Nao marcar tarefa como done sem smoke.
> Isto substitui dezenas de testes vitest que tendem a sair verdes
> mesmo quando o binario quebra (mocks divergem do real, build falha
> silenciosa, config runtime nao bate com fixture).

## Sobre o projeto

**fzagent** eh um superagente OpenClaw-style em TypeScript/Node.js ESM com
cerebro secundario hibrido (SQLite + FTS5 + Qdrant) e multi-provider LLM
(Anthropic, OpenAI, OpenRouter, Google, Ollama).

Posicionamento: cerebro maduro que sera eventualmente o juizo estrategico
do fazai-ng (integracao L99). Cada capacidade externa eh exposta como
**skill** com manifest v1. Detalhes em [`docs/architecture.md`](docs/architecture.md).

## Onde achar o que

| Pergunta                                  | Onde                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| Visao geral da arquitetura                | [`docs/architecture.md`](docs/architecture.md)                             |
| SQLite, Qdrant, logs                      | [`docs/data-stores.md`](docs/data-stores.md)                               |
| Skills, tools, gates HIGH                 | [`docs/skills-and-tools.md`](docs/skills-and-tools.md)                     |
| Providers, router, capability negotiation | [`docs/providers.md`](docs/providers.md)                                   |
| Config, CLI, logging                      | [`docs/operations.md`](docs/operations.md)                                 |
| Contrato declarativo do manifest v1       | [`wiki/concepts/skill-contract.md`](wiki/concepts/skill-contract.md)       |
| Referencia API (classes, types, funcoes)  | [`docs/api-reference/`](docs/api-reference/) — **auto-gerada via TypeDoc** |

## Monorepo

6 pacotes em `packages/`:

```
core      — types, config, logger, eventBus, errors (sem deps internas)
providers — LLM adapters + Router (capability negotiation)
memory    — WikiIndexer (SQLite+FTS5), QdrantWrapper, Embeddings (BGE)
agent     — Agent loop, ToolRegistry, builtins (fs/shell/web/wiki/skill/delegate)
skills    — SkillRegistry, SkillAuditor, defineSkill, builtins
cli       — Factory (buildRuntime/buildAgent) + comandos commander
```

Dependencias internas (sem ciclos):

```
cli ─┬─> agent ─┬─> providers ─> core
     │          └─> memory ──────^
     └─> skills ─> core
```

## Comandos essenciais

```
npm test                # vitest (220+ testes)
npm run typecheck       # tsc -b composite
npm run lint            # ESLint (CI usa --max-warnings 0)
npm run format          # Prettier write
npm run build           # tsup em todos os packages
npm run ci              # typecheck + lint + format:check + test
npm run docs:api        # regera docs/api-reference/ via TypeDoc
```

CLI do agente (apos build):

```
fzagent "<prompt>"                    # one-shot
fzagent --cli                         # interativo
fzagent tools list                    # tools nativas
fzagent skill list                    # skills (builtins + genaisrc)
fzagent skill describe <name>         # manifest completo
fzagent vector validate               # checa Qdrant collections
fzagent config                        # imprime config efetiva
```

## Convencoes

### Codigo

- TypeScript ESM. Imports relativos terminam em `.js` (resolved como `.ts`).
- Zod para validacao de input em tools/skills.
- Tipos publicos em `<package>/src/index.ts` — superficie estavel.
- Sem singleton global. Logger eh injetado.
- `defineTool` / `defineSkill` aplicam `z.output<TSchema>` no run() — defaults
  ja resolvidos, sem `undefined` indesejado nos handlers.

### Commits

- Convencao: `feat: ...` / `fix: ...` / `chore: ...` / `docs: ...`
- Pre-commit hook roda lint-staged (ESLint --fix + Prettier --write).
- Pre-push hook roda `npm run typecheck && npm test`. Falha bloqueia push.
- Co-Authored-By para mudancas feitas com auxilio de AI (modelo Claude eh
  `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`).

### Doc

- **Doc humana** (`docs/*.md`) expressa **intencao e decisao**.
- **Doc gerada** (`docs/api-reference/`) reflete **superficie observada**.
- Quando houver conflito, a humana tem prioridade interpretativa.
- Regerar api-reference depois de mudar `packages/*/src/index.ts`:
  `npm run docs:api`. Output eh versionado (drift visivel no PR diff).

### Skills (manifest v1)

Tres eixos ortogonais:

- `permissions`: `low` / `medium` / `high` (risco operacional)
- `requiresConfirmation`: `true|false|undefined` (gate explicito)
- `isDestructive`: `true|false` (hint declarativo)

Categorias de `targetDomain`: `system` | `kb` | `bridge` | `introspect` | `external` | `custom`.

Contrato completo: [`wiki/concepts/skill-contract.md`](wiki/concepts/skill-contract.md).

### Tools nativas

Camada de infraestrutura (fs/shell/web/wiki/skill/delegate). Gate HIGH com
callback TTY-aware. `shell.exec` eh a unica HIGH atualmente. Bypass:

- env `FZAGENT_AUTO_CONFIRM_HIGH=1` (one-shot)
- `AUTO_CONFIRM_HIGH=true` no `fzagent.conf` (persistente)

## Antes de mexer

1. Leia o doc humano relevante em `docs/`.
2. Se mexer em tipos publicos (export de `<package>/src/index.ts`), rode
   `npm run docs:api` antes de commitar — o diff em `docs/api-reference/`
   eh esperado e desejavel.
3. Rode `npm test` localmente. CI sera intransigente.
4. Commits pequenos, focados. Pre-commit hook formata sozinho.

## Depois de mexer — checklist concreto da REGRA ZERO

1. `npm run build` — build precisa sair limpo.
2. `npm run docs:api` se mexeu em `packages/*/src/index.ts` (exports
   publicos). Drift em `docs/api-reference/` precisa ser commitado junto.
3. Invocacao real do binario com pelo menos um comando — exemplos
   nao-destrutivos: `fzagent skill list`, `fzagent tools list`,
   `fzagent config`, `fzagent --help`.
4. Conferir output: tem que estar coerente com a mudanca. Se nao bater,
   a mudanca falhou.

## Recursos externos

- TypeDoc docs: https://typedoc.org
- AGENTS.md spec: https://agents.md
- Mintlify (avaliado e rejeitado para este repo — ver `docs/README.md`
  secao "Por que TypeDoc e nao Mintlify")
