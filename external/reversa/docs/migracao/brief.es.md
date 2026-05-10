# Schema del brief de migración

`migration_brief.md` es el primer artefacto. Captura el criterio de migración antes de que cualquier agente corra. Es consumido por los cinco agentes del Equipo de Migración.

---

## Cómo se recoge

`/reversa-migrate` conduce una entrevista interactiva en la primera ejecución. En ejecuciones posteriores ofrece **revisar / mantener / recrear**.

---

## Preguntas

La entrevista cubre, como mínimo:

1. **Objetivo de la migración.** ¿Por qué existe? ¿Qué cambia para el negocio si ocurre o no?
2. **Métricas de éxito.** ¿Cómo sabrás que funcionó? Objetivos numéricos o cualitativos claros.
3. **Restricciones.** Plazo, presupuesto, restricciones técnicas (ej: debe correr on-prem, debe cumplir con regulación de privacidad).
4. **Riesgos conocidos.** Factores de riesgo que ya ves.
5. **Stakeholders.** Quién decide, quién usa, quién es impactado.
6. **Stack objetivo.** Lenguaje, framework e infraestructura deseados. **Obligatorio.**

El brief **no pregunta sobre paradigma**: esa es responsabilidad del Paradigm Advisor.

El brief **no pregunta sobre apetito**: se deriva después de las elecciones de paradigma.

---

## Ejemplo mínimo

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

## Objetivo de la migración
Reducir costo de infra y tiempo de onboarding de devs nuevos. El legado en PHP 5.6 ya no tiene soporte y contratar devs senior se vuelve más caro cada año.

## Métricas de éxito
- Costo mensual de infra cae al menos 40%.
- Onboarding de dev nuevo pasa de 4 semanas a 2 semanas.
- Latencia p95 en endpoints críticos por debajo de 200ms.

## Restricciones
- Plazo: go-live antes del 2026-12-31.
- Presupuesto: hasta USD 50k consultoría + horas internas.
- Cumplimiento: GDPR obligatorio.
- Sin downtime mayor a 4h, en ventana de domingo.

## Riesgos conocidos
- Equipo interno pequeño, dos devs full-time.
- Documentación del legado es superficial en algunos módulos.
- Flujo de facturación tiene reglas fiscales sensibles.

## Stakeholders
- CTO: decisión final.
- Equipo de producto: define prioridades de flujo.
- Equipo financiero: valida flujo de facturación.
- Compliance: valida GDPR.

## Stack objetivo
- Lenguaje: Node.js 20.
- Framework: Fastify.
- Infraestructura: AWS Lambda + RDS PostgreSQL + SQS.
```

---

## Qué pasa con el brief

Cada agente lee el brief y `paradigm_decision.md` antes de producir su output. Las decisiones de los agentes deben ser **coherentes** con el brief, o señalan el conflicto explícitamente.

Por ejemplo: si el brief dice "go-live en 6 meses" y el legado tiene 800 reglas de negocio, el Strategist probablemente descartará Big Bang y recomendará Strangler Fig con alcance reducido para la primera ola.
