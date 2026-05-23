# Data Stores — onde o fzagent guarda estado

O fzagent eh **hibrido** por design: SQLite para texto/metadata estruturada,
Qdrant para vetores. Cada operacao usa a base apropriada ou ambas em paralelo.

## Quadro geral

| Base                           | Path/URL                      | Conteudo                                                    | Acessada por             |
| ------------------------------ | ----------------------------- | ----------------------------------------------------------- | ------------------------ |
| `db/wiki.sqlite`               | local                         | pages, FTS5, tags, links, sources, frontmatter, log         | `WikiIndexer`            |
| `db/sessions.sqlite`           | local                         | sessions, turns, tool_calls (historico episodico)           | `SessionStore`           |
| Qdrant                         | `http://localhost:6333` (env) | 6 collections `fzagent_*` com vetores 768d (BGE-base)       | `QdrantWrapper`          |
| `fzagent.log`                  | local (cwd)                   | pino JSON estruturado (todos eventos do logger)             | dual sink (console+file) |
| `logs/skill-invocations.jsonl` | local                         | 1 linha por invocacao de skill (hashes + decisao + outcome) | `JsonlSkillAuditor`      |

Defaults em `packages/core/src/config/schema.ts`:

- `DB_DIR=db`
- `WIKI_DB=db/wiki.sqlite`
- `LOGS_DIR=logs`
- `SKILL_AUDIT_FILE=skill-invocations.jsonl`
- `QDRANT_URL=http://localhost:6333` (env)

## SQLite — db/wiki.sqlite

Schema em `packages/memory/src/indexer/schema.ts`. Tabelas:

- `pages` — paginas markdown indexadas (id, path, title, body, sha256, mtime)
- `pages_fts` — virtual table FTS5 espelhando `title + body`, mantida por
  triggers. Busca textual: `pages_fts MATCH ?` com ranking BM25.
- `tags` + `page_tags` — many-to-many
- `links` — wiki-links `[[outra-pagina]]` resolvidos
- `sources` — fontes brutas (`raw/*`) anexadas a paginas
- `frontmatter` — YAML/TOML frontmatter por pagina
- `log` — historico de ingest/update/delete

Acesso: `packages/memory/src/indexer/indexer.ts` — `WikiIndexer`. Metodos
relevantes: `upsertPage`, `search(query, limit)`, `lint`, `stats`.

## SQLite — db/sessions.sqlite

Schema em `packages/agent/src/session/schema.ts`. Tabelas:

- `sessions` — uma linha por `agent.run()` (id, agent_id, task, status, ts)
- `turns` — uma linha por mensagem (role, content, tokens_in/out, ts)
- `tool_calls` — uma linha por invocacao de tool (turn_id, name, input,
  output, duration_ms, ok)

Acesso: `packages/agent/src/session/store.ts` — `SessionStore`. Cresce com
o uso; ainda nao tem rotacao/TTL (TODO eventual).

Inspecao manual:

```
sqlite3 db/sessions.sqlite "SELECT id, agent_id, task, status FROM sessions ORDER BY rowid DESC LIMIT 5"
sqlite3 db/sessions.sqlite "SELECT name, ok, duration_ms FROM tool_calls ORDER BY rowid DESC LIMIT 20"
```

## Qdrant — vetorial

Cliente em `packages/memory/src/qdrant/client.ts` — `QdrantWrapper`.

Collections esperadas (config `QDRANT_COLLECTIONS`):

- `fzagent_kb` — base de conhecimento principal
- `fzagent_memory` — memoria episodica vetorial
- `fzagent_learning` — aprendizado/feedback
- `fzagent_personality` — traits, tom, restricoes
- `fzagent_inference` — cache de inferencias
- `fzagent_semantic_cache` — cache de resultados semanticos

Dimensao: 768 (BGE-base-en-v1.5). Distancia: cosine. Threshold default
(`RAG_SIMILARITY_THRESHOLD`): 0.6.

Validacao das collections (CLI):

```
fzagent vector validate
```

Recriacao destrutiva (CLI):

```
fzagent vector recreate <collection>
```

## Busca hibrida — quando os dois cooperam

`wiki.query` (tool builtin) e `wiki-query` (skill builtin) fazem busca
hibrida:

```
                     query string
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
   pages_fts MATCH ?              embed -> Qdrant.search()
   (lexical, BM25)                (semantic, cosine)
            │                           │
            └──────────► merge ◄────────┘
                   (rank fusion)
```

Onde:

- **SQLite/FTS5** brilha em: token raro, codigo, ID exato, sintaxe.
- **Qdrant** brilha em: sinonimo, parafrase, intencao, linguagem natural.

## Logs estruturados

### fzagent.log

Quando `LOG_FILE` setado no `fzagent.conf`, o logger pino faz dual sink:
console pino-pretty + arquivo JSON estruturado. Cria o diretorio se
ausente.

Formato (uma linha JSON por evento):

```json
{
  "level": 40,
  "time": "2026-05-12T04:04:22.798Z",
  "toolName": "shell.exec",
  "msg": "HIGH tool auto-confirmed via FZAGENT_AUTO_CONFIRM_HIGH=1"
}
```

`level` segue pino: 10 trace, 20 debug, 30 info, 40 warn, 50 error, 60 fatal.

Acompanhamento ao vivo:

```
tail -f fzagent.log | jq .
```

### logs/skill-invocations.jsonl

Auditoria especifica de skills, append-only. Implementacao em
`packages/skills/src/audit.ts` — `JsonlSkillAuditor`.

Cada linha:

```json
{
  "timestamp": "2026-05-12T04:14:55.419Z",
  "skill": "fazai-bridge-ping",
  "targetDomain": "bridge",
  "permissions": "low",
  "isDestructive": false,
  "inputHash": "b93256e711490af6",
  "outputHash": "19aea81077f943b3",
  "decision": "auto",
  "outcome": "ok",
  "durationMs": 1,
  "error": null,
  "agentId": "fzagent",
  "sessionId": "..."
}
```

- `decision`: `auto` (sem confirm), `confirmed` (confirm aceito), `denied` (confirm negado).
- `outcome`: `ok` ou `error`.
- Hashes sao sha256 truncados em 16 chars (correlacao sem persistir segredos).

Quando precisar do payload completo: cruzar `sessionId` com `sessions.sqlite`.

## Resumo: o que cada operacao toca

| Operacao                     | wiki.sqlite     | sessions.sqlite | Qdrant          | fzagent.log | skill-invocations.jsonl |
| ---------------------------- | --------------- | --------------- | --------------- | ----------- | ----------------------- |
| `wiki ingest`                | ✅ write        | ❌              | ✅ upsert       | ✅ debug    | ❌                      |
| `wiki query`                 | ✅ read         | ❌              | ✅ search       | ✅ debug    | ❌                      |
| `wiki lint`                  | ✅ read         | ❌              | ❌              | ✅ debug    | ❌                      |
| `vector validate`            | ❌              | ❌              | ✅ read         | ✅ debug    | ❌                      |
| `agent skills`               | ❌              | ❌              | ❌              | ✅ debug    | ❌                      |
| `agent use <skill>`          | depende         | ❌              | depende         | ✅          | ✅                      |
| `agent loop` (fzagent "...") | depende da tool | ✅ write        | depende da tool | ✅          | ✅ se invocar skill     |
| `config`                     | ❌              | ❌              | ❌              | ❌          | ❌                      |
