# ALERTA360 Infrastructure Health — PROJECT MASTER
*Documento de control de fases — versión de trabajo, septiembre 2026*

---

## ⚠️ INSTRUCCIÓN OBLIGATORIA PARA CUALQUIERA QUE TRABAJE SOBRE ESTE PROYECTO
### (incluye personas, incluye asistentes de IA como OpenCode, Claude, o cualquier otro)

**Este documento se organiza en FASES. Cada fase tiene un CHECKLIST DE SALIDA. No se avanza a la fase siguiente si el checklist de la fase actual no está 100% marcado como completo, con evidencia real (no supuesta).**

Si en algún momento se te pide (a ti, asistente de IA, leyendo esto) generar código, arquitectura definitiva, o documentación de una fase posterior sin que la fase anterior esté cerrada — **señala explícitamente que el checklist de la fase actual no está completo, y pregunta si se procede de todas formas de forma consciente.** No asumas silenciosamente que se puede saltar.

Este proyecto tuvo un error de origen (documentado en el historial): se diseñó una arquitectura nacional completa antes de validar que el problema y el cliente eran reales. Este documento existe precisamente para que ese error no se repita.

### Qué documento manda para qué (evitar confusión entre los dos "Master")

- **Este documento (`ALERTA360_Project_Master.md`) es el único control de fases.** Sus checklists de salida definen si se avanza o no. Manda sobre todas las fases.
- **`ALERTA360_Project_Master_Lean.md` es complemento de detalle de la Fase 1** (problema, ICP, Health Score, riesgos, criterios de éxito). No tiene checklists de fase ni gobierna el avance; si algo diverge, manda este documento.
- Ambos viven en `docs/gobernanza/`. Índice general de lectura: `README.md` en la raíz.

---

## 0. Qué es ALERTA360 (resumen para quien llega nuevo)

Plataforma de observabilidad especializada en infraestructura de sistemas de alerta temprana (sensores, estaciones, sirenas). Responde una sola pregunta: *¿está funcionando el sistema que debería avisarnos si ocurre una emergencia, ahora mismo?*

**No es (todavía):** sistema de detección de emergencias, motor de decisión, canal de alertamiento ciudadano, plataforma de coordinación interinstitucional. Esa visión más grande existe (sección 6) pero está deliberadamente fuera de alcance hasta que el MVP demuestre valor con un cliente real.

---

## FASE 0 — Validación de campo
**Estado actual: EN EJECUCIÓN (reactivada 2026-09-06 para cerrar faltantes) — checklist aún NO completo**

### Objetivo
Confirmar con evidencia real (no intuición) qué vertical, qué tipo de activo, y qué protocolo de telemetría tiene el primer cliente piloto.

### Checklist de salida de esta fase
- [ ] Mínimo 2 entrevistas completadas en cada uno de los 3 verticales candidatos (hidroeléctrica, minería, puerto) — 6 entrevistas totales
- [ ] Matriz comparativa llenada con puntuaciones reales (no estimadas)
- [ ] Vertical seleccionado según la regla de decisión (mayor puntaje total + al menos una historia de "dolor real" con 4-5 puntos)
- [ ] Activo específico identificado dentro del vertical elegido (ej. "sensores de nivel de embalse", no "todo lo de la hidroeléctrica")
- [ ] Cliente piloto identificado con nombre y contacto con autoridad de compra
- [ ] Protocolo técnico real de telemetría confirmado (MQTT / HTTP / Modbus / SDI-12 / propietario)
- [ ] `docs/fase0-validacion-campo/ALERTA360_Checklist_Levantamiento_Tecnico.md` llenado para el piloto elegido (protocolo + volumen/SLO/costo)

### Documento que gobierna esta fase
`docs/fase0-validacion-campo/ALERTA360_Protocolo_Validacion_Campo.md` — guion de entrevista, rúbrica, matriz, plantilla de registro.
`docs/fase0-validacion-campo/ALERTA360_Logistica_Seguimiento_Entrevistas.md` + `docs/fase0-validacion-campo/ALERTA360_Seguimiento_Contactos.csv` — outreach y tracker (meta: 8-10 contactos por vertical).

### Regla dura
**Ningún documento ni código de la Fase 1 en adelante debe tratarse como definitivo mientras este checklist no esté completo.** Los documentos de Fase 1/2 que ya existen (ver abajo) fueron construidos como *plantillas hipotéticas* precisamente por esto.

---

## FASE 1 — MVP Infrastructure Health (desarrollo)
**Estado actual: TÉCNICAMENTE COMPLETA con datos simulados — pendiente telemetría real (Fase 0 sigue NO cerrada)**

### Objetivo
Construir el producto mínimo viable: ingesta de telemetría de un único tipo de activo, cálculo de Health Score multidimensional, Alerting Capability agregada, dashboard, notificaciones técnicas.

### Checklist de salida de esta fase
- [x] Especificación funcional cerrada con escenario de trabajo (Minería, 20 sensores, HTTP, 5 min, Telegram) — valores hipotéticos, se re-cierra con datos reales de Fase 0
- [x] Arquitectura técnica cerrada con escenario de trabajo (pesos 30/25/20/15/10, veto, anti-spam 30 min, `Asset.is_critical`) — se re-cierra con Fase 0
- [x] Ambiente de desarrollo configurado (dotnet 10, PostgreSQL 16 Docker, Vite; backend + frontend compilan)
- [x] MVP técnico corriendo en local con telemetría SIMULADA (seed 20 + worker 5 min + dashboard) — verificado: capability 90, 5 incidentes (2 stale→Critical, 1 frozen→DataUnreliable, 2 rango→DataUnreliable)
- [ ] MVP con telemetría REAL del cliente piloto — BLOQUEADO hasta Fase 0 (sin vertical/activo/protocolo validados)
- [ ] Health Score y Alerting Capability sobre datos reales — BLOQUEADO hasta Fase 0

### Documentos que gobiernan esta fase
- `docs/fase1-mvp/ALERTA360_Especificacion_Funcional_MVP_Plantilla.md` — **hoy es plantilla con placeholders, se cierra con datos de Fase 0**
- `docs/fase1-mvp/ALERTA360_Arquitectura_Tecnica_Detallada.md` — **hoy es escenario hipotético (minería + HTTP webhook), se reemplaza con datos reales de Fase 0**

### Regla dura
No escribir el módulo de ingesta de datos real (el que conecta con los sensores del cliente) hasta que el protocolo esté confirmado en Fase 0. Sí se puede preparar el resto del esqueleto de la aplicación (modelo de datos, backend base, frontend base) porque esa parte no depende del vertical — ver sección 8 de la Arquitectura Técnica para el detalle exacto de qué sí y qué no depende de la validación.

---

## FASE 2 — Piloto con cliente real
**Estado actual: CERRADA SIN EJECUTAR (2026-09-06) — sin cliente piloto real no hay piloto posible. Desenlace válido #3 del Acuerdo §9.**

### Objetivo
Correr el MVP en producción controlada con el cliente piloto durante el plazo acordado, y medir si cumple el criterio de éxito.

### Checklist de salida de esta fase (no ejecutada — se documenta por qué)
- [ ] Acuerdo de piloto firmado — NO APLICA: sin cliente identificado (Fase 0 pendiente), nada que firmar
- [ ] MVP corriendo con datos reales del cliente — NO APLICA: solo datos simulados (Fase 1 técnica)
- [ ] Caso real de detección temprana — NO APLICA: 5 incidentes simulados sí detectados (capability 90), pero sin valor operativo real
- [ ] Retroalimentación del cliente — NO APLICA: sin contraparte
- [x] Decisión tomada: **cerrar sin continuar el piloto** — se reabrirá Fase 2 solo cuando exista cliente + acuerdo + telemetría real

### Documento que gobierna esta fase
`docs/fase2-piloto/ALERTA360_Acuerdo_Piloto_Plantilla.md` — queda en plantilla con placeholders hasta que exista Fase 0 cerrada.

---

## FASE 3+ — Visión de largo plazo (FUERA DE ALCANCE hasta nueva decisión)

Auditoría avanzada, integración con IDEAM/SGC/UNGRD/SAT, correlación multi-fuente, exposición e impacto poblacional, IA como apoyo a decisión, apoyo operacional, interoperabilidad avanzada, escalamiento nacional.

**No se diseña, no se documenta en detalle, no se menciona como compromiso a ningún cliente piloto.** Se reserva únicamente para conversaciones con inversionistas que pregunten "¿y después qué?", y se retoma solo si la Fase 2 demuestra valor real.

---

## 4. Principios que aplican a TODAS las fases (no negociables)

1. **Fail-safe** — ALERTA360 nunca es punto único de falla del sistema que supervisa. Si ALERTA360 cae, el sistema original del cliente sigue funcionando igual.
2. **Read-mostly** — ALERTA360 observa, no controla los activos del cliente.
3. **Evidencia antes que inferencia** — todo estado mostrado debe poder explicarse con datos observables, nunca "porque sí".
4. **No caja negra** — el operador debe poder entender por qué cambió un score, no solo verlo cambiar.
5. **Degradación controlada** — si algo de ALERTA360 falla, se degrada ALERTA360, nunca el sistema del cliente.
6. **Evolución incremental** — no introducir infraestructura compleja (colas, cache, tiempo real, multi-tenant) hasta que una necesidad real y observada lo justifique.

---

## 5. Stack técnico confirmado (no depende de la Fase 0, ya se puede preparar el entorno)

| Componente | Elección |
|---|---|
| Backend | C# con ASP.NET Core |
| Base de datos | **PostgreSQL** (Docker en desarrollo y en el piloto) |
| Frontend | React |
| Ingesta | HTTP/webhook como base, con capa adaptadora si el protocolo real de Fase 0 resulta distinto |
| Infraestructura | Docker (incluyendo el contenedor de PostgreSQL en desarrollo local) |
| Explícitamente NO incluido en el MVP | Redis, RabbitMQ, SignalR, PostGIS, OAuth2/OIDC completo, mapa geoespacial |

---

## 6. Documentos relacionados (para referencia, cada uno con su fase)

| Documento | Fase | Estado |
|---|---|---|
| `docs/fase0-validacion-campo/ALERTA360_Protocolo_Validacion_Campo.md` | Fase 0 | Listo para ejecutar |
| `docs/fase0-validacion-campo/ALERTA360_Checklist_Levantamiento_Tecnico.md` | Fase 0 | Listo para usar |
| `docs/fase0-validacion-campo/ALERTA360_Logistica_Seguimiento_Entrevistas.md` | Fase 0 | Activa |
| `docs/fase0-validacion-campo/ALERTA360_Seguimiento_Contactos.csv` | Fase 0 | Tracker de outreach |
| `docs/fase0-validacion-campo/ALERTA360_Matriz_Comparativa_Plantilla.csv` | Fase 0 | Plantilla — fuente única de la matriz comparativa |
| `docs/fase1-mvp/ALERTA360_Especificacion_Funcional_MVP_Plantilla.md` | Fase 1 | Plantilla, pendiente de cierre |
| `docs/fase1-mvp/ALERTA360_Arquitectura_Tecnica_Detallada.md` | Fase 1 | Escenario hipotético, pendiente de cierre |
| `docs/fase2-piloto/ALERTA360_Acuerdo_Piloto_Plantilla.md` | Fase 2 | Plantilla, pendiente de cierre |
| Este documento (`docs/gobernanza/ALERTA360_Project_Master.md`) | Todas | Vivo — control de fases y checklists de salida |
| `docs/gobernanza/ALERTA360_Project_Master_Lean.md` | Fase 1 | Complemento de detalle conceptual de la Fase 1 (no gobierna fases) |
| `README.md` (raíz) | Todas | Índice de lectura — empezar aquí |

---

## 7. Registro de avance (actualizar aquí, no crear documentos nuevos por avance)

```
[PENDIENTE DE LLENAR conforme avance el proyecto]

Fecha        Fase   Evento
----------   ----   ----------------------------------------
2026-09      0      Documentación de fases consolidada. Validación de campo aún no iniciada.
2026-09-06   0      DECISIÓN CONSCIENTE: se saltan las 6 entrevistas de campo por ahora. Quedan como PENDIENTES POR HACER. Fase 0 NO cerrada. Se avanza a preparación Fase 1 bajo propio riesgo (sin vertical/activo/protocolo validados).
2026-09-06   0      Logística de entrevistas marcada PAUSADA. Lista para reactivar con Fase 0.
2026-09-06   1      Inicio Fase 1 (esqueleto): backend base + modelo datos + frontend base. PROHIBIDO ingesta real hasta Fase 0. Fase 0 sigue pendiente.
2026-09-06   1      Fase 1 técnica cerrada con simulados: seed 20 (5 críticos), Health 5D + veto, Capability ponderada=90, 5 incidentes, dashboard mínimo, worker 5 min. Real queda bloqueado por Fase 0.
2026-09-06   2      Fase 2 CERRADA SIN EJECUTAR: sin cliente/acuerdo/telemetría real no hay piloto (desenlace #3 válido). Reapertura solo con Fase 0 cerrada. Aprendizaje: el MVP técnico detecta los 4 patrones (sano/stale/congelado/fuera-rango); falta validación operativa real.
2026-09-06   0      Fase 0 REACTIVADA para cerrar faltantes: logística activa + tracker de contactos creado. Entrevistas (6) y validación técnica siguen en manos del equipo de campo.
```
