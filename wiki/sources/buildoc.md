---
title: buildoc — implementação de referência do tutorial Build-Your-Own-OpenClaw
type: source-dossier
source: https://github.com/rogerluft/buildoc (fork) / czl9707/build-your-own-openclaw (origem)
mirror: ./external/buildoc/
last_synced: 2026-05-09
status: reference
---

# buildoc — Dossiê do código-fonte de referência

> **Por que ele importa**: este repo contém 18 pastas (`00-chat-loop` … `17-memory`), cada uma um snapshot Python rodável do agente em cada estágio. É a fonte primária de verdade para confirmar dúvidas de implementação que o site do tutorial não detalha.

## 1. Estrutura macro

```
buildoc/
├── 00-chat-loop/        # snapshot do passo 00
├── 01-tools/
├── …
├── 17-memory/           # snapshot final (mais completo)
├── default_workspace/   # config + agents + skills compartilhados
│   ├── AGENTS.md        # catálogo + delegation patterns
│   ├── BOOTSTRAP.md     # workspace structure cheat-sheet
│   ├── config.example.yaml
│   ├── agents/
│   │   ├── pickle/{AGENT.md, SOUL.md}
│   │   └── cookie/{AGENT.md, SOUL.md}
│   └── skills/
│       ├── cron-ops/SKILL.md
│       └── skill-creator/{SKILL.md, scripts/init_skill.py}
├── web/                 # site do tutorial (Astro)
├── PROVIDER_EXAMPLES.md # snippets para múltiplos providers
├── GAP.md
├── README.md / README.zh.md
├── Cover.png
└── LICENSE
```

Cada pasta de passo é um pacote Python autocontido (`pyproject.toml` + `src/mybot/`).

## 2. Stack do snapshot mais completo (`17-memory`)

`pyproject.toml` declara:

| Dep                            | Função                                           |
| ------------------------------ | ------------------------------------------------ |
| `litellm>=1.0.0`               | Adapter unificado para todos os providers de LLM |
| `pydantic>=2.0.0`              | Tipos validados em runtime (equivalente a Zod)   |
| `typer>=0.9.0`                 | CLI declarativa                                  |
| `rich>=13.0.0`                 | Output bonito no terminal                        |
| `pyyaml>=6.0`                  | Config YAML                                      |
| `httpx>=0.27.0`                | HTTP client async                                |
| `crawl4ai>=0.3.0`              | Web scraping para `webread`                      |
| `watchdog>=3.0.0`              | File watcher para hot reload                     |
| `python-telegram-bot>=20.0`    | Channel Telegram                                 |
| `discord.py>=2.0`              | Channel Discord                                  |
| `fastapi>=0.104.0` + `uvicorn` | HTTP/WS server                                   |
| `websockets>=12.0`             | WebSocket worker                                 |
| `croniter>=2.0.0`              | Parser de expressões cron                        |

## 3. Layout do código (`src/mybot/`)

```
mybot/
├── channel/              # platform adapters
│   ├── base.py           # Channel ABC: run/reply/stop
│   ├── discord_channel.py
│   └── telegram_channel.py
├── cli/                  # entrypoints
│   ├── chat.py           # ChatLoop interativo
│   ├── server.py         # FastAPI launcher
│   └── main.py           # typer app
├── core/                 # núcleo
│   ├── agent.py          # Agent + AgentSession (loop tool-use)
│   ├── agent_loader.py   # discover agents/<id>/AGENT.md
│   ├── context.py        # SharedContext (config, eventbus, loaders)
│   ├── context_guard.py  # compaction (token threshold + summarize)
│   ├── cron_loader.py    # discover cron defs
│   ├── eventbus.py       # pub/sub + atomic persistence + recovery
│   ├── events.py         # InboundEvent/OutboundEvent/DispatchEvent
│   ├── history.py        # JSONL persistence
│   ├── prompt_builder.py # multi-layer prompt
│   ├── routing.py        # binding tier resolution
│   ├── session_state.py
│   └── skill_loader.py   # discover skills/<id>/SKILL.md
├── provider/
│   └── llm.py            # LLMProvider wrapper sobre litellm
├── server/               # workers do event-driven
│   ├── agent_worker.py   # consome InboundEvent
│   ├── channel_worker.py # publica InboundEvent dos channels
│   ├── cron_worker.py    # publica DispatchEvent agendados
│   ├── delivery_worker.py# consome OutboundEvent → channel.reply
│   ├── websocket_worker.py
│   ├── worker.py         # base class
│   └── server.py         # orquestra todos os workers
└── tools/
    ├── base.py           # BaseTool ABC + @tool decorator
    ├── builtin_tools.py  # read_file/write_file/edit_file/bash
    ├── registry.py       # ToolRegistry.with_builtins()
    ├── post_message_tool.py
    ├── skill_tool.py     # cria tool dinâmica de skills
    ├── subagent_tool.py  # cria tool dinâmica de delegate
    ├── webread_tool.py
    └── websearch_tool.py
```

## 4. Padrões reaproveitáveis com tradução TS

### 4.1 BaseTool decorator

Python:

```python
@tool(name="websearch", description="...", parameters={...})
async def websearch(query: str, session: "AgentSession") -> str: ...
```

TS equivalente:

```ts
export const websearch = defineTool({
  name: 'web.search',
  description: '...',
  input: z.object({ query: z.string() }),
  output: z.string(),
  async run(ctx, { query }) {
    /* ... */
  },
});
```

### 4.2 ToolRegistry.with_builtins()

Cria registry com `read_file/write_file/edit_file/bash` já pré-registradas.
**Tradução**: `ToolRegistry.withBuiltins()` em `packages/agent/Tools.ts` registra `fs.read`, `fs.write`, `fs.edit`, `shell.exec`.

### 4.3 EventBus com queue interna + atomic persist

Cinco passos críticos:

1. `publish(event)` é não-bloqueante (`queue.put`).
2. `run()` consome em loop, chama `_dispatch`.
3. `_dispatch` persiste se `OutboundEvent` (tmp + fsync + rename).
4. `_notify_subscribers` aguarda todos os handlers (`asyncio.gather`).
5. `_recover()` na startup re-publica `pending/*.json` órfãos.

**Tradução**: `EventBus.ts` com `Promise.all` no notify, `node:fs/promises` para persist, `chokidar` opcional para auto-recovery em containers.

### 4.4 multi-layer prompt

`PromptBuilder.build(state)` concatena com `\n\n`:

1. `agent.agent_md` (identity)
2. `## Personality\n\n{soul_md}` (opcional)
3. bootstrap (lê `BOOTSTRAP.md` do workspace)
4. runtime context (timestamp, agent_id)
5. channel hint (platform_name)

### 4.5 Routing tier

```python
def _compute_tier(self) -> int:
    if not any(c in self.value for c in r".*+?[]()|^$"):
        return 0  # exact
    if ".*" in self.value:
        return 2  # wildcard
    return 1      # specific regex
```

Sort por `(tier, original_index)`, primeiro match vence.

### 4.6 Subagent dispatch

Tool dinâmica gerada por factory que conhece os agentes disponíveis menos o próprio. Implementação: publica `DispatchEvent`, registra handler temporário filtrando por `session_id`, aguarda `asyncio.Future`, cleanup.

### 4.7 Memory agent (Cookie)

Em `default_workspace/agents/cookie/AGENT.md`:

- Identity: gerente de memória ao serviço do Pickle.
- 3 axes: `topics/` (timeless), `projects/` (project-specific), `daily-notes/` (YYYY-MM-DD).
- Operations: store (write), retrieve (read), organize (consolidate/migrate), project-specific.
- Acessado **apenas via dispatch** do agente principal.

### 4.8 SKILL.md format

```yaml
---
name: cron-ops
description: ...
---
markdown body com instruções
```

Discovery scan recursivo do diretório `skills/`, parse YAML+markdown.

## 5. Pontos sutis observados nos snapshots

- **session_id é UUID** gerado em `Agent.new_session()`.
- **post_message** só é registrado quando `source.is_cron` é True — força o agente a só falar proativamente em contexto agendado.
- **token threshold padrão**: 160000 (80% de 200k Claude Sonnet/Opus).
- **OutboundEvent persist** usa nome `{timestamp}_{session_id}.json` para ordenação determinística no recovery.
- **Skill discovery** acontece em `SkillLoader` ao startup; não há hot-reload de skills no buildoc (oportunidade de melhoria no fzagent: scan periódico via `SKILL_REGISTRY_SCAN_INTERVAL`).
- **Concurrency** em `agent_worker.py` usa `dict[str, asyncio.Semaphore]` lazy-criado por agent_id; cleanup quando contagem volta a zero.

## 6. Onde NÃO copiar literalmente

| buildoc                        | fzagent                                    | Por quê                                                                                     |
| ------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| litellm                        | adapters próprios em `packages/providers/` | Em TS não há equivalente único robusto; SDKs oficiais Anthropic/OpenAI/Gemini são melhores. |
| FastAPI                        | `node:http` + (opcional) Hono              | Mais leve em Node.                                                                          |
| watchdog                       | chokidar                                   | Nativo do ecossistema Node.                                                                 |
| typer                          | commander                                  | Idiomático em Node.                                                                         |
| pyyaml                         | yaml (eemeli/yaml)                         | Suporta merge de tags.                                                                      |
| JSONL history                  | SQLite                                     | FTS5 + queries; melhor para wiki indexer.                                                   |
| crawl4ai                       | fetch + turndown + readability             | Sem dep pesada.                                                                             |
| python-telegram-bot/discord.py | adiar; foco CLI/WS/HTTP                    | Reduz superfície inicial.                                                                   |

## 7. Observações para a FASE 8 (site)

- O `web/` do buildoc é Astro. Podemos espelhar a estrutura (collections content `steps`, layout dark) mas reescrever o copy para a marca fzagent.
- A imagem `Cover.png` (Pickle bot) será substituída por arte fzagent.

## 8. Como usar este dossiê durante a implementação

1. Antes de codar uma fase, abrir o snapshot equivalente em `./external/buildoc/<nn>-<slug>/src/mybot/` e ler 2-3 arquivos chave.
2. Confirmar o contrato (entrada/saída) com este dossiê.
3. Traduzir para TS com Zod no boundary, mantendo nomes próximos para facilitar diffing.
4. Quando descobrir um detalhe que não está aqui, **atualizar este dossiê** antes de prosseguir.
