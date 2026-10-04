import { describe, it, expect } from 'vitest'
import {
  renderDashboard,
  renderAssetDetail,
  renderChart,
  renderHistoryTable,
  renderScoreBreakdown,
  renderIncidentItems,
  computeDashboardMetrics,
  resolveAssetRoute,
  type Score,
  type AssetRow,
  type AssetDetail,
  type Incident,
  type ScorePoint,
} from './render'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseScore: Score = {
  scoreTotal: 72,
  scoreDisponibilidad: 80,
  scoreFrescura: 70,
  scoreCalidad: 75,
  scoreConsistencia: 65,
  scoreComunicacion: 68,
  status: 'DegradedMajor',
  calculatedAt: '2026-10-04T12:00:00Z',
}

const point = (scoreTotal: number, calculatedAt: string, status: string): ScorePoint => ({
  calculatedAt,
  scoreTotal,
  scoreDisponibilidad: scoreTotal,
  scoreFrescura: scoreTotal,
  scoreCalidad: scoreTotal,
  scoreConsistencia: scoreTotal,
  scoreComunicacion: scoreTotal,
  status,
})

const puntos: ScorePoint[] = [
  point(90, '2026-10-01T10:00:00Z', 'Healthy'),
  point(80, '2026-10-02T10:00:00Z', 'DegradedMinor'),
  point(55, '2026-10-03T10:00:00Z', 'Critical'),
]

const asset: AssetRow = {
  id: 'a-1',
  externalId: 'PZ-001',
  name: 'Piezómetro Embalse 01',
  assetType: 'Piezometro',
  isCritical: true,
  status: 'DegradedMajor',
  lastScore: baseScore,
}

const assets: AssetRow[] = [
  asset,
  {
    id: 'a-2',
    externalId: 'PZ-002',
    name: 'Piezómetro Embalse 02',
    assetType: 'Piezometro',
    isCritical: false,
    status: 'Healthy',
    lastScore: { ...baseScore, scoreTotal: 95, status: 'Healthy' },
  },
  {
    id: 'a-3',
    externalId: 'IN-009',
    name: 'Inclinómetro Talud 09',
    assetType: 'Inclinometro',
    isCritical: false,
    status: 'Healthy',
    lastScore: null,
  },
]

const detail: AssetDetail = {
  ...asset,
  locationLabel: 'zona perimetral',
  expectedIntervalSeconds: 300,
  updatedAt: '2026-10-04T08:54:00Z',
  incidentCount: 2,
  readingCount: 6,
}

const incidents: Incident[] = [
  {
    eventType: 'DataUnreliable',
    detectedAt: '2026-10-03T02:37:00Z',
    notes: 'Piezómetro transmitiendo 100% pero valor plano 15 días.',
  },
  { eventType: 'Critical', detectedAt: '2026-10-02T10:00:00Z' },
]

// ---------------------------------------------------------------------------
// renderScoreBreakdown
// ---------------------------------------------------------------------------

describe('renderScoreBreakdown', () => {
  it('muestra las 5 dimensiones con etiqueta corta', () => {
    const html = renderScoreBreakdown(baseScore)
    for (const label of ['Disp.', 'Fresc.', 'Calidad', 'Cons.', 'Com.']) {
      expect(html).toContain(label)
    }
  })

  it('muestra los 5 valores numéricos', () => {
    const html = renderScoreBreakdown(baseScore)
    for (const value of [80, 70, 75, 65, 68]) expect(html).toContain(`>${value}<`)
  })

  it('un activo sin evaluación muestra "Sin evaluación", no un 0', () => {
    // Un 0 se lee como "peor score posible" cuando en realidad significa "no medido".
    expect(renderScoreBreakdown(null)).toContain('Sin evaluación')
    expect(renderScoreBreakdown(null)).not.toContain('>0<')
  })
})

// ---------------------------------------------------------------------------
// computeDashboardMetrics
// ---------------------------------------------------------------------------

describe('computeDashboardMetrics', () => {
  it('cuenta solo los activos con evaluación como evaluados', () => {
    expect(computeDashboardMetrics(assets, null).evaluated).toBe(2)
  })

  it('un crítico degradado cuenta como crítico en riesgo', () => {
    expect(computeDashboardMetrics(assets, null).criticalAtRisk).toBe(1)
  })

  it('sin capability, promedia los scoreTotal de los evaluados', () => {
    // (72 + 95) / 2 = 83.5 → 84
    expect(computeDashboardMetrics(assets, null).averageScore).toBe(84)
  })

  it('con capability de la API, manda la API sobre el promedio local', () => {
    const cap = { score: 49, assetCount: 20, criticalAssetCount: 5 }
    expect(computeDashboardMetrics(assets, cap).averageScore).toBe(49)
  })

  it('identifica el peor score solo entre activos evaluados', () => {
    // a-3 tiene score null: no debe ganar como "peor" con 0.
    const m = computeDashboardMetrics(assets, null)
    expect(m.lowest?.id).toBe('a-1')
    expect(m.lowest?.lastScore?.scoreTotal).toBe(72)
  })

  it('no divide por cero cuando ningún activo tiene evaluación', () => {
    const m = computeDashboardMetrics([{ ...asset, lastScore: null }], null)
    expect(m.evaluated).toBe(0)
    expect(Number.isNaN(m.averageScore)).toBe(false)
    expect(m.lowest).toBeUndefined()
  })

  it('lista vacía no rompe nada', () => {
    const m = computeDashboardMetrics([], null)
    expect(m.evaluated).toBe(0)
    expect(m.criticalAtRisk).toBe(0)
    expect(m.lowest).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// renderDashboard
// ---------------------------------------------------------------------------

describe('renderDashboard', () => {
  it('indica que los datos vienen de la API en modo live', () => {
    const html = renderDashboard(assets, null, [], 'live')
    expect(html).toContain('Datos en vivo desde')
    expect(html).toContain('connection-dot is-live')
  })

  it('indica modo demostración cuando la API no respondió', () => {
    // Fail-soft: si la API cae, el operador debe saber que está viendo datos falsos.
    const html = renderDashboard(assets, null, [], 'demo')
    expect(html).toContain('Modo demostración')
    expect(html).toContain('connection-dot is-demo')
  })

  it('renderiza una fila por activo', () => {
    const html = renderDashboard(assets, null, [], 'live')
    expect((html.match(/data-asset-id=/g) ?? []).length).toBe(3)
  })

  it('el id del activo se escapa al escribirlo en el atributo', () => {
    const html = renderDashboard([{ ...asset, id: '"><script>alert(1)</script>' }], null, [], 'live')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&quot;&gt;&lt;script&gt;')
  })

  it('el nombre del activo se escapa', () => {
    const html = renderDashboard([{ ...asset, name: '<img src=x onerror=alert(1)>' }], null, [], 'live')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })

  it('marca los activos críticos con la etiqueta de ponderación', () => {
    const html = renderDashboard(assets, null, [], 'live')
    expect(html).toContain('Crítico · 2x')
    expect(html).toContain('Normal')
  })

  it('un activo sin score muestra guion medio, no 0', () => {
    const html = renderDashboard([{ ...asset, lastScore: null }], null, [], 'live')
    expect(html).toContain('<strong>—</strong>')
  })
})

// ---------------------------------------------------------------------------
// Incidentes
// ---------------------------------------------------------------------------

describe('renderIncidentItems', () => {
  it('traduce el eventType a español', () => {
    const html = renderIncidentItems(incidents, 'x', 'y')
    expect(html).toContain('Datos no confiables')
    expect(html).toContain('Estado crítico')
  })

  it('escapa las notas que vienen de la API', () => {
    const html = renderIncidentItems([{ ...incidents[0]!, notes: '<script>alert(1)</script>' }], 'x', 'y')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('un incidente sin nota muestra un texto en vez de vacío', () => {
    expect(renderIncidentItems([incidents[1]!], 'x', 'y')).toContain('Sin nota operacional')
  })

  it('sin incidentes muestra el mensaje de estado limpio', () => {
    const html = renderIncidentItems([], 'Sin incidentes recientes', 'Todo tranquilo')
    expect(html).toContain('Sin incidentes recientes')
    expect(html).toContain('Todo tranquilo')
    expect(html).toContain('incident-marker is-clear')
  })

  it('limita a 8 incidentes para no inflar la vista', () => {
    const muchos: Incident[] = Array.from({ length: 30 }, (_, i) => ({
      eventType: 'Degraded',
      detectedAt: '2026-10-02T10:00:00Z',
      notes: `Incidente ${i}`,
    }))
    expect((renderIncidentItems(muchos, 'x', 'y').match(/incident-marker/g) ?? []).length).toBe(8)
  })

  it('un eventType desconocido se escapa en vez de romper', () => {
    const html = renderIncidentItems(
      [{ eventType: '<script>x</script>', detectedAt: '2026-10-02T10:00:00Z' }],
      'x',
      'y',
    )
    expect(html).not.toContain('<script>')
  })
})

// ---------------------------------------------------------------------------
// Gráfico e histórico
// ---------------------------------------------------------------------------

describe('renderChart', () => {
  it('con menos de 2 puntos no intenta dibujar la línea', () => {
    // Con 1 punto, x() dividiría por (length - 1) = 0 → Infinity/NaN.
    expect(renderChart([])).toContain('Histórico insuficiente')
    expect(renderChart([puntos[0]!])).toContain('Histórico insuficiente')
    expect(renderChart([puntos[0]!])).not.toContain('<svg')
  })

  it('con 2+ puntos dibuja un punto por evaluación', () => {
    const html = renderChart(puntos)
    expect((html.match(/<circle/g) ?? []).length).toBe(3)
    expect(html).toContain('<svg')
  })

  it('marca la línea de 60 como umbral crítico', () => {
    const html = renderChart(puntos)
    expect(html).toContain('60 · crítico')
    expect(html).toContain('stroke-dasharray="5 4"')
  })

  it('describe la evolución en el aria-label para lectores de pantalla', () => {
    const html = renderChart(puntos)
    expect(html).toContain('aria-label="Evolución del score total')
    expect(html).toContain('90%')
    expect(html).toContain('55%')
  })

  it('sin NaN ni Infinity con el score en los extremos', () => {
    const extremos = [
      point(0, '2026-10-01T10:00:00Z', 'Critical'),
      point(100, '2026-10-02T10:00:00Z', 'Healthy'),
    ]
    const html = renderChart(extremos)
    expect(html).not.toContain('NaN')
    expect(html).not.toContain('Infinity')
  })

  it('un score fuera de 0-100 no rompe el render', () => {
    const raro = [
      point(-20, '2026-10-01T10:00:00Z', 'Critical'),
      point(140, '2026-10-02T10:00:00Z', 'Healthy'),
    ]
    expect(() => renderChart(raro)).not.toThrow()
  })
})

describe('renderHistoryTable', () => {
  it('sin evaluaciones muestra el mensaje vacío', () => {
    expect(renderHistoryTable([])).toContain('Sin evaluaciones registradas')
  })

  it('limita a 12 filas de datos (más el header)', () => {
    const muchos = Array.from({ length: 30 }, (_, i) =>
      point(50 + (i % 40), '2026-10-01T10:00:00Z', 'Healthy'),
    )
    // 12 filas de datos + 1 <tr> del <thead> = 13 <tr> en total.
    expect((renderHistoryTable(muchos).match(/<tr>/g) ?? []).length).toBe(13)
  })

  it('muestra el scoreTotal de cada evaluación', () => {
    expect(renderHistoryTable([point(77, '2026-10-01T10:00:00Z', 'Healthy')])).toContain('>77<')
  })
})

// ---------------------------------------------------------------------------
// Detalle de activo
// ---------------------------------------------------------------------------

describe('renderAssetDetail', () => {
  it('muestra el nombre del activo como título', () => {
    const html = renderAssetDetail(detail, [baseScore], [])
    expect(html).toContain('Piezómetro Embalse 01')
    expect(html).toContain('id="asset-title"')
  })

  it('escapa el nombre del activo', () => {
    const html = renderAssetDetail({ ...detail, name: '<script>alert(1)</script>' }, [], [])
    expect(html).not.toContain('<script>')
  })

  it('muestra los intervalos y conteos que vienen de la API', () => {
    const html = renderAssetDetail(detail, [baseScore], incidents)
    expect(html).toContain('Intervalo esperado 300s')
    expect(html).toContain('zona perimetral')
  })

  it('sin intervalo configurado lo dice explícitamente', () => {
    expect(renderAssetDetail({ ...detail, expectedIntervalSeconds: undefined }, [], [])).toContain(
      'Intervalo no configurado',
    )
  })

  it('sin ubicación registrada lo dice explícitamente', () => {
    expect(renderAssetDetail({ ...detail, locationLabel: null }, [], [])).toContain(
      'Sin ubicación registrada',
    )
  })

  it('activo crítico muestra la ponderación 2x en la ficha', () => {
    // La ficha usa "Crítica (2x)" (femenino); el pill del hero usa "Crítico · 2x".
    expect(renderAssetDetail(detail, [], [])).toContain('Crítica (2x)')
    expect(renderAssetDetail(detail, [], [])).toContain('Crítico · pondera 2x')
  })

  it('dibuja el gráfico con los puntos ordenados cronológicamente', () => {
    const html = renderAssetDetail(detail, puntos, [])
    expect(html).toContain('<svg')
    expect(html).not.toContain('NaN')
  })

  it('un activo sin evaluaciones renderiza sin romperse', () => {
    const html = renderAssetDetail({ ...detail, lastScore: null }, [], [])
    expect(html).toContain('Sin evaluación registrada')
  })
})

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

describe('resolveAssetRoute', () => {
  it('extrae el id de una ruta de detalle válida', () => {
    expect(resolveAssetRoute('#/activo/11464ef6-3c3e-4ec9-bb10-983fec5f7245')).toBe(
      '11464ef6-3c3e-4ec9-bb10-983fec5f7245',
    )
  })

  it('hash vacío devuelve null (dashboard)', () => {
    expect(resolveAssetRoute('')).toBeNull()
  })

  it('ruta desconocida devuelve null en vez de intentar cargar', () => {
    expect(resolveAssetRoute('#/otra-cosa/123')).toBeNull()
    expect(resolveAssetRoute('#/activo/')).toBeNull()
  })

  it('acepta ids hex en mayúsculas', () => {
    expect(resolveAssetRoute('#/activo/A1B2C3')).toBe('A1B2C3')
  })

  it('rechaza un id que no sea un guid — evita inyectar rutas en el fetch', () => {
    expect(resolveAssetRoute('#/activo/../admin')).toBeNull()
    expect(resolveAssetRoute('#/activo/a<script>')).toBeNull()
  })
})