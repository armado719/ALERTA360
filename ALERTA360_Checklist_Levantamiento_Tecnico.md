# ALERTA360 — Checklist Levantamiento Técnico de Protocolo
*Complementa a: Project Master Lean §9 + Arquitectura Técnica §3.2 / §9 + Protocolo Validación Campo §6 paso 5*
*Uso: llenar UNA ficha por cliente piloto candidato, con su equipo técnico. Sin esta ficha completa no se cierra el gate Vertical+Activo+Protocolo.*

## 1. Identificación
- Fecha:
- Vertical: [Hidroelectrica / Mineria / Puerto]
- Cliente piloto candidato:
- Contacto técnico (nombre, cargo, teléfono/email):
- Contacto autoridad compra (si distinto al técnico):

## 2. Activo (un solo tipo para el MVP)
- Tipo activo propuesto: [ej. nivel embalse / inclinómetro talud / sensor ambiental puerto]
- Marca / modelo sensor:
- Ficha técnica disponible: [Si/No — adjuntar]
- Cantidad activos piloto:
- Ubicación / acceso físico: [facil / remoto / zona restringida]

## 3. Protocolo y acceso a datos (crítico — define esfuerzo)
- Protocolo real: [HTTP webhook / API REST / MQTT / Modbus / SDI-12 / GPRS propietario / Satelital propietario / Otro]
- ¿Ya expone API/webhook hoy?: [Si/No]
- Si es propietario/antiguo: ¿requiere gateway hardware intermedio?: [Si/No — cuál]
- Formato payload actual: [JSON / binario / CSV / otro]
- Campos disponibles: [timestamp? / valor? / unidad? / batería? / señal?]
- Autenticación actual: [ninguna / token / usuario-clave / certificado / otra]
- ¿Pueden darnos acceso read-only sin afectar operación?: [Si/No — cómo]

## 4. Comportamiento de transmisión (alimenta Health Score §8)
- Intervalo esperado transmisión (segundos):
- Tolerancia / jitter típico:
- ¿Qué es rango físicamente plausible? (min-max + unidad):
- ¿Valor congelado típico? (¿cuántas lecturas iguales = sospechoso?):
- Latencia típica ingesta:
- Tasa errores actual aproximada:

## 5. Volumen y retención (valida "sin cola está bien")
- Lecturas/día estimadas: [cantidad_activos * 86400 / intervalo]
- Tamaño payload promedio (bytes):
- Retención requerida histórico: [ej. 90 días / 1 año]
- ¿Necesita tiempo real (<10s) o basta polling 1-5min?:

## 6. Sistema actual y fail-safe
- Herramienta actual: [Grafana / Zabbix / SCADA / ThingsBoard / Excel / ninguna]
- Si ALERTA360 cae, ¿su sistema sigue igual?: [Si/No — explicar]
- ¿ALERTA360 será solo lectura?: [Si — obligatorio MVP]

## 7. Notificaciones y operación
- Canal preferido: [Email / Telegram / Slack]
- Destinatarios (operador / admin):
- ¿Necesita anti-spam / agrupación?: [Si/No]
- Horario atención incidentes:

## 8. Seguridad y datos (alimenta Acuerdo Piloto §8)
- ¿Datos sensibles / infraestructura crítica?: [Si/No]
- ¿Requiere NDA formal?: [Si/No]
- Al fin piloto datos se: [eliminan / anonimizan / conservan — no asumir]
- Acceso ALERTA360: [solo lectura diagnóstico — Si/No]

## 9. Decisión gate
- [ ] Protocolo confirmado y reproducible
- [ ] Intervalo + rangos + tolerancia cerrados
- [ ] Acceso real a telemetría comprometido (fecha):
- [ ] Listo para definir pesos Health Score y fórmula Alerting Capability v0

*Si falta alguno: NO pasar a especificación funcional ni a código.*
