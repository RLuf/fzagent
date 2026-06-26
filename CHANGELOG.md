# Changelog

Todas as mudancas relevantes deste projeto sao documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o projeto adere a [Semantic Versioning](https://semver.org/lang/pt-BR/).

Convencoes de commit: [Conventional Commits](https://www.conventionalcommits.org/).

---

## [Unreleased]

Trabalho em curso. Veja a secao [0.1.0](#010---2026-05-19) para o estado atual.

### Added

- **TUI REPL Fullscreen** (`packages/tui`): Interface rica de terminal em tela cheia construida em React/Ink, com suporte a auto-complete de comandos slash, tratamento reativo de redimensionamento (`SIGWINCH`), cancelamento via Esc e hooks de sinal para restauracao segura do terminal (alt-screen cleanup).
- **Autocomplete na TUI** (`packages/tui`): Carregamento assincrono em background dos metadados de comandos slash ao iniciar a TUI, eliminando o estado temporario de `(carregando...)` na listagem do autocomplete.
- **Viewport e Rolagem na TUI** (`packages/tui`): Tratamento dinamico de altura e largura de linhas para evitar sobreposicao de texto (viewport layout clipping), com suporte a PageUp/PageDown e indicadores visuais de scroll (▲/▼).
- **Configuracao do Gitea CLI** (`tea`): Instalacao e integracao inicial do utilitario `tea` com o remote origin do fzagent.
- **ContextGuard Compaction** (`packages/agent`): Mecanismo autonomo de compactacao do historico quando o consumo de tokens atinge o limite (ex: 80% do budget de 200k). Usa o LLM para gerar resumos progressivos que substituem mensagens antigas sem perder a tarefa ancora e os turnos mais recentes.
- **Truncamento de Limite de Contexto** (`packages/agent`): Truncamento preventivo para mensagens de historico maiores que 20k caracteres e retornos de execucao de tools maiores que 10k caracteres para evitar explosao do contexto.
- **FCC Fix (Reinjecao de Tarefa)** (`packages/agent`): Reinjeta periodicamente a tarefa original como mensagem do usuario a cada N iteracoes (ex: 5) para manter o foco do LLM e evitar o decaimento de contexto em execucoes longas.
- **Split de log levels por sink** (`LOG_LEVEL_CONSOLE`, `LOG_LEVEL_FILE`): cada target do dual sink (console + arquivo) pode ter seu proprio level. Quando ausentes, herdam `LOG_LEVEL`. Receita operacional: `LOG_LEVEL_CONSOLE=silent` + `LOG_LEVEL_FILE=debug` deixa o console quieto e o arquivo verboso para forensics.

### Changed

- **Parametro CLI para TUI**: Ajustado o parametro global `--cli` para `--tui` no Commander para evitar conflitos de contexto entre CLI e TUI. Atualizada toda a documentacao correspondente (`AGENTS.md`, `README.md`, `HOW_TO_USE.md`, `docs/operations.md` e comentarios do pacote `tui`).
- **Politica de homologacao** em `AGENTS.md`: alem do `npm test`, toda mudanca termina com `npm run build` + invocacao real do binario `fzagent` (smoke obrigatorio). Vitest verde com binario quebrado nao conta como done. Adicionado passo explicito exigindo versionamento e documentacao de toda alteracao no `CHANGELOG.md` e na API Reference.
- **Posicionamento de Projeto**: Alinhamento de toda a documentacao para focar no `fzagent` como um agente autonomo local independente, com integracao opcional/indecidida com o `fazai-ng`.

### Removed

- **Experimento CLI-py** (`packages/cli-py`): Remocao completa do wrapper e daemon em Python, seus ambientes virtuais e testes de integracao, unificando todo o projeto em TypeScript ESM puro.

### Planejado

- FCC fix sub-sessao 2: compaction LLM com `groupAtomicUnits` preservando pares `tool_use`/`tool_result` (evita HTTP 400 da Anthropic).
- Skill `fazai-query-kb` com `QDRANT_FAZAI_URL` para ponte L99 ao corpo fazai-ng.
- Meta-skill `skill.create` (autoconstrucao a partir do registry).
- GeminiProxyProvider via Cloudflare Worker (camada OpenAI-compat sem SDK proprietario no runtime).
- Shell completion (bash/zsh) para o binario `fzagent` — hoje so `--help` do commander esta disponivel.

---

## [0.1.0] - 2026-05-19

Primeira release marcada. Cobre fundacoes do monorepo, loop agentico
THINK-ACT-OBSERVE-REFLECT, multi-provider com fallback, skills com
auto-discovery, mitigacao de FCC (Fractura de Coerencia Contextual)
e server HTTP/WebSocket com web-ui experimental.

### Added

- **Loop agentico** (`packages/agent`) com state machine, `maxIterations`,
  `tokenBudget`, circuit breaker por provider e cooldown configuravel.
- **Multi-provider router** (`packages/providers`) com fallback ordenado,
  retry e backoff exponencial; adapters Anthropic, Google (SDK), OpenAI,
  OpenRouter, Ollama.
- **Capability negotiation** via flag `supportsTools` no provider:
  evita degradacao silenciosa quando um provider nao consegue carregar
  tools no payload.
- **Tool name sanitization** (`packages/providers/src/utils/tool-names.ts`):
  `shell.exec` -> `shell_exec` no fio, desnormalizacao no inbound.
  Resolve HTTP 400 da Anthropic em nomes com ponto.
- **Skill registry** (`packages/skills`) com auto-discovery em
  `genaisrc/*.genai.mjs`, scan periodico via chokidar, manifest v1 com
  `permissions`, `requiresConfirmation`, `isDestructive`, `targetDomain`.
- **Gate HIGH-permission** para tools nativas (paridade com skills),
  com callback TTY-aware e bypass via `FZAGENT_AUTO_CONFIRM_HIGH=1`.
- **Cerebro secundario hibrido** (`packages/memory`): wiki markdown
  versionado em git, indexado em SQLite + FTS5, complementado por 6
  collections Qdrant (BGE-base 768d via ONNX local).
- **CLI ergonomico** (`packages/cli`): `fzagent "<prompt>"`,
  `--cli` interativo, `agent loop`, `wiki ingest`, `wiki query`,
  `wiki lint`, `vector validate`, `vector recreate`,
  `skill list`, `skill describe`.
- **Server HTTP + WebSocket** (`packages/cli/src/server.ts`): Express 5
  com Socket.io, endpoints REST para health e log tail, namespace `/ws`
  para streaming de eventos do agente.
- **Web UI experimental** (`packages/web-ui`): Vite 8 + React 19 +
  Tailwind 3 + Zustand 5 + axios + socket.io-client; consome `/ws`.
- **FCC fix sub-sessao 1** (Fractura de Coerencia Contextual): mitiga
  "lost in the middle" (Liu et al 2023) em sessoes longas:
  - **Task pinning sandwich**: a tarefa original aparece no TOPO e
    no fim do system prompt (`AGENTIC_TASK_PINNING_ENABLED=true`).
  - **Reinjecao periodica**: a cada `AGENTIC_REINJECT_EVERY` iteracoes
    (default 5), injeta `[LEMBRETE] Tarefa: ... Iter X/Y. Tokens Z/W.`
    como mensagem user sintetica antes da chamada LLM.
  - **Eventos novos** no `FzagentEventMap`: `agent.context-reinjected`,
    `agent.compaction-triggered`, `agent.compaction-completed` (este
    ultimo preparado para sub-sessao 2).
- **Logging dual sink** via Pino: `LOG_FILE=<path>` ativa escrita JSON
  estruturada em arquivo alem do console; mkdir on-demand.
- **WARN visivel para providers ignorados**: `ProviderRouter.tryAdd`
  emite WARN (antes DEBUG) quando credenciais faltam, evitando
  diagnostico cego.
- **Auditoria JSONL** (`JsonlSkillAuditor`): append-only com
  `sha256(16)` por invocacao de skill.
- **Templates operacionais**: `scripts/fzagent.service.template`
  (systemd unit) e `GEMINI.md` (instrucoes de projeto para gemini-cli).
- **Docs**: `docs/getting-started.md` (onboarding rapido),
  `docs/plano_sistema_logging_memoria.md` (plano arquitetural do
  modulo `logging_system/` experimental em Python).
- **TypeDoc + plugin Markdown** gerando `docs/api-reference/` (232
  arquivos) via `npm run docs:api`.

### Changed

- **Token budget default** elevado de 100k para **200k** em
  `AGENTIC_TOKEN_BUDGET`: tarefas reais com error-recovery (encoding,
  python2-vs-3, qdrant offline) consomem ~150k; 100k esgotava em ~15
  iteracoes.
- **GoogleProvider** migrado de invocacao do `gemini-cli` para o SDK
  `@google/generative-ai`: ~380 linhas refatoradas, suporte a tools
  nativos, streaming, e validacao de `models` nao-vazio no constructor.
- **OpenRouter removido do default `PROVIDER_FALLBACK_ORDER`**: free
  tier com rate-limit 429 frequente; pode ser reativado manualmente
  no `fzagent.conf`.
- **Policy ASCII-only** aplicada no system prompt e em strings de
  runtime: previne ruido em terminais que nao renderizam acentuacao
  e em pipes que normalizam encoding.
- **`python3` explicito** no system prompt: evita ambiguidade com
  python2 em sistemas que mantem ambos.
- **Node engine** elevado para Node 22 LTS (testado em 22.11; aviso
  EBADENGINE com Vite 8 ate 22.12, nao bloqueante).
- **AgentRunConfig** com 5 campos novos opcionais para FCC fix:
  `historyTurns`, `compactionThresholdPct`, `reinjectEvery`,
  `taskPinningEnabled`, `compactionKeepRecent`. Compatibilidade
  retroativa preservada (defaults seguros quando ausentes).

### Fixed

- **Anthropic HTTP 400** em `tools.0.custom.name` por regex de nome:
  sanitizacao via `sanitizeToolName` (ponto -> underscore) aplicada
  no `toolToAnthropic`, `messagesToAnthropic` e desnormalizacao
  inbound em `complete`/`stream`.
- **`TS7030`** em middleware do `server.ts` (return-paths em express
  RequestHandler).
- **`google.test.ts`** quebrando por requisito de `models` nao-vazio
  no constructor: testes ajustados + caso novo cobrindo erro de
  array vazio.
- **`credentials.test.ts`**: split entre "ollama sempre disponivel"
  e "google exige `GOOGLE_API_KEY`".
- **`taskMessageIndex`** capturado no momento do push (nao por busca
  posterior): previne mismatch em sessoes com `input.history`
  pre-populada com multiplas mensagens user.

### Removed

- `serve.py`: substituido por `packages/cli/src/server.ts` (Node
  nativo, sem dependencia Python no caminho operacional do agente).

### Security

- **Sem leak de credenciais**: politica de mascaramento aplicada a
  qualquer output que possa expor API keys; valores brutos jamais
  enviados a stdout, logs ou diffs.
- **HIGH gate** ativo por default em runtime non-TTY: nega execucao
  de tools `high` sem bypass explicito (`AUTO_CONFIRM_HIGH=true` no
  conf ou `FZAGENT_AUTO_CONFIRM_HIGH=1` no env).

### Internal

- **Padronizacao de eventos**: `FzagentEventMap` tipado e exposto
  via `createEventBus()`; consumidores podem usar `'*'` para wildcard.
- **`SessionStore.recordTurn`** registra tanto lembretes do FCC fix
  quanto resultados de compaction como turns normais (auditavel
  end-to-end).
- **Plano FCC fix completo** em `/home/rluft/.claude/plans/` (privado):
  sub-sessao 1 entregue; sub-sessao 2 (compaction LLM) preparada via
  eventos e config keys.

---

## [0.0.1] - 2026-05-12

Initial commit + dois commits de preparacao L99 e wiring de skills.
Estado pre-versionamento; consultar `git log` para historico granular
(`62fb68d`, `8f018a4`, `74a93a2`).

---

[Unreleased]: https://github.com/RLuf/fzagent/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/RLuf/fzagent/releases/tag/v0.1.0
[0.0.1]: https://github.com/RLuf/fzagent/commit/62fb68d
