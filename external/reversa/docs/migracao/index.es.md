# Equipo de Migración

El Equipo de Migración es el paso siguiente al Equipo de Descubrimiento. Mientras que Descubrimiento produce las specs del sistema legado, Migración transforma esas specs en un plan de reconstrucción en una stack moderna.

---

## Prerrequisito

Necesitas haber ejecutado `/reversa` antes y tener `_reversa_sdd/` poblado con las specs del sistema legado. Sin eso, `/reversa-migrate` aborta con un mensaje claro.

---

## Cómo ejecutar

```
/reversa-migrate
```

La primera ejecución conduce una entrevista (objetivo, métricas de éxito, restricciones, stack objetivo) y genera `_reversa_sdd/migration/migration_brief.md`. En ejecuciones posteriores el brief se reutiliza.

---

## Qué pasa

```
Brief (entrevista)
   │
   ▼
[1] Paradigm Advisor    → detecta paradigma del legado, alerta sobre el gap, decisión consciente
   │
   ▼
[2] Curator             → decide qué migra, qué se descarta, caso por caso
   │
   ▼
[3] Strategist          → propone estrategias (Strangler, Big Bang, Parallel Run, Branch by Abstraction)
   │
   ▼
[4] Designer            → diseña arquitectura, domain model y plan de datos
   │
   ▼
[5] Inspector           → define pruebas de equivalencia comportamental
   │
   ▼
handoff.md              → entrada para el agente de codificación
```

Entre cada agente hay una **pausa para decisión humana**. El modo predeterminado es interactivo. Usa `--auto` si quieres saltar las pausas (no recomendado en producción).

---

## Dónde aparecen los artefactos

El Equipo de Migración nunca toca código legado ni los artefactos del Equipo de Descubrimiento. Todo output del `/reversa-migrate` va a `_reversa_sdd/migration/`, una subcarpeta dentro de las specs originales.

```
<tu-proyecto-legado>/
└── _reversa_sdd/                  ← Equipo de Descubrimiento escribe aquí
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
    ├── <unit>/                    (Writer: feature folder con requirements.md, design.md, tasks.md por unit)
    ├── openapi/                   (Writer: specs de API)
    ├── user-stories/              (Writer: flujos de usuario)
    ├── traceability/              (Writer + Architect: matrices)
    ├── adrs/                      (Detective: ADRs retroactivos)
    ├── flowcharts/                (Archaeologist: Mermaid por módulo)
    ├── ui/                        (Visor, si corrió)
    ├── database/                  (Data Master, si corrió)
    │
    └── migration/                 ← Equipo de Migración escribe aquí
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
        ├── .state.json            (interno del orquestador)
        └── .logs/
```

Artefactos producidos por el Equipo de Migración:

| Archivo | Productor |
|---|---|
| `migration_brief.md` | Tú (entrevista) |
| `paradigm_decision.md` | Paradigm Advisor |
| `target_business_rules.md` + `discard_log.md` | Curator |
| `migration_strategy.md` + `risk_register.md` + `cutover_plan.md` | Strategist |
| `target_architecture.md` + `target_domain_model.md` + `target_data_model.md` + `data_migration_plan.md` | Designer |
| `parity_specs.md` + `parity_tests/*.feature` | Inspector |
| `handoff.md` | Orquestador |

---

## Próximos pasos

- [Los 5 agentes](agentes.md): qué hace cada uno, inputs y outputs.
- [Cambio de paradigma](paradigma.md): por qué el paradigma importa y cómo lo trata el Paradigm Advisor.
- [Estrategias de migración](estrategias.md): catálogo de las 4 estrategias.
- [Schema del brief](brief.md): preguntas y formato del `migration_brief.md`.
