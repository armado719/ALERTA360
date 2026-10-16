# ALERTA360 — Plataforma Global de Alertas Tempranas para Desastres Naturales

**Versión:** 1.0 (Arquitectura Maestra)  
**Fecha:** 2026  
**Estado:** En diseño  
**Propósito:** Documento de control de fases. Gobierna el avance del proyecto.

---

## 📖 Tabla de Contenidos

1. [Visión & Alcance](#visión--alcance)
2. [Problema Identificado](#problema-identificado)
3. [Solución Propuesta](#solución-propuesta)
4. [Stack Tecnológico](#stack-tecnológico)
5. [Modelo de Datos](#modelo-de-datos)
6. [Fases de Desarrollo](#fases-de-desarrollo)
7. [Integraciones Externas](#integraciones-externas)
8. [Criterios de Éxito](#criterios-de-éxito)
9. [Riesgos Identificados](#riesgos-identificados)
10. [Registro de Avance](#registro-de-avance)

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

### Frontend
- **Framework:** React 18+ con TypeScript
- **Build:** Vite
- **Styling:** Tailwind CSS
- **Mapa:** Leaflet + OpenStreetMap (gratis, open source)
- **Notificaciones:** Web Notifications API + Service Workers
- **Almacenamiento local:** IndexedDB (histórico de alertas)
- **Estado:** Zustand (ligero, simple)
- **HTTP:** Axios

### Backend
- **Runtime:** Node.js (Express.js)
- **Lenguaje:** TypeScript
- **Base de datos:** PostgreSQL (eventos, usuarios, preferencias)
- **Cache:** Redis (datos de alertas en tiempo real)
- **Colas:** Bull (procesamiento de ingesta)
- **ORM:** Prisma
- **API Rest:** Express + OpenAPI/Swagger

### DevOps
- **Containerización:** Docker + Docker Compose
- **CI/CD:** GitHub Actions
- **Hosting:** AWS/GCP/DigitalOcean (a definir)
- **Monitoreo:** Prometheus + Grafana

### Seguridad
- **Auth:** JWT (sin OAuth2 en MVP)
- **HTTPS:** SSL/TLS
- **Rate limiting:** Token bucket
- **Validación:** Joi/Zod (backend), TypeScript (frontend)

---

## 📊 Modelo de Datos

### Entidades Principales

```
User
├── id (uuid, PK)
├── email (string, unique)
├── username (string, unique)
├── password_hash (string)
├── preferences (jsonb) {
│   "alert_radius_km": 50,
│   "disaster_types": ["earthquake", "flood", "storm"],
│   "push_enabled": true,
│   "email_enabled": true
│ }
├── created_at
├── updated_at

Location (zonas de interés del usuario)
├── id (uuid, PK)
├── user_id (FK → User)
├── name (string) // "Mi casa", "Trabajo", etc
├── latitude (decimal)
├── longitude (decimal)
├── radius_km (int) // rango de alerta
├── created_at

DisasterEvent (evento detectado)
├── id (uuid, PK)
├── type (enum: earthquake | storm | flood | extreme_rain | landslide | volcanic | hurricane)
├── source (enum: usgs | noaa | nasa | ingv | custom)
├── external_id (string) // ID de la fuente original
├── latitude (decimal)
├── longitude (decimal)
├── magnitude (decimal, nullable) // para terremotos
├── intensity (int 1-10, nullable) // intensidad percibida
├── description (text)
├── raw_data (jsonb) // payload completo de la API origen
├── confidence (int 0-100) // qué tan seguro estamos del evento
├── occurred_at (timestamp)
├── detected_at (timestamp) // cuándo lo procesó ALERTA360
├── updated_at (timestamp) // última actualización
├── is_active (boolean) // si sigue siendo relevante

AlertNotification (notificación enviada)
├── id (uuid, PK)
├── user_id (FK → User)
├── event_id (FK → DisasterEvent)
├── location_id (FK → Location, nullable)
├── distance_km (decimal) // distancia del evento a zona de interés
├── channel (enum: push | email | sms)
├── sent_at (timestamp)
├── delivered_at (timestamp, nullable)
├── read_at (timestamp, nullable)
├── status (enum: pending | sent | delivered | failed)

AuditLog (trazabilidad)
├── id (uuid, PK)
├── user_id (FK → User, nullable)
├── action (string)
├── resource (string)
├── metadata (jsonb)
├── created_at
```

---

## 🚀 Fases de Desarrollo

### **FASE 0: VALIDACIÓN & PLANIFICACIÓN** 
**Duración:** 2 semanas  
**Responsable:** Equipo técnico  

#### Objetivos
- [ ] Confirmar acceso a APIs de USGS, NOAA y otras fuentes
- [ ] Validar latencia de ingesta de datos (objetivo: <2 min)
- [ ] Mapear requerimientos exactos de usuarios (encuesta/entrevistas)
- [ ] Definir stack final (validar que AWS/GCP disponibles)
- [ ] Crear prototipo de mapa interactivo

#### Entregables
- Documento de validación API (latencia, disponibilidad, limits)
- Resumen de entrevistas con usuarios potenciales
- Matriz de comparación: Leaflet vs Mapbox vs Google Maps
- Prototipo funcional de mapa
- Presupuesto estimado de infraestructura

#### Criterios de Salida (Checklist de CIERRE)
- ✅ Al menos 2 APIs de datos confirmadas y accesibles
- ✅ Prototipo de mapa renderiza eventos reales
- ✅ Equipo acuerda stack final
- ✅ Timeline y presupuesto aprobados
- ✅ Repositorio Git inicializado con estructura base

---

### **FASE 1: MVP - CORE DE ALERTAS**
**Duración:** 8 semanas  
**Objetivo:** Plataforma funcional con alertas en tiempo real

#### Sprint 1: Infraestructura & Backend Base (Semana 1-2)
- [ ] Configurar Docker/PostgreSQL/Redis
- [ ] Setup CI/CD con GitHub Actions
- [ ] API base: Express.js con rutas REST
- [ ] Schema de BD (Prisma migrations)
- [ ] Autenticación JWT (registro/login)
- [ ] Endpoint `/api/events` (GET con filtros)

#### Sprint 2: Ingesta de Datos (Semana 3-4)
- [ ] Adaptador USGS Earthquakes API
- [ ] Adaptador NOAA Weather/Alerts API
- [ ] Job de ingesta cada 5 minutos
- [ ] Validación y normalización de datos
- [ ] Endpoint `/api/events/{id}` (detalle)
- [ ] Tests unitarios de parsers

#### Sprint 3: Notificaciones & Preferencias (Semana 5-6)
- [ ] Modelo de User + Location + Preferences
- [ ] Motor de matching: evento → usuarios afectados
- [ ] Notificaciones push via Web Notifications API
- [ ] Email básico (SendGrid)
- [ ] Endpoint `/api/users/me` y `/api/locations`

#### Sprint 4: Frontend MVP (Semana 7-8)
- [ ] React + Vite setup
- [ ] Mapa interactivo con Leaflet
- [ ] Componentes: EventList, EventDetail, UserPreferences
- [ ] Renderizar eventos en tiempo real en mapa
- [ ] Login/registro básico
- [ ] Conectar a API backend

#### Entregables al Final de Fase 1
- Plataforma web funcional en `alerta360.local`
- API REST documentada (Swagger/OpenAPI)
- Base de datos con 1 semana de histórico de eventos
- Tests (>70% cobertura backend)
- Docker Compose para levantar todo local
- Documentación de deployment

#### Criterios de Salida (Checklist de CIERRE)
- ✅ Mapa renderiza eventos reales en tiempo real
- ✅ Usuario puede registrarse, definir zonas de interés, recibir alertas
- ✅ Alertas llegan en <2 minutos del evento
- ✅ Frontend funcional en móvil y escritorio
- ✅ API documentada y testeable
- ✅ Sin datos hardcodeados (todo de APIs reales)
- ✅ 0 errores críticos en producción local

---

### **FASE 2: PULIDO & ESCALABILIDAD**
**Duración:** 4 semanas  
**Objetivo:** Preparar para producción

#### Objetivos
- [ ] Mejorar UX/UI basado en user testing
- [ ] Agregar más tipos de desastres (landslides, volcanic)
- [ ] Implementar histórico avanzado (charts, trends)
- [ ] Optimizar performance (CDN, lazy loading)
- [ ] Security audit (OWASP top 10)
- [ ] Scaling test (¿Puede manejar 10k usuarios simultáneos?)
- [ ] Traducir a inglés

#### Entregables
- Dashboard mejorado con estadísticas
- Histórico de eventos con gráficos
- App optimizada (<3s load time)
- Reporte de seguridad auditado
- Load testing report

#### Criterios de Salida
- ✅ Pasó security audit (0 críticos)
- ✅ Load test: 10k usuarios sin degradación
- ✅ Lighthouse score >90
- ✅ UX testado con 20+ usuarios reales
- ✅ Listo para producción

---

### **FASE 3: PRODUCCIÓN & GO-LIVE**
**Duración:** 2 semanas  
**Objetivo:** Deploy a producción

#### Objetivos
- [ ] Seleccionar proveedor cloud final (AWS/GCP/DO)
- [ ] CI/CD a producción
- [ ] SSL/TLS con Let's Encrypt
- [ ] Configurar CDN (CloudFlare)
- [ ] Monitoreo 24/7 (Prometheus + AlertManager)
- [ ] Backup automático DB
- [ ] Status page pública
- [ ] Lanzar versión pública

#### Entregables
- Plataforma en alerta360.com (dominio)
- Monitoring dashboard
- Runbook de operaciones
- Plan de disaster recovery

#### Criterios de Salida
- ✅ 99.9% uptime SLA
- ✅ Alertas llegan en <2 min garantizado
- ✅ Equipo on-call 24/7
- ✅ 1000+ usuarios activos en primer mes

---

### **FASE 4: EXPANSIÓN (POST-MVP)**
**Duración:** Abierta  

#### Roadmap (no bloqueante para MVP)
- [ ] Apps móviles (React Native / Flutter)
- [ ] Integración con sistemas 911
- [ ] Modelos ML predictivos
- [ ] SMS notifications
- [ ] Webhooks para terceros (Slack, Discord)
- [ ] Soporte multi-idioma
- [ ] Datos de impacto post-desastre (víctimas, daños)
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

#### 2. NOAA Weather Alerts
- **URL:** https://api.weather.gov/alerts/active
- **Datos:** Alertas de tormenta, huracán, inundación (USA + territorios)
- **Latencia:** ~1-2 minutos
- **Formato:** JSON
- **Rate limit:** No especificado (público)
- **Implementación:** Parser, filtrar por zona

#### 3. NASA FIRMS (Fire Information for Resource Management System)
- **URL:** https://firms.modaps.eosdis.nasa.gov/
- **Datos:** Incendios detectados por satélite
- **Latencia:** ~4 horas
- **Implementación:** Ingesta diaria

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
- Deduplicación por geohash + timestamp
- Panel de administración para marcar eventos como "falso"
- Machine learning para filtrar ruido (Fase 2+)

### Riesgo 3: Escalabilidad en tiempo real
**Probabilidad:** MEDIA | **Impacto:** ALTO  
**Mitigación:**
- Redis para cache de eventos
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
**Fase actual:** DISEÑO (Pre-Fase 0)  
**Porcentaje completado:** 0%  
**Última actualización:** 2026

### Timeline Estimado
| Fase | Inicio | Fin | Duración |
|------|--------|-----|----------|
| Fase 0 (Validación) | Semana 1 | Semana 2 | 2 semanas |
| Fase 1 (MVP) | Semana 3 | Semana 10 | 8 semanas |
| Fase 2 (Pulido) | Semana 11 | Semana 14 | 4 semanas |
| Fase 3 (Go-Live) | Semana 15 | Semana 16 | 2 semanas |
| **TOTAL** | - | - | **16 semanas (~4 meses)** |

### Hitos Clave
- [ ] **Hito 1:** Fase 0 completada (Semana 2)
- [ ] **Hito 2:** Backend con ingesta USGS + NOAA (Semana 4)
- [ ] **Hito 3:** Frontend con mapa interactivo (Semana 8)
- [ ] **Hito 4:** Alertas en tiempo real funcionando (Semana 8)
- [ ] **Hito 5:** MVP en producción (Semana 16)

---

## 📞 Contacto & Gobernanza

**Propietario del Producto:** Tu nombre  
**Equipo técnico:** Asignado  
**Decisiones clave se toman:** En reuniones semanales  

**Regla dura:** 
> No se avanza de fase hasta que el checklist de salida esté 100% completo con evidencia real. Sin checklist completado, no hay progresión.

---

**Versión del documento:** 1.0  
**Próxima revisión:** Después de Fase 0  
**Historial de cambios:** [Pendiente de agregar cambios futuros]
