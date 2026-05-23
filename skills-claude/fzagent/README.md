# fzagent skill (Claude.ai operator)

Skill no formato openclaw/reversa que opera o cerebro secundario do
workspace fzagent (ingest, query, lint, geracao de artefatos).

## Estrutura

```
fzagent/
├── SKILL.md                  # frontmatter + capacidades + when-to-use
├── instructions.md           # workflow detalhado de cada capacidade
├── scripts/
│   └── check-runtime.sh     # checa CLI, .env, Qdrant
├── examples/
│   ├── 01-ingest-paper.md
│   ├── 02-query-with-synthesis.md
│   └── 03-generate-marp.md
├── references/
│   └── state-schema.md      # schema de .fzagent/state.json
└── README.md
```

## Instalacao

Copie ou link symbolico:

```bash
ln -s "$(pwd)/skills-claude/fzagent" ~/<projeto-fzagent>/.claude/skills/fzagent
```

## Pre-requisitos

- Node 18+ e workspace `fzagent` clonado e buildado (`npm install && npm run build`).
- `.env` com `ANTHROPIC_API_KEY` ou `CLAUDE_CODE_OAUTH_TOKEN`.
- Qdrant rodando (default `http://localhost:6333`).

## Diferenca para a skill `reversa`

| Aspecto   | reversa                                     | fzagent                                             |
| --------- | ------------------------------------------- | --------------------------------------------------- |
| Alvo      | sistema legado                              | wiki/cerebro secundario                             |
| Output    | specs SDD em `_reversa_sdd/`                | artefatos em `_fzagent_artifacts/`                  |
| Pipeline  | 5 fases sequenciais                         | operacoes ad-hoc                                    |
| Restricao | so escreve em `.reversa/` e `_reversa_sdd/` | so escreve em `wiki/`, `db/`, `_fzagent_artifacts/` |
