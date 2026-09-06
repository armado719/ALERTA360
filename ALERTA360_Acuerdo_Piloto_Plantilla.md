# ALERTA360 Infrastructure Health — Acuerdo de Piloto
*Plantilla con placeholders — mismo estado que la Especificación Funcional y la Arquitectura Técnica: se completa y firma SOLO cuando el vertical, activo, protocolo y cliente piloto estén confirmados por validación de campo real.*

> Este documento no reemplaza asesoría legal. Es un marco de entendimiento operativo para alinear expectativas antes de invertir esfuerzo de desarrollo; para un piloto con compromisos económicos formales, conviene que un contrato revise la versión final.

---

## 1. Partes

- **ALERTA360** (equipo de desarrollo), representado por `[NOMBRE]`.
- **Cliente piloto:** `[CLIENTE_PILOTO]`, representado por `[CONTACTO_AUTORIDAD]` (la persona con autoridad de decisión identificada en la validación de campo, Protocolo sección 1).

---

## 2. Objeto del piloto

Validar, con datos reales de `[CLIENTE_PILOTO]`, si ALERTA360 Infrastructure Health detecta degradaciones en su infraestructura de monitoreo (`[TIPO_ACTIVO]`) de forma más temprana y confiable que sus métodos actuales.

**Esto NO es todavía:** una compra, una licencia comercial, ni un compromiso de continuidad más allá del piloto. Es una prueba acotada para generar evidencia mutua.

---

## 3. Alcance del piloto

**Incluido:**
- Monitoreo de `[CANTIDAD_ACTIVOS_PILOTO]` activos de tipo `[TIPO_ACTIVO]`
- Health Score por activo + Alerting Capability agregado
- Notificaciones por `[CANAL_NOTIFICACION]`
- Dashboard de acceso para `[CLIENTE_PILOTO]`

**Explícitamente fuera del piloto** (recordatorio, hereda del Project Master sección 3):
- Otros tipos de activo fuera de `[TIPO_ACTIVO]`
- Integración con fuentes gubernamentales (IDEAM/SGC/UNGRD/SAT)
- Cualquier automatización de decisión o autorización
- Soporte 24/7 garantizado (a menos que se negocie explícitamente para el piloto)

---

## 4. Duración

**Plazo del piloto: `[PENDIENTE — sugerido 6-8 semanas]`**, contado desde que `[CLIENTE_PILOTO]` entrega acceso real a la telemetría (ver sección 5). No desde la firma del acuerdo — el reloj del piloto no debería correr mientras se resuelve el acceso técnico.

---

## 5. Compromisos de `[CLIENTE_PILOTO]`

- Proporcionar acceso a telemetría real de `[CANTIDAD_ACTIVOS_PILOTO]` activos, en el protocolo confirmado (`[PROTOCOLO_TELEMETRIA]`), dentro de `[PENDIENTE: plazo razonable, ej. 1-2 semanas desde la firma]`.
- Designar un punto de contacto técnico disponible para resolver dudas de integración durante el piloto.
- Usar el dashboard/notificaciones de forma real (no solo como demo) para que la evidencia del piloto sea válida.
- Dar retroalimentación honesta al cierre del piloto, incluyendo si NO resolvió el problema.

## 6. Compromisos de ALERTA360

- Entregar el MVP funcional descrito en la Especificación Funcional dentro de `[PENDIENTE: plazo de desarrollo, ej. 3-4 semanas desde acceso a datos]`.
- No usar los datos de `[CLIENTE_PILOTO]` para ningún fin fuera del piloto sin autorización explícita (ver sección 8).
- Mantener el principio fail-safe: si ALERTA360 falla, el monitoreo actual de `[CLIENTE_PILOTO]` no se ve afectado.
- Documentar y compartir con `[CLIENTE_PILOTO]` cualquier incidente detectado durante el piloto, con evidencia (principio "no caja negra").

---

## 7. Criterio de éxito del piloto (definir junto con el cliente, no unilateralmente)

*(Alineado con el criterio endurecido del Project Master Lean, sección 13 — no la versión anecdótica de "detectó una vez", que quedó descartada por no tener línea base de comparación ni contemplar falsos positivos.)*

**El piloto se considera exitoso si, durante su duración, se cumplen TODOS los siguientes:**

1. **Detección con adelanto medible:** al menos un caso real donde ALERTA360 notificó una degradación con `[PENDIENTE: X minutos, a definir con el cliente]` de adelanto respecto al método actual de `[CLIENTE_PILOTO]` — usando como línea base el caso histórico relatado en la entrevista de validación de campo (Protocolo, Bloque 4), no un número inventado.
2. **Tasa de falsos positivos controlada:** `[PENDIENTE: umbral a definir, ej. menos de N falsas alarmas técnicas por semana]`.
3. **Cero incidentes de `[CLIENTE_PILOTO]` causados por caída de ALERTA360** (verifica el principio fail-safe, sección 6).
4. **`[CONTACTO_AUTORIDAD]` (u otro operador designado) puede explicar sin ayuda externa** por qué el sistema marcó un activo como degradado, usando solo la información del dashboard.

**Preguntas a resolver con el cliente antes de fijar los valores numéricos de 1 y 2:**
- ¿Qué cuenta como "detección temprana con valor" para ellos específicamente? (esto varía mucho según el vertical)
- ¿Cuál es el caso de falla histórica (Protocolo, Bloque 4) que se usará como vara de comparación directa para el adelanto de detección?
- ¿Quién de su lado certifica que los 4 criterios se cumplieron?

---

## 8. Datos y confidencialidad

- Los datos de telemetría de `[CLIENTE_PILOTO]` se usan exclusivamente para el funcionamiento del piloto.
- `[PENDIENTE: definir si se requiere acuerdo de confidencialidad (NDA) formal — probable que sí si el cliente considera sensible la ubicación/estado de su infraestructura crítica]`.
- Al finalizar el piloto, se acuerda si los datos se eliminan, se anonimizan, o se conservan para análisis conjunto — **no asumir ninguna opción por defecto**.

---

## 9. Qué pasa al terminar el piloto

Tres desenlaces posibles, a decidir según el resultado (sección 7):

1. **Éxito confirmado** → se negocia transición a relación comercial (modelo de negocio aún sin definir, Project Master sección 5).
2. **Resultado mixto** → se define si se extiende el piloto, se ajusta alcance, o se cierra sin continuar.
3. **No se cumplió el criterio** → se cierra el piloto sin compromiso adicional; ambas partes documentan aprendizajes. Esto es un resultado válido, no un fracaso del proceso — es exactamente para lo que sirve un piloto.

---

## 10. Terminación anticipada

Cualquiera de las partes puede terminar el piloto antes del plazo si:
- El acceso a datos comprometido en la sección 5 no se cumple dentro de `[PENDIENTE: plazo de gracia]`.
- Se identifica un riesgo de seguridad o de continuidad operacional no previsto.
- `[CLIENTE_PILOTO]` decide que ya no tiene interés en continuar (sin penalización, dado que es un piloto sin compromiso comercial).

---

## 11. Firmas

`[NOMBRE — ALERTA360]` — Fecha: `[PENDIENTE]`
`[CONTACTO_AUTORIDAD — CLIENTE_PILOTO]` — Fecha: `[PENDIENTE]`
