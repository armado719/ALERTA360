/**
 * Genera `src/data/municipiosCo.ts`: código DANE → nombre y coordenadas de los
 * 1122 municipios de Colombia (DIVIPOLA publicada por MinSalud en datos.gov.co).
 *
 * La fuente de deslizamientos del IDEAM solo trae el código DANE, así que este
 * archivo se genera una vez y se sube al repo: la ingesta no depende de un
 * segundo servidor en cada ciclo. Las coordenadas son el centroide del
 * municipio, no el casco urbano.
 *
 * Uso: npm run build:municipios
 */
import axios from 'axios'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SOURCE_URL = 'https://www.datos.gov.co/resource/pqwj-3fi4.json?$limit=2000'
const EXPECTED = 1122
const OUT = fileURLToPath(new URL('../src/data/municipiosCo.ts', import.meta.url))

interface DivipolaRow {
  idmupio: string
  nommpio: string
  mpiolatitud: string
  mpiolongitud: string
}

// Filas de DIVIPOLA con coordenadas dañadas en origen, corregidas a mano.
// Mariquita (Tolima) viene como lat 525 / lon -74916667: perdió el punto decimal.
const OVERRIDES: Record<string, { lat: number; lon: number }> = {
  '73443': { lat: 5.25, lon: -74.9167 },
}

// Caja que contiene a Colombia continental, San Andrés y Providencia.
const inColombia = (lat: number, lon: number) => lat > -5 && lat < 14 && lon > -82 && lon < -66

const res = await axios.get<DivipolaRow[]>(SOURCE_URL, { timeout: 60000 })

const entries: [string, { n: string; lat: number; lon: number }][] = []
for (const row of res.data) {
  // DIVIPOLA guarda el código sin el cero inicial ("5002"); el IDEAM usa "05002".
  const dane = String(row.idmupio).trim().padStart(5, '0')
  const lat = OVERRIDES[dane]?.lat ?? Number(row.mpiolatitud)
  const lon = OVERRIDES[dane]?.lon ?? Number(row.mpiolongitud)
  if (!/^\d{5}$/.test(dane) || !Number.isFinite(lat) || !Number.isFinite(lon) || !inColombia(lat, lon)) {
    throw new Error(`Fila inválida en DIVIPOLA: ${JSON.stringify(row)}`)
  }
  entries.push([dane, { n: row.nommpio.trim(), lat: Number(lat.toFixed(4)), lon: Number(lon.toFixed(4)) }])
}

if (entries.length !== EXPECTED) {
  throw new Error(`Se esperaban ${EXPECTED} municipios y llegaron ${entries.length}`)
}
entries.sort(([a], [b]) => a.localeCompare(b))

const body = entries.map(([dane, m]) => `  '${dane}': ${JSON.stringify(m)},`).join('\n')
writeFileSync(
  OUT,
  `// Archivo generado por scripts/build-municipios.ts — no editar a mano.\n` +
    `// Fuente: MinSalud DIVIPOLA (datos.gov.co, pqwj-3fi4). Centroide de cada municipio.\n` +
    `export interface Municipio {\n  n: string\n  lat: number\n  lon: number\n}\n\n` +
    `export const MUNICIPIOS_CO: Record<string, Municipio> = {\n${body}\n}\n`,
  'utf8'
)
console.log(`OK: ${entries.length} municipios → ${OUT}`)
