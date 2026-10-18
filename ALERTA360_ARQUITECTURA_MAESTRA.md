# ALERTA360 — Plataforma Global de Alertas Tempranas para Desastres Naturales

**Versión:** 1.3  
**Fecha:** 2026-10-18  
**Estado:** MVP funcional en `main` — motor de alertas entregado (Hito 6 ✅); falta entrega real de email/SMS  
**Propósito:** Documento de control de fases. Gobierna el avance del proyecto.

---

## 📖 Tabla de Contenidos

1. [Visión & Alcance](#visión--alcance)
2. [Problema Identificado](#problema-identificado)
3. [Solución Propuesta](#solución-propuesta)
4. [Stack Tecnológico](#stack-tecnológico)
5. [Modelo de Datos](#modelo-de-datos)
6. [Visualización y mapa](#visualización-y-mapa)
7. [Fases de Desarrollo](#fases-de-desarrollo)
8. [Integraciones Externas](#integraciones-externas)
9. [Criterios de Éxito](#criterios-de-éxito)
10. [Riesgos Identificados](#riesgos-identificados)
11. [Registro de Avance](#registro-de-avance)

---

## 🎯 Visión & Alcance

### Visión
Crear la **plataforma unificada de alertas tempranas para desastres naturales** más accesible del mundo. Un único lugar donde ciudadanos, gobiernos e instituciones puedan:
- Recibir alertas en tiempo real sobre terremotos, avalanchas, lluvias extremas, tormentas, inundaciones, erupciones volcánicas, etc.
- Ver en tiempo real qué está ocurriendo en cualquier parte del planeta
- Tomar decisiones informadas basadas en datos consolidados

### Alcance (MVP - Fase 1)
- **Cobertura geográfica:** Global
- **Tipos de desastre:** Terremotos, Tormentas, Lluvias extremas, Inundaciones
- **Usuarios:** Ciudadanos civiles (fase inicial)
- **Interfaces:** Web responsive (móvil + escritorio)
- **Tiempo real:** Actualización cada 5 minutos

### Out of Scope (Futuro)
- Apps móviles nativas (iOS/Android)
- Integración con sistemas 911/emergencia
- Modelos predictivos ML avanzados
- Múltiples idiomas (comenzamos con español/inglés)

---

## 🔍 Problema Identificado

### Situación Actual
1. **Fragmentación de fuentes:** No existe una plataforma que consolide alertas de desastres naturales
2. **Acceso disperso:** Ciudadanos deben consultar múltiples sitios (USGS, NOAA, etc.)
3. **Falta de personalización:** No hay alertas por proximidad geográfica
4. **Brecha de información:** Comunidades vulnerables sin acceso a información temprana
5. **Duración de alerta:** Lag entre evento real y notificación al público

### Impacto
- Pérdida de vidas por falta de tiempo de reacción
- Decisiones inadecuadas sin datos unificados
- Pánico o desinformación por ruido de múltiples fuentes

---

## ✅ Solución Propuesta

### Propuesta de Valor
**ALERTA360** consolida datos de múltiples agencias meteorológicas, sísmicas y de desastres naturales en una sola plataforma que permite:

1. **Alertas personalizadas:** El usuario define zonas de interés y recibe notificaciones
2. **Mapa interactivo:** Visualización en tiempo real de eventos globales
3. **Información contextualizada:** Datos de impacto, recomendaciones de acción
4. **Acceso igualitario:** Funciona sin requerimientos técnicos avanzados
5. **Actualizaciones en tiempo real:** Sin lag entre evento y notificación

### Diferenciadores
- 🌍 **Único:** Primera plataforma que unifica TODO tipo de desastres naturales
- ⚡ **Rápida:** Alertas en menos de 2 minutos del evento
- 📱 **Accesible:** Funciona en cualquier dispositivo, sin instalación
- 🎯 **Personalizada:** Alertas solo para zones/tipos que importan al usuario
- 🆓 **Gratuita:** Información de desastres naturales es derecho humano

---

## 💻 Stack Tecnológico

> Estado a **2026-10-18**. Solo figura como «en uso» lo que el código importa hoy; lo demás está marcado como planificado.

### Frontend

| Pieza | En uso | Notas |
|---|---|---|
| Framework | React 18 + TypeScript + Vite 5 | `tsc --noEmit` limpio |
| Estilos | Tailwind CSS 3 | paleta oscura `#0b131d`, panel system propio |
| Mapa 2D | Leaflet 1.9 + react-leaflet 4.2 | teselas Esri: Oscuro / Satélite / Terreno / Relieve, sin API key |
| Mapa 3D | MapLibre GL **4.7.1** | globo, terreno AWS, satélite Esri, edificios OpenFreeMap |
| Calor | `leaflet.heat` (2D) + capa `heatmap` nativa (3D) | peso por severidad |
| Gráficas | Chart.js 4 + react-chartjs-2 | sparklines y dona por tipo |
| Animación | Framer Motion 14 | paneles, tarjetas y barra de tiempo |
| Iconos | lucide-react | — |
| HTTP | Axios | cliente en `src/services/api.ts` |
| Validación | Zod | compartido con el backend |

**Planificado / no implementado:** Zustand (instalado, sin uso), IndexedDB (histórico local), Web Notifications + Service Worker (push), PWA.

### Backend

| Pieza | En uso | Notas |
|---|---|---|
| Runtime | Node.js + Fastify | rutas `auth`, `events`, `locations` |
| ORM / BD | Prisma + PostgreSQL 16 | 6 modelos sincronizados con `db push` |
| Auth | `@fastify/jwt` + bcrypt | JWT y middleware `requireAuth` compartido |
| Config | Zod (`src/utils/config.ts`) | fail-fast de variables de entorno |
| Logs | Pino + pino-pretty | logging estructurado |
| Ingesta | `src/services/ingestion.ts` | USGS + NOAA cada 5 min vía `setInterval`; dedupe por `externalId + source` |
| Tiempo real | `@fastify/websocket` | instalado, aún sin canal de alertas |

**Planificado / no implementado:** Redis (caché), Bull (colas), `@fastify/swagger` (OpenAPI), SendGrid (email), `node-cron` (hoy se usa `setInterval`), motor de matching evento → usuarios.

### DevOps y seguridad

- Docker + Docker Compose (10 servicios en producción: db, backend, nginx, certbot, prometheus, alertmanager, grafana, node-exporter, postgres-exporter y backup), CI/CD con GitHub Actions.
- Observabilidad: `GET /metrics` (prom-client), 8 reglas de alerta, dashboard provisionado y página de estado pública en `/status`.
- Seguridad: JWT, HTTPS/TLS y rate limiting en nginx, validación con Zod, variables de entorno validadas al arranque.

---

## 📊 Modelo de Datos

### Entidades Principales

Verificado contra `backend/prisma/schema.prisma` el 2026-10-18: los seis modelos coinciden campo por campo.

```
User
├── id (String, PK, uuid)
├── email (String, unique)
├── username (String, unique)
├── passwordHash (String)
├── createdAt (DateTime)
├── updatedAt (DateTime)
├── locations (Location[])
├── notifications (Notification[])
└── preferences (UserPreference, 1:1)

UserPreference (preferencias de alerta del usuario)
├── id (String, PK, uuid)
├── userId (String, unique, FK → User)
├── alertRadiusKm (Int, default: 50)
├── disasterTypes (String[], default: ["earthquake", "storm", "flood", "rain"])
├── pushEnabled (Boolean, default: true)
├── emailEnabled (Boolean, default: true)
├── smsEnabled (Boolean, default: false)
├── createdAt (DateTime)
└── updatedAt (DateTime)

Location (zonas de interés del usuario)
├── id (String, PK, uuid)
├── userId (String, FK → User)
├── user (User)
├── name (String) // "Mi casa", "Trabajo", etc
├── latitude (Float)
├── longitude (Float)
├── radiusKm (Int, default: 50) // rango de alerta
├── createdAt (DateTime)
├── updatedAt (DateTime)
├── notifications (Notification[])
└── @@index([userId])

DisasterEvent (evento detectado)
├── id (String, PK, uuid)
├── type (String) // earthquake, storm, flood, rain, landslide, volcanic, hurricane
├── source (String) // usgs, noaa, nasa, custom
├── externalId (String, nullable) // ID de la fuente original
├── latitude (Float)
├── longitude (Float)
├── magnitude (Float, nullable) // para terremotos
├── intensity (Int, nullable) // intensidad percibida (1-10)
├── title (String)
├── description (String)
├── severity (String) // low, medium, high, critical
├── occurredAt (DateTime)
├── detectedAt (DateTime, default: now())
├── updatedAt (DateTime)
├── rawData (Json, nullable) // payload completo de la API origen
├── isActive (Boolean, default: true)
├── notifications (Notification[])
├── @@index([type])
├── @@index([occurredAt])
├── @@index([isActive])
└── @@index([latitude, longitude])

Notification (notificación enviada)
├── id (String, PK, uuid)
├── userId (String, FK → User)
├── user (User)
├── eventId (String, FK → DisasterEvent)
├── event (DisasterEvent)
├── locationId (String, nullable, FK → Location)
├── location (Location, nullable)
├── distanceKm (Float)
├── channel (String) // push, email, sms
├── status (String) // pending, sent, delivered, failed
├── sentAt (DateTime, default: now())
├── deliveredAt (DateTime, nullable)
├── readAt (DateTime, nullable)
├── @@index([userId])
├── @@index([eventId])
└── @@index([status])

AuditLog (trazabilidad)
├── id (String, PK, uuid)
├── userId (String, nullable, FK → User)
├── action (String)
├── resource (String)
├── metadata (Json, nullable)
├── createdAt (DateTime)
├── @@index([userId])
└── @@index([createdAt])
```

---

## 🗺️ Visualización y mapa

El mapa es hoy el diferencial del producto y funciona **sin ninguna API key**.

### 2D — `src/components/Map.tsx`

- **Cuatro estilos** conmutables: Oscuro (Esri Dark Gray + referencia), Satélite (World Imagery + límites), Terreno (World Topo) y Relieve (Shaded Relief). Cada uno con su filtro CSS vía `data-basemap`.
- **Mapa de calor** (`leaflet.heat`): radio 30, blur 24, `maxZoom` 7, gradiente azul → rojo y peso por severidad (crítico 1.0 · alto 0.72 · medio 0.45 · bajo 0.2).
- **Agrupación**: celdas de 56 px fusionadas a menos de 40 px; clic en burbuja → `fitBounds` a la zona; clic en evento → ficha.
- **Línea de tiempo de 24 h**: ventana `[ahora − 24 h, ahora − X]`, play/pausa (15 min cada 110 ms) y slider de 0.25 h. El calor, los clusters y los contadores acompañan la reproducción.
- Panel de capas de 224 px y atribuciones que se elevan cuando la barra de tiempo está visible.

### 3D — `src/components/Map3D.tsx`

- MapLibre GL 4.7.1 con proyección globo, `pitch` 38°, `maxPitch` 85° y terreno AWS (exaggeration 1.25).
- Edificios `fill-extrusion` desde **OpenFreeMap** a zoom ≥ 13, con color por `render_height`; al activarlos la cámara vuela a la ciudad (Bogotá por defecto).
- Topónimos (`place`) con Noto Sans; heatmap nativo con radio 26 → 74 px e intensidad 1.6 → 3.0 según zoom.
- Clusters propios y clic con zoom de expansión (más respaldo heurístico si la API de MapLibre no responde).
- Carga diferida con `React.lazy`: chunk `Map3D-*.js` de 812 kB (221 kB gzip) que no pesa en el arranque 2D.

Detalle técnico y capturas: [`docs/redesign/MAPA.md`](docs/redesign/MAPA.md).

---

## 🚀 Fases de Desarrollo

> Estado a **2026-10-18**. `[x]` = hecho y verificable en el repositorio; `[ ]` = pendiente.
> Aplica la «regla dura» del final: una fase solo se marca completa cuando su checklist está entero.

### **FASE 0: VALIDACIÓN & PLANIFICACIÓN** — ✅ cerrada (2026-10-15)
**Duración planificada:** 2 semanas

#### Objetivos
- [x] Confirmar acceso a APIs de USGS, NOAA y otras fuentes
- [x] Validar latencia de ingesta (objetivo <2 min): USGS 1-5 min, NOAA 1-2 min
- [ ] Mapear requerimientos exactos de usuarios (encuesta/entrevistas)
- [x] Definir stack final
- [x] Crear prototipo de mapa interactivo

#### Entregables
- [x] Documento de validación de APIs (esta maestra + `docs/redesign/MAPA.md`)
- [ ] Resumen de entrevistas con usuarios potenciales
- [x] Matriz de comparación de mapas (se optó por Esri + OpenFreeMap, sin API key)
- [x] Prototipo funcional de mapa
- [ ] Presupuesto estimado de infraestructura

#### Criterios de Salida
- ✅ Al menos 2 APIs confirmadas y accesibles
- ✅ El prototipo renderiza eventos reales
- ✅ Stack acordado
- ⏳ Timeline aprobado; presupuesto no definido

---

### **FASE 1: MVP - CORE DE ALERTAS** — 🚧 95 % (motor de alertas y bandeja entregados; faltan email/SMS reales y Swagger)
**Duración planificada:** 8 semanas

#### Sprint 1: Infraestructura & Backend Base — ✅
- [x] Docker + PostgreSQL (Redis todavía no se usa)
- [x] CI/CD con GitHub Actions
- [x] API base con **Fastify** y rutas REST
- [x] Schema de BD con Prisma (`db push`)
- [x] Autenticación JWT (registro/login)
- [x] Endpoint `/api/events` con filtros

#### Sprint 2: Ingesta de Datos — ✅
- [x] Adaptador USGS Earthquakes
- [x] Adaptador NOAA Weather/Alerts
- [x] Job de ingesta cada 5 minutos (`setInterval`)
- [x] Validación y normalización (Zod + mapeo de severidad)
- [x] Endpoint `/api/events/:id`
- [ ] Tests unitarios de parsers (aún no hay suite de tests)

#### Sprint 3: Notificaciones & Preferencias — 🚧 85 %
- [x] Modelos `User` + `Location` + `UserPreference` (con `minSeverity`)
- [x] Motor de matching evento → usuarios afectados (`services/matching.ts`, 5 reglas + dedupe en BD)
- [x] Push en vivo por WebSocket (`/ws/alerts`) y bandeja en la UI
- [x] Endpoints `/api/notifications/*` y `/api/preferences`
- [ ] Email real (SendGrid) y SMS (Twilio): hoy la notificación queda `pending`
- [x] Endpoints `/api/auth/me` y `/api/locations`

Detalle: [`docs/fase4/MOTOR_ALERTAS.md`](docs/fase4/MOTOR_ALERTAS.md).

#### Sprint 4: Frontend MVP — ✅ (superado: mapa 2D/3D avanzado)
- [x] React + Vite
- [x] Mapa interactivo (Leaflet 2D + MapLibre 3D)
- [x] Componentes de lista, detalle y preferencias
- [x] Eventos en tiempo real en el mapa
- [x] Login/registro
- [x] Conexión con la API (con modo demo de respaldo)

#### Entregables al final de Fase 1
- [x] Plataforma web funcional en `localhost:5173`
- [ ] API documentada con OpenAPI (Swagger pendiente)
- [x] Base de datos con histórico de eventos
- [ ] Tests con >70 % de cobertura (hoy: 37 tests de motor, geo y API; cobertura sin medir)
- [x] Docker Compose para levantar todo en local
- [x] Documentación de despliegue (parcial, ver Fase 3)

#### Criterios de Salida
- ✅ El mapa renderiza eventos reales
- ⏳ Registro y zonas de interés funcionan, pero **las alertas todavía no llegan**
- ⏳ Latencia <2 min: depende del motor de alertas
- ✅ Frontend funcional en móvil y escritorio
- ⏳ API testeable, sin Swagger
- ✅ Sin datos hardcodeados en producción (el modo demo es explícito)
- ✅ 0 errores críticos en local

---

### **FASE 2: PULIDO & ESCALABILIDAD** — 🚧 40 %
**Duración planificada:** 4 semanas

- [x] UX/UI rediseñada («Centro de Mando» oscuro) — 2026-10-17/18
- [x] Más tipos de desastre en modelo y demo (landslide, volcanic, hurricane)
- [x] Visualización avanzada: calor, edificios 3D, clusters y línea de tiempo
- [x] Histórico básico (sparklines y dona por tipo)
- [x] Optimización por lazy loading (`Map3D` en chunk aparte)
- [ ] Security audit (OWASP Top 10)
- [ ] Load testing (10k usuarios)
- [ ] Traducción a inglés
- [ ] Histórico avanzado (tendencias por rango de fechas)

#### Criterios de Salida
- [ ] Security audit sin hallazgos críticos
- [ ] Load test de 10k usuarios
- ⏳ Lighthouse >90 (sin re-medir tras el rediseño)
- [ ] UX testada con 20+ usuarios

---

### **FASE 3: PRODUCCIÓN & GO-LIVE** — 🚧 85 % (todo lo del repo listo; falta desplegar)
**Duración planificada:** 2 semanas · **Runbook:** [`docs/FASE_3_PRODUCCION.md`](docs/FASE_3_PRODUCCION.md)

- [ ] Seleccionar proveedor cloud final — *recomendado Hetzner CX22 o DigitalOcean; decisión externa*
- [x] CI/CD preparado para producción (imagen en ghcr + `dist/` por rsync, `docker compose` v2, `prisma db push`, health check y rollback automático)
- [x] SSL/TLS con Let's Encrypt (nginx + certbot con renovación cada 12 h)
- [ ] CDN — *configuración de cache lista; falta activar Cloudflare*
- [x] Monitoreo: `/metrics` con `prom-client`, Prometheus, 8 reglas de alerta, Alertmanager y dashboard provisionado en Grafana
- [x] Backup automático de BD (servicio diario, retención de 7 días, S3 opcional)
- [x] Status page pública en `/status`
- [ ] Lanzamiento público — *depende del dominio y del servidor*

#### Criterios de Salida
- [ ] 99.9 % de uptime (medible solo en producción)
- [ ] Alertas <2 min garantizadas (motor listo; falta medirlo en producción)
- [ ] Equipo on-call
- [ ] 1000+ usuarios activos el primer mes

---

### **FASE 4: EXPANSIÓN (POST-MVP)** — estructura creada
**Duración:** abierta

- [x] Estructura `mobile/` y `ml/` con scaffold
- [ ] Apps móviles (React Native / Flutter)
- [ ] Integración con sistemas 911
- [ ] Modelos ML predictivos
- [ ] SMS
- [ ] Webhooks (Slack, Discord)
- [ ] Multi-idioma
- [ ] Datos de impacto post-desastre
- [ ] Integración con gobiernos locales

---

## 🔗 Integraciones Externas

### Fase 1 (MVP - OBLIGATORIAS)

#### 1. USGS Earthquake Hazards Program
- **URL:** https://earthquake.usgs.gov/earthquakes/feed/v1.0/
- **Datos:** Terremotos globales en tiempo real
- **Latencia:** ~1-5 minutos
- **Rate limit:** Ilimitado (es pública)
- **Formato:** GeoJSON
- **Implementación:** Parser en Node.js, ingesta cada 5 min
- **Estado:** ✅ implementado (`backend/src/services/ingestion.ts`)

#### 2. NOAA Weather Alerts
- **URL:** https://api.weather.gov/alerts/active
- **Datos:** Alertas de tormenta, huracán, inundación (USA + territorios)
- **Latencia:** ~1-2 minutos
- **Formato:** JSON
- **Rate limit:** No especificado (público)
- **Implementación:** Parser, filtrar por zona
- **Estado:** ✅ implementado (`backend/src/services/ingestion.ts`)

#### 3. NASA FIRMS (Fire Information for Resource Management System)
- **URL:** https://firms.modaps.eosdis.nasa.gov/
- **Datos:** Incendios detectados por satélite
- **Latencia:** ~4 horas
- **Implementación:** Ingesta diaria
- **Estado:** ⏳ pendiente

### Fase 2+ (OPCIONALES)
- **INGV** (Italia): Erupciones volcánicas
- **Copernicus** (EU): Inundaciones, desastres varios
- **Local weather APIs:** Wunderground, OpenWeatherMap

---

## 🎯 Criterios de Éxito

### MVP (Final Fase 1)
| Métrica | Target | Medida |
|---------|--------|--------|
| Cobertura de desastres | 4 tipos | Terremotos, Tormentas, Inundaciones, Lluvias |
| Latencia de alerta | <2 min | Desde evento real hasta notificación usuario |
| Disponibilidad | 99% | En primeras 2 semanas de producción |
| UX Score | >8/10 | Encuesta de 50 usuarios |
| Uptime API | 99.5% | En 30 días |
| Load | 1,000 usuarios simultáneos | Sin degradación |

> **Estado a 2026-10-18:** cobertura de 4 tipos ✅ · motor de alertas ✅ (latencia real sin medir en producción) · disponibilidad, UX y load sin medir.

### Post-Lanzamiento (Fase 3+)
- 100k usuarios en 6 meses
- 5+ tipos de desastres cubiertos
- Partnerships con agencias nacionales de emergencia
- Reducción verificable de tiempo de reacción en zonas piloto

---

## ⚠️ Riesgos Identificados

### Riesgo 1: Disponibilidad de APIs externas
**Probabilidad:** ALTA | **Impacto:** CRÍTICO  
**Mitigación:**
- Caché de últimos 7 días de eventos
- Endpoint `/api/status` que reporta salud de cada fuente
- Alertar a usuarios si hay lag en ingesta

### Riesgo 2: Falsos positivos / eventos duplicados
**Probabilidad:** MEDIA | **Impacto:** ALTO  
**Mitigación:**
- Deduplicación por `externalId + source` (implementada en la ingesta)
- Panel de administración para marcar eventos como "falso"
- Machine learning para filtrar ruido (Fase 2+)

### Riesgo 3: Escalabilidad en tiempo real
**Probabilidad:** MEDIA | **Impacto:** ALTO  
**Mitigación:**
- Redis para caché de eventos (planificado); hoy la mitigación es agrupación + mapa de calor + carga diferida del 3D
- WebSockets solo para usuarios suscritos a zonas activas
- CDN para assets estáticos

### Riesgo 4: Privacidad de datos de usuarios
**Probabilidad:** MEDIA | **Impacto:** ALTO  
**Mitigación:**
- GDPR-compliant (sin vender datos)
- Encriptación en tránsito (TLS)
- Política privada clara
- Audits de seguridad trimestrales

### Riesgo 5: Adoptación por usuarios
**Probabilidad:** MEDIA | **Impacto:** MEDIO  
**Mitigación:**
- Publicidad en redes sociales
- Partnerships con ONGs de desastres naturales
- Presencia en medios (tech news, etc.)

---

## 📋 Registro de Avance

### Estado General del Proyecto
**Fase actual:** Fase 1 cerrando (motor de alertas) + Fase 2 en curso (UX y visualización ya entregadas)

**Porcentaje completado:**
- Fase 0 (Validación): ✅ 100 %
- Fase 1 (MVP): 🚧 95 % — frontend, auth, ingesta, motor de alertas y bandeja listos; faltan email/SMS reales y Swagger
- Fase 2 (Pulido): 🚧 40 % — UX y visualización hechas; faltan auditoría, load test e i18n
- Fase 3 (Producción): 🚧 85 % — métricas, alertas, TLS, backups y status page listos; falta desplegar
- Fase 4 (Expansión): 🚧 10 % — solo estructura

**Última actualización:** 2026-10-18

### Timeline Real

| Fase | Plan original | Estado real |
|------|---------------|-------------|
| Fase 0 (Validación) | Semanas 1-2 | ✅ 2026-10-15 |
| Fase 1 (MVP) | Semanas 3-10 | 🚧 2026-10-15 → 2026-10-18 (95 %) |
| Fase 2 (Pulido) | Semanas 11-14 | 🚧 iniciada 2026-10-17 (UX y mapa) |
| Fase 3 (Go-Live) | Semanas 15-16 | 🚧 2026-10-18 infraestructura lista; deploy pendiente |
| **Total** | 16 semanas | **desviado**: MVP en 4 días, producción sin fecha |

### Hitos Clave
- [x] **Hito 1:** Fase 0 documentada (validación, stack, plan) — 2026-10-15
- [x] **Hito 2:** Backend con schema Prisma (6 modelos) + Docker + health check — 2026-10-15
- [x] **Hito 3:** Frontend MVP con mapa + dashboard interactivo — 2026-10-15
- [x] **Hito 4:** Ingesta real USGS + NOAA con deduplicación — 2026-10-17
- [x] **Hito 5:** Rediseño «Centro de Mando» + mapa 2D/3D (capas, calor, edificios, clusters, timeline) — 2026-10-18
- [x] **Hito 6:** Motor de alertas, bandeja y push por WebSocket — 2026-10-18 (email/SMS reales pendientes)
- [x] **Hito 7:** Producción lista: métricas, dashboard, alertas, backups, TLS y status page — 2026-10-18
- [ ] **Hito 8:** MVP en producción (deploy real) — PENDIENTE

---

## 📞 Contacto & Gobernanza

**Propietario del Producto:** Armando Ramírez Cardozo  
**Email:** arc.fullstack30@gmail.com  
**GitHub:** https://github.com/armado719/ALERTA360  
**Equipo técnico:** Asignado  
**Decisiones clave se toman:** En reuniones semanales

**Regla dura:** 
> No se avanza de fase hasta que el checklist de salida esté 100% completo con evidencia real. Sin checklist completado, no hay progresión.

---

**Versión del documento:** 1.3  
**Próxima revisión:** al desplegar en producción (Hito 7)  
**Historial de cambios:** v1.0 (diseño original) → v1.1 (stack Fastify, modelo UserPreference, estado y contacto) → v1.2 (stack real con mapa 2D/3D sin API key, sección de visualización, fases y avance al 2026-10-18, deduplicación por `externalId + source`) → v1.3 (motor de alertas y bandeja entregados: Hito 6, Fase 1 al 95 %)
