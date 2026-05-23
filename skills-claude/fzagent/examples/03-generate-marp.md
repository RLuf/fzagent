# Exemplo 3: gerar slides Marp a partir de uma analise

## Pedido do usuario

> "Transforme wiki/analyses/circuit-breaker.md em slides Marp."

## Passos

1. Leia o arquivo:
   ```
   fs.read wiki/analyses/circuit-breaker.md
   ```
2. Estruture em slides:
   - Slide 1: titulo + abstract
   - Slide 2: problema
   - Slide 3: solucao (estado closed/open/half-open)
   - Slide 4: codigo TS
   - Slide 5: testes / metricas
3. Salve em `_fzagent_artifacts/slides/circuit-breaker.md`:

```markdown
---
marp: true
theme: default
class: invert
---

# Circuit Breaker no fzagent

Pattern classico de tres estados.

---

## Problema

Provider falhando consecutivamente esgota credito sem entregar valor.

---

## Solucao: 3-state machine

closed → open (cooldown) → half-open (uma chance) → closed/open

---

## Codigo TS

\`\`\`ts
class CircuitBreaker {
canExecute(): boolean { ... }
recordSuccess(): void { ... }
recordFailure(): void { ... }
}
\`\`\`

---

## Metricas

- 0 falhas em testes unitarios
- Cooldown default: 30s
- maxFailures: 3
```

4. Sugira: "Para gerar PDF, instale Marp CLI: `npm i -g @marp-team/marp-cli`,
   depois: `marp _fzagent_artifacts/slides/circuit-breaker.md -o circuit-breaker.pdf`."
