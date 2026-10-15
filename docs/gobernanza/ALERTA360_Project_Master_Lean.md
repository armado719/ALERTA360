# ALERTA360 — Project Master Lean
**Alcance: Fase 1 — ALERTA360 Infrastructure Health**
*Versión de trabajo — septiembre 2026 (v0.3 — correcciones de numeración y consistencia)*

> Este documento cubre SOLO la Fase 1. Las fases 2–9 (auditoría avanzada, integración de fuentes, correlación, exposición, IA, orquestación, coordinación nacional) se mencionan únicamente como visión de largo plazo en la sección 11, y no deben influir en las decisiones de arquitectura ni de alcance de esta fase.

---

## 1. Resumen ejecutivo

**Qué es:** una plataforma de observabilidad especializada en infraestructura de sistemas de alerta temprana (sensores, estaciones, sirenas, telemetría, comunicaciones). Responde una sola pregunta: *¿está funcionando el sistema que debería avisarnos si ocurre una emergencia, ahora mismo?*

**Qué NO es (todavía):** un sistema de detección de emergencias, un motor de decisión, un canal de alertamiento ciudadano, ni una plataforma de coordinación interinstitucional.

**Para quién:** operadores de infraestructura crítica (inicialmente privados) que ya tienen sensores/sistemas de monitoreo propios y necesitan saber, de forma centralizada y confiable, si esa capacidad de monitoreo está sana.

**Por qué ahora:** porque es el componente de todo el análisis previo que no depende de gobernanza interinstitucional, marco legal de gestión del riesgo, ni autorización de terceros para operar — es observabilidad de sistemas propios del cliente.

---

## 2. Problema (y estado de validación)

**Hipótesis del problema:**
En algunos operadores de sistemas de alerta, la salud de la infraestructura se supervisa mediante herramientas fragmentadas, procesos manuales o mecanismos que no permiten conocer de forma consolidada la capacidad de monitoreo disponible en un momento determinado.

*(Redacción deliberadamente menos contundente que en versiones anteriores — afirmar "no tienen una vista centralizada y confiable" ya daba por probado algo que todavía no se ha validado con nadie. Se reemplaza por un problema demostrado en cuanto haya evidencia de campo, sección 4.1.)*

**Estado real de esta hipótesis: [PENDIENTE DE VALIDAR — sin confirmar con ningún cliente potencial todavía]**

Antes de continuar con arquitectura más allá del MVP, se necesita:
- [ ] **Mínimo 6 conversaciones** con candidatos a cliente (2 por vertical, ver sección 4 y el Protocolo de Validación de Campo) confirmando que este dolor existe y que hoy lo resuelven mal (manualmente, por llamadas, o no lo resuelven). *(Corregido: antes decía "al menos 3", desalineado con el Protocolo de Validación de Campo, que exige 2 por vertical = 6 mínimo. Este documento y el Protocolo deben coincidir siempre en este número.)*
- [ ] Confirmar si ya usan alguna herramienta de monitoreo/observabilidad genérica (Grafana, Zabbix, PRTG, SCADA propio) — si sí, la conversación cambia de "¿tienen este problema?" a "¿por qué lo que usan hoy no es suficiente?".

---

## 3. Alcance de la Fase 1 (MVP)

### Incluido
- Ingesta de telemetría de **un único tipo de activo** (sensores hidrométricos, estaciones meteorológicas, o sirenas). El tipo exacto se selecciona DESPUÉS de la validación de campo (sección 4.1), no antes — soportar varios tipos de activo desde el inicio son, en la práctica, tres problemas de integración distintos.
- Cálculo de un Health Score por activo y agregado
- Dashboard de estado (sin mapa todavía)
- Alertas técnicas por un solo canal (email o Telegram/Slack — no canal propio)
- Registro básico de eventos de infraestructura (caída, recuperación)

### Explícitamente fuera de alcance en esta fase
- Integración con IDEAM / SGC / UNGRD / SAT (Fase 3+)
- Correlación multi-fuente, exposición poblacional, apoyo a decisión, IA (Fase 4+)
- Canal de alertamiento ciudadano
- Mapa geoespacial / PostGIS
- RBAC avanzado, Zero Trust, gestión de secretos de nivel gubernamental
- Cualquier automatización que declare una emergencia o autorice una acción

---

## 4. Cliente objetivo (ICP) — Fase 1

**Perfil preferido:** operador privado de infraestructura crítica con presupuesto propio de gestión de riesgo/continuidad operacional y ciclo de decisión corto.

Candidatos a explorar EN PARALELO (no elegidos todavía — ver 4.1):
1. Hidroeléctrica (monitoreo de nivel de embalse / sensores de presa)
2. Operación minera (taludes, sismicidad inducida)
3. Puerto o terminal (sensores ambientales/operacionales)

**Cambio de criterio respecto a versiones anteriores:** el vertical del piloto NO se elige por intuición antes de hablar con nadie. Se elige por evidencia. Es posible, por ejemplo, que una hidroeléctrica ya tenga un SCADA sofisticado que resuelve este problema perfectamente bien, mientras que una minera pequeña con 50 sensores y gestión manual tenga el dolor real y accesible. No se sabe hasta preguntar en los tres frentes a la vez.

Explícitamente pospuesto para después del piloto: municipios, SAT públicos, entidades nacionales (ciclos de decisión más largos, procurement público).

### 4.1 Validación de campo — se hace ANTES de elegir vertical

Objetivo: conseguir conversaciones reales (no encuestas) con personas que operen infraestructura de monitoreo en los cuatro verticales candidatos a la vez (hidroeléctrica, minería, puerto, interventoría/monitoreo geotécnico de obra — el 4º abierto en 2026-10, ver Project Master §0.1), y elegir el vertical del piloto según quién muestre mayor dolor, mayor cantidad de activos, peor observabilidad actual, protocolos más accesibles, presupuesto y disposición real a pilotar.

**Meta mínima: 2 conversaciones por vertical = 6 en total** (coincide con el Protocolo de Validación de Campo — ver sección 2, este número no debe divergir entre documentos).

Preguntas guía (nunca preguntar directamente "¿le gustaría ALERTA360?" — eso induce la respuesta; se busca entender cómo trabajan hoy):
- ¿Cuántos sensores/estaciones tienen?
- ¿Cómo saben hoy que uno falló? ¿Cuánto tardan en enterarse?
- ¿Quién recibe la alerta y con qué herramienta (Grafana/Zabbix/SCADA/ThingsBoard/ninguna)?
- ¿Qué es lo que esa herramienta actual NO les resuelve?
- ¿Han tenido sensores transmitiendo datos incorrectos o congelados? ¿Cómo lo detectan?
- ¿Llevan historial de fallas? ¿Pueden saber su capacidad de monitoreo actual en un momento dado?
- ¿Cuánto les cuesta (en plata o en riesgo) una falla no detectada a tiempo?
- ¿Quién tendría autoridad para comprar algo así?
- **Pregunta clave:** "Cuénteme la última vez que un sensor o sistema de monitoreo falló y se dieron cuenta tarde. ¿Qué pasó?"

**Esto es un gate del proyecto, no un paso más de una lista:**

```
ALERTA360
    │
    ▼
VALIDACIÓN DE CAMPO
    │
┌───┼───┐
▼   ▼   ▼
Minería Hidro Puerto
    │
    ▼
EVIDENCIA COMPARABLE
    │
    ▼
VERTICAL SELECCIONADO
    │
    ▼
ACTIVO SELECCIONADO
    │
    ▼
PROTOCOLO CONFIRMADO
    │
    ▼
MVP REAL
```

Hasta llegar al último punto (protocolo confirmado), no se desarrolla producto.

---

## 5. Modelo de negocio (hipótesis, no decidido)

**[PENDIENTE — no asumir ninguno de estos hasta hablar con el ICP]**
- Opción A: SaaS por número de activos monitoreados
- Opción B: Servicio gestionado con soporte incluido
- Opción C: Proyecto de implementación + suscripción de mantenimiento

No se fija modelo de precios hasta validar con al menos un cliente piloto real qué presupuesto y bajo qué figura contractual compraría esto.

---

## 6. Arquitectura funcional (Fase 1)

```
Activo (sensor/estación/sirena)
        │
        ▼
Ingesta de telemetría (webhook / MQTT / polling)
        │
        ▼
Normalización mínima (timestamp, id de activo, valor, estado)
        │
        ▼
Motor de Health Score (multidimensional — ver sección 9)
   - disponibilidad, frescura, calidad, consistencia, comunicación
   - detección de datos estancados/anómalos ("falso saludable")
        │
        ▼
Agregación → Alerting Capability (ver sección 9.1)
        │
        ▼
Almacenamiento (histórico + estado actual)
        │
        ├──► Dashboard (Health Score por activo + Alerting Capability agregada + histórico)
        │
        └──► Notificador (alerta técnica por email/Telegram cuando cambia de estado)
```

**Principio de diseño no negociable:** si ALERTA360 cae, el sistema de monitoreo original del cliente (si existe) sigue funcionando exactamente igual. ALERTA360 nunca es punto único de falla del sistema que supervisa.

---

## 7. Arquitectura técnica (Fase 1 — deliberadamente simple)

| Componente | Elección MVP | Nota |
|---|---|---|
| Backend | ASP.NET Core (C#) | Reutiliza lo que ya conoces |
| Base de datos | PostgreSQL | Sin PostGIS todavía — no hay mapa en Fase 1 |
| Ingesta | Webhook HTTP + soporte MQTT si el activo lo requiere | Confirmar protocolo real del cliente piloto antes de decidir (ver sección 10) |
| Cola/mensajería | Ninguna todavía | RabbitMQ se agrega solo si el volumen lo justifica |
| Tiempo real | Polling simple en el dashboard | SignalR se agrega solo si el cliente pide vista en vivo |
| Frontend | TypeScript + Vite (sin framework) | Dashboard simple, sin mapa |
| Auth | Autenticación estándar + cifrado en tránsito/reposo | RBAC granular y Zero Trust se posponen a cuando haya múltiples clientes/instituciones |
| Infraestructura | Docker + un solo entorno | CI/CD básico, sin necesidad de alta disponibilidad multi-región todavía |

**Deliberadamente NO incluido en Fase 1 (a menos que se justifique, ver nota):** Redis, RabbitMQ, SignalR, PostGIS, OAuth2/OIDC completo — se evalúan cuando exista más de un cliente o el volumen de datos lo justifique.

**Nota sobre OpenTelemetry — distinción importante:** no se descarta por la misma razón que el resto de la lista. Hay dos observabilidades distintas y no deben confundirse:

```
Observabilidad del CLIENTE          Observabilidad de ALERTA360
sensores / estaciones / sirenas          API / backend / DB / ingesta
        │                                        │
        ▼                                        ▼
   → ALERTA360 (esto SÍ es el producto)     → logs / métricas / traces (esto es para saber
                                               si nuestro propio sistema está sano)
```

OpenTelemetry no forma parte del MVP salvo que, durante la validación técnica, se identifique una necesidad concreta de observar el propio backend de ALERTA360 (no los sensores del cliente). No montar una plataforma de observabilidad enorme para nosotros mismos, pero sí saber si nuestro sistema está funcionando.

---

## 8. Principios arquitectónicos del MVP

*(Renumerado: antes aparecía como "7.1", al mismo nivel que la sección 7 de la que dependía — se corrige aquí como sección propia, y todo lo siguiente se desplaza en consecuencia.)*

1. **Fail-safe** — ALERTA360 no puede impedir ni retrasar el funcionamiento del sistema original del cliente.
2. **Read-mostly** — inicialmente ALERTA360 observa, no controla los activos.
3. **Evidencia antes que inferencia** — cada estado debe poder explicarse con datos observables. Ejemplo: si el dashboard muestra `🔴 Sensor 17 — Crítico`, debe poder responder con: última transmisión (14:32:07), intervalo esperado (60 s), tiempo sin dato válido (18 min), si hay datos congelados (sí/no), estado de comunicación.
4. **No caja negra** — el operador debe poder entender por qué cambió el Health Score, no solo verlo cambiar.
5. **Degradación controlada** — si falla un componente de ALERTA360, se degrada ALERTA360, no el sistema supervisado (refuerza el principio de la sección 6).
6. **Evolución incremental** — no introducir componentes distribuidos (colas, cache, tiempo real) hasta que una necesidad real y observada los justifique.

---

## 9. Health Score — definición multidimensional (no un solo número ingenuo)

Estructura conceptual de las dos métricas de esta fase (se detallan en 9 y 9.1):

```
                    ALERTA360
                        │
             ┌──────────┴──────────┐
             ▼                     ▼
      Infrastructure Health   Alerting Capability
             │                     │
      ¿Cómo está el activo?  ¿Qué capacidad de
                              alerta queda disponible?
```

**Definición conceptual (v0.2 — reemplaza el cálculo de un solo criterio):**

```
Health = f(Disponibilidad, Frescura, Calidad, Consistencia, Comunicación)
```

| Dimensión | Qué mide |
|---|---|
| Disponibilidad | ¿está transmitiendo? |
| Frescura | ¿cuándo transmitió por última vez? |
| Calidad | ¿el dato recibido es válido? |
| Consistencia | ¿el comportamiento del dato tiene sentido en el tiempo? |
| Comunicación | ¿la conexión presenta degradación? |

**Solape conceptual identificado y su resolución (pendiente de cerrar con datos reales, pero con regla de prioridad ya definida):**
Disponibilidad, Frescura y Comunicación pueden pisarse entre sí (los tres, en el fondo, hablan de si el dato está llegando). La regla de prioridad cuando se contradicen:
- Si **Disponibilidad = verde** pero **Consistencia = rojo** → el estado final es `⚠️ DATOS NO CONFIABLES`, nunca `🟢 saludable`. Consistencia y Calidad tienen prioridad de veto sobre Disponibilidad/Frescura — un activo "conectado pero mintiendo" nunca puede mostrarse como sano.
- **Comunicación** se trata como causa raíz, no como síntoma: si Comunicación está degradada, puede explicar por qué Disponibilidad/Frescura bajaron, y el mensaje al operador debe decir "comunicación degradada" en vez de simplemente "sensor caído" (principio de no caja negra, sección 8).
- **No se congelan pesos numéricos de `f()` todavía.** Se congelan solo después de tener la ficha técnica real del activo elegido (sección 10) — antes de eso, cualquier peso sería inventado.

Bandas orientativas (NO fijadas — deben salir de las características del activo real del piloto):
- 100 → saludable
- 80–99 → degradación leve
- 60–79 → degradación importante
- 0–59 → crítico

**Riesgo identificado y que debe mitigarse desde el diseño ("falso saludable"):**
Un sensor puede seguir "transmitiendo" (Disponibilidad y Comunicación en verde) pero con datos congelados o corruptos (Calidad/Consistencia en rojo). El health score NO puede basarse solo en "¿llegó un dato reciente?" — por eso la regla de prioridad de arriba existe. Esto es justamente lo que separa *Device Monitoring* (¿está conectado?) de *Alert Infrastructure Health* (¿lo que reporta es confiable?):

> Sensor 17 está transmitiendo correctamente.  ← insuficiente
> Sensor 17 está operativo y su comportamiento indica que la capacidad de monitoreo asociada está disponible.  ← el estándar real
> El 15 de septiembre a las 02:37 el sistema detectó degradación 18 minutos antes de que el operador la identificara.  ← ahí aparece el producto

Ejemplo de estado que el sistema debe poder distinguir y mostrar explícitamente:
`⚠️ SENSOR OPERATIVO — DATOS NO CONFIABLES` (distinto de `🔴 SENSOR OFFLINE`)

**[PENDIENTE: definir umbrales numéricos concretos por dimensión y por tipo de activo — depende del vertical elegido tras la validación de campo, sección 4.1]**

### 9.1 Segunda métrica, separada del Health Score por activo: Alerting Capability Score

No basta con saber cómo está cada activo individual. La pregunta más cercana al problema original que dio origen a ALERTA360 es otra:

> ¿Cuánta capacidad real de alerta tengo disponible en este momento?

**Definición formal y su límite explícito (importante para no sobre-prometer):**
El Alerting Capability Score representa la capacidad técnica disponible del conjunto de infraestructura supervisada para producir y transmitir información útil al sistema de monitoreo del cliente. **NO significa que ALERTA360 sepa si una emergencia real puede ser detectada** — significa únicamente: "según los activos y componentes que estamos supervisando, ¿qué porcentaje de la capacidad técnica configurada está disponible ahora mismo?". Mantener esta distinción evita que el producto haga una afirmación más grande de la que puede sostener.

**Corrección de una contradicción con la sección 3:** el ejemplo original de esta métrica (92% de salud técnica con solo 61% de capacidad efectiva porque las sirenas fallan) asume dos tipos de activo distintos (sensores + sirenas), pero la sección 3 fija el MVP en **un único tipo de activo**. Con un solo tipo de activo, Alerting Capability no puede depender de heterogeneidad de tipos — se resuelve así para esta fase:

> **Alerting Capability en Fase 1 (un solo tipo de activo) = promedio ponderado por criticidad operativa entre activos del mismo tipo**, no un contraste entre categorías distintas de infraestructura. Ejemplo válido para el MVP: de 20 sensores del mismo tipo, los 5 ubicados en puntos críticos de la operación pesan más en el agregado que los 15 restantes — así el score puede caer por debajo del promedio simple de salud si justamente los sensores críticos son los degradados, sin necesitar sirenas ni un segundo tipo de activo.

El ejemplo multi-tipo (sensores + sirenas + comunicaciones, con el contraste 92% vs. 61%) queda reservado como visión válida para cuando el proyecto soporte más de un tipo de activo (Fase 2 en adelante) — no se usa como ejemplo de Fase 1 para evitar prometer algo que el alcance actual no cubre.

**[PENDIENTE: definir qué hace "crítico" a un activo dentro del mismo tipo — depende del vertical y cliente piloto reales]**

---

## 10. Viabilidad técnica de integración

**[PENDIENTE DE INVESTIGAR — no asumido]**
- Confirmar protocolo real de los sensores/estaciones del cliente piloto (Modbus, SDI-12, telemetría propietaria GPRS/satelital, o ya expone API/webhook).
- Si el protocolo es antiguo o propietario, puede requerirse un gateway de hardware intermedio — esto cambia el esfuerzo y el costo del piloto y debe confirmarse ANTES de comprometer una fecha de entrega.

### 10.1 Estimaciones operativas pendientes (no se puede dimensionar el piloto sin esto)

> Fuente única para responder estas 4 preguntas: `docs/fase0-validacion-campo/ALERTA360_Checklist_Levantamiento_Tecnico.md` §5 (una ficha por piloto). No duplicar aquí.

Estas preguntas deben responderse con datos del cliente piloto real, antes de comprometer una arquitectura de despliegue definitiva:

- **Volumen esperado:** cantidad de activos × frecuencia de transmisión = lecturas por segundo/minuto estimadas. Sin esto no se sabe si "sin cola de mensajería" (sección 7) sigue siendo válido.
- **Retención de datos:** ¿cuánto tiempo se conserva el histórico crudo (`TelemetryReading`) vs. solo los snapshots de Health Score agregados?
- **SLO ingesta → dashboard:** ¿en cuánto tiempo debe reflejarse en el dashboard una lectura recién ingresada? Define si el polling simple de la sección 7 es suficiente o si se necesita algo más rápido.
- **Costo de infraestructura del piloto:** estimado aproximado de hosting/DB/dominio para la duración del piloto, para no descubrirlo a mitad de camino.

---

## 11. Visión de largo plazo (NO parte del compromiso de esta fase)

Fases 2–9 (auditoría avanzada, integración de fuentes IDEAM/SGC/SAT, correlación, exposición e impacto, IA como apoyo, apoyo operacional, interoperabilidad avanzada, escalamiento) se mantienen como visión a evaluar únicamente si la Fase 1 demuestra valor con un cliente real. No se diseña ni se menciona en el pitch inicial al cliente piloto — se reserva para conversaciones con inversionistas que pregunten "¿y después qué?".

---

## 12. Riesgos abiertos (sin resolver, no ignorar)

- Sin validación de cliente real → mayor riesgo del proyecto, por encima de cualquier riesgo técnico.
- **Competencia real a vencer: no es "no tener herramienta", es "¿por qué no instalo Grafana + Zabbix + MQTT y listo?"** — esa es la pregunta que hará un cliente potencial informado, y "porque está especializado en alerta temprana" es una respuesta débil. La diferenciación tiene que demostrarse con la cadena semántica Activo → Estado técnico → Capacidad de alerta → Degradación → Evidencia → Tiempo de detección → Recuperación → Historial (sección 9) y con la métrica de Alerting Capability (sección 9.1), que una herramienta de observabilidad genérica no calcula de fábrica.
- Protocolo de integración real del piloto, desconocido hasta hoy.
- Modelo de precios y de contratación, sin validar.
- Estimaciones operativas (volumen, retención, SLO, costo — sección 10.1) sin resolver: no se puede prometer un plazo de entrega firme sin esto.

---

## 13. Criterios de éxito del piloto

*(Endurecido respecto a la versión anterior — "detectó una vez" era anecdótico y sin línea base de comparación. Ahora incluye lead-time, falsos positivos y uptime propio.)*

El piloto se considera exitoso si, durante su duración, se cumplen TODOS los siguientes:

1. **Detección con adelanto medible:** al menos un caso real donde ALERTA360 notificó una degradación con **`[PENDIENTE: definir X minutos]` de adelanto** respecto al tiempo que el cliente hubiera tardado con su método actual (la propia entrevista de validación de campo, Bloque 4, da la línea base real de comparación — no se inventa un número antes de tener ese dato).
2. **Tasa de falsos positivos controlada:** `[PENDIENTE: definir umbral, ej. menos de N falsas alarmas técnicas por semana]` — un sistema que grita demasiado seguido pierde confianza del operador tan rápido como uno que no avisa.
3. **Cero incidentes del cliente causados por caída de ALERTA360** — verifica en la práctica el principio fail-safe (sección 8).
4. **El operador puede explicar sin ayuda externa** por qué el sistema marcó un activo como degradado, usando la información que el propio dashboard le da (verifica el principio "no caja negra", sección 8).

**[PENDIENTE: cerrar los valores numéricos de 1 y 2 junto con el cliente piloto antes de firmar el Acuerdo de Piloto, no de forma unilateral]**

---

## Próximos pasos inmediatos (antes de escribir código)

1. **Validación de campo primero, vertical después** (sección 4.1): mínimo 6 conversaciones reales (2 por vertical), guiadas por la pregunta clave ("cuénteme la última vez que un sensor falló y se dieron cuenta tarde"), no por preguntas que induzcan la respuesta.
2. Con esa evidencia, elegir el vertical del piloto según dolor real, cantidad de activos, mala observabilidad actual y disposición a pilotar — no por intuición.
3. Confirmar protocolo técnico real de los sensores/estaciones de ese cliente (sección 10), junto con las estimaciones operativas de la sección 10.1.
4. Con esas respuestas, cerrar la regla de prioridad y umbrales numéricos del Health Score (sección 9), definir la fórmula de criticidad de Alerting Capability (sección 9.1), y el stack final de ingesta (sección 7).
5. Cerrar los valores numéricos de los criterios de éxito (sección 13) junto con el cliente, antes de firmar el Acuerdo de Piloto.

**Encuadre de fondo (no cambia la arquitectura, cambia la actitud del equipo):** este documento no describe todavía "una plataforma que vamos a desarrollar". Describe una hipótesis de producto. El orden correcto es dolor validado → usuario → activo → protocolo → datos → Health Score → MVP → piloto — no al revés.
