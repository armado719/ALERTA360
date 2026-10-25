# 📋 BITÁCORA DE CAMBIOS — ALERTA360

**Proyecto:** ALERTA360 — Plataforma Global de Alertas Tempranas para Desastres Naturales  
**Última actualización:** 2026-10-25  
**Versión actual:** 0.5.0 — MVP Fases 1-3 + infraestructura de producción + motor de alertas (WebSocket, push offline, email, SMS) + zonas círculo/polígono + catálogo de mejoras Fase 4 (#1–#7) + fuente NHC (A4, sin commitear)  
**Versión de la bitácora:** 1.4

---

## 📌 Propósito y convenciones

Este documento registra **todos los cambios significativos** del proyecto ALERTA360.

- Las entradas van en **orden cronológico inverso** (la más reciente primero), ordenadas por la fecha del commit.
- Cada entrada indica: fecha, commit(s), archivos afectados y estado.
- **Tests** = número de casos `it(...)` definidos en `backend/test/` al cerrar ese commit (recontados desde git el 2026-10-25).
- Una entrada sin commit se marca **⚠️ sin commitear**.

---

## 🩺 Estado actual (medido 2026-10-25)

| Verificación | Resultado |
|---|---|
| `tsc --noEmit` backend | ✅ 0 errores |
| `tsc --noEmit` frontend | ✅ 0 errores |
| Build frontend (`vite build`) | ✅ 2.465 módulos · `index` 760 kB (247 kB gzip) + `Map3D` 812 kB (221 kB gzip) · aviso de tamaño de chunk |
| Tests backend | 146 en 16 archivos — ✅ todos pasan por archivo · ⚠️ en la suite completa (`vitest run`) 2 tests de `alert-engine.int` y los hooks de `routes`/`docs` fallan por **timeout** (5 s / 10 s) cuando la máquina está cargada; aislados pasan 19/19 |
| Cambios sin commitear | NHC (A4) en `ingestion.ts` + `config.ts` + `test/nhc.test.ts` + `backend/.env.example` + `.env.production.example` + `docker-compose.prod.yml`; `deploy.yml`; borrado de `FASE_1/2/3_RESUMEN.md`; `MEJORAS_DESDE_WORLD_INTEL.md` sin versionar |

---

## 🗓️ Historial de Cambios

### **2026-10-25 — Reorganización de la bitácora (v1.3 → v1.4)**
#### Cambios Realizados:
- ✅ Orden cronológico restaurado según la fecha de los commits; cuatro bloques sin título ni fecha ahora tienen su entrada.
- ✅ Eliminados duplicados: B3 escalada (2 entradas), motor de alertas del 17/18-10 (2 entradas) y Fase 3 producción (3 entradas fusionadas en una).
- ✅ Conteos de tests corregidos con los valores reales de cada commit (ej.: geolocalización+GDACS = 103, no 52/90; digest = 118, no 122; B1 = 126, no 130).
- ✅ Añadida la entrada que faltaba de `f071dee` (Bloque 0: CI, claves, Swagger, EONET con 26 tests).
- ✅ NHC registrado como fuente nueva **A4** (antes figuraba como "fix #7 D2").
- ✅ Actualizadas las secciones de resumen de fases, estructura, métricas y pendientes; se quitaron métricas sin medición (tiempo de carga, "runtime errors 0").

---

### **2026-10-20 — FASE 4 A4: fuente NHC (ciclones tropicales) ⚠️ sin commitear**
#### Cambios Realizados:
- ✅ **`backend/src/services/ingestion.ts`** — Fuente nueva **NHC Forecast Cone** (ArcGIS REST de NOAA, capa 7 de `NHC_tropical_weather_summary`):
  - `registerSource('nhc')` + `fetchNHC()` (GeoJSON, `User-Agent` identificado).
  - `mapNHC(feature)` — cono de incertidumbre (`Polygon`) → evento `hurricane` anclado al centroide (`polygonCentroid` de `geo.ts`). Severidad por viento máximo (kts): ≥96 critical · 64–95 high · 34–63 medium · <34 low. Cono completo en `rawData.cone`. `externalId = nhc-<stormId>-<advisory>`. Cuenca derivada del prefijo (AL/EP/CP/WP).
  - Caso NHC en `runIngestion` con circuit breaker (`canFetch` / `reportSuccess` / `reportFailure`), dedup por `externalId`, hooks de matching, métrica `ingestionEventsTotal{source="nhc"}` y log del ciclo. El tipo de retorno incluye `nhc`.
  - **Bug corregido durante el desarrollo:** el ring se convertía a `[lat, lon]` (`[c[1], c[0]]`) aunque `polygonCentroid` espera `[lon, lat]`, y devolvía latitude=-80.2 en vez de 25.6. Ahora se usa `[c[0], c[1]]`, igual que `extractNOAACoords`.
- ✅ **`backend/src/utils/config.ts`** — `NHC_ENABLED` (default **`true`**), `NHC_URL`, `NHC_TIMEOUT` (10 s).
- ✅ **`backend/test/nhc.test.ts`** (nuevo, 4 tests) — cono → hurricane con polygon en `rawData`, null sin `Polygon`, escala de severidad por viento, descarte de null-island.

#### Estado:
- ✅ TSC backend: 0 errores
- ✅ Tests: 146 (16 archivos)
- ✅ `NHC_ENABLED` / `NHC_URL` / `NHC_TIMEOUT` documentados en `backend/.env.example` y `.env.production.example`, y reenviados al backend en `docker-compose.prod.yml` (2026-10-25). Antes, compose no los pasaba al contenedor y un `NHC_ENABLED=false` en producción se habría ignorado.
- ℹ️ `NHC_ENABLED` arranca en `true`, a diferencia de Meteoalarm/Digest (`false`).

### **Cambios en el árbol de trabajo (fecha sin registrar) ⚠️ sin commitear**
- ✅ **`.github/workflows/deploy.yml`** — `NODE_VERSION` 20 → 22; nuevo paso **"Validar secretos de despliegue"** (falla si faltan `PROD_HOST`, `PROD_USER` o `PROD_SSH_KEY`); corregido el nombre del archivo `.env.produccion` → `.env.production` (3 sitios: despliegue y rollback).
  - ✅ El paso nuevo había quedado insertado **en medio** de "Validar artefacto" y se llevó `test -f dist/status.html` y `du -sh dist` a "Validar secretos". Devueltos a su paso el 2026-10-25 (YAML validado).
  - ✅ Nombre unificado como `.env.production` también en el comentario de `.env.production.example` y en `docs/FASE_3_PRODUCCION.md` (2026-10-25). Antes un servidor montado siguiendo el runbook habría fallado al desplegar.
  - ✅ El runbook (línea 109) copiaba desde `.env.example` (el del frontend, sin `DB_*`, `JWT_SECRET` ni `GRAFANA_PASSWORD`). Ahora hace `cp .env.production.example .env.production`. El comentario de `nginx.conf:137` también usa el nombre nuevo (2026-10-25).
  - ℹ️ `.gitignore` ignora ambos nombres a propósito, para que un `.env.produccion` antiguo nunca se suba.
- ✅ Borrados `FASE_1_RESUMEN.md`, `FASE_2_RESUMEN.md` y `FASE_3_RESUMEN.md`; el detalle sigue en `AUDITORIA_FASE_N.md` y en esta bitácora.
- ⏳ `MEJORAS_DESDE_WORLD_INTEL.md` (el catálogo de mejoras que se usa en la Fase 4) aún no está versionado.

---

### **2026-10-19 — FASE 4 #7 D2: zonas de alerta con polígono** · `41c204a` + `745e0c4`
#### Cambios Realizados (backend — `41c204a`):
- ✅ **`backend/prisma/schema.prisma`** — `Location.shape String @default("circle")` + `Location.polygon Json?` (GeoJSON).
- ✅ **`backend/src/utils/geo.ts`** — `pointInPolygon` (ray casting) + `pointInPolygonAntimeridian` (cruce de ±180°).
- ✅ **`backend/src/services/matching.ts`** — `matchCandidate`: si `shape="polygon"` usa punto-en-polígono (`distanceKm=0`); el `findMany` selecciona `shape, polygon`; nuevo `normalizePolygonCoords`.
- ✅ **`backend/test/geo-polygon.test.ts`** (nuevo, 7 tests) — dentro/fuera + antimeridiano en Fiji (179°E/179°W).
- ✅ **`backend/test/matching.test.ts`** — +2 tests (evento dentro/fuera del polígono).

#### Cambios Realizados (frontend — `745e0c4`):
- ✅ **`src/components/LocationPanel.tsx`** — toggle círculo/polígono + textarea de vértices `(lat,lon)` → GeoJSON `Polygon` (ring en `lon,lat`; el centroide se guarda como lat/lng). `LocationItem` con badge de polígono y número de vértices.
- ✅ **`src/services/api.ts`** — `Location` y `createLocation` aceptan `shape?` / `polygon?`.
- ✅ **`backend/src/routes/locations.ts`** — Zod `shape` + `polygon` y persistencia al crear.

#### Estado:
- ✅ TSC backend y frontend: 0 errores · `npm run build` OK (solo aviso de tamaño de chunk)
- ✅ Tests: 142 (15 archivos)

### **2026-10-19 — FASE 4 #6 D1: geocoding testeable + fix del guard 503** · `52a589c`
#### Cambios Realizados:
- ✅ **`backend/src/routes/geocode.ts`** — se extrae `mapNominatimResults` (función pura) del handler; `requireGeocodeEnabled` ahora hace `return reply.status(503)` (bug: el preHandler no terminaba la petición).
- ✅ **`backend/test/geocode.test.ts`** (nuevo, 3 tests) — mapeo puro (coords + filtro de ítems sin coords) + guard 503. Sustituye un mock de axios inestable por un test determinista (49 ms).

#### Estado:
- ✅ TSC 0 · Tests: 133 (14 archivos)

### **2026-10-19 — FASE 4 #5 B3: nivel de escalada por exposición** · `0fbae5d`
#### Cambios Realizados:
- ✅ **`backend/src/services/analysis/exposure.ts`** — `computeEscalationLevel(population, severity, radiusKm?): 0-4`. Score = millones expuestos + peso de severidad + ajuste por radio.
  - Niveles: 0 sin exposición · 1 bajo (<1 M) · 2 medio · 3 alto · 4 crítico (>5 M o severidad crítica). Reutilizable en el motor de alertas y en el payload WS.
- ✅ **`backend/src/routes/events.ts`** — `GET /api/events` y `/:id` exponen `escalationLevel` junto a `exposedPopulation`.
- ✅ **`backend/test/exposure.test.ts`** — +4 tests (nivel 0/4, escalada por severidad, tope 4).

#### Estado:
- ✅ TSC 0 · Tests: 130 (13 archivos)

### **2026-10-19 — FASE 4 #4 B1: población expuesta** · `f20933a`
#### Cambios Realizados:
- ✅ **`backend/src/services/analysis/exposure.ts`** (nuevo) — `CITIES` (Top-15 áreas urbanas densas, datos ONU 2022) + `estimateExposedPopulation(lat, lon, radiusKm?)` calculado al vuelo (reusa `haversineKm`).
- ✅ **`backend/src/routes/events.ts`** — `GET /api/events` y `/:id` exponen `exposedPopulation` (población a ≤50 km del epicentro).
- ✅ **`backend/test/exposure.test.ts`** (nuevo, 4 tests) — Tokio, 0 en mar abierto, radio configurable, dataset de 15 ciudades.
- Sin cambio de schema (escalable a Top-N).

#### Estado:
- ✅ TSC 0 · Tests: 126 (13 archivos)

### **2026-10-19 — FASE 4 #3 A3: fuente Meteoalarm (Europa)** · `f5b5154`
#### Cambios Realizados:
- ✅ **`backend/src/services/ingestion.ts`** — `fetchMeteoalarm` + `mapMeteoalarm` (tipo/severidad/área vía mapas), `registerSource('meteoalarm')`, caso en `runIngestion` con circuit breaker y flags, métricas y log.
- ✅ **`backend/src/utils/config.ts`** — `METEOALARM_ENABLED` (default `false`), `METEOALARM_URL`, `METEOALARM_COUNTRIES`, `METEOALARM_TIMEOUT`.
- ✅ **`backend/test/meteoalarm.test.ts`** (nuevo, 4 tests) — mapeo, null sin coords, severidad por defecto, `externalId` sin colisión.
- ⚠️ Endpoint configurable: no hay un JSON público estable de Meteoalarm para toda Europa. El mapeo asume el contrato `[{type, severity, lat, lon, onset, area, title, description}]`.

#### Estado:
- ✅ TSC 0 · Tests: 122 (12 archivos)

### **2026-10-19 — FASE 4 #2 B5: resumen diario por email** · `68e1c8a` + `0a564fe`
#### Cambios Realizados:
- ✅ **`backend/src/services/notifications/digest.ts`** (nuevo) — `collectDigestEvents` (24 h, activos y no `stale`), `filterEventsForUser` (tipo + severidad + radio haversine), `sendDailyDigest` (reusa `sendEmail` / SendGrid) y `startDigestScheduler` (diario a `DIGEST_HOUR`).
- ✅ **`backend/src/utils/config.ts`** — `DIGEST_ENABLED` (default `false`) + `DIGEST_HOUR` (default 8 UTC).
- ✅ **`backend/src/index.ts`** — arranca `startDigestScheduler(app.prisma)`.
- ✅ **`backend/test/digest.test.ts`** (nuevo, 8 tests) — filtrado, envío, skip cuando está desactivado, fallo, delay.
- ✅ Métrica `notificationsDelivered` del email por `channel` / `status`.

#### Estado:
- ✅ TSC 0 · Tests: 118 (11 archivos) · sin cambios de schema

### **2026-10-19 — FASE 4 #1: frescura de eventos (fetchedAt / stale)** · `07569df`
#### Cambios Realizados:
- ✅ **`MEJORAS_DESDE_WORLD_INTEL.md`** auditado: A1 (EONET) y A2 (GDACS) **ya estaban** implementados en `ingestion.ts` (el documento analizaba el repo externo `world-intel-mcp`). Plan corregido y priorizado por impacto real.
- ✅ **`backend/prisma/schema.prisma`** — `DisasterEvent.fetchedAt DateTime @default(now())` + `stale Boolean @default(false)` + índices en ambos.
- ✅ **`backend/src/services/ingestion.ts`** — `runFreshnessSweep(prisma, staleAfterMs?)` marca `stale=true` cuando `fetchedAt` venció; corre al arrancar y en cada ciclo. Nunca lanza.
- ✅ **`backend/src/routes/events.ts`** — `GET /api/events` y `/:id` exponen `fetchedAt` y `stale`.
- ✅ **`backend/src/utils/config.ts`** — `STALE_AFTER_MINUTES` (default 30).
- ✅ **`backend/test/freshness.test.ts`** (nuevo, 2 tests) — filtro `where:{stale:false, fetchedAt:{lt}, isActive:true}` + fallo devuelve 0.

#### Estado:
- ✅ TSC 0 · Tests: 110 (10 archivos) · `prisma generate` OK

### **2026-10-19 — FASE 3: notificaciones push offline (Service Worker + Web Push VAPID)** · `aa9a275`
#### Cambios Realizados:
- ✅ **`backend/src/utils/config.ts`** — `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (defaults de dev; en prod por env).
- ✅ **`backend/prisma/schema.prisma`** — `User.pushSubscription Json?`.
- ✅ **`backend/src/services/push.ts`** (nuevo) — `sendPush(subscription, payload)` con `web-push`; nunca lanza.
- ✅ **`backend/src/services/matching.ts`** — si `hub.sendToUser` devuelve 0 (sin WS conectado) hace **fallback a `sendPush`** con `{title, body, data:{eventId, lat, lng, url}}`; la query incluye `user.pushSubscription`.
- ✅ **`backend/src/routes/notifications.ts`** — `POST /api/notifications/subscribe` (Zod) + `GET /api/notifications/vapid`. JWT requerido.
- ✅ **`backend/src/types/web-push.d.ts`** (nuevo) — tipos mínimos.
- ✅ **`backend/test/push.test.ts`** (nuevo, 4 tests) + test de fallback offline en `alert-engine.int.test.ts`.
- ✅ **`public/sw.js`** — `push` → `showNotification`, `notificationclick` → abrir/enfocar `data.url`, `skipWaiting` y limpieza de caché.
- ✅ **`src/hooks/usePushSubscription.ts`** (nuevo) — registro del SW, permiso, clave VAPID, `pushManager.subscribe`, POST de la suscripción.
- ✅ **`src/services/api.ts`** — `fetchVapidKey()` + `subscribeToPush(sub)`; se elimina `subscribeToAlerts` (huérfana).
- ✅ **`src/App.tsx`** — `usePushSubscription(!!user)`.

#### Estado:
- ✅ TSC backend y frontend: 0 errores
- ✅ Tests: 108 (9 archivos)
- ✅ Build frontend OK (`dist/sw.js` incluido)

### **2026-10-19 — Zonas de alerta, geolocalización, GDACS + circuit breaker y test e2e del motor (v0.4.1)** · `bd67bb2`
#### Cambios Realizados (fuentes globales — Bloque 0):
- ✅ **`backend/src/services/sources/types.ts`** (nuevo) — contrato `MappedEvent` / `Source` + `isNullIsland` / `isValidPoint`.
- ✅ **`backend/src/services/sources/health.ts`** (nuevo) — circuit breaker: 3 fallos seguidos → `down` + cooldown de 5 min; sin datos frescos en 30 min → `degraded`.
- ✅ **`backend/src/routes/sources.ts`** (nuevo) — `GET /api/sources/health` (`complete`, `sources[]`, `intervalMs`).
- ✅ **`backend/src/services/ingestion.ts`** — los fetchers **lanzan** errores (antes un catch silencioso confundía "caído" con "0 eventos"); circuit breaker en el ciclo; GDACS (fetch + `mapGDACS` + métricas); `EONET_BBOX` y `EONET_DAYS` configurables.
- ✅ **`backend/src/utils/config.ts`** + **`backend/.env.example`** — `GDACS_ENABLED`, `GDACS_DAYS`, `EONET_BBOX`, `EONET_DAYS`, `INGEST_INTERVAL`.
- ✅ **`backend/test/sources.test.ts`** (nuevo) — circuit breaker (abrir / cerrar / cooldown) + `mapGDACS`.

#### Cambios Realizados (zonas y geolocalización):
- ✅ **`backend/src/routes/geocode.ts`** (nuevo) — proxy de Nominatim (`/api/geocode/search` + reverse).
- ✅ **`src/components/LocationPanel.tsx`** (nuevo) — buscador con autocomplete (debounce 500 ms), GPS del navegador + `reverseGeocode`, slider de radio 1–1000 km, guardar/borrar zonas, lista con contador.
- ✅ **`src/components/Header.tsx`** — botón MapPin con badge de zonas.
- ✅ **`src/components/Map.tsx`** — `LocationCircles` dibuja el círculo de cobertura de cada zona.
- ✅ **`src/App.tsx`** — estado `locations` + `showLocationPanel`, `saveLocation` / `deleteLocation`.
- ✅ **`backend/test/alert-engine.int.test.ts`** (nuevo, 4 tests) — `buildApp({ prisma: fakePrisma })` + **hub WS real** + `fakeSocket`: push al WS, dedup en BD (`created:0` al repetir), sin WS persiste la notificación, sin match fuera del radio.
- ✅ Motor validado de punta a punta: zona → ingesta → `matchEvent` → `hub.sendToUser` → WS → cliente.

#### Estado:
- ✅ TSC backend y frontend: 0 errores · build backend y frontend OK
- ✅ Tests: 103 (8 archivos)
- ⚠️ El motor empuja al WS en cada matching (stateless); la dedup es solo en BD (`createMany skipDuplicates` + `@@unique`). El cliente (`useAlerts.ts`) deduplica visualmente por `eventId`. `notifications/dispatch.ts` es fire-and-forget y loguea ruido cuando el Prisma falso no devuelve el evento completo. Aceptado porque nunca rompe la ingesta.

### **2026-10-19 — Bloque 0: infraestructura productiva (CI, claves, Swagger, latencia)** · `f071dee`
#### Cambios Realizados:
- ✅ **`.github/workflows/ci.yml`** — YAML válido otra vez (había un EOF suelto y un `with:` duplicado); se agregan los tests al pipeline.
- ✅ **`docker-compose.prod.yml`** — paso de claves al backend (SendGrid, Twilio, GDACS, Nominatim) + `INGEST_INTERVAL=120000` (latencia de 2 min).
- ✅ **`nginx.conf`** — `location /docs` y `/openapi.json` (Swagger UI accesible).
- ✅ **`.env.production.example`** + **`backend/.env.example`** — variables globales, de geocodificación e `INGEST_INTERVAL`.
- ✅ **`backend/src/services/ingestion.ts`** — corregido un `\n` literal que rompía el parseo; el tipo de retorno incluye `eonet`.
- ✅ **`backend/test/eonet.test.ts`** (nuevo, 26 tests) — `mapEONET` (coordenadas, geometría más reciente, categorías, títulos, rawData, magnitud) + `mapEONETSeverity`.
- ✅ **`src/data/demoEvents.ts`**, **`src/types/index.ts`**, **`src/components/Dashboard.tsx`** — 5 tipos nuevos (wildfire / drought / heatwave / snow / dust).

#### Estado:
- ✅ TSC backend y frontend: 0 errores
- ✅ Tests: 74 (6 archivos)

---

### **2026-10-18 — Fase 1: entrega real de alertas (SendGrid + Twilio) y Swagger** · `6e9412e`
#### Cambios Realizados:
- ✅ **`backend/src/services/notifications/`** (nuevo):
  - `dispatch.ts` — orquestador: toma las notificaciones `pending` de email/sms, las envía y actualiza el estado (`sent` / `failed` / `skipped`). Fire-and-forget desde el matching; inyección de dependencias (`DispatchDeps`).
  - `email.ts` — SendGrid REST v3 (`/v3/mail/send`) con `axios`. `skipped` si falta `SENDGRID_API_KEY`.
  - `sms.ts` — Twilio REST (`/Messages.json`) con `axios`. Valida formato E.164.
- ✅ **`backend/src/routes/docs.ts`** + **`backend/src/docs/openapi.ts`** (nuevo) — Swagger UI en `/docs`, spec en `/openapi.json`. Desactivable con `DOCS_ENABLED=false`.
- ✅ **`backend/src/plugins/metrics.ts`** — métrica `notificationsDelivered{channel, status}`.
- ✅ **`backend/src/utils/config.ts`** — `SENDGRID_API_KEY`, `EMAIL_FROM`, `SENDGRID_BASE_URL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `TWILIO_BASE_URL`, `DOCS_ENABLED`. Defaults vacíos: el motor funciona sin configurarlos.
- ✅ **`backend/src/routes/preferences.ts`** — `PUT /api/preferences` gestiona `User.phone` (E.164); el GET lo incluye.
- ✅ **`backend/prisma/schema.prisma`** — `User.phone String?`, `Notification.error String?`, `status` admite `skipped`.
- ✅ **`backend/package.json`** — `@fastify/swagger@^8.15.0` + `@fastify/swagger-ui@^2.1.0` (Fastify 4). Se quitan `@sendgrid/mail` y `twilio` (se usa `axios` directo).
- ✅ **Tests** — `dispatch.test.ts` (7) y `docs.test.ts` (3).

#### Estado:
- ✅ TSC 0 · build backend OK · build frontend OK (2.461 módulos, `status.html` incluido)
- ✅ Tests: 48 (5 archivos)

### **2026-10-17/18 — Fase 3: producción lista + Fase 4: motor de alertas + fix crítico de `asyncHandler`** · `e0be01d` + `0755507`
#### Cambios Realizados (Fase 3 — producción):
- ✅ Se integró el paquete `alerta360-produccion-alertas` (29 archivos) y se borraron las copias `alerta360-fase3`, `alerta360-fase3 (1)` y `alerta360-ui-redesign (1)`.
- ✅ **`backend/src/plugins/metrics.ts`** (nuevo) — Prometheus con `prom-client@15.1.3`: métricas de proceso `alerta360_*`, histograma y contador HTTP por método/ruta/estado, gauges de ingesta (última correcta, duración, eventos activos, errores por fuente).
- ✅ **`backend/src/index.ts`** — `GET /metrics`; `/health` enriquecido (latencia de BD, frescura de ingesta, uptime, versión) que responde **503** si PostgreSQL falla; apagado ordenado con SIGTERM/SIGINT.
- ✅ **`backend/src/services/ingestion.ts`** — instrumentación por ciclo: eventos nuevos por fuente, errores, duración y última ingesta correcta.
- ✅ **`monitoring/`** — `alerts.yml` (8 reglas: API caída, 5xx >5 %, p95 >1 s, ingesta parada >15 min, 3 h sin eventos, errores de inserción, memoria >512 MB, pico de tráfico), `alertmanager.yml` (webhook `ALERT_WEBHOOK_URL` + inhibición), `prometheus.yml` y Grafana provisionado (6 stats + 5 series).
- ✅ **`docker-compose.prod.yml`** — 10 servicios con healthchecks, límites de logs y puertos de observabilidad solo en `127.0.0.1`: backend, nginx, certbot (renovación cada 12 h), prometheus, alertmanager, grafana, node-exporter, postgres-exporter y backup diario.
- ✅ **`nginx.conf`** — TLS 1.2/1.3, HSTS, CSP, `Permissions-Policy`, caché inmutable de `/assets`, `/status`, ACME en HTTP, `/metrics` bloqueado al exterior, gzip ampliado y bloque `real_ip` de Cloudflare (22 rangos) listo para descomentar.
- ✅ **`public/status.html`** (nuevo) — página de estado pública que consulta `/health` cada 30 s.
- ✅ **`backend/Dockerfile`** — multi-stage, usuario `node`, `HEALTHCHECK`.
- ✅ **`scripts/`** — `backup.sh` (contenedor u host, retención, S3 opcional), `deploy.sh` (levanta la BD antes del `db push`, health check con reintentos, `.current_tag`) e `init-letsencrypt.sh`. `chmod +x` en `0755507`.
- ✅ **`.github/workflows/deploy.yml`** — reescrito: compila `dist/` en CI y lo sube por `rsync` con swap atómico (antes el frontend **no se desplegaba**), `docker compose` v2, espera `pg_isready`, `prisma db push`, `nginx -t`, health check local y público, y **rollback automático** (dist anterior + tag previo). Imágenes `ghcr.io` en minúsculas con tag `sha-<commit>`.
- ✅ **`.gitignore`** — se versionan los `package-lock.json` (CI y Docker usan `npm ci`).
- ✅ **`docs/FASE_3_PRODUCCION.md`** (runbook: arquitectura, firewall `ufw`, observabilidad, backups con prueba mensual RTO/RPO, rollback, Cloudflare, checklist de go-live) + **`.env.production.example`** + `ALERTA360_ARQUITECTURA_MAESTRA.md` v1.2.

#### Cambios Realizados (Fase 4 — motor de alertas):
- ✅ **`backend/src/app.ts`** (nuevo) — `buildApp()` separado de `listen()`, testeable con `app.inject()` y Prisma inyectado.
- ✅ **`backend/src/services/matching.ts`** (nuevo) — 5 reglas: evento activo y con coordenadas reales, tipo seguido, severidad ≥ `minSeverity`, dentro del radio (elige la ubicación más cercana) y canal habilitado (SMS solo desde `high`). Dedup por `@@unique(userId, eventId, channel)` con `createMany({ skipDuplicates: true })`.
- ✅ **`backend/src/realtime/hub.ts`** + **`ws.ts`** (nuevo) — `AlertHub` (usuario → sockets), `WS /ws/alerts?token=<jwt>`, cierre 1008 sin token.
- ✅ **`backend/src/routes/notifications.ts`** + **`preferences.ts`** (nuevo) — bandeja (listar, contador, marcar leída, marcar todas, borrar) y preferencias (radio, tipos, `minSeverity`, canales) con Zod.
- ✅ **`backend/src/utils/geo.ts`** (nuevo) — Haversine, ranking de severidad, descarte de `0,0`.
- ✅ **`backend/src/middleware/errorHandler.ts`** — **bug crítico:** `asyncHandler` no devolvía la promesa y, usado como `preHandler`, **colgaba todas las rutas autenticadas** (`/api/locations`, `/api/auth/me`). Ahora hace `return await fn(...)`.
- ✅ **CORS** — `CORS_ORIGIN` admite lista separada por comas; en dev se permite cualquier `localhost` / `127.0.0.1` / IP LAN; preflight cacheado 24 h. El frontend usa rutas relativas `/api` y `/ws` (proxy de Vite en dev, nginx en prod).
- ✅ **`backend/src/index.ts`** — `startIngestScheduler` con `onEventCreated → matchEvent(hub)`.
- ✅ **UI** — `src/hooks/useAlerts.ts` (sondeo cada 30 s + WebSocket con reconexión), `src/components/NotificationsPanel.tsx` (agrupa por evento, canales, distancia, no leídas) y campana con badge real.
- ✅ **Métricas** — `notifications_created_total{channel}`, `matching_runs_total`, `matching_matches_total`, `matching_duration_seconds`, `ws_connections`.
- ✅ **Tests** (nuevo, `vitest.config.ts`) — `geo.test.ts`, `matching.test.ts`, `routes.test.ts`.
- ✅ **`docs/fase4/MOTOR_ALERTAS.md`** + captura `docs/redesign/notificaciones.png`.

#### Estado:
- ✅ TSC backend y frontend: 0 errores · build frontend 2.461 módulos (`index` 732 kB / 240 kB gzip + chunk `Map3D`)
- ✅ Tests: 37 (3 archivos)
- ✅ `/metrics` y `/health` probados en local (503 correcto sin BD); YAML de compose/Prometheus/Alertmanager/Grafana y JSON del dashboard validados; `bash -n` de los tres scripts
- ✅ `nginx -t` con y sin el bloque de Cloudflare + prueba real con nginx 1.26: 301 en `:80`, `/status` 200, `/metrics` 404, proxy `/api`, ACME 200, rate limit 429 y HSTS/CSP presentes
- ✅ E2E con PostgreSQL 17 real: usuario en Bogotá → 3 notificaciones (push/email/sms) + alerta por WS; el usuario de Medellín no recibe nada
- ✅ CORS verificado en dev y prod (con y sin `www`; orígenes ajenos bloqueados)
- ⏳ Externo: servidor, DNS, certificado TLS real y secretos `PROD_*`

---

### **2026-10-17 — Mapa v2: calor, edificios 3D, clusters navegables y línea de tiempo** · `5fc0429` + `ac4b0e4` + merge `160b2fa`
#### Cambios Realizados:
- ✅ **`src/components/Map.tsx`** — reescrito: `BASEMAPS` conmutables (Oscuro · Satélite · Terreno · Relieve, Esri sin API key), `HeatLayer` (`leaflet.heat`, gradiente azul → rojo), `ClusterLayer` (celdas de 56 px + fusión a <40 px; clic → `fitBounds`), `EventConnections`, panel de capas de 224 px y atribución que sube cuando la línea de tiempo está visible.
- ✅ **`src/components/Map3D.tsx`** — globo (MapLibre 4.7.1) + terreno AWS (exaggeration 1.25) + satélite Esri; edificios `fill-extrusion` de OpenFreeMap a zoom ≥13; topónimos Noto Sans; heatmap nativo (radio 26→74 px, intensidad 1.6→3.0); clusters con `easeTo` (y respaldo si `getClusterExpansionZoom` no responde); `ResizeObserver`.
- ✅ **`src/App.tsx`** — `timeline` (`enabled` / `hoursAgo` / `playing`), pasos de 15 min cada 110 ms, ventana `[ahora − 24 h, ahora − hoursAgo]`; calor, clusters y contadores siguen la reproducción.
- ✅ **`src/index.css`** — filtros por `data-basemap`, estilos MapLibre, marcadores HUD (`.a360-gl-*`, `.a360-bubble`), fondo de estrellas, offset de atribución con `data-timeline`.
- ✅ **`src/data/demoEvents.ts`** — 178 eventos deterministas en las últimas 24 h reales.
- ✅ **`src/types/leaflet-heat.d.ts`** — tipos de `leaflet.heat`.
- ✅ **`package.json`** — `maplibre-gl ^4.7.1` (la 6.x no arranca el worker en Vite dev; antes estaba en 5.4) y `leaflet.heat ^0.2.0`.
- ✅ **`docs/redesign/MAPA.md`** — documentación con capturas.
- ✅ `ac4b0e4` — borrado `alerta360-ui-redesign/`.

#### Estado:
- ✅ TSC 0 · build 2.461 módulos; `index` 732 kB (240 kB gzip) + `Map3D` 812 kB (221 kB gzip)
- ✅ Teselas verificadas: 6 URLs de Esri, AWS Terrain y OpenFreeMap
- ✅ Merge a `main` (`160b2fa`); rama `ui/redesign-v2` publicada
- ⏳ Queda en `vite.config.ts` el `watch.ignored: ['**/alerta360-ui-redesign/**']`, que ya no hace falta.

### **2026-10-17 — UI Redesign + Map3D (MapLibre: globo, terreno, satélite)** · `1971a4b`
#### Cambios Realizados (rediseño):
- ✅ Paquete `alerta360-ui-redesign/` aplicado: paleta más fría (#0b131d bg, #0d1621 surface, #16212e surfaceElev), sistema panel/card con gradientes, layout responsive mobile-first.
- ✅ **`src/index.css`** — gradiente radial cian/púrpura, filtro de tinte para teselas Leaflet, sistema panel/card.
- ✅ **`src/App.tsx`** — layout `lg:flex-row`, `EventDetailCard` flotante, toast de error que se oculta a los 9 s, modo demo con fallback `DEMO_EVENTS`.
- ✅ **`src/components/Map.tsx`** — marcadores HUD CSS (`.a360-marker/halo/ring/dot` con pulso), controles Lucide, retícula central, ESRI Dark Gray Canvas.
- ✅ **`src/components/Dashboard.tsx`** — layout compacto, búsqueda local, KPI cards, donut con total superpuesto, filtros colapsables.
- ✅ **`src/components/Header.tsx`** — reloj en vivo, `IconButton`, badges de notificaciones y demo.
- ✅ **`src/components/EventDetailCard.tsx`** (nuevo) — card flotante con animación spring.
- ✅ **`src/components/Sparkline.tsx`** — relleno con gradiente, leyenda, tooltip compacto.
- ✅ **`vite.config.ts`** — `allowedHosts: true`.

#### Cambios Realizados (Map3D):
- ✅ `maplibre-gl` instalado (sin API key); `Map3D.tsx` movido a `src/components/`; import `import * as maplibregl`; quitado `antialias: true` (no existe en los tipos).
- ✅ Toggle 2D/3D en `src/App.tsx`; CSS `.a360-gl-*`.
- ✅ Satélite Esri `World_Imagery` y terreno AWS `terrarium` (HTTP 200 verificados); proyección globo, DEM ×1.25, cielo/niebla.

#### Estado:
- ✅ TSC 0 (`--skipLibCheck`)

### **2026-10-17 — Paleta SerQ + fix de teselas del mapa** · `7adeb82`
#### Cambios Realizados:
- ✅ **Teselas** — CARTO (ahora exige API key) reemplazado por ESRI Dark Gray Canvas (gratis, HTTP 200).
- ✅ **`tailwind.config.js`** — paleta SerQ: `bg #04060b`, `txt #e9eef8`, `orange #ff5b1f/#ff8a3d`, `blue #2fa8ff`, `green #25d07d`, `red #ff4d4d`. Severidades: critical→red, high→orange, medium→blue, low→green.
- ✅ **`src/index.css`** — 3 gradientes ambientales sobre #04060b; glassmorphism rediseñado (gradiente 180°, borde `::before`, blur 16 px); Leaflet y popups con el mismo estilo.
- ✅ **`src/App.tsx`** — fondo `bg-bg`, 3 blobs ambientales (`.ambient.a1/a2/a3`), grid al 8,5 %.
- ✅ **`Map.tsx`**, **`Dashboard.tsx`**, **`Sparkline.tsx`** — colores hex y `cyan-*` migrados a la paleta SerQ; iconos Lucide.

#### Estado:
- ✅ TSC 0 · dev server HTTP 200 · teselas ESRI verificadas

### **2026-10-17 — Backend: buenas prácticas (nodebestpractices)** · `04e9c97`
#### Cambios Realizados:
- ✅ **`backend/src/utils/config.ts`** (nuevo) — validación Zod de las variables de entorno; fail-fast si faltan `JWT_SECRET` o `DATABASE_URL`.
- ✅ **`backend/src/utils/logger.ts`** (nuevo) — Pino (`pino-pretty` en dev, JSON en prod); reemplaza todos los `console.*`.
- ✅ **`backend/src/utils/prisma.ts`** (nuevo) — augmentation `fastify.prisma: PrismaClient`.
- ✅ **`backend/src/middleware/errorHandler.ts`** (nuevo) — handler centralizado + `asyncHandler()`.
- ✅ **`backend/src/middleware/requireAuth.ts`** (nuevo) — antes estaba duplicado en `auth.ts` y `locations.ts`.
- ✅ **`backend/src/index.ts`** y rutas — usan `config`, `logger`, `setupErrorHandler()` y el singleton `fastify.prisma` (se eliminan los `new PrismaClient()` duplicados).
- ✅ **`backend/src/services/ingestion.ts`** — `logger` + `config`; inyección `runIngestion(prisma)` / `startIngestScheduler(prisma)`.
- Dependencias: `pino`, `pino-pretty`.

#### Estado:
- ✅ TSC 0 · build OK · backend en http://localhost:3000 (health OK)

### **2026-10-17 — UI premium: Chart.js, Lucide y Framer Motion** · `67810a9`
#### Cambios Realizados:
- ✅ **`src/components/Sparkline.tsx`** (nuevo) — `Sparkline` (línea con gradiente, tension 0.4) y `DonutChart` (cutout 65 %).
- ✅ **`src/components/Dashboard.tsx`** — sparklines Chart.js en las stat cards, donut por tipo de evento, iconos Lucide (adiós emojis), Framer Motion (`whileHover`/`whileTap`, `AnimatePresence`, `layoutId`, animaciones escalonadas), buscador, selector de rango, cards con barra de severidad, reloj en el footer.
- ✅ **`src/components/Header.tsx`** — iconos Lucide, entrada animada, micro-interacciones, reloj, badge de notificaciones, avatar con gradiente.
- ✅ **`src/components/Map.tsx`** — controles con Lucide + Framer Motion.
- Dependencias: `chart.js@4.5.1`, `react-chartjs-2@5.3.1`, `framer-motion@14.3.0`, `lucide-react@1.59.0`.

#### Estado:
- ✅ TSC 0 · build 2.453 módulos, 693,76 kB (226,87 kB gzip)

### **2026-10-16 — Backend real (auth, eventos, ubicaciones, ingesta USGS/NOAA) + frontend premium** · `2ed3a61` + `9ed6599`
#### Cambios Realizados (backend):
- ✅ **`backend/src/routes/auth.ts`** — `POST /auth/register`, `POST /auth/login`, `GET /auth/me` (JWT + bcrypt + Zod).
- ✅ **`backend/src/routes/events.ts`** — `GET /api/events` (filtros `types` / `timeRange`) y `GET /api/events/:id`.
- ✅ **`backend/src/routes/locations.ts`** — CRUD con JWT.
- ✅ **`backend/src/services/ingestion.ts`** — USGS (feed geojson `all_day`) + NOAA (alertas activas); scheduler cada 5 min; dedup por `externalId`.
- ✅ `prisma db push` — 6 tablas (User, UserPreference, Location, DisasterEvent, Notification, AuditLog); PostgreSQL en Docker (`alerta360-db`, :5432).
- ✅ Verificado: eventos reales de USGS y NOAA en `/api/events`.

#### Cambios Realizados (frontend):
- ✅ **`tailwind.config.js`** / **`src/index.css`** — tema oscuro premium, colores neón por severidad, utilidades `.glass*`, animaciones, overrides de Leaflet.
- ✅ **`src/components/AuthModal.tsx`** (nuevo) — login/registro con token JWT en `localStorage`.
- ✅ **`src/components/Header.tsx`**, **`Dashboard.tsx`** (card de alerta crítica, stat cards con sparklines SVG, event cards), **`Map.tsx`** (CARTO dark, marcadores con glow/pulso, líneas de conexión 5–500 km, retícula, controles, popups glass, auto-fit).
- ✅ **`src/services/api.ts`** — reescrito: persistencia del JWT, `register`/`login`/`logout`/`getMe`, eventos y ubicaciones sin datos mock.

#### Estado:
- ✅ TSC 0 (backend + frontend) · build 133 módulos, 376 kB (116,84 kB gzip)
- ✅ Backend en :3000 y frontend en :5173 (proxy Vite → backend)

### **2026-10-16 — Fix de tipos: `import.meta.env`** · `4004261`
#### Cambios Realizados:
- ✅ **`src/services/api.ts`** — `process.env.VITE_API_URL` → `import.meta.env.VITE_API_URL` (convención Vite, sin `@types/node`).
- ✅ **`src/vite-env.d.ts`** (nuevo) — `/// <reference types="vite/client" />`.

#### Estado:
- ✅ TSC 0 · build 114,34 kB gzip

---

### **2026-10-15 — Fases 1 a 4: MVP, infraestructura y estructura de expansión** · commits `d745b90` → `0f615e0` (2026-10-16)
#### Fase 1 — MVP frontend:
- ✅ React 18 + Vite + Tailwind + Leaflet: `App.tsx`, `Header.tsx`, `Map.tsx`, `Dashboard.tsx`, `services/api.ts` (con datos mock), `types/index.ts`, `index.css`.
- ✅ Configuración: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `.env.example`, `.gitignore`, `Makefile`.
- ✅ Documentación: `README.md`, `QUICK_START.md`, `STATUS.md`, `ALERTA360_ARQUITECTURA_MAESTRA.md`, `ALERTA360_HERRAMIENTAS_RECOMENDADAS.md`, `INDICE_DOCUMENTACION.md`, `AUDITORIA_FASE_1.md` (y `FASE_1_RESUMEN.md`, hoy eliminado).
- ✅ Build: 114,36 kB gzip · TSC 0 warnings.
- ℹ️ Las ramas `master` (v1) y `feat/alerta360-v2-clean` (v2) citadas en ese momento ya no existen; hoy solo están `main` y `ui/redesign-v2`.

#### Fase 2 — infraestructura backend:
- ✅ Fastify + TypeScript: `backend/src/index.ts` con `/health`.
- ✅ PostgreSQL + Prisma: `schema.prisma` con 6 modelos (User, UserPreference, Location, DisasterEvent, Notification, AuditLog).
- ✅ `docker-compose.yml` (PostgreSQL + backend), `backend/Dockerfile`, `backend/.env.example`.
- ✅ `AUDITORIA_FASE_2.md` (y `FASE_2_RESUMEN.md`, hoy eliminado).

#### Fase 3 — infraestructura de producción (primera versión):
- ✅ `.github/workflows/ci.yml` + `deploy.yml`, `docker-compose.prod.yml` (5 servicios), `nginx.conf` (TLS, cabeceras, rate limiting, gzip), `monitoring/prometheus.yml`, `scripts/deploy.sh` + `backup.sh`.
- ✅ `AUDITORIA_FASE_3.md` (y `FASE_3_RESUMEN.md`, hoy eliminado). Todo esto se rehízo el 2026-10-17/18 (ver arriba).

#### Fase 4 — estructura de expansión:
- ✅ `mobile/package.json` (React Native), `ml/requirements.txt` + `ml/api/main.py` (FastAPI), `docs/fase4/FASE_4_PLAN.md`.
- ⏳ Son solo esqueletos: `mobile/` no tiene código fuente y `ml/` contiene un único archivo Python.

### **2026-10-15 — Proyecto inicializado** · `f3213f5` + `d9ef585`
- ✅ Repositorio creado, estructura base y datos sensibles excluidos del control de versiones.
- ℹ️ **Antecedentes:** el historial conserva commits del 2026-09-05 al 2026-10-04 (`f19acd4` → `672bd44`) de una versión anterior con otro stack (ASP.NET, frontend TS+Vite vanilla, tests xUnit, Telegram y Fase 0 de validación). `d745b90` eliminó ese código (~8.000 líneas) antes del MVP actual.

---

## 📊 Resumen de Fases

| Fase | Estado | Detalle | Última actualización |
|------|--------|---------|----------------------|
| Fase 0: Validación con usuarios | ⏳ Pendiente | Hubo trabajo en la versión anterior (sept.–oct.), no en la actual | — |
| Fase 1: MVP frontend | ✅ Completa | Mapa 2D/3D, dashboard, auth, línea de tiempo, zonas | 2026-10-19 |
| Fase 1: Entrega de alertas | ✅ Completa | SendGrid, Twilio, Swagger | 2026-10-18 |
| Fase 2: Backend e ingesta | ✅ Completa | 6 fuentes: USGS, NOAA, NASA EONET, GDACS, Meteoalarm, NHC (⚠️ NHC sin commitear) + circuit breaker + frescura | 2026-10-20 |
| Fase 3: Infraestructura de producción | ✅ Lista | Métricas, alertas, TLS, backups, status page, CD con rollback | 2026-10-18 |
| Fase 3: Push offline | ✅ Completa | Service Worker + Web Push VAPID | 2026-10-19 |
| Fase 3: Despliegue real | ⏳ Bloqueado (externo) | Falta servidor, DNS, certificado TLS y secretos `PROD_*` | — |
| Fase 4: Motor de alertas | ✅ Completo | Matching de 5 reglas, WS, dedup, zonas círculo/polígono | 2026-10-19 |
| Fase 4: Catálogo de mejoras | 🚧 En curso | Hechas #1 frescura, #2 B5, #3 A3, #4 B1, #5 B3, #6 D1, #7 D2 y A4 NHC | 2026-10-20 |
| Fase 4: Mobile (React Native) | ⏳ Solo esqueleto | `mobile/package.json` | 2026-10-15 |
| Fase 4: ML (FastAPI) | ⏳ Solo esqueleto | `ml/api/main.py` | 2026-10-15 |

---

## 📁 Estructura del Proyecto (2026-10-25)

```
ALERTA360/
├── src/                          # Frontend (React 18 + Vite + Tailwind)
│   ├── App.tsx · main.tsx · index.css · vite-env.d.ts
│   ├── components/               # AuthModal, Dashboard, EventDetailCard, Header, LocationPanel,
│   │                             # Map, Map3D, NotificationsPanel, Sparkline
│   ├── hooks/                    # useAlerts (WS + sondeo), usePushSubscription
│   ├── services/api.ts           # Cliente HTTP (auth, eventos, zonas, notificaciones, push)
│   ├── data/demoEvents.ts        # 178 eventos demo
│   └── types/                    # index.ts, leaflet-heat.d.ts
├── public/                       # sw.js (Service Worker), status.html
├── backend/                      # Fastify 4 + Prisma + PostgreSQL
│   ├── prisma/schema.prisma      # 6 modelos
│   ├── src/
│   │   ├── app.ts · index.ts     # buildApp() + arranque (schedulers de ingesta y digest)
│   │   ├── routes/               # auth, docs, events, geocode, locations, notifications,
│   │   │                         # preferences, sources
│   │   ├── services/
│   │   │   ├── ingestion.ts      # USGS, NOAA, EONET, GDACS, Meteoalarm, NHC + frescura
│   │   │   ├── matching.ts       # Motor de alertas
│   │   │   ├── push.ts           # Web Push VAPID
│   │   │   ├── analysis/         # exposure.ts (población + escalada)
│   │   │   ├── notifications/    # dispatch, email (SendGrid), sms (Twilio), digest
│   │   │   └── sources/          # health.ts (circuit breaker), types.ts
│   │   ├── realtime/             # hub.ts, ws.ts
│   │   ├── middleware/           # errorHandler, requireAuth
│   │   ├── plugins/metrics.ts    # Prometheus
│   │   ├── docs/openapi.ts       # Swagger
│   │   ├── types/web-push.d.ts
│   │   └── utils/                # config (Zod), geo, logger (Pino), prisma
│   └── test/                     # 16 archivos Vitest (146 tests)
├── mobile/                       # React Native (solo package.json)
├── ml/                           # FastAPI (requirements.txt + api/main.py)
├── monitoring/                   # prometheus.yml, alerts.yml, alertmanager.yml, grafana/
├── scripts/                      # deploy.sh, backup.sh, init-letsencrypt.sh
├── .github/workflows/            # ci.yml, deploy.yml
├── docs/
│   ├── FASE_3_PRODUCCION.md      # Runbook de producción
│   ├── fase4/                    # FASE_4_PLAN.md, MOTOR_ALERTAS.md
│   └── redesign/                 # MAPA.md + capturas
├── docker-compose.yml            # Dev
├── docker-compose.prod.yml       # Prod (10 servicios)
├── nginx.conf
└── BITACORA.md                   # Este archivo
```

---

## 📈 Métricas del Proyecto (medidas 2026-10-25)

### Código
- **Frontend:** ~3.990 líneas TS/TSX en 18 archivos (+119 de datos demo)
- **Backend:** ~4.277 líneas TS en 31 archivos
- **Tests backend:** ~2.116 líneas, 16 archivos, 146 tests
- **Componentes React:** 9 + 2 hooks
- **Modelos de BD:** 6 (User, UserPreference, Location, DisasterEvent, Notification, AuditLog)
- **Rutas API:** 8 módulos · **Fuentes de datos:** 6
- **Python:** 1 archivo

### Build
- **Frontend:** 2.465 módulos, ~53 s en la máquina de desarrollo
- **Bundle:** `index` 760 kB (247 kB gzip) + `Map3D` 812 kB (221 kB gzip, carga diferida) + CSS 42 kB / 65 kB. Ambos chunks superan el umbral de aviso de Vite (500 kB).
- **Lighthouse / tiempo de carga:** sin medir desde los rediseños del 2026-10-17

### Calidad
- **Errores TypeScript:** 0 (backend y frontend)
- **Tests:** 146/146 pasan por archivo; la suite completa en paralelo es inestable por timeouts cuando la máquina está cargada (ver Pendientes)

### Documentación
- **Archivos .md:** 18 (raíz + `docs/`)
- **Auditorías:** 3 (`AUDITORIA_FASE_1/2/3.md`)

---

## ⏳ Pendientes y riesgos conocidos

- ⏳ **Commitear A4 NHC** (`ingestion.ts`, `config.ts`, `backend/test/nhc.test.ts`, `.env.example`s, `docker-compose.prod.yml`) junto con `deploy.yml`.
- ⏳ **Meteoalarm en producción:** `METEOALARM_*` tampoco se reenvía en `docker-compose.prod.yml`, así que en prod siempre queda con los valores por defecto (desactivado).
- ⏳ **Tests inestables con carga:** `alert-engine.int.test.ts` (timeout de 5 s) y los hooks de `routes`/`docs` (10 s). Opciones: subir `testTimeout`/`hookTimeout` en `vitest.config.ts` o limitar los workers.
- ⏳ **Ruido en logs de tests:** `dispatch.ts:55` (`buildEmail`) lanza `Cannot read properties of undefined (reading 'severity')` cuando el Prisma falso no devuelve el evento. No rompe nada, pero ensucia la salida.
- ⏳ **Dedup del push en vivo:** el WS recibe la alerta en cada matching; solo se deduplica en BD y visualmente en el cliente.
- ⏳ **Meteoalarm:** el contrato JSON es una suposición; validarlo contra un endpoint real antes de activarlo.
- ⏳ **Bundle:** `index` (760 kB) supera el umbral de Vite; evaluar dividirlo con `manualChunks` o `import()` dinámico.
- ⏳ **`vite.config.ts`:** quitar el `watch.ignored` de `alerta360-ui-redesign/` (la carpeta ya no existe).
- ⏳ **`MEJORAS_DESDE_WORLD_INTEL.md`:** versionarlo o moverlo a `docs/fase4/`.
- ⏳ **Externo:** servidor, DNS, certificado TLS y secretos `PROD_HOST` / `PROD_USER` / `PROD_SSH_KEY`.
- ⏳ **Fase 0:** validar el producto con usuarios reales.
- ⏳ **Mobile y ML:** pasar de esqueleto a desarrollo.

---

## 🔗 Enlaces Importantes

- **Repositorio:** https://github.com/armado719/ALERTA360
- **Documentación:** `README.md` · índice en `INDICE_DOCUMENTACION.md`
- **Arquitectura:** `ALERTA360_ARQUITECTURA_MAESTRA.md`
- **Tech stack:** `ALERTA360_HERRAMIENTAS_RECOMENDADAS.md`
- **Producción:** `docs/FASE_3_PRODUCCION.md`
- **Motor de alertas:** `docs/fase4/MOTOR_ALERTAS.md`

---

## 📞 Contacto

**Propietario del proyecto:** Armado719  
**Email:** arc.fullstack30@gmail.com  
**GitHub:** https://github.com/armado719/ALERTA360

---

## 📝 Notas

- Esta bitácora se actualiza con cada cambio significativo.
- Orden cronológico inverso por fecha de commit; cada entrada indica fecha, commit(s), archivos y estado.
- Los conteos de tests reflejan los tests definidos al cerrar cada commit.

---

**Última actualización:** 2026-10-25  
**Versión de la bitácora:** 1.4  
**Status:** ✅ Activo
