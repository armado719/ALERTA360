---
schemaVersion: 1
scope: workspace
updatedAt: "2026-09-18T23:23:55.127Z"
workspaceName: "ALERTA360"
---

# Project Memory

## Project Overview
- Workspace de diseño llamado ALERTA360.
- El proyecto evolucionó desde un inicio indefinido hacia un dashboard operativo MVP para monitoreo de activos, métricas e incidentes.
- La conversación y el trabajo se mantienen en español.

## Current State
- Existe una app frontend TypeScript bajo `src/frontend`.
- `src/frontend/index.html` funciona como shell Vite con idioma español, título/metadatos de ALERTA360 y favicon embebido.
- `src/frontend/src/main.ts` implementa un dashboard operativo con estructura semántica, métricas, tabla de activos, incidentes y fallback demo cuando no hay backend local.
- `src/frontend/src/style.css` soporta una interfaz de panel robusta alineada al baton visual.
- `App.jsx` existe como preview autónomo equivalente para validación visual; fue levantado/previsualizado correctamente sin errores de consola ni assets.
- `src/frontend/DESIGN.md` existe y es el baton/sistema visual mínimo; tratarlo como la única fuente autoritativa de tokens visuales.
- `AGENTS.md` y `.codesign/settings.json` siguen ausentes.
- Docker fue iniciado por el usuario, pero `docker-compose.yml` solo define Postgres (`alerta360-db`) y no levanta frontend ni backend de app.
- Verificación más reciente: ok sobre `App.jsx`; preview renderiza con 169 nodos, 0 errores de consola y 0 errores de assets.

## Artifacts
- `src/frontend/index.html`: shell Vite principal; contiene metadata, idioma y favicon de ALERTA360.
- `src/frontend/src/main.ts`: implementación real de la app/dashboard con consumo de API local y datos demo de respaldo.
- `src/frontend/src/style.css`: estilos principales del dashboard.
- `src/frontend/package.json`: scripts Vite (`dev`, `build`, `preview`) para levantar el frontend manualmente.
- `docker-compose.yml`: actualmente solo levanta base de datos Postgres, no frontend.
- `App.jsx`: preview autónomo creado para validar la experiencia visual sin depender del flujo Vite/TypeScript.
- `src/frontend/DESIGN.md`: baton de diseño vigente y autoritativo para colores, tipografía, layout, elevación, formas y componentes.

## Design Direction
- Dirección actual: dashboard operativo, claro y ejecutivo para ALERTA360.
- Enfoque en monitoreo 360 de activos críticos, salud operativa, incidentes y señales de riesgo.
- Visual sobrio de producto SaaS: fondo claro, superficies suaves, texto de alto contraste, acento violeta y estados semánticos para éxito/alerta/peligro.
- Priorizar legibilidad, jerarquía de métricas y rápida lectura de estado antes que decoración.

## User Feedback
- Usuario inició con “hola”, luego pidió “analiza el proyecto”, “continua”, “lo pudes levantar para velo” y aclaró “muestramelo en el navegaodr no lo veo”.
- Preguntó si debía iniciar Docker y luego dijo “listo ya la inici”.
- Después indicó “no memustra nada”, reportando que no ve nada en navegador.
- La prioridad inmediata del usuario es poder ver y ejecutar el dashboard en navegador.
- Conviene seguir respondiendo en español y con instrucciones concretas de ejecución.

## Decisions
- Preservar el título/diseño actual “Saludo inicial” en turnos de continuación; no reconstruir ni renombrar salvo petición explícita.
- Antes de editar fuentes existentes: inspeccionar workspace, leer `src/frontend/DESIGN.md` si existe y revisar la fuente correspondiente.
- Usar `src/frontend/DESIGN.md` como baton autoritativo y no duplicar tablas completas de tokens en memoria.
- Mantener un fallback demo para que el dashboard sea útil aun cuando el backend local no esté disponible.
- Mantener `App.jsx` como objetivo de preview autónomo cuando el flujo Vite/TS no pueda validarse directamente por el entorno.
- Docker actual no levanta la interfaz; para ver la app real hay que ejecutar Vite desde `src/frontend` o añadir un servicio frontend al compose.

## Open Questions
- ¿Qué alcance funcional exacto debe cubrir ALERTA360: activos de datos, infraestructura, seguridad, continuidad u otro dominio?
- ¿Qué endpoints reales del backend deben consumirse y cuál es el contrato final de datos?
- ¿Existe o debe crearse un backend de app además de Postgres?
- ¿Debe el dashboard incorporar autenticación, roles, filtros avanzados o navegación entre módulos?
- ¿El nombre visible/diseño “Saludo inicial” debe mantenerse como título de diseño o cambiar a un nombre más representativo?
- ¿El usuario quiere levantar el frontend manualmente con Vite o prefiere que se agregue al `docker-compose.yml`?

## Next Steps
- Explicar al usuario que Docker solo levanta Postgres y por eso no aparece frontend en navegador.
- Guiar ejecución del frontend: entrar a `src/frontend`, correr `npm install` y `npm run dev -- --host 0.0.0.0`, luego abrir la URL que imprima Vite.
- Si el usuario prefiere Docker completo, añadir servicio frontend a `docker-compose.yml`.
- Validar el dashboard en ejecución con la app real.
- Conectar o ajustar `main.ts` a endpoints definitivos cuando exista backend.
- Añadir estados vacíos, carga y error más específicos si el producto lo requiere.
- Actualizar `src/frontend/DESIGN.md` solo cuando se consoliden nuevas decisiones visuales reutilizables.

## Promotion Candidates For DESIGN.md
- Confirmar como patrones reutilizables: tarjetas de métricas, tabla de activos, lista de incidentes y badges de estado.
- Consolidar la dirección “dashboard operativo SaaS claro con acento violeta y estados semánticos”.
- Documentar el uso de fallback/demo como patrón de presentación para entornos sin backend, si aplica al producto.

## Recent History
- 2026-09-18: Inicio del workspace ALERTA360 con saludo del usuario; asistente preguntó qué desea diseñar o modificar.
- 2026-09-18: Usuario pidió analizar el proyecto; se inspeccionaron fuentes, estilos y documentación base.
- 2026-09-18: Usuario pidió “continua”; se actualizó el dashboard, se reparó el baton, se creó `App.jsx` y se verificó el preview sin errores.
- 2026-09-18: Usuario pidió levantar el proyecto para verlo; se previsualizó `App.jsx` correctamente.
- 2026-09-18: Usuario indicó que no lo veía en el navegador; se abrió el preview y se verificó ok.
- 2026-09-18: Usuario preguntó si debía iniciar Docker; se aclaró que no hace falta para preview visual, pero sí para probar backend real.
- 2026-09-18: Usuario confirmó que inició Docker; se pidieron contenedores/puertos/logs y se sugirieron URLs locales.
- 2026-09-18: Usuario reportó que no muestra nada; se inspeccionó `docker-compose.yml` y se confirmó que solo levanta Postgres, no el frontend.