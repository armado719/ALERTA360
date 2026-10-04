# ALERTA360 — Riesgos detectados en Entrevista #1

*Generado 2026-10 tras la primera entrevista (25/30). Cada riesgo tiene: qué pasó, por qué importa, opciones con recomendación, y qué decisión dispara cuál.*

**Estado: los 3 están ABIERTOS — requieren decisión del equipo, no se resuelven solos.**

---

## Riesgo 1 — El vertical del checklist no coincide con el cliente real

### Qué pasó

La entrevista se hizo con un perfil que no encaja en los tres verticales del checklist de Fase 0 (hidroeléctrica, minería, puerto).

Señales en la transcripción:
- Habla de *"el cliente"* y de *"la interventoría del cliente"* — no es dueño de la infraestructura.
- Monitorea obras de terceros: presas de tierra y enrocado, túneles de conducción/desviación, taludes críticos.
- Se define como *"sponsor técnico"* — especifica y justifica, pero no firma compras.
- Las decisiones las toma el Gerente de Proyectos / Director de Operaciones, y sobre 10-15k USD el Gerente General.

**Lectura:** probablemente es una empresa de interventoría / consultancy de ingeniería geotécnica, o una operación de monitoreo por contrato.

### Por qué importa

El Project Master Lean §4 define el ICP como *"operador privado de infraestructura crítica con presupuesto propio de gestión de riesgo"*. Una interventoría:

| | Operador (ICP del Master) | Interventoría (el cliente real) |
|---|---|---|
| Motivo de compra | Riesgo operacional, responsabilidad legal | Penalización contractual (glosas), reputación ante el cliente final |
| Acceso a datos | Dueño del activo y del dato | Dueño del activo NO; del dato, solo lo que le contratan |
| Autoridad de decisión | Más cerca del activo | Sponsor técnico ≠ comprador |
| Dolor | Alto y continuo | Alto y **puntual** (por obra/contrato) |
| Permanencia | Alta | Baja — termina con el contrato |

El dolor es real y grande, pero el **modelo de negocio cambia por completo**: no es SaaS por activos, es algo ligado a contratos de interventoría, probablemente por obra.

### Opciones

**Opción A — Mantener los 3 verticales y registrar esta entrevista bajo "Hidroeléctrica"**
- ✅ No toca el governance. La matriz se llena.
- ❌ Es una clasificación forzada. El Project Master dice que el vertical se elige **por evidencia**, no por conveniencia. Etiquetar un consultor como hidroeléctrica es exactamente el error que el Master dice evitar.
- Riesgo: se construye el MVP para un cliente que quizá no existe.

**Opción B — Abrir una 4ª vertical: "Interventoría / monitoreo geotécnico de obra"** ✅ RECOMENDADA
- ✅ Reconoce la realidad del primer cliente real sin forzar la clasificación.
- ✅ Es un nicho coherente y con dolor demostrado (glosas, presión de entrega, riesgo de responsabilidad profesional).
- ⚠️ Obliga a actualizar el checklist de salida de Fase 0 (3 verticales → 4) y la logística de outreach (8-10 contactos por vertical → también para esta).
- ⚠️ Menos contactos disponibles y ciclo de decisión más lento.

**Opción C — Descartar esta entrevista y buscar un operador puro**
- ✅ Mantiene el ICP del Master intacto.
- ❌ Tarda meses y tiraaway evidencia de dolor genuino ya capturada.
- ❌ Puede ser la respuesta de miedo, no la correcta.

### Recomendación

**Opción B.** Cambiar el checklist de fases por una entrevista real de buena calidad es exactamente para lo que existe el governance. Documentar el cambio, no silenciarlo.

**Decisión requerida:** ¿cuál de las 3?

---

## Riesgo 2 — La heterogeneidad de activos rompe la premisa del MVP

### Qué pasó

El Master Lean §3 fija el MVP en **un único tipo de activo**, con el argumento explícito: *"soportar varios tipos de activo desde el inicio son, en la práctica, tres problemas de integración distintos"*.

El cliente tiene, según su propia descripción:
- **Piezómetros** (~70% de la red) — nivel de agua y presión de poros
- **Inclinómetros y extensómetros** — deformación y desplazamiento
- **Geófonos** — sismicidad y vibración
- **Sensores de filtración y temperatura** — caudal y temperatura del agua

Su frase: *"No es lo mismo un sensor enterrado a 40 metros de profundidad en una presa, que uno a la intemperie en un talud."*

Y su infraestructura es heterogénea también en el transporte: nube ThingsBoard-like, SCADA local, y **radio/SMS**.

### Por qué importa

Es el riesgo técnico más serio de los tres. La arquitectura de Fase 1 asume:
- Un intervalo de transmisión uniforme
- Un formato de payload único
- Una regla de "dato congelado" única (X lecturas iguales = sospechoso)
- Rangos plausibles (min-max) por tipo de sensor

Ninguno de esos cuatro aplica igual a un piezómetro (que transmite cuando cambia la presión, no cada minuto) y a un inclinómetro (que se mueve en milímetros al mes). **Congelado** significa cosas distintas: en un inclinómetro, un valor constante durante 15 días es lo normal, no una falla.

Si se construye el MVP para un solo tipo y el cliente real tiene cuatro, el Health Score va a marcar "DataUnreliable" sensores que están perfectamente sanos. Eso es el peor resultado posible: un producto que grita falso positivo, justo lo que el Master Lean §13.2 dice que destruye la confianza del operador.

### Opciones

**Opción A — Mantener "un solo tipo" y fijar piezómetro como el activo del MVP** ✅ RECOMENDADA como camino, pero con corrección de premisas
- ✅ Respeta el Master Lean §3.
- ✅ Piezómetros son el 70% de la red — máximo alcance con mínimo esfuerzo.
- ⚠️ **Requiere corregir dos cosas** que hoy están mal y que la entrevista demostró:
  1. La detección de "congelado" debe ser **por tipo de activo**, no global. Un umbral de lecturas idénticas que funciona para presión de poros es falso positivo puro para desplazamiento.
  2. El intervalo esperado debe ser **por activo y por contexto** (lluvia, mantenimiento, modo dormido). El cliente ya tiene sensores en "dormiente" que un umbral fijo marcaría como caídos.
- El concepto de "activo" en Fase 1 probablemente necesita un atributo de perfil de medición.

**Opción B — Soportar multi-tipo desde el inicio**
- ❌ Contradice explícitamente el Master Lean §3. Solo justificable si el piloto lo exige, y aquí todavía no se sabe.

**Opción C — Preguntarle al cliente en la siguiente entrevista cuál asset le duele más**
- ✅ Es lo que dice el Master §4.1 paso 4: elegir activo por evidencia.
- ⚠️ No resuelve el problema técnico, solo lo pospone. Pero es barato y se puede hacer junto con la decisión del Riesgo 1.

### Recomendación

**Opción A, pero convertir el Riesgo 2 en el objetivo de la Entrevista #2.** La pregunta técnica que responde todo: *"si tuvieras que resolver solo un tipo de sensor primero, ¿cuál te habría evitado el incidente del talud?"* — y si la respuesta es "ninguno, el que nos habría avisado es el que detecta cuándo un sensor está mintiendo, sin importar el tipo", eso abre una vía mejor que el piezómetro.

Esa segunda formulación es interesante: el cliente no pide "vigilar piezómetros". Pide "vigilar que lo que me reportan es confiable". Si la próxima entrevista confirma esa formulación, el motor de Health Score debe ser **por dimensiones de calidad** (frescura, plausibilidad, consistencia) y **el tipo de sensor entra como parámetro del perfil**, no como una arquitectura distinta. Eso resolvería la heterogeneidad sin violar el MVP.

**Decisión requerida:** ¿fijamos piezómetro como activo del MVP ahora, o lo decidimos después de la Entrevista #2?

---

## Riesgo 3 — El presupuesto exige ROI demostrado antes de ver la herramienta

### Qué pasó

- **No existe partida específica** para software de monitoreo de la salud de sensores. Hay OPEX general "Mantenimiento y Operaciones" por proyecto.
- **Dos niveles de aprobación:** Gerente de Proyectos / Director de Operaciones si es **< 10-15k USD**; Comité de Compras + Gerente General si lo supera.
- **Requisito explícito:** *"No basta con decir 'es una herramienta moderna'. Tenemos que demostrar con números cuántas horas-hombre de revisiones innecesarias nos ahorra o, más importante aún, cuánto riesgo de multa, retrabajo o daño reputacional nos evita."*

Datos disponibles del incidente:
- 4.000 – 5.000 USD por evento de 3 días (sin que hubiera deslizamiento real)
- 1.500 – 2.000 USD de movilización de urgencia
- 20 – 30 horas-hombre de ingeniería
- 6 – 24 horas de tiempo de detección promedio
- ~350-400 sensores, 45 estaciones

### Por qué importa

El Project Master Lean §5 dice que el modelo de precios está **[PENDIENTE — no asumir ninguno hasta hablar con el ICP]**. Esta entrevista ya dio la primera señal dura, y no es la que el MVP asume.

**El MVP asume SaaS por número de activos.** Pero este cliente:
- Compra por proyecto, no por infraestructura.
- Pide justification con números, no una demo.
- Tiene umbral de aprobación alto: si superas 10-15k USD, el Gerente General entra y el ciclo se alarga.

Si el modelo de precios del MVP es incompatible con esto, no es un detalle comercial — es un hallazgo de diseño que hay que capturar ahora, no después de construir.

### Opciones

**Opción A — Registrar el dato y no actuar todavía** ✅ RECOMENDADA
- ✅ Es **una** entrevista. El Master §5 dice que no se fija modelo hasta validar con el ICP, y un dato aislado no es validación.
- ✅ La Entrevista #2 (o la de Roberto en la mina) va a decir si el umbral de 10-15k y la exigencia de ROI son comunes al sector o propio de este cliente.
- ⚠️ Con una sola fuente, no se puede construir el caso ROI todavía.

**Opción B — Empezar a construir el modelo ROI ahora con estos números**
- ⚠️ Tentador porque los datos son buenos y la historia es convincente.
- ❌ Sería exactamente el error que el Project Master previene: diseñar con datos hipotéticos de un solo cliente antes de validar. Peor: inventar cifras que luego no se sostienen frente a un gerente.
- Lo que sí se puede hacer: registrar que el **ROI calculable con datos reales existe** y que hay que construirlo como entregable del piloto.

**Opción C — Cambiar el modelo de negocio a venta por proyecto / consulting**
- ❌ Sin evidencia suficiente. Una entrevista no invalida una hipótesis.

### Recomendación

**Opción A: registrar, no actuar.** Anotar en el Lean §5 que apareció la primera señal de modelo de negocio (umbral de aprobación por monto, exigencia de ROI previo a la demo, compra por proyecto), y que se validate con al menos una entrevista más del mismo sector.

**Acción concreta que sí vale:** agregar al **Checklist de Levantamiento Técnico** (o al Acuerdo de Piloto) un apartado de **cifras base del cliente** que el piloto debe llenar antes de empezar. No para vender, sino para que al final del piloto exista el número que el cliente exigía. Si el piloto no produce ese número, el piloto falló aunque el software funcione.

---

## Resumen — las 3 decisiones abiertas

| # | Riesgo | Recomendación | Para decidir necesitas |
|---|---|---|---|
| 1 | Vertical no coincide con el ICP del Master | **Abrir 4ª vertical** (interventoría / monitoreo geotécnico de obra) y documentar el cambio | Confirmar organización de Juan Carlos (¿quién lo contrató? ¿a quién le responde?) |
| 2 | Heterogeneidad de activos rompe "un solo tipo" | **Fijar piezómetro** (70% de la red) + corregir umbrales por tipo; reformular la pregunta al cliente en la Entrevista #2 | Respuesta del cliente a "¿un solo sensor primero, cuál?" |
| 3 | Presupuesto exige ROI previo | **Registrar, no actuar.** Agregar "cifras base del cliente" al entregable del piloto | Una entrevista más del mismo sector |

---

## Nota de alcance

Este documento **no cambia** el Project Master ni su checklist de salida. Es un registro de hallazgos y recomendaciones. Cualquier cambio de governance (ej. abrir la 4ª vertical) debe hacerse en `ALERTA360_Project_Master.md` §Fase 0 y registrarse en §7, con la decisión explícita de que se acepta consciente.

**No aparece código nuevo por este documento.** El Project Master es explícito: sin Fase 0 cerrada, los documentos de Fase 1+ son plantillas hipotéticas. Este es un registro de evidencia de campo, que es lo que la Fase 0 pide.
