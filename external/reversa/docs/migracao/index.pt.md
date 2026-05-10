# Time de Migração

O Time de Migração é o passo seguinte ao Time de Descoberta. Enquanto a Descoberta produz as specs do sistema legado, a Migração transforma essas specs em um plano de reconstrução em uma stack moderna.

---

## Pré-requisito

Você precisa ter rodado `/reversa` antes e ter o `_reversa_sdd/` populado com as specs do legado. Sem isso, o `/reversa-migrate` aborta com mensagem clara.

---

## Como rodar

```
/reversa-migrate
```

A primeira execução conduz uma entrevista (objetivo, métricas, restrições, stack alvo) e gera `_reversa_sdd/migration/migration_brief.md`. Em execuções seguintes o brief é reusado.

---

## O que acontece

```
Brief (entrevista)
   │
   ▼
[1] Paradigm Advisor    → detecta paradigma do legado, alerta gap, decisão consciente
   │
   ▼
[2] Curator             → decide o que migra, descarta, decide caso a caso
   │
   ▼
[3] Strategist          → propõe estratégias (Strangler, Big Bang, Parallel Run, Branch by Abstraction)
   │
   ▼
[4] Designer            → desenha a arquitetura, domain model e plano de dados
   │
   ▼
[5] Inspector           → define provas de equivalência comportamental
   │
   ▼
handoff.md              → entrada para o agente de codificação
```

Entre cada agente há uma **pausa para decisão humana**. O modo padrão é interativo. Use `--auto` se quiser pular as pausas (não recomendado em produção).

---

## Onde os artefatos aparecem

O Time de Migração nunca toca em código legado nem nos artefatos do Time de Descoberta. Todo output do `/reversa-migrate` vai para `_reversa_sdd/migration/`, uma subpasta dentro das specs originais.

```
<seu-projeto-legado>/
└── _reversa_sdd/                  ← Time de Descoberta escreve aqui
    ├── inventory.md               (Scout)
    ├── dependencies.md            (Scout)
    ├── code-analysis.md           (Archaeologist)
    ├── data-dictionary.md         (Archaeologist)
    ├── domain.md                  (Detective)
    ├── state-machines.md          (Detective)
    ├── permissions.md             (Detective)
    ├── architecture.md            (Architect)
    ├── erd-complete.md            (Architect)
    │
    ├── <unit>/                    (Writer: feature folder com requirements.md, design.md, tasks.md por unit)
    ├── openapi/                   (Writer: specs de API)
    ├── user-stories/              (Writer: fluxos de usuário)
    ├── traceability/              (Writer + Architect: matrizes)
    ├── adrs/                      (Detective: ADRs retroativos)
    ├── flowcharts/                (Archaeologist: Mermaid por módulo)
    ├── ui/                        (Visor, se rodou)
    ├── database/                  (Data Master, se rodou)
    │
    └── migration/                 ← Time de Migração escreve aqui
        ├── migration_brief.md
        ├── paradigm_decision.md
        ├── target_business_rules.md
        ├── discard_log.md
        ├── migration_strategy.md
        ├── risk_register.md
        ├── cutover_plan.md
        ├── target_architecture.md
        ├── target_domain_model.md
        ├── target_data_model.md
        ├── data_migration_plan.md
        ├── parity_specs.md
        ├── parity_tests/
        │   └── *.feature
        ├── ambiguity_log.md
        ├── handoff.md
        ├── .state.json            (interno do orquestrador)
        └── .logs/
```

Artefatos produzidos pelo Time de Migração:

| Arquivo | Quem produz |
|---|---|
| `migration_brief.md` | Você (entrevista) |
| `paradigm_decision.md` | Paradigm Advisor |
| `target_business_rules.md` + `discard_log.md` | Curator |
| `migration_strategy.md` + `risk_register.md` + `cutover_plan.md` | Strategist |
| `target_architecture.md` + `target_domain_model.md` + `target_data_model.md` + `data_migration_plan.md` | Designer |
| `parity_specs.md` + `parity_tests/*.feature` | Inspector |
| `handoff.md` | Orquestrador |

---

## Próximos passos

- [Os 5 agentes](agentes.md): o que cada um faz, inputs e outputs.
- [Mudança de paradigma](paradigma.md): por que paradigma importa e como o Paradigm Advisor trata.
- [Estratégias de migração](estrategias.md): catálogo das 4 estratégias.
- [Schema do brief](brief.md): perguntas e formato do `migration_brief.md`.
