# Migration brief schema

`migration_brief.md` is the first artifact. It captures the migration criteria before any agent runs. It is consumed by the five agents of the Migration Team.

---

## How it is collected

`/reversa-migrate` runs an interactive interview on first execution. On subsequent runs, it offers **review / keep / recreate**.

---

## Questions

The interview covers, at minimum:

1. **Migration objective.** Why does it exist? What changes for the business if it happens or not.
2. **Success metrics.** How will you know it worked? Clear numeric or qualitative targets.
3. **Constraints.** Deadline, budget, technical constraints (e.g. must run on-prem, must comply with privacy regulation).
4. **Known risks.** Risk factors you can already see.
5. **Stakeholders.** Who decides, who uses, who is impacted.
6. **Target stack.** Desired language, framework and infrastructure. **Mandatory.**

The brief **does not ask about paradigm**: that is the Paradigm Advisor's responsibility.

The brief **does not ask about appetite**: it is derived later from paradigm choices.

---

## Minimal example

```yaml
---
schemaVersion: 1
generatedAt: 2026-05-02T14:30:00Z
reversa:
  version: "1.2.17"
kind: migration_brief
producedBy: orchestrator
hash: "sha256:..."
---

# Migration Brief

## Migration objective
Reduce infra cost and onboarding time for new devs. Legacy PHP 5.6 is no longer supported and hiring senior PHP devs gets more expensive every year.

## Success metrics
- Monthly infra cost drops at least 40%.
- New dev onboarding goes from 4 weeks to 2 weeks.
- p95 latency on critical endpoints below 200ms.

## Constraints
- Deadline: go-live by 2026-12-31.
- Budget: up to USD 50k consulting + internal hours.
- Compliance: GDPR mandatory.
- No downtime longer than 4h, in a Sunday window.

## Known risks
- Small internal team, two full-time devs.
- Legacy documentation is shallow in some modules.
- Billing flow has sensitive fiscal rules.

## Stakeholders
- CTO: final decision.
- Product team: defines flow priorities.
- Finance team: validates billing flow.
- Compliance: validates GDPR.

## Target stack
- Language: Node.js 20.
- Framework: Fastify.
- Infrastructure: AWS Lambda + RDS PostgreSQL + SQS.
```

---

## What happens with the brief

Each agent reads the brief and `paradigm_decision.md` before producing its output. Agent decisions must be **coherent** with the brief, or they explicitly flag the conflict.

For example: if the brief says "go-live in 6 months" and the legacy has 800 business rules, the Strategist will likely discard Big Bang and recommend Strangler Fig with reduced scope for the first wave.
