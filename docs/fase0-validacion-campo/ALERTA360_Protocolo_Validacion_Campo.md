# ALERTA360 — Protocolo de Validación de Campo
*Documento operativo — complementa al Project Master Lean, sección 4.1*

**Propósito de este documento:** ejecutar el gate "Validación de Campo → Vertical Seleccionado" de forma consistente entre los CUATRO verticales (hidroeléctrica, minería, puerto, interventoría/monitoreo geotécnico de obra — esta última abierta en 2026-10, ver Project Master §0.1), sin sesgo, y con criterios de decisión definidos ANTES de hablar con nadie — para no elegir el vertical por simpatía o por quién contestó primero.

**Regla de oro de todo el protocolo:** no se menciona ALERTA360 como producto durante la entrevista. Se investiga cómo trabajan hoy. Si preguntan "¿y esto para qué es?", la respuesta es honesta pero neutra: *"Estamos investigando cómo los operadores de infraestructura crítica supervisan la salud de sus sistemas de monitoreo, antes de decidir si vale la pena construir algo."*

---

## 1. Antes de la entrevista

- **A quién buscar:** no al gerente general — a quien opera o supervisa directamente el monitoreo (jefe de mantenimiento, ingeniero de instrumentación, jefe de SCADA/automatización, coordinador HSE). Es quien vive el dolor, no quien firma el presupuesto (a esa persona se llega después, si el dolor se confirma).
- **Cómo conseguir la conversación:** contacto directo/referido es mejor que formulario o encuesta fría. 20-30 minutos de llamada o presencial, no un cuestionario por escrito — las respuestas por escrito pierden la anécdota, que es lo más valioso.
- **Meta mínima de esta ronda:** al menos 2 conversaciones por vertical antes de comparar. Una sola conversación por vertical no es evidencia, es anécdota.

**Total: 8 entrevistas (4 verticales × 2).** Ver `ALERTA360_Project_Master.md` §0.1 — la 4ª vertical (Interventoría / monitoreo geotécnico de obra) se abrió en 2026-10 tras la Entrevista #1.

---

## 2. Guion de entrevista (flujo, no cuestionario rígido)

### Bloque 1 — Apertura (2 min)
Explicar quién eres, qué estás investigando (ver encuadre neutro arriba), y pedir permiso para grabar notas (no necesariamente grabación de audio, pero si se puede, mejor).

### Bloque 2 — Contexto operativo (5 min)
- ¿Cuántos sensores/estaciones/equipos de monitoreo tienen bajo su responsabilidad?
- ¿Qué tipo de activos son? (nivel, presión, sismicidad, temperatura, etc.)
- ¿Con qué herramienta supervisan hoy su estado? (Grafana / Zabbix / SCADA propio / hojas de Excel / nada centralizado)

### Bloque 3 — El dolor, sin nombrarlo (8 min)
- ¿Cómo saben hoy que un sensor o estación falló? ¿Cuánto tardan en enterarse típicamente?
- ¿Han tenido sensores que siguen "conectados" pero entregando datos incorrectos o congelados? ¿Cómo lo detectaron, si lo detectaron?
- ¿Llevan algún historial de fallas de su infraestructura de monitoreo?
- ¿Podrían decirme, ahora mismo si se los pregunto, qué porcentaje de su capacidad de monitoreo está disponible? (esta pregunta casi nunca la pueden responder bien — esa dificultad ES el hallazgo)

### Bloque 4 — La pregunta clave (5 min, no apurar)
> "Cuénteme la última vez que un sensor o sistema de monitoreo falló y ustedes se dieron cuenta tarde. ¿Qué pasó?"

Dejar que cuenten la historia completa sin interrumpir. Aquí sale el dato más valioso de toda la entrevista: costo real (plata, riesgo, tiempo), quién se enteró, cómo, y cuánto tardaron en reaccionar.

### Bloque 5 — Presupuesto y autoridad (5 min)
- Si algo pudiera resolver esto, ¿quién en su organización tendría que aprobar comprarlo?
- ¿Existe hoy una partida de presupuesto para herramientas de monitoreo/mantenimiento predictivo, o sería un gasto nuevo?
- ¿Cuánto les costó (aproximado) la última falla no detectada a tiempo, si lo pueden estimar?

### Bloque 6 — Cierre (2 min)
Agradecer, y preguntar si conocen a alguien más en su organización o en otra empresa del mismo sector con quien valga la pena hablar (así se consiguen las siguientes entrevistas del mismo vertical, hasta llegar al mínimo de 2 — sección 1).

**Nunca preguntar:** "¿le gustaría una herramienta que...", "¿pagaría por...", "¿qué le parece la idea de...". Esas preguntas inducen una respuesta educada, no honesta.

---

## 3. Criterios de puntuación (definidos ANTES de la primera entrevista)

Para cada conversación, calificar de 1 a 5 en cada dimensión (1 = no hay evidencia / negativo, 5 = evidencia fuerte y clara):

| Dimensión | Qué se califica | 1 | 3 | 5 |
|---|---|---|---|---|
| **Dolor real** | ¿Hubo una historia concreta de falla detectada tarde con consecuencia real? | No recuerdan ninguna | Recuerdan una, sin consecuencia grave | Historia clara, con costo/riesgo concreto |
| **Cantidad de activos** | ¿Cuántos sensores/equipos bajo monitoreo? | Menos de 10 | 10–50 | Más de 50 |
| **Observabilidad actual (invertido)** | ¿Qué tan mal resuelto está hoy? | Ya tienen SCADA/plataforma sofisticada que responde todo | Tienen algo, pero con huecos reconocidos | Manual, por llamadas, o nada centralizado |
| **Accesibilidad del protocolo** | ¿Qué tan estándar es el protocolo de sus sensores? | Propietario, cerrado, requiere negociar con fabricante | Semi-estándar, requiere gateway conocido | Ya expone API/webhook o protocolo abierto (MQTT, HTTP) |
| **Presupuesto/autoridad** | ¿Existe partida y una persona identificable que decide? | No hay partida, decisión muy centralizada arriba | Hay partida adyacente (mantenimiento) pero no dedicada | Partida existente y contacto con autoridad de compra clara |
| **Disposición a pilotar** | ¿Mostraron apertura real a probar algo, no solo cortesía? | Evasivos o desinteresados | Neutros, "avísenme cuando esté listo" | Pidieron detalles concretos o propusieron seguir hablando |

**Puntaje total por entrevista:** suma simple (máximo 30). **Puntaje por vertical:** promedio de sus entrevistas.

---

## 4. Matriz comparativa

**Fuente única de verdad: `ALERTA360_Matriz_Comparativa_Plantilla.csv`** (archivo separado, en esta misma carpeta, no se duplica aquí). Se carga con los resultados de las 6+ entrevistas y sirve para aplicar la regla de decisión de abajo. Si en algún momento aparece una segunda copia de esta matriz en otro documento, se elimina — solo debe existir en el CSV.

**Regla de decisión:** el vertical con mayor TOTAL se convierte en el candidato al piloto — pero solo si además tuvo al menos una historia concreta de "dolor real" con puntaje 4 o 5. Si el vertical con mayor total no tiene esa historia, no se elige todavía: se hacen 1-2 entrevistas adicionales en ese vertical antes de decidir.

---

## 5. Plantilla de registro por entrevista

```
Fecha:
Vertical:
Organización (si se puede nombrar) / anonimizado si no:
Cargo del entrevistado:
Cantidad de activos bajo su responsabilidad:
Herramienta actual de monitoreo:

Historia clave (Bloque 4) — resumen textual:


Puntuación:
- Dolor real:            [ ]/5
- Cantidad de activos:   [ ]/5
- Observabilidad actual: [ ]/5
- Accesibilidad protocolo:[ ]/5
- Presupuesto/autoridad: [ ]/5
- Disposición a pilotar: [ ]/5
TOTAL:                   [ ]/30

Cita textual más reveladora (si la hay):

Riesgo u objeción que mencionaron:

¿Refirió a otro contacto?  Sí/No — ¿a quién?
```

---

## 6. Qué hacer con el resultado

1. Completar mínimo 2 entrevistas por vertical (6 total) antes de tocar la matriz.
2. Llenar la matriz comparativa (sección 4).
3. Aplicar la regla de decisión — un solo vertical queda seleccionado.
4. Con el vertical elegido, identificar el activo específico dentro de él (ej. "sensores de nivel de embalse", no "todo lo de la hidroeléctrica").
5. Confirmar el protocolo técnico real de ese activo con la misma persona entrevistada o con su equipo técnico (esto alimenta la sección 10 del Project Master Lean).
6. Solo entonces se actualiza el Project Master Lean con vertical, activo y protocolo cerrados, y se pasa a la especificación funcional del MVP.

**No se avanza a especificación funcional ni arquitectura detallada sin completar los 6 pasos anteriores.**
