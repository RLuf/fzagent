# Writer

**Command:** `/reversa-writer`
**Phase:** 4 - Generation

---

## 📝 The notary

The notary transforms what was discovered into formal, precise, traceable contracts. Each clause has a declared confidence level. The document is a contract: an AI agent can reimplement the system from it.

---

## What it does

The Writer transforms what was discovered in the previous three phases into formal contracts: precise, traceable, and detailed enough for an AI agent, without access to the original code, to reimplement the functionality faithfully.

Specs are not documentation for humans to read on a quiet afternoon. They are operational contracts.

---

## The workflow

The Writer never generates everything at once. Large projects have many components, and generating everything in one response burns excessive context and prevents incremental review. The flow is:

### 1. Build and present the plan

Before generating any file, the Writer reads all artifacts from previous phases and the organization decision saved in `[specs]` of `config.toml`. It then builds a complete list of what it will generate:

```
📋 Generation plan: 3 units, 11 files total

Units:
  [ ] 1. auth/requirements.md
  [ ] 2. auth/design.md
  [ ] 3. auth/tasks.md
  [ ] 4. orders/requirements.md
  [ ] 5. orders/design.md
  [ ] 6. orders/tasks.md
  [ ] 7. payments/requirements.md
  [ ] 8. payments/design.md
  [ ] 9. payments/tasks.md

Globals:
  [ ] 10. openapi/api-v1.yaml
  [ ] 11. traceability/code-spec-matrix.md

Type CONTINUE to start.
```

You approve (or adjust) the plan before any generation begins.

### 2. Generate one file at a time

For each item: generates the file, saves it, reports what was completed and what comes next, and **stops**. You confirm "CONTINUE" before the next one. This allows you to review each spec before moving on.

### 3. Globals last

After all unit files are generated, globals come in order: `openapi/`, `user-stories/`, and finally the code-spec matrix that ties each legacy file to a unit with its coverage level.

---

## Output layout: feature folders

Each unit becomes a folder under `<output_folder>/`. The "unit" depends on the `granularity` chosen during the organization step (right after the documentation level question):

| `granularity` | A unit is... |
|---------------|--------------|
| `module` | A legacy module |
| `endpoint` | An HTTP/RPC endpoint or contract |
| `use-case` | A behavioral use case |
| `hybrid` | Module at top, use cases nested inside |
| `feature` | A feature listed by Scout |
| `custom` | A folder defined by the user |

Every unit folder has the three canonical SDD files: `requirements.md`, `design.md`, `tasks.md`. Optional files (`contracts.md`, `flows.md`, `edge-cases.md`, `decisions.md`, `legacy-mapping.md`, `questions.md`) are added when the doc level and context call for them.

---

## Canonical files per unit

| File | Content |
|------|---------|
| `<unit>/requirements.md` | What the unit does: business rules, NFRs, acceptance criteria, MoSCoW |
| `<unit>/design.md` | How the unit is built: interface, flows, dependencies, design decisions |
| `<unit>/tasks.md` | Implementation tasks traceable to the legacy code, with done criteria and confidence |

Every statement is marked with 🟢, 🟡, or 🔴. No exceptions.

---

## Cross-cutting globals

These stay at the root of `<output_folder>/`, outside the unit folders:

| File | Content |
|------|---------|
| `openapi/[api].yaml` | API spec (if applicable, complete/detailed only) |
| `user-stories/[flow].md` | User stories (complete/detailed only) |
| `traceability/code-spec-matrix.md` | Legacy file → unit coverage matrix |
