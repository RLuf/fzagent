# The 5 agents of the Migration Team

The agents run in fixed sequence. Each one reads what the previous produced and adds its own artifact. `/reversa-migrate` orchestrates everything.

---

## Pipeline

```
Paradigm Advisor → Curator → Strategist → Designer → Inspector
```

There is a human review pause between agents. Default mode is interactive.

---

## 1. Paradigm Advisor

**Command:** `/reversa-paradigm-advisor` (usually invoked by `/reversa-migrate`)

Detects the paradigm of the legacy system, infers the natural paradigm of the target stack declared in the brief, and flags gaps. Forces a conscious user decision, because changing language is rarely just a syntactic change, it is often a fundamental change of mental model.

**Produces:** `paradigm_decision.md` (mandatory reading for all subsequent agents).

---

## 2. Curator

**Command:** `/reversa-curator`

Reads the legacy business rules and decides, rule by rule: **MIGRATE**, **DISCARD** or **HUMAN DECISION**. Considers the chosen paradigm: rules that are artifacts of the legacy paradigm (e.g. manual locks in a synchronous procedural system) may be discarded under an event-driven target.

**Produces:** `target_business_rules.md` and `discard_log.md`.

---

## 3. Strategist

**Command:** `/reversa-strategist`

Evaluates possible strategies (Strangler Fig, Big Bang, Parallel Run, Branch by Abstraction), presents explicit trade-offs, and recommends one. Final decision is human.

Considers the appetite derived from `paradigm_decision.md`: conservative appetite favors Branch by Abstraction; transformational allows Big Bang on small systems.

**Produces:** `migration_strategy.md`, `risk_register.md`, `cutover_plan.md`.

---

## 4. Designer

**Command:** `/reversa-designer`

Drafts the new system specs: target architecture (with Mermaid diagram), domain model, data model, and data migration plan. Honors the chosen paradigm (event-driven requires explicit events, OO with DI requires interfaces, etc.).

Does not naively decompose 1-to-1: identifies real bounded contexts and justifies groupings and separations.

**Produces:** `target_architecture.md`, `target_domain_model.md`, `target_data_model.md`, `data_migration_plan.md`.

---

## 5. Inspector

**Command:** `/reversa-inspector`

Defines how to prove the new system is behaviorally equivalent to the legacy where it matters. Adapts criteria to the paradigm: a sync → event-driven shift requires coverage of message ordering, idempotency, and eventual consistency.

**Produces:** `parity_specs.md` and Gherkin `.feature` files for each critical flow.

---

## Running manually

You almost never need to call an isolated agent. `/reversa-migrate` orchestrates everything. But if an agent failed or you want to rerun from a specific point:

```
/reversa-migrate --resume                    # resumes from the last completed agent
/reversa-migrate --regenerate=designer       # deletes Designer + Inspector outputs and redoes them
```
