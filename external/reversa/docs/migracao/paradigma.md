# Paradigm shift

Most migrations fail beneath the surface. The user thinks they are changing language (PHP → Node, Java → Go), but they are actually changing paradigm. And paradigm shapes much more than syntax: it shapes how you think about concurrency, consistency, execution order, error handling.

The Paradigm Advisor exists to force that conversation before the architecture is drawn.

---

## Why this matters

Consider a simple legacy rule:

> "When the order is confirmed, debit inventory and send email. If any step fails, undo everything."

In synchronous procedural PHP, this is a database transaction with `BEGIN / COMMIT / ROLLBACK`. It works because everything runs in the same process, in the same HTTP request.

In serverless event-driven Node, **no transaction spans handlers**. Each step is a function, each function is an event, and the email failure already happened *after* inventory was debited. You need saga, idempotency, retry, dead letter queue. It is not a bug. It is the paradigm.

Migrating that rule "as it is" to Node breaks. But a generic LLM will migrate it as it is, because that is what is in the legacy specs.

The Paradigm Advisor catches that early.

---

## What it does

1. **Detects** the legacy paradigm from the specs in `_reversa_sdd/`. Looks for concrete markers: class structure, data access patterns, presence of events, linear synchronous flow, and so on.

2. **Infers** the natural paradigm of the target stack declared in the brief. Modern Node is async/event-driven. Go is CSP/goroutines. Elixir is actor model. There is no "neutral" choice.

3. **Identifies the gap** with concrete examples from the legacy system itself, not in the abstract.

4. **Presents 3 options** to the user:
    - **Adopt the natural paradigm of the stack** (transformational). Rewrite the rule to the new model. More work, more aligned.
    - **Force a paradigm similar to the legacy** (conservative). Try to keep the synchronous model on an asynchronous stack. Less work, more fragile.
    - **Hybrid** (balanced). Some rules follow the new paradigm, others keep the old. Decision per category.

5. **Records** the decision in `paradigm_decision.md`, along with the **derived appetite** (`conservative` / `balanced` / `transformational`) that will influence all subsequent agents.

---

## What it is not responsible for

- Deciding for you. It educates, presents and forces the choice. The decision is human.
- Changing the target stack. If the brief says Node, it works with Node. Changing the stack means redoing the brief.
- Detecting paradigm without evidence. Every claim about the legacy paradigm carries traceable evidence (with 🟢🟡🔴⚠️ tagging).

---

## Example: procedural PHP → async Node

| Aspect | Procedural PHP | Async/event-driven Node |
|---|---|---|
| Concurrency | One request per process, natural locking | Implicit concurrency, manual locking |
| Transaction | `BEGIN/COMMIT` in DB spans the request | Saga or outbox, no distributed transaction |
| Error | Throw and let-it-die or explicit rollback | Retry, dead letter, idempotency |
| Order | Linear flow in the controller | Events may arrive out of order |
| State | Server-side session | Stateless, state in token or external store |

If the migration ignores this, the new system "works" in test and breaks in production under real load. The Paradigm Advisor catches it before the Designer starts.
