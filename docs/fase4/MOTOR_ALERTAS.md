# 🚨 ALERTA360 — Motor de alertas

**Versión:** 1.0 · **Fecha:** 2026-10-18
**Código:** `backend/src/services/matching.ts`, `backend/src/routes/notifications.ts`,
`backend/src/routes/preferences.ts`, `backend/src/realtime/`

---

## 1. Qué hace

Cada evento nuevo que entra por la ingesta (USGS / NOAA) se evalúa contra
todos los usuarios con preferencias y ubicaciones. Si cumple las reglas, se
crean notificaciones (una por canal) y se empujan en vivo por WebSocket a
quien tenga la sesión abierta.

```
ingesta (5 min) ──► evento nuevo ──► matching ──► notifications (BD)
                                        │
                                        └──► WebSocket /ws/alerts
```

## 2. Reglas de matching

En orden, todas obligatorias:

| # | Regla | Implementación |
|---|---|---|
| 1 | El evento está activo y tiene coordenadas reales | `isActive`, descarta `0,0` (fuente sin geocodificar) |
| 2 | El tipo está entre los que sigue el usuario | `UserPreference.disasterTypes` |
| 3 | La severidad alcanza el mínimo del usuario | `minSeverity` (low · medium · high · critical) |
| 4 | Alguna ubicación cae dentro de su radio | `Location.radiusKm` (reserva: `alertRadiusKm`) |
| 5 | Hay al menos un canal habilitado | push / email / sms |

Detalles:

- **Una notificación por evento y canal.** Si dos ubicaciones entran en el
  radio se usa la más cercana, para no duplicar.
- **SMS solo para `high` y `critical`** (`SMS_MIN_SEVERITY`): cada mensaje
  tiene coste real.
- **Deduplicación en la base de datos** por `@@unique([userId, eventId, channel])`
  + `createMany({ skipDuplicates: true })`. Reprocesar un evento no duplica nada.
- **Distancia** con la fórmula del semiverseno (`utils/geo.ts`), sin PostGIS:
  error despreciable para radios de alerta y coste ~0.

## 3. API

Todas las rutas requieren `Authorization: Bearer <jwt>`.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/notifications?limit=50&unreadOnly=true` | Bandeja del usuario + contador de no leídas |
| `GET` | `/api/notifications/unread-count` | Solo el contador (badge) |
| `POST` | `/api/notifications/:id/read` | Marca una como leída (idempotente) |
| `POST` | `/api/notifications/read-all` | Marca todas |
| `DELETE` | `/api/notifications/:id` | Borra una propia |
| `GET` | `/api/preferences` | Preferencias (crea las de defecto) |
| `PUT` | `/api/preferences` | Actualización parcial |
| `WS` | `/ws/alerts?token=<jwt>` | Alertas en vivo |

Respuesta de `/api/notifications`:

```json
{
  "unread": 2,
  "notifications": [
    {
      "id": "…", "channel": "push", "status": "sent", "distanceKm": 2.9,
      "sentAt": "2026-10-18T04:04:11.000Z", "readAt": null,
      "event": { "id": "…", "type": "earthquake", "title": "…", "severity": "high",
                 "latitude": 4.73, "longitude": -74.09, "occurredAt": "…", "source": "usgs" }
    }
  ]
}
```

## 4. WebSocket

- Autenticación por query (`?token=`) o cabecera `Authorization`.
- Al conectar responde `{"type":"ready","userId":"…"}`.
- Cada alerta: `{"type":"alert","eventId":…,"title":…,"severity":…,"distanceKm":…,"channels":[…]}`
- Token inválido → cierre `1008`.
- Si el socket del usuario está abierto cuando se crea la notificación, la fila
  queda en `status: "sent"`; si no, en `pending` (el frontend la recoge por
  sondeo cada 30 s).

El frontend (`src/hooks/useAlerts.ts`) escucha el socket, refresca la bandeja y
reconecta con espera exponencial. La campana muestra las no leídas y el panel
agrupa por evento (un evento puede tener push + email + sms).

## 5. Métricas

| Métrica | Tipo | Uso |
|---|---|---|
| `alerta360_matching_runs_total` | counter | Eventos evaluados |
| `alerta360_matching_matches_total` | counter | Eventos con al menos un usuario |
| `alerta360_matching_duration_seconds` | histogram | Coste del matching por evento |
| `alerta360_notifications_created_total{channel}` | counter | Volumen por canal |
| `alerta360_ws_connections` | gauge | Sesiones en vivo |

## 6. Cómo probarlo

```bash
# Unitarios y de rutas (sin base de datos: Prisma falso)
cd backend && npm test

# Extremo a extremo contra un PostgreSQL real
DATABASE_URL=postgresql://… JWT_SECRET=… npm run dev
#  → registrar usuario, POST /api/locations, PUT /api/preferences
#  → insertar un evento cerca y comprobar GET /api/notifications
```

## 7. CORS y proxy

El frontend llama a `/api` y `/ws` **en el mismo origen**:

- **Desarrollo:** Vite los redirige al backend (`vite.config.ts`). No hay CORS.
- **Producción:** nginx hace lo mismo; tampoco hay CORS.
- Solo si el frontend vive en otro dominio (`VITE_API_URL`) entra CORS en juego.

El backend acepta una **lista** de orígenes separada por comas en `CORS_ORIGIN`.
En desarrollo (`NODE_ENV != production`) acepta además cualquier
`localhost` / `127.0.0.1` / IP de red local con cualquier puerto, que es lo que
rompía al abrir la app en `127.0.0.1:5173` o cuando Vite cambiaba a 5174:

```bash
CORS_ORIGIN=https://alerta360.com,https://www.alerta360.com
```

Errores típicos:

| Síntoma | Causa | Solución |
|---|---|---|
| `No 'Access-Control-Allow-Origin'` en `:3000` | Front abierto en otro origen no listado | Usar el proxy (`/api`) o añadir el origen a `CORS_ORIGIN` |
| CORS solo falla en el segundo dominio | Falta `www` en la lista | Añadir ambos |
| Preflight 404 | Origen rechazado | Revisar el log `[CORS] Origen no permitido` |

## 8. Limitaciones conocidas

- **Una sola instancia.** El hub de WebSockets vive en memoria; con varias
  réplicas haría falta Redis pub/sub.
- **Email y SMS** crean la notificación con estado `pending`: no hay proveedor
  conectado todavía (SendGrid / Twilio).
- **Sin backfill:** un usuario nuevo no recibe alertas de eventos anteriores.
- El matching recorre todas las preferencias; con decenas de miles de usuarios
  habrá que particionar por caja geográfica o pasar a PostGIS.
