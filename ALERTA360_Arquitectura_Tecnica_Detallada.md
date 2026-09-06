# ALERTA360 Infrastructure Health — Arquitectura Técnica Detallada
*Escenario de trabajo — HIPOTÉTICO, no validado en campo*

> ⚠️ **Nota obligatoria de uso:** este documento asume Vertical = Minería y Protocolo = HTTP webhook/API REST como escenario de trabajo, elegidos por recomendación, NO por resultado de las entrevistas del Protocolo de Validación de Campo. Sirve para adelantar diseño y detectar preguntas técnicas, pero **no debe usarse para escribir código de producción hasta que el vertical, el activo y el protocolo reales estén confirmados** con un cliente piloto identificado. Si al validar sale otro vertical/protocolo, varias decisiones de este documento (especialmente la sección 3, ingesta) cambian.

---

## 1. Alcance de esta arquitectura

Cubre solo la Fase 1 (Infrastructure Health) para un único tipo de activo del vertical minero: **sensores geotécnicos de monitoreo de taludes** (ejemplo de trabajo: inclinómetros, piezómetros, o sensores de desplazamiento — el tipo exacto se confirma con el cliente piloto real).

---

## 2. Modelo de datos (entidades principales)

```
Asset (activo)
├── id (uuid, PK)
├── external_id (string) — identificador del cliente para ese sensor
├── name (string)
├── asset_type (enum: talud_inclinometro | talud_piezometro | talud_desplazamiento | otro)
├── expected_interval_seconds (int) — intervalo de transmisión esperado
├── location_label (string) — descripción textual, sin coordenadas obligatorias en MVP
├── is_critical (boolean) — pesa 2x en Alerting Capability si es true (ver sección 5); definido con el equipo de geotecnia del cliente piloto real, no por defecto
├── client_id (FK → Client)
├── status (enum: healthy | degraded_minor | degraded_major | critical)
├── created_at, updated_at

Client (cliente piloto)
├── id (uuid, PK)
├── name (string)
├── vertical (enum: mineria | hidroelectrica | puerto)
├── created_at

TelemetryReading (lectura cruda)
├── id (uuid, PK)
├── asset_id (FK → Asset)
├── received_at (timestamp) — cuándo llegó a ALERTA360
├── measured_at (timestamp) — timestamp reportado por el sensor
├── raw_value (jsonb) — payload crudo, para trazabilidad
├── parsed_value (numeric) — valor normalizado principal
├── is_valid (boolean) — resultado de validación de rango/calidad

HealthScoreSnapshot (cálculo periódico)
├── id (uuid, PK)
├── asset_id (FK → Asset)
├── calculated_at (timestamp)
├── score_disponibilidad (int 0-100)
├── score_frescura (int 0-100)
├── score_calidad (int 0-100)
├── score_consistencia (int 0-100)
├── score_comunicacion (int 0-100)
├── score_total (int 0-100)
├── status (enum: healthy | degraded_minor | degraded_major | critical)

IncidentEvent (evento de auditoría)
├── id (uuid, PK)
├── asset_id (FK → Asset)
├── event_type (enum: degraded | critical | recovered | data_unreliable)
├── detected_at (timestamp)
├── resolved_at (timestamp, nullable)
├── acknowledged_by (string, nullable) — operador que confirmó
├── notes (text, nullable)

AlertingCapabilitySnapshot (agregado)
├── id (uuid, PK)
├── client_id (FK → Client)
├── calculated_at (timestamp)
├── score (int 0-100)
├── asset_count (int)
├── critical_asset_count (int)
```

**Nota de diseño:** `TelemetryReading` guarda el payload crudo (`raw_value`) además del valor normalizado — esto es lo que permite el principio "no caja negra" (Project Master, sección 8): siempre se puede reconstruir por qué el sistema calculó un score determinado.

---

## 3. Contrato de ingesta (HIPOTÉTICO — protocolo real puede cambiar esto por completo)

### 3.1 Endpoint de ingesta (escenario HTTP webhook)

```
POST /api/v1/ingest/{asset_external_id}
Authorization: Bearer <token del cliente>
Content-Type: application/json

{
  "measured_at": "2026-09-05T14:32:07Z",
  "value": 12.4,
  "unit": "mm",
  "raw": { ... payload original del fabricante, se guarda tal cual ... }
}
```

**Respuesta esperada:**
```
200 OK
{ "status": "received", "asset_id": "..." }
```

**Si el protocolo real resulta ser distinto (Modbus, SDI-12, telemetría satelital propietaria):** este endpoint no cambia — se agrega una capa de adaptador/gateway ANTES de este endpoint, que traduce el protocolo real al contrato JSON de arriba. Esa capa es la que realmente depende de la validación técnica pendiente (Project Master, sección 10).

### 3.2 Validación de payload al recibir
- `measured_at` no puede ser futuro ni tener más de 2 horas de antigüedad (valor de trabajo, ajustable con ficha técnica real)
- `value` debe estar dentro de rango físico plausible por `asset_type` — valor de trabajo: −100 mm a +100 mm para `talud_desplazamiento`/`talud_inclinometro`; 0-500 kPa para `talud_piezometro` (rangos reales a confirmar con ficha técnica del sensor, Checklist de Levantamiento Técnico)
- Autenticación por token simple por cliente (no OAuth2 completo en MVP, ver Project Master sección 7)

---

## 4. Motor de Health Score (job periódico, no en el camino crítico de ingesta)

```
Cada N minutos (ej. cada 5 min):
  para cada Asset activo:
    leer TelemetryReading recientes
    calcular:
      - disponibilidad = ¿hubo lectura en expected_interval_seconds * 2 (tolerancia)?
      - frescura = f(tiempo desde última lectura válida) — banda por minutos, ver Especificación sección 4
      - calidad = ¿parsed_value dentro de rango físico? (sección 3.2)
      - consistencia = ¿valor no repetido/congelado en las últimas 3 lecturas (≥15 min)?
      - comunicación = ¿tasa de errores de ingesta > 20% en ventana de 30 min?
    // Pesos de trabajo (ajustables tras ficha técnica real):
    // Consistencia 30% + Calidad 25% + Disponibilidad 20% + Frescura 15% + Comunicación 10%
    score_ponderado = 0.30*consistencia + 0.25*calidad + 0.20*disponibilidad + 0.15*frescura + 0.10*comunicacion
    // Regla de veto (Project Master sección 9): Consistencia o Calidad en rojo → tope de banda
    si consistencia == rojo OR calidad == rojo:
      status = "data_unreliable"  // nunca "healthy", sin importar score_ponderado
    si_no:
      status = banda(score_ponderado)  // saludable / degradado leve / degradado importante / crítico
    guardar HealthScoreSnapshot
    si status cambió respecto al snapshot anterior:
      crear IncidentEvent
      disparar notificación (sección 6)
```

**Por qué job periódico y no cálculo en tiempo real por cada lectura:** cumple el principio de evolución incremental (Project Master, sección 8) — no se necesita infraestructura de streaming (Kafka, etc.) para el volumen esperado de un solo cliente piloto.

---

## 5. Motor de Alerting Capability (agregado, corre después del Health Score)

```
Cada vez que se actualiza cualquier HealthScoreSnapshot del cliente:
  recalcular AlertingCapabilitySnapshot:
    // Escenario de trabajo (Especificación Funcional, sección 5):
    // 5 de 20 sensores marcados como "zona crítica" (Asset.is_critical = true) pesan 2x
    score = Σ(score_total_i * peso_i) / Σ(peso_i)
            donde peso_i = 2 si Asset.is_critical, 1 en caso contrario
    // Nota: qué activo es "zona crítica" se confirma con el equipo de geotecnia
    // del cliente piloto real — el campo Asset.is_critical se agrega al modelo (sección 2)
```

---

## 6. Notificaciones

```
IncidentEvent creado
  → resolver canal según configuración del cliente (email / Telegram / Slack)
  → construir mensaje con: asset.name, status anterior, status nuevo,
    razón (qué dimensión cambió), link al detalle en el dashboard
  → enviar (con reintento simple, sin cola dedicada en MVP)
```

**Regla de anti-spam (resuelta, alineada con Especificación Funcional sección 7):** no reenviar el mismo tipo de notificación del mismo activo más de una vez cada 30 minutos mientras el status no cambie. Si el status cambia (ej. degradado → crítico), se notifica de inmediato sin esperar la ventana — se compara `status` actual vs. el del `IncidentEvent` abierto más reciente de ese `asset_id`.

---

## 7. Stack técnico (confirmado en Project Master, sección 7 — no repetido aquí en detalle)

- Backend: ASP.NET Core (C#)
- Base de datos: PostgreSQL (esquema de sección 2 de este documento)
- Ingesta: endpoint HTTP (sección 3), sin cola de mensajería en MVP
- Job de cálculo: proceso periódico simple (hosted service / cron), no motor de streaming
- Frontend: React, consumiendo API REST sobre los mismos endpoints/tablas

---

## 8. Qué de este documento NO depende del vertical/protocolo (y por tanto ya es más confiable)

- El modelo de datos de `HealthScoreSnapshot`, `IncidentEvent` y `AlertingCapabilitySnapshot` (sección 2) — la estructura de las 5 dimensiones y el concepto de snapshot no cambia aunque cambie el vertical.
- El principio de job periódico en vez de cálculo en tiempo real (sección 4).
- El flujo general de notificación (sección 6), solo cambia el canal.

## 9. Qué SÍ depende 100% de confirmar vertical/activo/protocolo reales

- El contrato exacto de ingesta (sección 3) — si el protocolo real no es HTTP webhook, se necesita la capa adaptadora mencionada.
- Los rangos físicos plausibles por tipo de activo (sección 3.2).
- Los pesos de ponderación del Health Score y del Alerting Capability (secciones 4 y 5).
- El intervalo esperado de transmisión real.

---

**Próximo paso real (recordatorio):** este documento se vuelve arquitectura de verdad, no hipótesis, en cuanto completes las entrevistas de campo y confirmes vertical + activo + protocolo con un cliente piloto real.
