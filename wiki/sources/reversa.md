---
title: reversa — framework de engenharia reversa baseado em skills markdown
type: source-dossier
source: https://github.com/RLuf/reversa (fork) / sandeco/reversa (origem)
mirror: ./external/reversa/
last_synced: 2026-05-09
status: reference
---

# reversa — Dossiê do código-fonte de referência

> **Por que ele importa**: o reversa é um framework Node.js que **NÃO chama LLM diretamente**. Ele instala um conjunto de skills markdown (`SKILL.md`) em engines compatíveis (Claude Code, Codex, Cursor, Gemini CLI) e deixa o agente do usuário orquestrá-las. É o nosso modelo direto para a FASE 9 (`skills-claude/reversa/` e `skills-claude/fzagent/`).

## 1. Visão geral

- Distribuído via npm: `npx reversa install` instala 30+ skills no projeto legado do usuário.
- Cada skill é um arquivo `SKILL.md` com YAML frontmatter + corpo markdown contendo as instruções operacionais.
- Os skills coordenam-se entre si por meio de um **plano** (`.reversa/plan.md`) e um **state** (`.reversa/state.json`) que vivem no projeto-alvo.
- O agente principal (`reversa`) atua como orquestrador, salvando checkpoints após cada skill concluído.

## 2. Estrutura macro

```
reversa/
├── package.json          # type: module, bin: reversa
├── bin/reversa.js        # CLI dispatcher (commands/*)
├── lib/
│   ├── commands/         # install, update, status, uninstall, add-agent, add-engine, export-diagrams
│   ├── installer/        # detector, manifest, prompts, validator, writer, orange-prompts
│   └── utils/            # banner, json-safe
├── agents/               # ★ os SKILL.md ★ — cada subpasta é uma skill
│   ├── reversa/          # orquestrador principal
│   ├── reversa-scout/
│   ├── reversa-archaeologist/
│   ├── reversa-architect/
│   ├── reversa-detective/
│   ├── reversa-writer/
│   ├── reversa-reviewer/
│   ├── reversa-data-master/
│   ├── reversa-design-system/
│   ├── reversa-visor/
│   ├── reversa-tracer/
│   ├── reversa-coding/
│   ├── reversa-curator/
│   ├── reversa-detective/
│   ├── reversa-doubt/
│   ├── reversa-inspector/
│   ├── reversa-migrate/
│   ├── reversa-n8n/
│   ├── reversa-paradigm-advisor/
│   ├── reversa-plan/
│   ├── reversa-pricing-{estimate,profile,size}/
│   ├── reversa-principles/
│   ├── reversa-quality/
│   ├── reversa-reconstructor/
│   ├── reversa-requirements/
│   ├── reversa-resume/
│   ├── reversa-strategist/
│   ├── reversa-to-do/
│   └── reversa-agents-help/
├── templates/            # plan.md e state.json default
└── docs/                 # mkdocs trilíngue (en/pt/es)
```

## 3. Anatomia de um SKILL.md (exemplo: `reversa/SKILL.md`)

```markdown
---
name: reversa
description: Ponto de entrada principal do Reversa. Orquestra a análise…
license: MIT
compatibility: Claude Code, Codex, Cursor, Gemini CLI…
metadata:
  author: sandeco
  version: '1.0.0'
  framework: reversa
  role: orchestrator
---

Você é o Reversa, orquestrador central do framework Reversa.

## Ao ser ativado

1. Leia `.reversa/state.json`
2. Se phase==null → siga step-01-first-run.md
3. Se phase!=null → siga step-02-resume.md

## Executando os agentes do plano

…

## Verificação de versão

Compare `.reversa/version` com `https://registry.npmjs.org/reversa/latest`…

## Estouro de contexto

Salve checkpoint imediato e instrua o usuário a `/reversa` em nova sessão.

## Checkpoint preventivo entre etapas

Marcos heurísticos (não tente estimar tokens entre engines).

## Escala de confiança

🟢 CONFIRMADO / 🟡 INFERIDO / 🔴 LACUNA

## Regra absoluta

Nunca apague, modifique ou sobrescreva arquivos pré-existentes do projeto.
```

Padrões observados em todas as skills:

- frontmatter com `name`, `description`, `license`, `compatibility`, `metadata{author,version,framework,role|phase}`
- corpo em markdown com seções bem definidas: identity, when to use, process, output paths, checkpoint, regras absolutas
- algumas skills têm `references/` com templates (`design-template.md`, `tasks-template.md`, `state-schema.md`, `checkpoint-guide.md`)
- referências cruzadas entre skills usam linguagem natural ("Ative o skill `reversa-scout`")

## 4. Templates importantes (`templates/`)

### 4.1 `state.json` (esqueleto)

```json
{
  "version": "{{VERSION}}",
  "project": "",
  "user_name": "",
  "chat_language": "pt-br",
  "doc_language": "Português",
  "answer_mode": "chat",
  "doc_level": "completo",
  "output_folder": "_reversa_sdd",
  "forward_folder": "_reversa_forward",
  "phase": null,
  "completed": [],
  "pending": [
    "reconhecimento",
    "escavacao",
    "interpretacao",
    "geracao",
    "revisao"
  ],
  "checkpoints": {},
  "engines": [],
  "agents": [],
  "created_files": []
}
```

**Reaproveitar para fzagent**: estado da sessão de wiki ingest pode usar formato similar (`.fzagent/state.json` com `phase`, `completed`, `pending`).

### 4.2 `plan.md`

Plano em fases (Reconhecimento → Escavação → Interpretação → Geração → Revisão), cada fase com tarefas marcáveis (`- [ ]` / `- [x]`). Reversa atualiza esse arquivo conforme progride.
**Reaproveitar**: nossa skill-claude `fzagent` pode gerar `.fzagent/plan.md` similar para tarefas multi-step.

## 5. CLI e fluxo de instalação

`bin/reversa.js` é o dispatcher. Comandos:

| Comando           | Função                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `install`         | Detecta engines, pergunta quais skills instalar, copia para `.agents/skills/` (e `.claude/skills/` para Claude Code), cria `.reversa/`, gera SHA-256 manifest |
| `update`          | Atualiza skills para versão mais nova, comparando manifest                                                                                                    |
| `status`          | Mostra estado atual da análise (`.reversa/state.json`)                                                                                                        |
| `uninstall`       | Remove skills e estrutura                                                                                                                                     |
| `add-agent`       | Adiciona skill individual                                                                                                                                     |
| `add-engine`      | Adiciona suporte a engine adicional                                                                                                                           |
| `export-diagrams` | Exporta Mermaid → SVG/PNG (usa `@mermaid-js/mermaid-cli`)                                                                                                     |

`lib/installer/detector.js` define `ENGINES` array com:

- `name`, `id`
- `entryFile` (ex.: `CLAUDE.md`, `AGENTS.md`)
- `skillsDir` (ex.: `.agents/skills`, `.claude/skills`)
- `universalSkillsDir` (compartilhado entre engines)
- detecção via presença de arquivos sentinela

`lib/installer/writer.js` faz cópia atômica + cria `.gitignore` apropriado + nunca toca em arquivos do usuário.

`lib/installer/manifest.js` gera SHA-256 de cada skill instalada para comparação em updates.

## 6. Agentes e seus papéis (compactado)

### Pipeline principal

| Agente            | Fase           | Output                                                                          |
| ----------------- | -------------- | ------------------------------------------------------------------------------- |
| **reversa**       | orquestrador   | `.reversa/{state.json,plan.md,context/*}`                                       |
| **scout**         | reconhecimento | `_reversa_sdd/{inventory.md,dependencies.md}` + `.reversa/context/surface.json` |
| **archaeologist** | escavação      | `_reversa_sdd/code-analysis.md` por módulo                                      |
| **detective**     | interpretação  | `_reversa_sdd/{domain.md,permissions.md,state-machines.md}` + ADRs retroativos  |
| **architect**     | interpretação  | C4 diagrams, ERD, integration map                                               |
| **writer**        | geração        | specs SDD por componente, OpenAPI, user stories                                 |
| **reviewer**      | revisão        | revisão cruzada, validação de gaps                                              |

### Agentes independentes

| Agente            | Função                              |
| ----------------- | ----------------------------------- |
| **visor**         | UI a partir de screenshots          |
| **data-master**   | DDL, migrations, ORM, ERD, triggers |
| **design-system** | tokens, cores, tipografia           |
| **tracer**        | análise dinâmica via logs           |

### Tradutores (input adapters)

| Agente  | Função                                 |
| ------- | -------------------------------------- |
| **n8n** | converte workflow N8N JSON em SDD spec |

### Adicionais

| Agente                              | Função                                 |
| ----------------------------------- | -------------------------------------- |
| **pricing-{estimate,profile,size}** | estimativa de esforço/valor            |
| **paradigm-advisor**                | sugere paradigmas                      |
| **doubt**                           | levanta dúvidas que requerem o usuário |
| **inspector**                       | revisão de qualidade                   |

## 7. Padrões aplicáveis ao fzagent

### 7.1 Skill como markdown puro

Não escrevemos código para definir uma skill. Frontmatter YAML define metadata; markdown body define instruções. O agente do usuário (Claude Code, Cursor) interpreta o markdown como prompt operacional.
**Adotar**: nossa skill `skills-claude/fzagent/SKILL.md` segue exatamente esse formato.

### 7.2 State machine persistido em JSON

`.reversa/state.json` permite resumir entre sessões. Cada skill atualiza um pequeno escopo do estado.
**Adotar**: `.fzagent/state.json` para sessões longas de ingest/query.

### 7.3 Plan.md como contrato visual com o usuário

Usuário pode editar o plano antes de executar. Skills apenas leem.
**Adotar**: o agente fzagent pode gerar/exibir `plan.md` para ingest pipelines longos.

### 7.4 Confidence scale (🟢🟡🔴)

Reusar a mesma convenção em saídas estruturadas do fzagent — o lint do wiki indexer pode marcar páginas com lacunas detectadas como 🔴.

### 7.5 Engine detection

Detector pattern (procura por `CLAUDE.md`, `.cursorrules`, etc.) é útil para a skill `fzagent` decidir onde escrever.

### 7.6 Manifest com SHA-256

Permite update seguro sem sobrescrever modificações locais. Se o hash do arquivo instalado != hash do manifest = arquivo foi customizado pelo usuário, pular.

### 7.7 Regra absoluta de não-modificação

"Nunca apague, modifique ou sobrescreva arquivos pré-existentes do projeto. Escreve APENAS em `.reversa/`, `_reversa_sdd/`."
**Adotar**: nossa skill fzagent escreve só em `wiki/`, `db/`, `_fzagent_artifacts/`.

### 7.8 Prompt de checkpoint preventivo

Reversa oferece pausa proativa entre marcos do plano para o usuário recomeçar com contexto limpo. Heurística baseada em sinais observáveis (arquivos lidos, artefatos gerados, trocas de mensagem) — explicitamente NÃO tenta estimar tokens.
**Adotar**: padrão valioso para ingest pipelines longos.

## 8. O que NÃO copiar do reversa

| Item                               | Razão                                                                      |
| ---------------------------------- | -------------------------------------------------------------------------- |
| `inquirer` para prompts CLI        | Para o nosso CLI usar `commander` + `enquirer`/`prompts` (mais leve)       |
| `chalk@5` + `ora@7`                | Pode ser substituído por `picocolors` + `nanospinner` para footprint menor |
| docs trilíngue mkdocs              | Para o site do fzagent usaremos Astro (FASE 8)                             |
| Foco em legacy reverse-engineering | Domínio diferente — fzagent é generalista                                  |

## 9. Como usar este dossiê

1. Para projetar a skill `skills-claude/fzagent/SKILL.md` (FASE 9), copiar a forma do `agents/reversa/SKILL.md`.
2. Para projetar a skill `skills-claude/reversa/SKILL.md` que **opera** o reversa, copiar a essência do `agents/reversa/SKILL.md` mas como **wrapper** sobre o `npx reversa install` e o ciclo `/reversa`.
3. Para o `state.json` e `plan.md` de operações longas do fzagent, basear em `templates/state.json` e `templates/plan.md`.
4. Atualizar este dossiê quando lermos qualquer skill nova de `agents/`.
