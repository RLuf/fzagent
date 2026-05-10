# Migration strategies

The Strategist presents at least two strategies with explicit trade-offs and recommends one. The final decision is human. This document describes the catalog of the four supported strategies.

---

## Summary

| Strategy | When it applies | Cost | Risk | Time |
|---|---|---|---|---|
| **Strangler Fig** | System in production, cannot stop | Medium | Low | Long |
| **Big Bang** | Small system, controlled window, transformational appetite | Low | High | Short |
| **Parallel Run** | Critical logic (financial, fiscal, regulatory) | High | Medium | Medium |
| **Branch by Abstraction** | Internal refactor before migration, conservative appetite | Low | Low | Medium |

---

## Strangler Fig

The new system grows around the legacy, replacing modules one by one. The legacy gets gradually "strangled", hence the name.

**When it makes sense:**

- System in production that cannot have long downtime.
- Small team or limited time.
- Clear boundaries between modules (otherwise it tangles).

**Typical risks:**

- Long period with two coexisting systems.
- The router (proxy) in front becomes a bottleneck if poorly designed.
- Temptation to keep both systems indefinitely.

---

## Big Bang

Replace everything at once in a controlled window. Turn off the old, turn on the new.

**When it makes sense:**

- Small system, well-bounded scope.
- Viable maintenance window (weekend, holiday).
- Transformational appetite confirmed in `paradigm_decision.md`.

**Typical risks:**

- If something goes wrong, rollback is expensive.
- Real load only shows up in production.
- Integration bugs only appear after go-live.

The Strategist explicitly flags high risk when there is a major paradigm shift combined with Big Bang, and in those cases tends to recommend Parallel Run for prior validation.

---

## Parallel Run

Both systems run side by side reading the same inputs. Outputs are compared. The new one only takes over officially when divergence drops below an agreed threshold for an agreed period.

**When it makes sense:**

- Critical logic where "wrong" has high cost: financial, fiscal, payroll, billing.
- Complex calculations with many edge cases.
- When behavioral parity must be proven, not assumed.

**Typical risks:**

- Doubled infra cost during the period.
- Need for instrumentation to compare outputs.
- The "accept divergence" decision must be explicit.

The Inspector defines acceptable parity criteria (e.g. divergence < 0.01% over 30 days).

---

## Branch by Abstraction

Before actually migrating, you refactor the legacy to introduce an abstraction layer at the point where the substitution will happen. Then you swap the implementation behind that layer.

**When it makes sense:**

- Conservative appetite.
- System with low architectural cohesion, where extracting an isolated module is hard.
- Team wants to gain confidence before the leap.

**Typical risks:**

- Extra refactoring work that may feel "wasted" if the migration does not happen.
- Adding abstraction in the wrong place worsens maintainability.

---

## How the Strategist chooses

The Strategist combines three signals:

1. **Brief**: deadline, budget, constraints, criticality.
2. **Derived appetite** from `paradigm_decision.md`: conservative / balanced / transformational.
3. **Size and state of the legacy**: number of rules, flow complexity, integrations.

Conservative appetite favors Branch by Abstraction and Strangler Fig. Transformational appetite allows Big Bang on small systems. Major paradigm shift with transformational appetite makes the Strategist recommend Parallel Run for validation.
