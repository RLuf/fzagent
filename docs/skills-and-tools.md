# Skills e Tools

fzagent tem **duas superficies** de capability:

- **Tools** — built-ins do agente. Mantidas em `packages/agent/src/tools/builtins/`.
  Disponiveis a TODOS os agentes do fzagent, sem opt-in.
- **Skills** — capacidades expandidas, descobertas em `genaisrc/*.genai.mjs` em
  runtime ou registradas programaticamente (builtins do pacote skills).
  Sao o **protocolo de transplante L99** — quando o corpo fazai-ng expor
  capacidades, sera como skill com `targetDomain='bridge'`.

A divisao eh deliberada:

- Tools sao "infraestrutura" — o agente precisa delas pra existir (ler/escrever
  arquivos, executar comandos, falar com a web).
- Skills sao "capacidade declarada" — opt-in por quem opera o agente, com
  manifest completo, governanca propria.

## Tools nativas (10)

Lista em `packages/agent/src/tools/builtins/index.ts` — `registerBuiltinTools()`.

| Tool             | Permission | O que faz                                             |
| ---------------- | ---------- | ----------------------------------------------------- |
| `shell.exec`     | `high`     | Executa bash. Captura stdout. Falha em exit != 0.     |
| `fs.read`        | `low`      | Le arquivo do disco. Caminhos relativos vs `ctx.cwd`. |
| `fs.write`       | `medium`   | Escreve em arquivo. `mkdirp` por padrao.              |
| `web.fetch`      | `low`      | GET de uma URL. Retorna texto extraido.               |
| `web.search`     | `low`      | Brave Search. Requer `BRAVE_SEARCH_API_KEY`.          |
| `wiki.ingest`    | `medium`   | Ingere fonte bruta no cerebro secundario.             |
| `wiki.query`     | `low`      | Busca hibrida (FTS5 + Qdrant) + sintese opcional.     |
| `wiki.lint`      | `low`      | Orfas, links quebrados, fontes nao-anexadas.          |
| `skill.invoke`   | `medium`   | Invoca skill registrada (auto-discovery genaisrc).    |
| `agent.delegate` | `medium`   | Sub-agente filho no mesmo workspace.                  |

Inspecao no CLI:

```
fzagent tools list
fzagent tools describe shell.exec
```

### Gate HIGH em tools nativas

`packages/agent/src/tools/registry.ts` — `ToolRegistry.execute()`.

Quando `TOOL_HIGH_PERMISSION_REQUIRES_CONFIRM=true` (default), tools com
`permissions='high'` passam por `onHighConfirm` callback antes de rodar.

Resolucao do callback (em `packages/cli/src/factory.ts` — `makeHighConfirm`):

1. Env var `FZAGENT_AUTO_CONFIRM_HIGH=1` -> bypassa (override one-shot)
2. `AUTO_CONFIRM_HIGH=true` no fzagent.conf -> bypassa (persistente)
3. TTY interativo -> pergunta `[y/N]` no terminal e bloqueia
4. Non-TTY (pipe, runtime headless) -> **nega** (politica safe)

Hoje so `shell.exec` eh HIGH entre as builtins. Quando uma chamada eh negada,
o agente recebe a string de erro como tool_result e tipicamente pede ao
usuario confirmacao explicita.

## Skills

Tipos em `packages/skills/src/types.ts`. Manifest v1 normativo em
`wiki/concepts/skill-contract.md`. Schema canonico em
`packages/core/src/types/skill.ts` — `SkillManifestSchema`.

### Tres eixos ortogonais

| Eixo                   | Valores                      | Significado                                                      |
| ---------------------- | ---------------------------- | ---------------------------------------------------------------- |
| `permissions`          | `low` / `medium` / `high`    | Risco operacional padrao                                         |
| `requiresConfirmation` | `true` / `false` / undefined | Gate explicito (override do default derivado de permissions)     |
| `isDestructive`        | `true` / `false`             | Hint declarativo (mudanca de estado nao trivialmente reversivel) |

A independencia eh por design: existem skills MEDIUM que mexem em producao
(requer confirm) e HIGH em dry-run (nao requer).

### Categorias de targetDomain

| `targetDomain` | Significado                                            |
| -------------- | ------------------------------------------------------ |
| `system`       | Workspace local, processos, FS do diretorio do fzagent |
| `kb`           | Base de conhecimento (Qdrant collections, SQLite wiki) |
| `bridge`       | Integracao com fazai-ng (canal definido em L99)        |
| `introspect`   | Leitura de telemetria/status/estado do proprio agente  |
| `external`     | APIs externas (web, terceiros)                         |
| `custom`       | Nao se encaixa nas anteriores                          |

### SkillRegistry

`packages/skills/src/registry.ts`. Responsabilidades:

- **`loadAll()`** — escaneia `genaisrc/*.genai.mjs`, dynamic-import com
  cache-bust por sha256, valida shape minimo (`name` + `run`), registra.
- **`registerProgrammatic(spec)`** — registra builtins do pacote sem ler
  do disco.
- **`invoke(name, input, ctx)`** — pipeline: encontra skill -> gate
  `requiresConfirmation` -> valida input (Zod) -> `skill.run` -> audita.
- **`startWatching()`** — chokidar no diretorio; recarrega `.genai.mjs`
  quando muda.
- **`requiresConfirmation(name)`** — true se manifest tem `requiresConfirmation=true`
  ou (`permissions='high'` E `highRequiresConfirm` E callback presente).

### Skills builtin (6 do pacote)

Em `packages/skills/src/builtins.ts` — `registerBuiltinSkills()`:

- `cleaner` (HIGH) — remove caches/tmp
- `reflect` (LOW) — reflexao do agente
- `web-research` (LOW) — agrega search+fetch+sintese
- `wiki-ingest` (MEDIUM) — wrapper friendly de `wiki.ingest`
- `wiki-query` (LOW) — wrapper friendly de `wiki.query`
- `code-review` (LOW) — revisao de codigo

### Skills demo em genaisrc/ (3 do ensaio L99)

- `fazai-query-kb.genai.mjs` — read-only Qdrant query (whitelist `fazai_*`)
- `fazai-bridge-ping.genai.mjs` — mock de bridge IPC com `targetDomain='bridge'`.
  Substituido pela implementacao real quando L99 chegar.
- `fazai-introspect.genai.mjs` — snapshot de providers/skills/governance do agente.

### Auditoria — JsonlSkillAuditor

`packages/skills/src/audit.ts`. Toda invocacao gera evento em
`logs/skill-invocations.jsonl`. Implementacao append-only.

Eventos cobrem:

- Skill nao encontrada (outcome=error, decision=auto)
- Confirm negado (outcome=error, decision=denied)
- Run lancou exception (outcome=error)
- Sucesso (outcome=ok, decision=auto/confirmed)

Payload nao eh persistido — so hashes sha256(16 chars). Para auditoria
completa, cruzar `sessionId` com `sessions.sqlite`.

### Inspecao no CLI

```
fzagent skill list                            # todas (builtins + genaisrc)
fzagent skill list --domain kb                # filtra por targetDomain
fzagent skill list --destructive              # so destrutivas
fzagent skill describe fazai-bridge-ping      # manifest completo (JSON)
fzagent agent use <skill-id> '{"key":"val"}'  # invoca diretamente
```

## Assimetria de gate (importante)

| Camada        | Gate HIGH                                               | Auditoria                                 |
| ------------- | ------------------------------------------------------- | ----------------------------------------- |
| Tools nativas | `ToolRegistry` aceita callback, factory pluga TTY-aware | sessions.sqlite (turn + tool_call)        |
| Skills        | `SkillRegistry` aceita callback, mesmo padrao           | sessions.sqlite + skill-invocations.jsonl |

A partir do commit `8f018a4` os dois lados tem paridade no gate HIGH. A
auditoria especifica de skills (JSONL) eh adicional — tools nativas usam so o
log estruturado do pino + sessions.sqlite.
