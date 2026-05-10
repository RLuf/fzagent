# Cambio de paradigma

La mayoría de las migraciones falla bajo la superficie. El usuario cree que está cambiando de lenguaje (PHP → Node, Java → Go), pero en realidad está cambiando de paradigma. Y el paradigma moldea mucho más que sintaxis: moldea cómo piensas en concurrencia, consistencia, orden de ejecución, manejo de errores.

El Paradigm Advisor existe para forzar esa conversación antes de que se diseñe la arquitectura.

---

## Por qué importa

Considera una regla simple del legado:

> "Cuando el pedido se confirma, debita del stock y envía email. Si cualquier paso falla, deshacer todo."

En PHP procedural síncrono, esto es una transacción de base de datos con `BEGIN / COMMIT / ROLLBACK`. Funciona porque todo corre en el mismo proceso, en el mismo request HTTP.

En Node serverless event-driven, **no existe transacción que atraviese handlers**. Cada paso es una función, cada función es un evento, y la falla del email ya ocurrió *después* de que el stock fue debitado. Necesitas saga, idempotencia, retry, dead letter queue. No es un bug. Es el paradigma.

Migrar esa regla "tal como es" a Node se rompe. Pero un LLM genérico la migrará tal como es, porque eso es lo que está en las specs del legado.

El Paradigm Advisor lo detecta antes.

---

## Qué hace

1. **Detecta** el paradigma del legado a partir de las specs en `_reversa_sdd/`. Busca marcas concretas: estructura de clases, patrones de acceso a datos, presencia de eventos, flujo síncrono lineal, etc.

2. **Infiere** el paradigma natural de la stack objetivo declarada en el brief. Node moderno es async/event-driven. Go es CSP/goroutines. Elixir es actor model. No hay elección "neutral".

3. **Identifica el gap** con ejemplos concretos del propio sistema legado, no en abstracto.

4. **Presenta 3 opciones** al usuario:
    - **Adoptar el paradigma natural de la stack** (transformacional). Reescribir la regla al modelo nuevo. Más trabajo, más alineado.
    - **Forzar un paradigma similar al legado** (conservador). Intentar mantener el modelo síncrono en una stack asíncrona. Menos trabajo, más frágil.
    - **Híbrido** (equilibrado). Algunas reglas siguen el paradigma nuevo, otras mantienen el viejo. Decisión por categoría.

5. **Registra** la decisión en `paradigm_decision.md`, junto con el **apetito derivado** (`conservative` / `balanced` / `transformational`) que influirá en todos los agentes posteriores.

---

## De qué no es responsable

- Decidir por ti. Educa, presenta y fuerza la elección. La decisión es humana.
- Cambiar la stack objetivo. Si el brief dice Node, trabaja con Node. Cambiar la stack significa rehacer el brief.
- Detectar paradigma sin evidencia. Toda afirmación sobre el paradigma del legado viene con evidencia trazable (con tagging 🟢🟡🔴⚠️).

---

## Ejemplo: PHP procedural → Node async

| Aspecto | PHP procedural | Node async/event-driven |
|---|---|---|
| Concurrencia | Un request por proceso, lock natural | Concurrencia implícita, lock manual |
| Transacción | `BEGIN/COMMIT` en BD atraviesa el request | Saga o outbox, sin transacción distribuida |
| Error | Throw y let-it-die o rollback explícito | Retry, dead letter, idempotencia |
| Orden | Flujo lineal en el controller | Los eventos pueden llegar fuera de orden |
| Estado | Sesión en el servidor | Stateless, estado en token o store externo |

Si la migración ignora esto, el sistema nuevo "funciona" en test y se rompe en producción bajo carga real. El Paradigm Advisor lo detecta antes de que el Designer empiece.
