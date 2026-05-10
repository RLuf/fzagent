# Migration Team

The Migration Team is the next step after the Discovery Team. While Discovery produces specs of the legacy system, Migration transforms those specs into a rebuild plan for a modern stack.

---

## Prerequisite

You must have run `/reversa` first and have `_reversa_sdd/` populated with legacy specs. Without that, `/reversa-migrate` aborts with a clear message.

---

## How to run

```
/reversa-migrate
```

The first execution conducts an interview (objective, success metrics, constraints, target stack) and generates `_reversa_sdd/migration/migration_brief.md`. Subsequent runs reuse the brief.

---

## What happens

```
Brief (interview)
   │
   ▼
[1] Paradigm Advisor    → detects legacy paradigm, flags gap, forces conscious decision
   │
   ▼
[2] Curator             → decides what migrates, what gets discarded, case by case
   │
   ▼
[3] Strategist          → proposes strategies (Strangler, Big Bang, Parallel Run, Branch by Abstraction)
   │
   ▼
[4] Designer            → drafts target architecture, domain model, data plan
   │
   ▼
[5] Inspector           → defines proofs of behavioral equivalence
   │
   ▼
handoff.md              → input for the coding agent
```

Between agents there is a **human decision pause**. Default mode is interactive. Use `--auto` to skip pauses (not recommended in production).

---

## Where artifacts land

The Migration Team never touches legacy code or Discovery Team artifacts. Every `/reversa-migrate` output lands in `_reversa_sdd/migration/`, a subfolder inside the original specs.

```
<your-legacy-project>/
└── _reversa_sdd/                  ← Discovery Team writes here
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
    ├── <unit>/                    (Writer: feature folder with requirements.md, design.md, tasks.md per unit)
    ├── openapi/                   (Writer: API specs)
    ├── user-stories/              (Writer: user flows)
    ├── traceability/              (Writer + Architect: matrices)
    ├── adrs/                      (Detective: retroactive ADRs)
    ├── flowcharts/                (Archaeologist: Mermaid per module)
    ├── ui/                        (Visor, if it ran)
    ├── database/                  (Data Master, if it ran)
    │
    └── migration/                 ← Migration Team writes here
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
        ├── .state.json            (internal to orchestrator)
        └── .logs/
```

Artifacts produced by the Migration Team:

| File | Producer |
|---|---|
| `migration_brief.md` | You (interview) |
| `paradigm_decision.md` | Paradigm Advisor |
| `target_business_rules.md` + `discard_log.md` | Curator |
| `migration_strategy.md` + `risk_register.md` + `cutover_plan.md` | Strategist |
| `target_architecture.md` + `target_domain_model.md` + `target_data_model.md` + `data_migration_plan.md` | Designer |
| `parity_specs.md` + `parity_tests/*.feature` | Inspector |
| `handoff.md` | Orchestrator |

---

## Next steps

- [The 5 agents](agentes.md): what each one does, inputs and outputs.
- [Paradigm shift](paradigma.md): why paradigm matters and how the Paradigm Advisor handles it.
- [Migration strategies](estrategias.md): catalog of the 4 strategies.
- [Brief schema](brief.md): questions and format of `migration_brief.md`.
