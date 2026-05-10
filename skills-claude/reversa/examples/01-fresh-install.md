# Exemplo 1: instalacao em projeto legado pela primeira vez

## Cenario

Projeto Node.js antigo (Express, sem testes, sem docs). Cliente quer
modernizar mas precisa entender o escopo.

## Passos do agente

1. Pre-flight (`scripts/preflight.sh`).
2. `git status` — confirmar arvore limpa.
3. `npx reversa install`.
4. Selecionar agentes: todos.
5. `/reversa` — primeira execucao.
6. Scout roda (~2 min): identifica 12 modulos, Express + Sequelize.
7. Apresentar opcoes de docLevel — usuario escolhe **completo**.
8. Apresentar organizacao das specs — usuario escolhe **modulo**.
9. Archaeologist roda por modulo (12x ~3 min cada).
10. Checkpoint preventivo — usuario continua.
11. Detective + Architect + Writer + Reviewer (~30 min total).
12. Output em `_reversa_sdd/`.

## Resultado tipico

- 12 specs SDD em `_reversa_sdd/specs/`.
- ERD com 23 entidades em `architecture.md`.
- 4 ADRs retroativos em `domain.md`.
- 9 watch items em `_reversa_forward/regression-watch.md`.
