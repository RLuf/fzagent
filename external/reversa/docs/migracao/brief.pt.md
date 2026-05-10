# Schema do brief de migração

O `migration_brief.md` é o primeiro artefato. Ele captura o critério de migração antes de qualquer agente rodar. É consumido pelos cinco agentes do Time de Migração.

---

## Como é coletado

O `/reversa-migrate` conduz uma entrevista interativa na primeira execução. Em execuções seguintes, oferece **revisar / manter / recriar**.

---

## Perguntas

A entrevista cobre, no mínimo:

1. **Objetivo da migração.** Por que ela existe? O que muda no negócio se acontecer ou não.
2. **Métricas de sucesso.** Como você vai saber que deu certo? Alvos numéricos ou qualitativos claros.
3. **Restrições.** Prazo, orçamento, restrições técnicas (ex: precisa rodar on-prem, precisa atender LGPD).
4. **Riscos conhecidos.** Fatores de risco que você já enxerga.
5. **Stakeholders.** Quem decide, quem usa, quem é impactado.
6. **Stack alvo.** Linguagem, framework e infraestrutura desejados. **Obrigatório.**

O brief **não pergunta paradigma**: isso é responsabilidade do Paradigm Advisor.

O brief **não pergunta apetite**: ele é derivado depois das escolhas de paradigma.

---

## Exemplo mínimo

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

## Objetivo da migração
Reduzir custo de infra e tempo de onboarding de novos devs. O legado em PHP 5.6 não tem mais suporte e contratar dev sênior fica cada vez mais caro.

## Métricas de sucesso
- Custo de infra mensal cai pelo menos 40%.
- Onboarding de novo dev passa de 4 semanas para 2 semanas.
- Tempo médio de resposta dos endpoints críticos abaixo de 200ms (p95).

## Restrições
- Prazo: go-live até 2026-12-31.
- Orçamento: até R$ 250k em consultoria + horas internas.
- Conformidade: LGPD obrigatória.
- Não pode haver downtime maior que 4h em janela de domingo.

## Riscos conhecidos
- Equipe interna pequena, dois devs full-time.
- Documentação do legado é rasa em alguns módulos.
- Fluxo de cobrança tem regras fiscais sensíveis.

## Stakeholders
- CTO: decisão final.
- Time de produto: define prioridades de fluxo.
- Time financeiro: valida fluxo de cobrança.
- Compliance: valida LGPD.

## Stack alvo
- Linguagem: Node.js 20.
- Framework: Fastify.
- Infraestrutura: AWS Lambda + RDS PostgreSQL + SQS.
```

---

## O que acontece com o brief

Cada agente lê o brief e o `paradigm_decision.md` antes de produzir seu output. Decisões dos agentes precisam ser **coerentes** com o brief, ou eles sinalizam o conflito explicitamente.

Por exemplo: se o brief diz "go-live em 6 meses" e o legado tem 800 regras de negócio, o Strategist provavelmente vai descartar Big Bang e recomendar Strangler Fig + escopo reduzido para a primeira onda.
