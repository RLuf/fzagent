# Los 5 agentes del Equipo de Migración

Los agentes corren en secuencia fija. Cada uno lee lo que produjeron los anteriores y agrega un artefacto. `/reversa-migrate` orquesta todo.

---

## Pipeline

```
Paradigm Advisor → Curator → Strategist → Designer → Inspector
```

Entre cada agente hay una pausa para revisión humana. El modo predeterminado es interactivo.

---

## 1. Paradigm Advisor

**Comando:** `/reversa-paradigm-advisor` (generalmente invocado por `/reversa-migrate`)

Detecta el paradigma del sistema legado, infiere el paradigma natural de la stack objetivo declarada en el brief y alerta sobre los gaps. Fuerza una decisión consciente del usuario, porque cambiar de lenguaje rara vez es solo un cambio sintáctico, frecuentemente es un cambio fundamental de modelo mental.

**Produce:** `paradigm_decision.md` (lectura obligatoria para todos los agentes posteriores).

---

## 2. Curator

**Comando:** `/reversa-curator`

Lee las reglas de negocio del legado y decide, regla por regla: **MIGRAR**, **DESCARTAR** o **DECISIÓN HUMANA**. Considera el paradigma elegido: reglas que son artefactos del paradigma legado (ej: locks manuales en un sistema procedural síncrono) pueden descartarse en un objetivo event-driven.

**Produce:** `target_business_rules.md` y `discard_log.md`.

---

## 3. Strategist

**Comando:** `/reversa-strategist`

Evalúa estrategias posibles (Strangler Fig, Big Bang, Parallel Run, Branch by Abstraction), presenta trade-offs explícitos y recomienda una. La decisión final es humana.

Considera el apetito derivado de `paradigm_decision.md`: apetito conservador favorece Branch by Abstraction; transformacional permite Big Bang en sistemas pequeños.

**Produce:** `migration_strategy.md`, `risk_register.md`, `cutover_plan.md`.

---

## 4. Designer

**Comando:** `/reversa-designer`

Diseña las specs del sistema nuevo: arquitectura objetivo (con diagrama Mermaid), domain model, data model y plan de migración de datos. Honra el paradigma elegido (event-driven exige eventos explícitos, OO con DI exige interfaces, etc.).

No descompone ingenuamente 1-a-1: identifica bounded contexts reales y justifica agrupaciones y separaciones.

**Produce:** `target_architecture.md`, `target_domain_model.md`, `target_data_model.md`, `data_migration_plan.md`.

---

## 5. Inspector

**Comando:** `/reversa-inspector`

Define cómo probar que el sistema nuevo es comportamentalmente equivalente al legado en los puntos críticos. Adapta los criterios al paradigma: el cambio síncrono → event-driven exige cobertura de orden de mensajes, idempotencia y consistencia eventual.

**Produce:** `parity_specs.md` y archivos `.feature` en Gherkin para cada flujo crítico.

---

## Cuándo correr manualmente

Casi nunca necesitas llamar a un agente aislado. `/reversa-migrate` orquesta todos. Pero si un agente falló o quieres reejecutar desde un punto específico:

```
/reversa-migrate --resume                    # retoma desde el último agente que completó
/reversa-migrate --regenerate=designer       # borra Designer + Inspector y los rehace
```
