import { DisasterEvent, DisasterType } from '../types'

/**
 * Datos de demostración (deterministas).
 * Se usan sólo cuando el backend no está disponible, para que el mapa y el
 * panel se vean vivos al abrir la app. Los números replican el mockup:
 * 0 críticos · 4 altos · 0 medios · 174 bajos = 178 eventos, más los 4
 * deslizamientos del IDEAM de `IDEAM_LANDSLIDES` (2 altos, 2 medios).
 */

function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Cluster = { name: string; lat: number; lng: number; spread: number; n: number }

// Zonas sísmicas / meteorológicas típicas
const CLUSTERS: Cluster[] = [
  { name: 'Costa de Japón',        lat: 37.5,  lng: 142.0, spread: 9,  n: 26 },
  { name: 'California',            lat: 35.5,  lng: -120.0, spread: 5, n: 22 },
  { name: 'Chile central',         lat: -32.0, lng: -71.5,  spread: 6, n: 18 },
  { name: 'Indonesia',             lat: -3.0,  lng: 118.0,  spread: 10, n: 17 },
  { name: 'Turquía / Egeo',        lat: 38.5,  lng: 27.0,   spread: 5, n: 14 },
  { name: 'México',                lat: 17.0,  lng: -99.0,  spread: 6, n: 13 },
  { name: 'Colombia',              lat: 4.6,   lng: -74.1,  spread: 4, n: 12 },
  { name: 'Nueva Zelanda',         lat: -41.0, lng: 174.0,  spread: 5, n: 11 },
  { name: 'Grecia',                lat: 38.0,  lng: 23.5,   spread: 4, n: 10 },
  { name: 'Alaska',                lat: 61.0,  lng: -150.0, spread: 8, n: 9  },
  { name: 'Filipinas',             lat: 12.0,  lng: 122.0,  spread: 5, n: 9  },
  { name: 'Islandia',              lat: 64.9,  lng: -19.0,  spread: 3, n: 7  },
  { name: 'Perú',                  lat: -12.0, lng: -77.0,  spread: 5, n: 6  },
  { name: 'Himalaya',              lat: 28.5,  lng: 84.0,   spread: 5, n: 4  },
]

const TYPES: DisasterType[] = ['earthquake', 'storm', 'flood', 'rain', 'landslide', 'volcanic']

const TITLES: Record<DisasterType, string[]> = {
  earthquake: ['Sismo M {m} — {z}', 'Enjambre sísmico — {z}', 'Réplica M {m} — {z}'],
  storm: ['Tormenta severa — {z}', 'Frente convectivo — {z}', 'Vientos de {v} km/h — {z}'],
  flood: ['Inundación repentina — {z}', 'Desbordamiento de río — {z}', 'Anegamiento urbano — {z}'],
  rain: ['Lluvia intensa — {z}', 'Acumulados de {v} mm — {z}', 'Precipitación anómala — {z}'],
  landslide: ['Deslizamiento de tierra — {z}', 'Alud en ladera — {z}', 'Socavón reportado — {z}'],
  volcanic: ['Actividad volcánica — {z}', 'Ceniza en suspensión — {z}', 'Tremor volcánico — {z}'],
  hurricane: ['Huracán categoría {v} — {z}', 'Trayectoria ciclónica — {z}', 'Alerta por huracán — {z}'],
  wildfire: ['Incendio forestal — {z}', 'Foco de calor activo — {z}', 'Combate de incendios — {z}'],
  drought: ['Sequía severa — {z}', 'Advertencia de sequía — {z}', 'Récord de sequía — {z}'],
  heatwave: ['Ola de calor — {z}', 'Temperaturas extremas — {z}', 'Alerta de calor — {z}'],
  snow: ['Tormenta de nieve — {z}', 'Avalancha de nieve — {z}', 'Acumulación de nieve — {z}'],
  dust: ['Tormenta de polvo — {z}', 'Alerta de calidad del aire — {z}', 'Humedad extrema — {z}'],
}

const SOURCES = ['usgs', 'noaa', 'nasa_eonet', 'gdacs', 'nhc', 'ideam']

// Amenaza por deslizamientos del IDEAM (OSPA): mismo formato que genera el
// backend, en el centroide de municipios reales.
const IDEAM_LANDSLIDES = [
  { dane: '05002', lugar: 'Abejorral (Antioquia)', lat: 5.8038, lng: -75.4385, nivel: 'alta', tres: '47,9', diez: '101,3', dias: 26 },
  { dane: '05040', lugar: 'Anorí (Antioquia)', lat: 7.1932, lng: -75.1085, nivel: 'alta', tres: '52,9', diez: '126,7', dias: 22 },
  { dane: '52835', lugar: 'San Andrés de Tumaco (Nariño)', lat: 1.6376, lng: -78.6121, nivel: 'moderada', tres: '31,4', diez: '88,2', dias: 19 },
  { dane: '86001', lugar: 'Mocoa (Putumayo)', lat: 1.2201, lng: -76.6654, nivel: 'moderada', tres: '28,0', diez: '74,6', dias: 17 },
] as const

function pick<T>(arr: T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)]
}

export function buildDemoEvents(total = 178): DisasterEvent[] {
  const r = mulberry32(20261017)
  const now = Date.now()
  const events: DisasterEvent[] = []

  // 4 eventos "altos" para que el KPI y el mapa tengan un acento naranja
  const HIGH_CLUSTERS = [0, 1, 3, 5]

  let idx = 0
  for (const cluster of CLUSTERS) {
    const isHighCluster = idx < HIGH_CLUSTERS.length
    for (let i = 0; i < cluster.n && events.length < total; i++) {
      const type: DisasterType = isHighCluster && i === 0
        ? pick(['earthquake', 'storm', 'flood', 'volcanic'] as DisasterType[], r)
        : pick(TYPES, r)
      const severity = isHighCluster && i === 0 ? 'high' : 'low'
      const magnitude = type === 'earthquake' ? +(3.1 + r() * 3.4).toFixed(1) : undefined
      const wind = Math.round(40 + r() * 80)
      const rain = Math.round(30 + r() * 140)

      const title = pick(TITLES[type], r)
        .replace('{m}', magnitude ? magnitude.toFixed(1) : '—')
        .replace('{v}', String(type === 'rain' || type === 'flood' ? rain : wind))
        .replace('{z}', cluster.name)

      const lat = cluster.lat + (r() - 0.5) * cluster.spread * 2
      const lng = cluster.lng + (r() - 0.5) * cluster.spread * 2 * 1.6
      // repartidos en las últimas 24 h para que la línea de tiempo muestre actividad
      const minutesAgo = Math.round(r() * 60 * 23.5) + 5
      const detected = new Date(now - minutesAgo * 60_000)

      events.push({
        id: `demo-${events.length + 1}`,
        type,
        title,
        description:
          type === 'earthquake'
            ? `Evento sísmico detectado en ${cluster.name}. Profundidad estimada ${Math.round(8 + r() * 60)} km. Sin reportes de daños mayores por ahora.`
            : `Condiciones adversas registradas en ${cluster.name}. Monitoreo automático activo con actualización cada 5 minutos.`,
        latitude: +lat.toFixed(3),
        longitude: +lng.toFixed(3),
        magnitude,
        intensity: Math.round(r() * 60) + 10,
        severity,
        occurredAt: new Date(detected.getTime() - 4 * 60_000).toISOString(),
        detectedAt: detected.toISOString(),
        source: pick(SOURCES, r),
        rawData: { demo: true, cluster: cluster.name },
      })
    }
    idx++
  }

  for (const [i, d] of IDEAM_LANDSLIDES.entries()) {
    const detected = new Date(now - (40 + i * 25) * 60_000)
    events.push({
      id: `demo-ideam-desliz-${d.dane}`,
      type: 'landslide',
      title: `Amenaza ${d.nivel} por deslizamientos en ${d.lugar}`,
      description:
        `Lluvia acumulada: ${d.tres} mm en 3 días y ${d.diez} mm en 10 días (${d.dias} días con lluvia). ` +
        `Fuente: IDEAM — Oficina del Servicio de Pronósticos y Alertas (OSPA). ` +
        `Nivel orientativo para prepararse; no es una declaratoria oficial de alerta.`,
      latitude: d.lat,
      longitude: d.lng,
      magnitude: Number(d.diez.replace(',', '.')),
      severity: d.nivel === 'alta' ? 'high' : 'medium',
      occurredAt: detected.toISOString(),
      detectedAt: detected.toISOString(),
      source: 'ideam',
      rawData: { demo: true, dane: d.dane, nivel: d.nivel.toUpperCase(), fuente: 'IDEAM — OSPA' },
    })
  }

  return events
}

export const DEMO_EVENTS = buildDemoEvents()
