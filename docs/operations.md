# Operations — Configuracao, CLI, Logging

## Hierarquia de configuracao

```
.env (credenciais, override)
   │
   ▼
fzagent.conf (operacional, defaults do operador)
   │
   ▼
schema defaults (packages/core/src/config/schema.ts)
```

Regra: `.env` tem **precedencia** sobre `fzagent.conf` quando a mesma chave
existe em ambos. `fzagent.conf.example` documenta todas as chaves do conf
com comentarios.

Ambos os arquivos sao gitignored:

- `.env` — credenciais (API keys, tokens, segredos)
- `fzagent.conf` — config local do operador (modelos preferidos, paths)

## Chaves principais

### .env (credenciais)

| Chave                     | Default                      | Observacao                       |
| ------------------------- | ---------------------------- | -------------------------------- |
| `CLAUDE_CODE_OAUTH_TOKEN` | —                            | Anthropic OAuth (1a prioridade)  |
| `ANTHROPIC_OAUTH_TOKEN`   | —                            | Anthropic OAuth (2a prioridade)  |
| `ANTHROPIC_AUTH_TOKEN`    | —                            | Anthropic (3a)                   |
| `ANTHROPIC_API_KEY`       | —                            | Anthropic API key (4a)           |
| `OPENAI_API_KEY`          | —                            |                                  |
| `OPENROUTER_API_KEY`      | —                            |                                  |
| `BRAVE_SEARCH_API_KEY`    | —                            | Necessario para `web.search`     |
| `QDRANT_URL`              | `http://localhost:6333`      |                                  |
| `QDRANT_API_KEY`          | —                            | Opcional (Qdrant local sem auth) |
| `OLLAMA_BASE_URL`         | `http://192.168.0.101:11434` | papaimach                        |
| `LOG_LEVEL`               | —                            | Override do conf (opcional)      |
| `LOG_LEVEL_CONSOLE`       | —                            | Override do conf, sink console   |
| `LOG_LEVEL_FILE`          | —                            | Override do conf, sink arquivo   |
| `LOG_FORMAT`              | —                            | Override do conf (opcional)      |
| `LOG_FILE`                | —                            | Override do conf (opcional)      |

### fzagent.conf (operacional)

Sessoes principais:

**LLMs**:

- `PROVIDER_FALLBACK_ORDER` — ordem de fallback (csv)
- `MODELS_ANTHROPIC`, `MODELS_OPENAI`, etc. — modelos disponiveis por provider
- `DEFAULT_MODEL` — modelo padrao

**Agentic loop**:

- `AGENTIC_MAX_ITERATIONS` (20) — max iters por `agent.run()`
- `AGENTIC_TOKEN_BUDGET` (200000) — budget de tokens por sessao
- `AGENTIC_CIRCUIT_BREAKER_MAX_FAILURES` (3)
- `AGENTIC_CIRCUIT_BREAKER_COOLDOWN_MS` (30000)

**Skills**:

- `GENAISRC_DIR` (`genaisrc`) — onde estao as `.genai.mjs`
- `SKILL_REGISTRY_SCAN_INTERVAL` (60000ms) — re-scan periodico
- `SKILL_HIGH_PERMISSION_REQUIRES_CONFIRM` (true)
- `TOOL_HIGH_PERMISSION_REQUIRES_CONFIRM` (true)
- `AUTO_CONFIRM_HIGH` (false) — bypass global

**Memory**:

- `WIKI_DIR` (`wiki`), `WIKI_DB` (`db/wiki.sqlite`)
- `RAG_SIMILARITY_THRESHOLD` (0.6), `RAG_TOP_K` (5)
- `QDRANT_COLLECTIONS` — csv das 6 collections fzagent\_\*
- `EMBEDDINGS_DIM` (768), `EMBEDDINGS_CACHE_SIZE`

**Logging**:

- `LOG_LEVEL` (`info`) — vocabulario: `verbose` | `debug` | `info` | `silent`
- `LOG_LEVEL_CONSOLE` (vazio = herda LOG_LEVEL) — override do level do sink console
- `LOG_LEVEL_FILE` (vazio = herda LOG_LEVEL) — override do level do sink arquivo
- `LOG_FORMAT` (`pretty`) — `pretty` | `json` | `silent`
- `LOG_FILE` (vazio) — quando setado, dual sink (console + JSON file)

**Paths**:

- `DB_DIR` (`db`), `RAW_DIR` (`raw`), `LOGS_DIR` (`logs`)
- `SKILL_AUDIT_FILE` (`skill-invocations.jsonl`)

## CLI Reference

Binario: `packages/cli/dist/cli.js` (apos build) ou `npm run dev`.

### One-shot e interativo

```
fzagent "<prompt>"                # one-shot, dispatch p/ agent loop
fzagent --tui                     # loop interativo readline
fzagent --dump-context "<prompt>" # debug de system prompt injetado e tokens
fzagent --version
```

### Agent

```
fzagent agent loop "<task>" [-m <model>]
fzagent agent budget "<task>" -i <maxIter> --token-budget <n>
fzagent agent skills              # lista skills (alias antigo)
fzagent agent use <skillId> '<input-json>'
```

### Skills (manifest v1)

```
fzagent skill list [--domain <d>] [--destructive]
fzagent skill describe <name>     # imprime manifest completo (JSON)
```

### Tools nativas

```
fzagent tools list                # 10 tools com permissions
fzagent tools describe <name>     # imprime input schema
```

### Wiki (cerebro secundario)

```
fzagent wiki ingest <path> [--summarize]
fzagent wiki query "<q>" [--top <n>] [--synthesize]
fzagent wiki lint                 # orfas, links quebrados, fontes nao-anexadas
fzagent wiki stats
```

### Vector (Qdrant)

```
fzagent vector validate           # checa exists/dim/points per collection
fzagent vector recreate <name>    # DESTRUTIVO
```

### Config

```
fzagent config                    # imprime conf + env (secrets mascarados)
```

## Logging

Implementacao em `packages/core/src/logger/index.ts` — `createLogger()`.

### Niveis

Vocabulario oficial — apenas 4 valores recomendados pelo operador:

- `silent` — desliga tudo
- `info` — eventos operacionais normais (default)
- `debug` — info + diagnostico interno (provider calls, skill loading, etc.)
- `verbose` — alias de `debug` (conveniencia)

Outros valores aceitos por compatibilidade pino: `trace`, `warn`, `error`,
`fatal`.

### Formatos

- `pretty` — terminal colorido (pino-pretty)
- `json` — uma linha JSON por evento
- `silent` — sem output

### Dual sink — console + arquivo

Quando `LOG_FILE` setado, o logger usa transport com multiplos targets:

```
LOG_FORMAT=pretty + LOG_FILE=fzagent.log
  ├─► stdout/stderr (pino-pretty, colorido)        — usa LOG_LEVEL_CONSOLE
  └─► fzagent.log   (pino/file, JSON estruturado)  — usa LOG_LEVEL_FILE
```

Cada sink pode ter seu proprio level (override via `LOG_LEVEL_CONSOLE`
e `LOG_LEVEL_FILE`). Quando ausentes, herdam `LOG_LEVEL`. Receita comum:
console quieto + arquivo verboso para forensics.

```
LOG_LEVEL=info
LOG_LEVEL_CONSOLE=silent
LOG_LEVEL_FILE=debug
LOG_FILE=/tmp/fzagent.log
```

Diretorio do `LOG_FILE` eh criado automaticamente. Path relativo eh
resolvido contra o cwd; absoluto eh usado direto.

### Inspecao ao vivo

```
tail -f fzagent.log | jq .
tail -f logs/skill-invocations.jsonl | jq 'select(.outcome=="error")'
```

## Auto-confirm de tools HIGH

Tres formas, em ordem de precedencia:

1. **`FZAGENT_AUTO_CONFIRM_HIGH=1`** (env var) — bypass one-shot.
   ```
   FZAGENT_AUTO_CONFIRM_HIGH=1 fzagent "rode pwd"
   ```
2. **`AUTO_CONFIRM_HIGH=true`** no `fzagent.conf` — bypass persistente.
3. **TTY interativo** sem nenhum bypass — pergunta `[y/N]` no terminal.
4. **Non-TTY** sem bypass — **nega** (politica safe).

Para tools HIGH (hoje so `shell.exec` entre as builtins) e skills HIGH
(`cleaner` entre as builtins).

## Hooks de git (husky)

Em `.husky/`:

- **pre-commit** — `lint-staged` aplica ESLint --fix + Prettier --write em
  arquivos staged. Falha bloqueia o commit.
- **pre-push** — `npm run typecheck && npm test`. Bloqueia push se algo
  quebrar.

Em hardware lento, o pre-push pode demorar ~30s (build composite + test
suite). Vale paciencia — eh menos custoso que CI red.

## Comandos npm uteis

```
npm test              # vitest suite completa
npm run typecheck     # tsc -b composite
npm run lint          # ESLint (CI usa --max-warnings 0)
npm run format        # Prettier write
npm run format:check  # Prettier check (CI)
npm run build         # tsup em todos os pacotes
npm run ci            # typecheck + lint + format:check + test
```

## Diretorios criados em runtime

Estes diretorios sao criados automaticamente quando necessario; nao precisa
pre-criar manualmente:

| Path                                        | Criado por                                  | Quando                                          |
| ------------------------------------------- | ------------------------------------------- | ----------------------------------------------- |
| `db/`                                       | WikiIndexer + SessionStore (better-sqlite3) | Primeira ingest ou primeira `agent.run()`       |
| `logs/`                                     | JsonlSkillAuditor + (LOG_FILE pai)          | Primeira skill invoke ou primeiro logger event  |
| `~/.cache/fzagent/models/bge-base-en-v1.5/` | EmbeddingsService                           | Primeiro embed (download de 440MB do ONNX)      |
| `genaisrc/`                                 | git (.gitkeep)                              | Pre-existente; skills do usuario vivem aqui     |
| `raw/`                                      | git (.gitkeep)                              | Pre-existente; fontes brutas para `wiki ingest` |
