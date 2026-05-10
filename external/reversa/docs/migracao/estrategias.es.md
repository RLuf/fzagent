# Estrategias de migración

El Strategist presenta al menos dos estrategias con trade-offs explícitos y recomienda una. La decisión final es humana. Este documento describe el catálogo de las cuatro estrategias soportadas.

---

## Resumen

| Estrategia | Cuándo aplica | Costo | Riesgo | Tiempo |
|---|---|---|---|---|
| **Strangler Fig** | Sistema en producción, no puede parar | Medio | Bajo | Largo |
| **Big Bang** | Sistema pequeño, ventana controlada, apetito transformacional | Bajo | Alto | Corto |
| **Parallel Run** | Lógica crítica (financiera, fiscal, regulatoria) | Alto | Medio | Medio |
| **Branch by Abstraction** | Refactor interno antes de la migración, apetito conservador | Bajo | Bajo | Medio |

---

## Strangler Fig

El sistema nuevo crece alrededor del legado, reemplazando módulos uno por uno. El legado va siendo "estrangulado" gradualmente, de ahí el nombre.

**Cuándo tiene sentido:**

- Sistema en producción que no puede tener downtime largo.
- Equipo pequeño o tiempo limitado.
- Bordes claros entre módulos (de lo contrario, se enreda).

**Riesgos típicos:**

- Período largo con dos sistemas conviviendo.
- El router (proxy) al frente se vuelve cuello de botella si está mal diseñado.
- Tentación de mantener ambos sistemas indefinidamente.

---

## Big Bang

Reemplazar todo de una vez en una ventana controlada. Apaga lo viejo, enciende lo nuevo.

**Cuándo tiene sentido:**

- Sistema pequeño, alcance bien delimitado.
- Ventana de mantenimiento viable (fin de semana, feriado).
- Apetito transformacional confirmado en `paradigm_decision.md`.

**Riesgos típicos:**

- Si algo sale mal, el rollback es caro.
- La carga real solo aparece en producción.
- Bugs de integración solo surgen después del go-live.

El Strategist señala explícitamente alto riesgo cuando hay un cambio grande de paradigma combinado con Big Bang, y en esos casos suele recomendar Parallel Run para validación previa.

---

## Parallel Run

Los dos sistemas corren en paralelo leyendo las mismas entradas. Las salidas se comparan. El nuevo solo asume oficialmente cuando la divergencia cae por debajo de un umbral acordado durante un período acordado.

**Cuándo tiene sentido:**

- Lógica crítica donde "incorrecto" tiene alto costo: financiero, fiscal, nómina, facturación.
- Cálculos complejos con muchos casos especiales.
- Cuando la paridad comportamental debe probarse, no suponerse.

**Riesgos típicos:**

- Costo de infra duplicado durante el período.
- Necesidad de instrumentación para comparar salidas.
- La decisión de "aceptar la divergencia" debe ser explícita.

El Inspector define los criterios de paridad aceptable (ej: divergencia < 0.01% durante 30 días).

---

## Branch by Abstraction

Antes de migrar realmente, refactorizas el legado para introducir una capa de abstracción en el punto donde ocurrirá la sustitución. Después intercambias la implementación detrás de esa capa.

**Cuándo tiene sentido:**

- Apetito conservador.
- Sistema con baja cohesión arquitectural, donde extraer un módulo aislado es difícil.
- El equipo quiere ganar confianza antes del salto.

**Riesgos típicos:**

- Trabajo extra de refactor que puede sentirse "perdido" si la migración no ocurre.
- Agregar abstracción en el lugar equivocado empeora la mantenibilidad.

---

## Cómo elige el Strategist

El Strategist combina tres señales:

1. **Brief**: plazo, presupuesto, restricciones, criticidad.
2. **Apetito derivado** de `paradigm_decision.md`: conservative / balanced / transformational.
3. **Tamaño y estado del legado**: número de reglas, complejidad de los flujos, integraciones.

Apetito conservador favorece Branch by Abstraction y Strangler Fig. Apetito transformacional permite Big Bang en sistemas pequeños. Cambio grande de paradigma con apetito transformacional hace que el Strategist recomiende Parallel Run para validación.
