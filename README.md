# 🌍 ALERTA360 — Plataforma Global de Alertas Tempranas para Desastres Naturales

**Versión:** 0.1.0 (MVP)  
**Estado:** En desarrollo - Fase 1  
**Última actualización:** 2026

---

## 📖 Descripción

ALERTA360 es una plataforma web moderna que consolida alertas en tiempo real sobre desastres naturales de múltiples fuentes (USGS, NOAA, NASA) en una sola interfaz intuitiva.

**¿El problema?**  
Ciudadanos, gobiernos e instituciones deben consultar múltiples sitios para obtener información de emergencias (terremotos, tormentas, inundaciones, etc.).

**¿La solución?**  
Un único dashboard global donde ver todos los desastres naturales activos, filtrar por tipo y zona de interés, y recibir alertas personalizadas.

---

## 🎯 Features MVP (Fase 1)

- ✅ **Mapa interactivo global** con Leaflet
- ✅ **Dashboard de eventos en tiempo real**
- ✅ **Filtros por tipo de desastre** (terremotos, tormentas, inundaciones, lluvia extrema)
- ✅ **Datos reales** desde USGS y NOAA
- ✅ **Diseño responsive** (móvil + escritorio)
- ✅ **Interfaz en español**
- 🔄 **Actualización automática** cada 5 minutos

---

## 🛠 Tech Stack

### Frontend
- **React 18** — Framework UI
- **Vite** — Build tool ultrarrápido
- **Tailwind CSS** — Estilos con utilidades
- **Leaflet + react-leaflet** — Mapas interactivos
- **Axios** — HTTP client
- **TypeScript** — Type safety

### Backend (Próximas fases)
- **Fastify** — API HTTP rápida
- **Node.js** — Runtime
- **PostgreSQL** — Base de datos
- **Prisma** — ORM

### DevOps
- **Vite** — Dev server + bundling
- **Docker Compose** — Desarrollo local

---

## 🚀 Cómo Empezar

### Requisitos
- Node.js 18+
- npm o yarn

### Instalación

```bash
# Clonar el repo
git clone https://github.com/armado719/ALERTA360.git
cd ALERTA360

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

La app se abrirá en `http://localhost:5173`

### Build para producción

```bash
npm run build
npm run preview
```

Output en `dist/`

---

## 📁 Estructura del Proyecto

```
ALERTA360/
├── src/
│   ├── components/           # Componentes React
│   │   ├── Header.tsx        # Encabezado
│   │   ├── Map.tsx           # Mapa interactivo
│   │   └── Dashboard.tsx     # Panel lateral con eventos
│   ├── services/
│   │   └── api.ts            # Servicios HTTP (USGS, NOAA)
│   ├── types/
│   │   └── index.ts          # TypeScript types
│   ├── App.tsx               # Componente raíz
│   ├── main.tsx              # Entry point
│   └── index.css             # Estilos globales
├── dist/                     # Build output
├── package.json              # Dependencias
├── vite.config.ts            # Configuración Vite
├── tailwind.config.js        # Configuración Tailwind
├── tsconfig.json             # Configuración TypeScript
└── README.md                 # Este archivo
```

---

## 🗺️ Fuentes de Datos

### 1. USGS Earthquake Hazards Program
- **Endpoint:** `https://earthquake.usgs.gov/earthquakes/feed/v1.0/`
- **Datos:** Terremotos globales
- **Latencia:** 1-5 minutos
- **Licencia:** Public domain

### 2. NOAA Weather Alerts
- **Endpoint:** `https://api.weather.gov/alerts/active`
- **Datos:** Alertas meteorológicas (USA + territorios)
- **Latencia:** 1-2 minutos
- **Licencia:** Público

### 3. NASA FIRMS (Fire Information)
- **Endpoint:** `https://firms.modaps.eosdis.nasa.gov/`
- **Datos:** Detección de incendios por satélite
- **Latencia:** ~4 horas
- **Licencia:** Público

---

## 🎨 UI/UX

### Colores (Tailwind)
| Tipo | Color | Hex |
|------|-------|-----|
| Crítico | Rojo | #C7352F |
| Alto | Naranja | #B7791F |
| Medio | Amarillo | #FBBF24 |
| Bajo | Verde | #138A45 |

### Componentes
1. **Header** — Título + hora actual
2. **Map** — Leaflet canvas con markers geolocalizados
3. **Dashboard** — Panel con stats + lista de eventos + detalles

---

## 🔄 Flujo de Datos

```
┌─────────────────┐
│  USGS / NOAA    │ (APIs externas)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Servicio API    │ (src/services/api.ts)
│ (Fetch datos)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  React State    │ (Zustand)
│ (eventos[])     │
└────────┬────────┘
         │
         ├──────────► Map (render markers)
         └──────────► Dashboard (render lista)
```

---

## 📊 Eventos Mockeados (MVP)

Para desarrollo sin conexión a APIs reales, usamos datos mock:

```javascript
{
  id: 'evt-001',
  type: 'earthquake',
  title: 'Terremoto en Colombia',
  description: 'Magnitud 5.2 en zona cafetera',
  latitude: 5.0,
  longitude: -75.5,
  magnitude: 5.2,
  severity: 'high',
  source: 'USGS',
  occurredAt: '2026-10-15T...',
  detectedAt: '2026-10-15T...'
}
```

---

## 🧪 Testing

```bash
# Type checking
npm run type-check

# (Próximas fases)
npm run test
```

---

## 📈 Roadmap

### Fase 1 (Actual) ✅
- [x] Frontend MVP con mapa
- [x] Integración USGS
- [x] Integración NOAA
- [x] Dashboard interactivo
- [ ] Tests básicos

### Fase 2 (Próximas 4 semanas)
- [ ] Backend Fastify + PostgreSQL
- [ ] Autenticación JWT
- [ ] Notificaciones en tiempo real (WebSockets)
- [ ] Histórico de eventos
- [ ] Gráficos de tendencias

### Fase 3 (Go-Live)
- [ ] Deploy a producción (AWS/GCP)
- [ ] CI/CD con GitHub Actions
- [ ] Monitoreo con Prometheus
- [ ] Optimization para 10k+ usuarios

---

## 🤝 Contribuir

1. Fork el repo
2. Crea un branch (`git checkout -b feature/mi-feature`)
3. Commit cambios (`git commit -am 'Add feature'`)
4. Push a branch (`git push origin feature/mi-feature`)
5. Abre un Pull Request

---

## 📝 Documentación Adicional

- [ALERTA360_ARQUITECTURA_MAESTRA.md](./ALERTA360_ARQUITECTURA_MAESTRA.md) — Fases, hitos, riesgos
- [ALERTA360_HERRAMIENTAS_RECOMENDADAS.md](./ALERTA360_HERRAMIENTAS_RECOMENDADAS.md) — Tech stack validado

---

## 📞 Contacto

**Propietario del proyecto:** Armado719  
**Email:** armado719@example.com  
**GitHub:** https://github.com/armado719/ALERTA360

---

## 📜 Licencia

MIT — Libre para uso comercial y no comercial

---

## 🙏 Agradecimientos

- USGS por datos de terremotos
- NOAA por alertas meteorológicas
- NASA por datos de incendios
- OpenStreetMap contributors
- Comunidad de React & Leaflet

---

**Última actualización:** 2026  
**Estado de construcción:** 🟢 Funcional MVP  
**Bundle size:** 114.35 kB (gzipped) — ⚡ Ultraligero
