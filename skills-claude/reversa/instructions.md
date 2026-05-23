# reversa skill — workflow detalhado

## Passo 1: Pre-flight checks

```bash
node --version    # esperado >= 18.0.0
git --version
ls -la .git/HEAD  # confirma que e repo git
```

Se falhar:

- Node < 18: instrua o usuario a atualizar.
- Sem git: avise que recovery ficara dificil; ofereca `git init`.

## Passo 2: Backup recomendado

> Embora reversa nao modifique arquivos existentes, IA pode errar.
> Recomendo:
>
> 1. `git status` — confirme arvore limpa.
> 2. `git commit -am "before reversa"` se houver pendentes.
> 3. Backup local: `cp -r . ../$(basename $PWD)-backup`.

## Passo 3: Instalar reversa

```bash
npx reversa install
```

O instalador:

1. Detecta engines presentes (Claude Code, Codex, Cursor, Gemini CLI).
2. Pergunta quais agentes instalar (todos por padrao).
3. Coleta nome do projeto, idioma, preferencias.
4. Copia skills para `.agents/skills/` (e `.claude/skills/` para Claude Code).
5. Cria entry file (`CLAUDE.md`, `AGENTS.md`).
6. Cria `.reversa/state.json` + `.reversa/plan.md`.

## Passo 4: Ativar `/reversa`

No agente do usuario (Claude Code, Codex, etc.), digite `/reversa`.
O agente principal le `state.json`:

- `phase==null` → primeira execucao: segue `step-01-first-run.md`.
- `phase!=null` → retomada: segue `step-02-resume.md`.

## Passo 5: Executar pipeline

Sequencial por agente. Em cada checkpoint:

| #   | Agente        | Output principal                                   |
| --- | ------------- | -------------------------------------------------- |
| 1   | Scout         | inventory.md, dependencies.md, surface.json        |
| 2   | Archaeologist | code-analysis.md por modulo                        |
| 3   | Detective     | domain.md, permissions.md, state-machines.md, ADRs |
| 4   | Architect     | C4 diagrams, ERD, integration map                  |
| 5   | Writer        | specs SDD, OpenAPI, user stories                   |
| 6   | Reviewer      | revisao cruzada, relatorio de confianca            |

Apos cada agente: salve checkpoint em `.reversa/state.json`.

## Passo 6: Decisao de docLevel (apos Scout)

Apresente ao usuario:

> O Scout concluiu. Aqui esta o que encontrei:
>
> - **N modulos** identificados: [lista]
> - **Linguagem principal:** [linguagem]
> - **N integracoes externas** detectadas
> - **Banco de dados:** [presente/ausente]
>
> Qual nivel de documentacao?
>
> ◉ **1. Essencial** ← padrao
> ○ **2. Completo**
> ○ **3. Detalhado**

Persista em `state.json` -> `doc_level`.

## Passo 7: Decisao de organizacao das specs

Antes do Archaeologist, pergunte como organizar specs:

- **modulo** (default quando ha pastas top-level por dominio)
- **caso-de-uso** (BDD/Gherkin presente)
- **endpoint** (roteamento centralizado)
- **hibrida** (combinacao)
- **feature** (fallback)
- **customizada**

Persista em `.reversa/config.toml` -> `[specs]`.

## Passo 8: Checkpoint preventivo

Apos cada agente, ofereça pausa:

> O **[agente]** terminou e o checkpoint esta salvo. A proxima etapa e
> longa. Voce quer:
>
> 1. Continuar agora
> 2. Pausar — `/clear` + `/reversa` em sessao nova (recomendado)
>
> Pressione 1, 2, ou CONTINUAR.

> ⚠️ Nunca ofereça opcao 2 logo apos uma retomada (a sessao ja esta limpa).

## Passo 9: Verificacao de regressao (re-extracoes)

Apos o ultimo agente do plano: leia `references/step-04-regression-check.md`
do reversa. Compara watch items declarados em
`_reversa_forward/<feature>/regression-watch.md` contra os artefatos
recem-gerados em `_reversa_sdd/`.

## Trouble-shooting

- **Rate limit do LLM**: pause, retome em 1h.
- **Contexto estourando**: salve `state.json` agora, recomece com `/clear`.
- **Modulo grande demais para Archaeologist**: divida em sub-modulos via
  prompt explicito.

## Estouro de contexto

Salve checkpoint imediato e instrua: "Vou pausar aqui. Tudo salvo. Digite
`/reversa` em sessao nova para continuar."
