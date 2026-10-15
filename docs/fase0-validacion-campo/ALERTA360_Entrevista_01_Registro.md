# ALERTA360 — Registro de Entrevista #1

*Generado a partir de la transcripción de la llamada. Complementa el Protocolo §5.*

---

## Identificación

- **Fecha:** (completar — la entrevista menciona "puente festivo de mayo" como evento, la llamada es posterior)
- **Entrevistador:** Eduardo Ríos
- **Entrevistado:** Juan Carlos Romero
- **Ciudad:** Ibagué, Tolima, Colombia
- **Cargo:** (completar — se define como *sponsor técnico*; supervisa directamente instrumentación en proyectos. Probablemente Jefe de Instrumentación o similar. NO es el gerente general — cumple el criterio del Protocolo §1)
- **Organización:** (completar — menciona "el cliente", una "interventoría del cliente" y una "empresa hidroeléctrica asociada". Identificar si es una interventoría/consultora de ingeniería o unaificio de operación)
- **Vertical candidato:** (**a definir** — ver nota abajo)

---

## Contexto operativo

- **Activos físicos:** presas de tierra y enrocado, túneles de conducción/desviación, taludes críticos de alta pendiente
- **Variables medidas:**
  - Nivel y presión de poros (piezómetros) — ~70% de la red
  - Deformación y desplazamiento (inclinómetros, extensómetros)
  - Sismicidad / vibración (geófonos, cerca de fallas activas y voladuras)
  - Caudal y temperatura (filtración y temperatura del agua en presas)
- **Cantidad:** 45 estaciones bajo supervisión directa / 350-400 sensores activos en campo (Tolima, Eje Cafetero, Antioquia). Fluctúa por sensores en modo "dormante" durante fases de mantenimiento.
- **Herramienta actual (Frankenstein declarado):**
  1. Plataforma en nube custom por TI (parecida a ThingsBoard) — presas y proyectos nuevos. Funciona bien.
  2. SCADA local — proyectos antiguos, "a veces pierde comunicación".
  3. Radio o SMS — un par de estaciones remotas; datos consolidados manualmente en Excel para reportes semanales al cliente.
  4. CMMS básico para tickets de mantenimiento + bitácora en campo (PDF) + Excel maestro por proyecto.

**Heterogeneidad relevante para ALERTA360:** "no es lo mismo un sensor enterrado a 40 metros de profundidad en una presa, que uno a la intemperie en un talud". Esto rompe la premisa de Fase 1 de "un único tipo de activo" — es un riesgo real para el MVP.

---

## Dolor (Hallazgos)

1. **Tiempo de detección real: 6 a 24 horas.** Tres vías: (a) alerta automática de pérdida de comunicación / batería baja — 2 a 4 h, "no siempre confiable"; (b) detección pasiva en revisión matutina o Excel semanal — 12 a 24 h, más si es fin de semana; (c) **el cliente llama preguntando por qué no ve datos** — "perdimos el control de la narrativa".

2. **Ambigüedad de estado en pantalla (el hallazgo central).** Cita textual: *"un sensor que se quedó sin batería se ve exactamente igual que un sensor que está midiendo una condición crítica"*. El protocolo de respuesta es llamar al técnico de campo más cercano — toma horas, a veces un día si la zona es difícil. Mientras tanto: *"estamos operando a ciegas con ese punto de monitoreo"*.

3. **Riesgo "falso saludable" confirmado con ejemplo real** (hace ~3 meses, presa en Antioquia): piezómetro marcado "100% online", batería buena, reportando cada hora. El valor era una línea casi plana. **Lo detectó un ingeniero geotécnico leyendo el PDF semanal**, no el sistema. Causa real: micro-falla en el cable, datalogger congelado repitiendo el último valor. Frase clave del entrevistado: *"El sistema te dice que está 'conectado', pero no te dice si lo que está midiendo tiene sentido físico. Y eso no hay dashboard estándar que te lo resuelva fácilmente hoy."*

4. **Sin historial clínico por sensor.** Tickets en CMMS, bitácoras en PDF, Excel maestro — en silos. Para responder "¿cuál sensor falla más y por qué?" hay que cruzar a un analista y **toma días**. No hay análisis de tendencia de fallas.

5. **Capacidad de monitoreo no cuantificable.** Estimó "85-90% a ojo de buen cubero", con nudo en la garganta, porque el sistema reporta "380 de 400 conectados en verde" pero 20 podrían estar congelados/erráticos. Para dar el número certificado: auditar estación por estación cruzando visitas técnicas y lecturas manuales → **días o semanas**. *"Ese no saber con certeza cuántos 'ojos' tenemos realmente abiertos es, sin duda, nuestro mayor punto ciego operativo."*

---

## Bloque 4 — Historia clave (el dato más valioso)

**Evento:** hace ~2 meses, puente festivo de mayo. Talud crítico sobre un túnel de desviación, proyecto hidroeléctrico en Antioquia. Piezómetro clave midiendo presión de poros en la zona más sensible.

**Secuencia:**
- Viernes por la tarde, inicio de festivo. **Sistema en verde**, piezómetro reportando nivel estable dentro de umbrales. Sin alertas rojas, sin aviso de pérdida de comunicación.
- Llovía torrencialmente desde el jueves.
- **Lunes por la tarde** se detectan — no por el sistema, sino porque un ingeniero residente de la **interventoría del cliente** hizo una ronda visual de rutina y spontaneously decidió tomar lectura manual con sonda de inmersión.
- Nivel real: **casi 2 metros por encima** de lo reportado. El sensor no estaba apagado — congelado, repitiendo el último valor válido del viernes por la mañana; la humedad había dañado el cableado interno del cabezal.
- **Volando a ciegas 3 días enteros de lluvias intensas** en el punto más crítico de la estructura.
- El talud aguantó.

**Costo estimado (4.000 – 5.000 USD por un evento de 3 días):**
- Movilización de emergencia (técnico especializado un sábado, viáticos, transporte difícil, horas extras): 1.500 – 2.000 USD
- Horas-hombre de ingeniería (análisis de datos erráticos, llamadas al cliente, reorganización logística): 20 – 30 h
- **Glosa contractual:** 5% de la facturación mensual por "falla en los niveles de servicio de monitoreo continuo" — 2.000 – 3.000 USD
- **Costo reputacional:** el cliente descubrió primero.

> *"En total, un evento de 3 días nos costó fácilmente entre 4.000 y 5.000 dólares... Y eso fue sin que ocurriera un deslizamiento real. Si el talud hubiera llegado a fallar... las cifras serían de millones, y probablemente estaríamos hablando de responsabilidades legales, no solo de una glosa."*

**Esta es la historia que cumple la regla de decisión** (dolor real = 5, con consecuencia cuantificada). Debería bastar sola si el mismo vertical mantiene la puntuación.

---

## Presupuesto y autoridad

- **Autoridad técnica:** Juan Carlos es sponsor técnico. Especifica, evalúa y justifica operativamente. No firma.
- **Autoridad de compra:** Gerente de Proyectos / Director de Operaciones si la inversión es **< 10.000 – 15.000 USD**. Si supera el umbral: **Comité de Compras + firma del Gerente General**.
- **Partida:** no existe partida específica para software de monitoreo de la salud de sensores ni para mantenimiento predictivo de instrumentación. Existe OPEX general "Mantenimiento y Operaciones" asignado por proyecto (cubre sensor dañado, conectividad satelital). Una herramienta nueva = gasto nuevo o reasignación de "mejoras tecnológicas" — bolsa limitada y vigilada.
- **Requisito de aprobación:** *"No basta con decir 'es una herramienta moderna'. Tenemos que demostrar con números cuántas horas-hombre de revisiones innecesarias nos ahorra o, más importante aún, cuánto riesgo de multa, retrabajo o daño reputacional nos evita."*

**Implicación para el modelo de negocio:** el interlocutor exige ROI cuantificado ANTES de ver la herramienta. No basta "alertar cuando falla" — hay que mostrar horas ahorradas y riesgo evitado. Esto cambia el pitch del Acuerdo de Piloto.

---

## Puntuación

| Dimensión | Nota | Justificación |
|---|---|---|
| Dolor real | **5/5** | Historia concreta, con costo cuantificado (4-5k USD), glosa y riesgo legal |
| Cantidad de activos | **5/5** | 350-400 sensores, 45 estaciones — muy por encima de 50 |
| Observabilidad actual (inv.) | **5/5** | Nube + SCADA + radio/SMS + Excel. Manual, reactivo, fragmentado |
| Accesibilidad del protocolo | **3/5** | Heterogéneo y propietario. Nube custom por TI, SCADA local, radio/SMS. No hay API/webhook confirmada |
| Presupuesto / autoridad | **3/5** | OPEX existe pero no partida de software. Dos niveles de aprobación, el alto llega a Gerente General |
| Disposición a pilotar | **4/5** | Abierto, se desahogó, dio 2 referidos. No pidió detalles concretos de la herramienta |
| **TOTAL** | **25/30** | |

---

## Referidos obtenidos

| Contacto | Cargo | Organización | Vertical |
|---|---|---|---|
| **Laura Gómez** | Coordinadora de Geotecnia | Empresa hidroeléctrica asociada | Hidroeléctrica |
| **Roberto** (apellido pendiente) | Jefe de mantenimiento | Mina El Roble | Minería |

Prometió enviar los correos por WhatsApp al salir de la llamada. **Dar seguimiento el mismo día o al siguiente.**

---

## ⚠️ Nota sobre el vertical — decisión pendiente, NO cerrar aún

El checklist de Fase 0 define tres verticales candidatas: **hidroeléctrica, minería, puerto**. Juan Carlos no encaja limpiamente en ninguna:

- **No es dueño de la infraestructura.** Habla de "el cliente" y de la "interventoría del cliente" — parece ser una **empresa de interventoría / consultancy de ingeniería** que monitorea obras de terceros (presas, túneles, taludes), no un operador hidroeléctrico.
- Si el piloto real es con una interventoría, el **ICP del Master Lean §4 no coincide** ("operador privado de infraestructura crítica"). Es un cliente distinto, posiblemente con más dolor (obra en construcción, presión contractual, glosas) pero también con menos autoridad y menos datos.
- El referido de **Roberto en la mina El Roble** sí es un operador-style, y ahí encaja mejor el perfil de "operación minera" (taludes, sismicidad inducida).

**RESUELTO 2026-10:** se abrió la **cuarta vertical** — *Interventoría / monitoreo geotécnico de obra*. Registrada en `ALERTA360_Project_Master.md` §0.1 y cargada en la matriz (`Interventoria_E1` = 25/30). Pendiente solo confirmar el nombre de la organización y el cargo exacto del entrevistado.

---

## Contraste con el MVP de Fase 1 (re-análisis 2026-10-03 contra la transcripción original)

### Validado (hipótesis del producto que esta entrevista confirma)

1. **El veto "falso saludable" es real y tiene precio.** Dos casos independientes (presa en Antioquia hace ~3 meses; talud en Antioquia en el puente de mayo): sensor "conectado" y en verde midiendo un valor congelado. Frase del cliente: *"El sistema te dice que está 'conectado', pero no te dice si lo que está midiendo tiene sentido físico."* El MVP ya detecta congelado (consistencia), stale (frescura/disponibilidad) y fuera de rango (calidad) — el diferenciador central está validado con costo directo (4-5k USD + glosa 5%).
2. **Alerting Capability responde a la pregunta que al cliente le da vergüenza.** "¿Qué % de su capacidad de monitoreo está disponible?" → llamada por él "nuestro mayor punto ciego operativo". El Capability% del MVP es exactamente esa métrica.
3. **Línea base de detección: 6–24 h** (2–4 h solo si la alerta automática funciona). Es el baseline contra el cual el piloto debe medir el "adelanto" (Master Lean §3.1).
4. **Hay ventana operativa para alertas push:** revisión a las 7 AM + llamadas manuales por radio/celular. Telegram es plausible, pero sigue **sin validar** — el Checklist de Levantamiento pregunta "canal preferido: Email/Telegram/Slack" y esta entrevista no lo cubrió.

### Brechas del MVP frente a los datos reales (corregir AL CERRAR Fase 0, no antes)

1. **Frescura fija incompatible con sensores horarios.** `HealthEvaluationService` escala la *disponibilidad* con `ExpectedIntervalSeconds`, pero la *frescura* (0-5/5-10 min) y la *ventana de comunicación* (30 min) son fijas. Con un piezómetro horario (caso real: "reportando cada hora"), frescura=0 y com=0 la mayor parte del tiempo → score hundido sin anomalía (≈75 = falso degradado) y oscilación tipo diente de sierra entre reportes. **Corrección:** frescura y ventana de comunicación proporcionales al intervalo.
2. **Ingesta SMS/radio no es HTTP/webhook.** Confirma la "capa adaptadora" prevista en Master §5, o enfocar el piloto primero en la fracción de la red con plataforma nube/SCADA expuesto.
3. **No existe estado "dormante"** (sensores en mantenimiento, declarados por el entrevistado) → sin él, el Capability% penaliza apagados voluntarios.
4. **Escala 20 → 350-400.** El MVP simula 20 activos; a escala real el Capability% debe declarar cobertura para no producir el mismo "85-90% a ojo de buen cubero" que el cliente describe como su dolor.
5. **"3 lecturas iguales → congelado"** asume muestreo denso; con intervalos horarios y resolución gruesa puede dar falsos congelados → umbral parametrizable por tipo/intervalo.

### Límites de este análisis

- **Solo 1 de 8 entrevistas.** El Protocolo exige 8 (4 verticales × 2) antes de comparar entre verticales. La E1 ya está cargada en la matriz; faltan 7.
- El scoring 25/30 se verificó contra la rúbrica; **Observabilidad 5/5 es discutible** (rúbrica 3 = "tienen algo con huecos": tienen plataforma nube que "funciona bastante bien" + SCADA). Se mantiene 5 por la fracción radio/SMS consolidada a mano, pero revisar al promediar verticales.

---

## Cita textual más reveladora

> *"El sistema te dice que está 'conectado', pero no te dice si lo que está midiendo tiene sentido físico. Y eso no hay dashboard estándar que te lo resuelva fácilmente hoy."*

## Riesgo u objeción mencionada

- Los datos críticos llegan por **SMS y radio** — un canal analógico que ningún software procesa. Limitación técnica dura para cualquier producto.
- La **heterogeneidad de activos** (profundidad vs. intemperie) contradice la premisa de "un único tipo de activo" del MVP.
- Budget approval exige ROI demostrado previamente a ver la herramienta.

---

## Pendientes de esta entrevista

- [ ] Confirmar organización y cargo exacto del entrevistado
- [ ] Recibir y registrar los contactos de Laura Gómez y Roberto (WhatsApp)
- [ ] Guardar la transcripción original (audio/notas) como respaldo de la cita textual
- [ ] Agendar entrevista #2 (mismo perfil o vertical hermano)
- [ ] Decidir el vertical en el registro de avance del Project Master §7
