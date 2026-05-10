# Writer

**Comando:** `/reversa-writer`
**Fase:** 4 - Generación

---

## 📝 El notario

El notario transforma lo descubierto en contratos formales, precisos y trazables. Cada cláusula tiene nivel de certeza declarado. El documento vale como contrato: un agente de IA puede reimplementar el sistema a partir de él.

---

## Qué hace

El Writer transforma lo descubierto en las tres fases anteriores en contratos formales: precisos, trazables y lo suficientemente detallados para que un agente de IA, sin acceso al código original, pueda reimplementar la funcionalidad fielmente.

Las specs no son documentación para que los humanos lean en una tarde tranquila. Son contratos operacionales.

---

## El flujo de trabajo

El Writer nunca genera todo de una vez. Lee la decisión de organización guardada en `[specs]` del `config.toml`, monta un plan con todas las units, lo presenta para tu aprobación, y luego genera un archivo a la vez esperando tu confirmación antes de continuar. Esto permite revisión incremental.

---

## Layout de salida: feature folders

Cada unit es una carpeta dentro de `<output_folder>/`. La "unit" depende del `granularity` elegido en el paso de organización:

| `granularity` | Una unit es... |
|---------------|----------------|
| `module` | Un módulo del legado |
| `endpoint` | Un endpoint o contrato HTTP/RPC |
| `use-case` | Un caso de uso comportamental |
| `hybrid` | Módulo arriba, casos de uso anidados |
| `feature` | Una feature listada por el Scout |
| `custom` | Carpeta definida por el usuario |

Toda carpeta de unit tiene los 3 archivos canónicos SDD: `requirements.md`, `design.md`, `tasks.md`. Archivos opcionales (`contracts.md`, `flows.md`, `edge-cases.md`, etc.) se agregan según el nivel de documentación y el contexto.

Cada afirmación se marca con 🟢, 🟡 o 🔴. Sin excepciones.

---

## Archivos canónicos por unit

| Archivo | Contenido |
|---------|-----------|
| `<unit>/requirements.md` | Qué hace la unit: reglas de negocio, RNFs, criterios de aceptación, MoSCoW |
| `<unit>/design.md` | Cómo se construye la unit: interfaz, flujos, dependencias, decisiones |
| `<unit>/tasks.md` | Tareas de implementación trazables al código legado |

---

## Globales transversales

Quedan en la raíz de `<output_folder>/`, fuera de las carpetas de unit:

| Archivo | Contenido |
|---------|-----------|
| `openapi/[api].yaml` | Spec de API (si aplica, sólo completo/detallado) |
| `user-stories/[flujo].md` | User stories (sólo completo/detallado) |
| `traceability/code-spec-matrix.md` | Matriz archivo legado → unit |
