# Skill Contract v1 — protocolo cerebro<->corpo

Status: **stable** (manifest v1) · Versao: 0.1.0 · Owner: `@fzagent/skills`

## Por que existe

O fzagent e desenhado como **cerebro** que opera capacidades expostas por
outros sistemas (do proprio workspace, do fazai-ng, de servicos externos). O
canal pelo qual o cerebro invoca capacidades e a **skill**.

Uma skill e um manifesto declarativo + uma funcao `run()`. O cerebro nao
precisa ler o codigo da skill para decidir invoca-la — o manifest carrega
tudo que e necessario para planejar, validar input e auditar a consequencia.

## Shape do manifest

Definido em `packages/core/src/types/skill.ts` (`SkillManifestSchema`) e
construido via `defineSkill()` em `@fzagent/skills`.

| Campo                  | Tipo                                                                       | Default              | Obrigatorio |
| ---------------------- | -------------------------------------------------------------------------- | -------------------- | ----------- |
| `name`                 | string                                                                     | —                    | sim         |
| `description`          | string                                                                     | —                    | sim         |
| `triggers`             | string[]                                                                   | `[]`                 | nao         |
| `inputSchema`          | `z.ZodTypeAny`                                                             | —                    | sim         |
| `outputSchema`         | `z.ZodTypeAny`                                                             | —                    | nao         |
| `permissions`          | `'low' \| 'medium' \| 'high'`                                              | `'low'`              | nao         |
| `category`             | `'system' \| 'agent' \| 'wiki' \| 'web' \| 'code' \| 'memory' \| 'custom'` | `'custom'`           | nao         |
| `version`              | string semver                                                              | `'0.1.0'`            | nao         |
| `targetDomain`         | `'system' \| 'kb' \| 'bridge' \| 'introspect' \| 'external' \| 'custom'`   | `'custom'`           | nao         |
| `requiresConfirmation` | boolean                                                                    | undefined (derivado) | nao         |
| `isDestructive`        | boolean                                                                    | `false`              | nao         |
| `run`                  | `(ctx, input) => Promise<output>`                                          | —                    | sim         |

### `permissions` vs `requiresConfirmation`

Dois eixos independentes:

- **`permissions`** classifica o **risco operacional padrao** da skill:
  - `low`: read-only, sem efeitos colaterais perceptiveis.
  - `medium`: side-effects locais (logs, arquivos do workspace, ingestao).
  - `high`: side-effects em sistemas compartilhados / dados de producao.

- **`requiresConfirmation`** controla o **gate explicito de confirmacao**:
  - `undefined` (default): registry deriva de `permissions === 'high'` +
    flag global `SKILL_HIGH_PERMISSION_REQUIRES_CONFIRM`.
  - `true`: SEMPRE pede confirmacao, independente do permission level. Util
    para MEDIUM que toca producao.
  - `false`: NUNCA pede confirmacao, mesmo sendo HIGH. Util para HIGH em
    dry-run ou read-only.

Os dois campos sao independentes porque risco operacional e gate de
confirmacao decorrem de logicas diferentes: o primeiro classifica a
_natureza_ da operacao, o segundo politica de execucao.

### `targetDomain`

Identifica QUAL subsistema do corpo a skill toca, do ponto de vista do
cerebro fzagent:

- `system`: workspace local, processos, FS do diretorio do fzagent.
- `kb`: base de conhecimento (Qdrant collections, SQLite wiki).
- `bridge`: integracao com fazai-ng (canal ainda nao definido nesta versao).
- `introspect`: leitura de telemetria/status/estado do proprio agente.
- `external`: APIs externas (web, terceiros).
- `custom`: nao se encaixa nas categorias anteriores.

O `targetDomain` e usado:

1. Pelo cerebro, para agrupar consequencias ao planejar uma cadeia de skills.
2. Pelo auditor JSONL, para indexar invocacoes por subsistema.
3. Pelo operador-humano, para revisar `skill list` filtrando por dominio.

### `isDestructive`

Hint declarativo: a skill realiza mudanca de estado **nao trivialmente
reversivel**. NAO e inferido — a skill se declara destrutiva.

Usado para:

- Auditoria destacar visualmente skills destrutivas no log.
- Cerebro decidir, antes de invocar, se precisa de plano de rollback.
- Operador-humano filtrar skills perigosas em `skill list --destructive`.

## Ciclo de vida de uma invocacao

```
THINK         cerebro decide invocar skill X com input I
  |
  v
RESOLVE       SkillRegistry.get(X) -> LoadedSkill manifest
  |
  v
VALIDATE      manifest.inputSchema.parse(I) -> validated input
  |
  v
GATE          requiresConfirmation(X)?
                  true  -> onHighConfirm(X) -> abort ou prosseguir
                  false -> prosseguir
  |
  v
EXECUTE       manifest.run(ctx, validated)
  |
  v
AUDIT         log JSONL (timestamp, name, inputHash, outputHash, decisao, ms)
  |
  v
OBSERVE       output retorna ao cerebro como tool_result
```

## Auto-discovery

Skills do usuario vivem em `genaisrc/*.genai.mjs`. Cada arquivo exporta
`export default defineSkill({...})`. O `SkillRegistry`:

1. Le `genaisrc/` no `loadAll()`.
2. Dynamic-import de cada `.genai.mjs` com cache-busting por hash sha256.
3. Valida o shape do `default export` (tem `name` e `run` -> aceita).
4. Registra. Se `watch=true`, recarrega quando muda (chokidar).

Skills system vem programaticamente via `registerBuiltinSkills(reg)` antes
de `loadAll()` — isso garante que builtins existem mesmo se o diretorio
genaisrc estiver vazio.

## Estabilidade do contrato

`SkillManifest v1` e **estavel**. Mudancas de schema sao MAJOR (manifest v2).
Adicoes de campos OPCIONAIS sao MINOR. Skills nao precisam re-declarar
versao para continuar funcionando enquanto v1 viver.

## Exemplos

Ver `genaisrc/` para skills demo cobrindo `kb`, `bridge` e `introspect`.
