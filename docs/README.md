# fzagent — Documentacao

Documentacao tecnica do fzagent, organizada por dominio. Cada secao linka
para arquivos-fonte autoritativos no codigo. Esta documentacao reflete o
estado **observado**, nao roadmap.

## Indice — escrita humana

| Documento                                  | Cobre                                                          |
| ------------------------------------------ | -------------------------------------------------------------- |
| [architecture.md](architecture.md)         | Visao geral, posicionamento L99, fluxo de uma iteracao         |
| [data-stores.md](data-stores.md)           | SQLite (wiki + sessions), Qdrant, logs estruturados            |
| [skills-and-tools.md](skills-and-tools.md) | SkillRegistry, ToolRegistry, manifest v1, gate HIGH, auditoria |
| [providers.md](providers.md)               | ProviderRouter, capability negotiation, adapters               |
| [operations.md](operations.md)             | fzagent.conf, .env, comandos CLI, logging                      |
| [cli-python.md](cli-python.md)             | CLI alternativa e gerenciador de daemon em Python 3.7+         |


## Indice — gerado automaticamente

| Localizacao                               | Cobre                                                                                                                |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [api-reference/](api-reference/README.md) | Referencia de classes, interfaces, types, funcoes exportadas por cada `@fzagent/*` package. **Gerado pelo TypeDoc.** |

### Regenerar a api-reference

```
npm run docs:api
```

O script (`rimraf docs/api-reference && typedoc`) le `typedoc.json` na
raiz, escaneia os 6 entry points (`packages/*/src/index.ts`) e regera o
output em `docs/api-reference/`. Toda doc API vem do AST do TypeScript —
se tu mudar uma assinatura, regenerar atualiza a doc sem reescrever nada.

Quando regenerar:

- Depois de mudar exports em qualquer `packages/*/src/index.ts`
- Antes de tagar release
- Em CI opcionalmente (verificacao de drift)

### Por que TypeDoc e nao Mintlify/Docusaurus/etc.

Trade-off avaliado: SaaS de doc (Mintlify, GitBook, ReadMe) cobra
vendor-lock + hosting fora da infra propria + repositorio separado do
codigo (apodrece). TypeDoc gera markdown puro que vive no monorepo,
renderiza no GitHub viewer, e respeita a soberania da infra.

## Documentos normativos relacionados

- [`wiki/concepts/skill-contract.md`](../wiki/concepts/skill-contract.md) —
  Contrato declarativo do manifest v1 (campos, estabilidade, ciclo de vida).
- [`fzagent.conf.example`](../fzagent.conf.example) — Defaults do conf, todos
  documentados inline.
- [`README.md`](../README.md) raiz — quick start.

## Convencoes

- Caminhos sao relativos a raiz do repo (`/home/rluft/fzagent`).
- Trechos de codigo referenciam `file:line` para navegacao rapida.
- Estado atual: monorepo TypeScript com 6 pacotes (`core`, `providers`,
  `memory`, `agent`, `skills`, `cli`).
- **Doc humana** (`*.md` na raiz de `docs/`) tem **prioridade interpretativa**
  sobre api-reference auto-gerada quando houver conflito (a doc humana
  expressa intencao; api-reference reflete apenas o que existe).
