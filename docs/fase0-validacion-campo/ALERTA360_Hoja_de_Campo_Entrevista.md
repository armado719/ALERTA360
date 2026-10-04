ok hermes 
*Versión imprimible/usable durante la llamada. Complementa el Protocolo §2 (guion) y §5 (registro).*

---

## Antes de marcar

- Entrevistar a quien **opera o supervisa** el monitoreo: jefe de instrumentación, SCADA/automatización, mantenimiento, coordinador HSE. No al gerente general.
- Duración: 20-30 min. Videollamada > teléfono. Nunca cuestionario escrito.
- Anotar en esta hoja durante la llamada, no después.

## Regla de oro

**Nunca mencionar ALERTA360 ni ninguna idea de producto.** Se investiga cómo trabajan hoy.

Si preguntan "¿esto para qué es?": *"Estoy investigando cómo los operadores de infraestructura crítica supervisan la salud de sus sistemas de monitoreo, antes de decidir si vale la pena construir algo."*

**Nunca preguntar:** "¿le gustaría una herramienta que...?", "¿pagaría por...?", "¿qué le parece la idea de...?" → inducen respuesta educada, no honesta.

---

## Bloque 1 — Apertura (2 min)

- Presentarse (nombre, de dónde vienes).
- "Estoy investigando cómo se supervisa hoy la salud de los sensores en operaciones como esta. No es una venta."
- "¿Te parece si voy tomando apuntes mientras hablamos?"

---

## Bloque 2 — Contexto operativo (5 min)

1. ¿Cuántos sensores / estaciones / equipos de monitoreo tiene bajo su responsabilidad?
2. ¿Qué tipo de activos son? (nivel, presión, sismicidad, temperatura, caudal, otro)
3. ¿Con qué herramienta supervisan hoy su estado? (Grafana / Zabbix / SCADA propio / ThingsBoard / Excel / nada centralizado)
4. ¿Quién ve esa información todos los días y qué hace cuando ve algo raro?

---

## Bloque 3 — El dolor, sin nombrarlo (8 min)

5. ¿Cómo saben hoy que un sensor o estación falló? ¿Cuánto tardan en enterarse típicamente?
6. ¿Han tenido sensores que siguen "conectados" pero entregan datos incorrectos o congelados? ¿Cómo lo detectaron, si lo detectaron?
7. ¿Llevan historial de fallas de su infraestructura de monitoreo?
8. Si yo le preguntara ahora mismo: **¿qué porcentaje de su capacidad de monitoreo está disponible?** — esta pregunta casi nadie la puede responder bien. La dificultad ES el hallazgo. No ayudar con pistas; dejar que struggle con la respuesta.

---

## Bloque 4 — La pregunta clave (5 min, NO APURAR)

> **"Cuénteme la última vez que un sensor o sistema de monitoreo falló y ustedes se dieron cuenta tarde. ¿Qué pasó?"**

- Dejar que cuenten la historia completa. **No interrumpir.**
- No llenar los silencios mientras piensan la anécdota.
- Anotar aquí la historia: ________________________________________________
  ____________________________________________________________________
- Si la cuenta, preguntar: ¿cuánto tiempo pasó entre que falló y se enteraron? ¿Quién se enteró? ¿Cómo? ¿Qué costó?

---

## Bloque 5 — Presupuesto y autoridad (5 min)

9. Si algo pudiera resolver esto, ¿quién en su organización tendría que aprobar comprarlo?
10. ¿Existe hoy una partida de presupuesto para herramientas de monitoreo / mantenimiento predictivo, o sería un gasto nuevo?
11. ¿Cuánto les costó aproximadamente la última falla no detectada a tiempo, si lo pueden estimar?

---

## Bloque 6 — Cierre (2 min)

- Agradecer.
- "¿Conoce a alguien más en su organización, o en otra empresa del mismo sector, con quien valga la pena hablar?" (así se consiguen las 2 entrevistas del vertical)

---

## Puntuación (1-5 cada una) — llenar JUSTO después, mientras está fresco

| Dimensión | 1 | 3 | 5 | Nota |
|---|---|---|---|---|
| Dolor real | No recuerdan ninguna | Recuerdan una, sin consecuencia grave | Historia clara con costo/riesgo |5|
| Cantidad de activos (<10 / 10-50 / >50) | <10 | 10-50 | >50 | 5|
| Observabilidad actual (invertido) | SCADA sofisticado que responde todo | Algo con huecos reconocidos | Manual / por llamadas / nada centralizado | 5|
| Accesibilidad del protocolo | Propietario, cerrado | Semi-estándar, gateway conocido | Ya expone API/webhook/MQTT | 5|
| Presupuesto / autoridad | No hay partida | Partida adyacente (mantenimiento) | Partida propia + contacto con autoridad | 5|
| Disposición a pilotar | Evasivos / desinteresados | Neutros | Pidieron detalles / propusieron seguir | 5|
| **TOTAL** | | | | **/30** |

---

## Registro

- **Fecha:** ______________
- **Vertical:** [ ] Hidroeléctrica  [ ] Minería  [ ] Puerto
- **Organización** (o anonimizado): ______________
- **Cargo del entrevistado:** ______________
- **Herramienta actual:** ______________
- **Cita textual más reveladora:** ______________________________________
- **Riesgo u objeción que mencionó:** ______________________________________
- **¿Refirió a otro contacto?**  [ ] Sí → ¿a quién? __________   [ ] No

---

## Criterios de puntuación — referencia rápida

| Dimensión | Qué se califica | 1 | 3 | 5 |
|---|---|---|---|---|
| Dolor real | ¿Hubo historia concreta de falla detectada tarde con consecuencia real? | No recuerdan ninguna | Una, sin consecuencia grave | Clara, con costo/riesgo concreto |
| Cantidad de activos | ¿Cuántos sensores bajo monitoreo? | <10 | 10-50 | >50 |
| Observabilidad actual (inv.) | ¿Qué tan mal resuelto está hoy? | SCADA sofisticado | Con huecos reconocidos | Manual / nada centralizado |
| Accesibilidad protocolo | ¿Estándar el protocolo de sus sensores? | Propietario, requiere negociar | Semi-estándar, gateway conocido | API/webhook/MQTT abierto |
| Presupuesto/autoridad | ¿Partida + persona identificable? | No hay partida | Partida adyacente | Partida propia + autoridad clara |
| Disposición a pilotar | ¿Apertura real, no cortesía? | Evasivos | Neutros | Pidieron detalles / siguieron hablando |

---

## Nota de versión

Este archivo es hoja de apoyo, no sustituye el Protocolo. Si diverge algo, manda `ALERTA360_Protocolo_Validacion_Campo.md`.
