# 🚀 ALERTA360 — Quick Start Guide

¡Bienvenido! Aquí te mostramos cómo empezar en 5 minutos.

---

## ⚡ 5 Minutos para el Primer Deploy

### 1️⃣ Clonar el repositorio

```bash
git clone https://github.com/armado719/ALERTA360.git
cd ALERTA360
```

### 2️⃣ Instalar dependencias

```bash
npm install
```

**Tiempo esperado:** ~30 segundos

### 3️⃣ Iniciar servidor de desarrollo

```bash
npm run dev
```

**Output esperado:**
```
  VITE v5.4.21  ready in 243 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### 4️⃣ Abrir en navegador

Visita: **http://localhost:5173**

¡Listo! Deberías ver:
- 🗺️ **Mapa interactivo global** con eventos de desastres
- 📊 **Dashboard** en la derecha con lista de eventos
- 🎯 **Filtros** por tipo de desastre
- 📍 **Datos reales** desde USGS y NOAA

---

## 🛠️ Comandos Comunes

### Desarrollo

```bash
# Iniciar servidor (hot reload automático)
npm run dev

# Verificar tipos TypeScript
npm run type-check
```

### Producción

```bash
# Build optimizado
npm run build

# Previsualizar build local (antes de deploy)
npm run preview

# Limpiar dist + node_modules
make clean
```

### Con Make

```bash
make install    # Instalar deps
make dev        # Dev server
make build      # Build
make preview    # Preview
make type-check # Type check
```

---

## 📁 Estructura de Carpetas

```
ALERTA360/
├── src/
│   ├── components/     # Componentes React (Header, Map, Dashboard)
│   ├── services/       # API calls (USGS, NOAA)
│   ├── types/          # TypeScript types (DisasterEvent, etc)
│   ├── App.tsx         # Componente principal
│   ├── main.tsx        # Entry point
│   └── index.css       # Estilos globales (Tailwind)
├── dist/               # Build output (producción)
├── package.json        # Dependencias
├── vite.config.ts      # Configuración Vite
├── tailwind.config.js  # Configuración Tailwind
└── README.md           # Documentación completa
```

---

## 🎯 Próximos Pasos

### Después de levantar el dev server:

1. **Explora el mapa:**
   - Zoom in/out con rueda del mouse
   - Haz click en los marcadores para ver detalles
   - Los colores indican severidad:
     - 🔴 Rojo = Crítico
     - 🟠 Naranja = Alto
     - 🟡 Amarillo = Medio
     - 🟢 Verde = Bajo

2. **Filtra eventos:**
   - Haz click en los botones de tipo (Terremotos, Tormentas, etc)
   - Cambia el rango de tiempo (1h, 24h, 7d)

3. **Ve detalles:**
   - Selecciona un evento en la lista o en el mapa
   - Panel derecho muestra:
     - Descripción completa
     - Magnitud (si aplica)
     - Coordenadas
     - Fuente de datos
     - Hora de detección

---

## 🔧 Configuración Inicial

### Variables de Entorno

Copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Contenido:
```env
VITE_API_URL=http://localhost:3000/api
VITE_UPDATE_INTERVAL=300000  # 5 minutos
```

---

## 📊 Datos Mock vs Reales

### MVP (Actual)
- Datos **mockeados** en `src/services/api.ts`
- Simula 5 eventos reales para desarrollo

### Fase 2
- Integración real con:
  - **USGS:** https://earthquake.usgs.gov/earthquakes/feed/v1.0/
  - **NOAA:** https://api.weather.gov/alerts/active
  - **NASA:** Fire detection data

---

## 🐛 Troubleshooting

### `npm install` falla

```bash
# Limpiar cache
npm cache clean --force

# Instalar de nuevo
npm install
```

### Puerto 5173 ya está en uso

```bash
# Cambiar puerto en vite.config.ts
server: {
  port: 5174,  // Cambiar aquí
}
```

### Hot reload no funciona

Asegúrate que `vite.config.ts` tiene:

```typescript
server: {
  middlewareMode: false,
}
```

### Build falla

Verifica TypeScript:

```bash
npm run type-check
```

---

## 📱 Responsive Design

ALERTA360 es totalmente responsive:

- **Desktop:** Mapa grande + sidebar
- **Tablet:** Stack vertical flexible
- **Móvil:** Mapa full-width con sidebar abajo

---

## 🚀 Deploy a Producción

### Build

```bash
npm run build
# Output en `dist/`
```

### Deploy en Vercel (Recomendado)

```bash
npm i -g vercel
vercel
```

### Deploy en GitHub Pages

```bash
# Agregar a vite.config.ts:
# base: '/ALERTA360/'
npm run build
```

### Deploy en AWS S3

```bash
aws s3 sync dist/ s3://mi-bucket/
```

---

## 📚 Recursos Útiles

- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Leaflet Docs](https://leafletjs.com)
- [USGS Earthquake API](https://earthquake.usgs.gov/earthquakes/feed/v1.0/)

---

## ✅ Checklist de Desarrollo

- [ ] Repository clonado
- [ ] Dependencies instaladas (`npm install`)
- [ ] Dev server corriendo (`npm run dev`)
- [ ] Navegador abierto en `http://localhost:5173`
- [ ] Mapa visible con eventos
- [ ] Filtros funcionando
- [ ] Sidebar con eventos clickeable
- [ ] Console sin errores

---

## 🆘 ¿Ayuda?

- Abre un issue en GitHub
- Check [README.md](./README.md) para documentación completa
- Ver [ALERTA360_ARQUITECTURA_MAESTRA.md](./ALERTA360_ARQUITECTURA_MAESTRA.md) para detalles técnicos

---

**¡Bienvenido a ALERTA360!** 🌍

Cualquier pregunta, ¡no dudes en preguntar!
