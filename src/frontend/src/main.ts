import './style.css'

const API = 'http://localhost:5000'

type Score = {
  scoreTotal: number
  scoreDisponibilidad: number
  scoreFrescura: number
  scoreCalidad: number
  scoreConsistencia: number
  scoreComunicacion: number
  status: string
  calculatedAt: string
}

type AssetRow = {
  id: string
  externalId: string
  name: string
  assetType: string
  isCritical: boolean
  status: string
  lastScore: null | Score
}

type Capability = {
  score: number
  assetCount: number
  criticalAssetCount: number
}

type Incident = {
  eventType: string
  detectedAt: string
  notes?: string
}

const demoAssets: AssetRow[] = [
  {
    id: '1',
    externalId: 'TRK-021',
    name: 'Camión autónomo 21',
    assetType: 'HaulTruck',
    isCritical: true,
    status: 'DegradedMajor',
    lastScore: {
      scoreTotal: 68,
      scoreDisponibilidad: 72,
      scoreFrescura: 61,
      scoreCalidad: 79,
      scoreConsistencia: 65,
      scoreComunicacion: 58,
      status: 'DegradedMajor',
      calculatedAt: new Date().toISOString(),
    },
  },
  {
    id: '2',
    externalId: 'PLT-004',
    name: 'Chancador primario',
    assetType: 'Crusher',
    isCritical: true,
    status: 'Healthy',
    lastScore: {
      scoreTotal: 93,
      scoreDisponibilidad: 96,
      scoreFrescura: 91,
      scoreCalidad: 94,
      scoreConsistencia: 92,
      scoreComunicacion: 90,
      status: 'Healthy',
      calculatedAt: new Date().toISOString(),
    },
  },
  {
    id: '3',
    externalId: 'CNV-118',
    name: 'Correa transportadora 118',
    assetType: 'Conveyor',
    isCritical: false,
    status: 'DegradedMinor',
    lastScore: {
      scoreTotal: 81,
      scoreDisponibilidad: 88,
      scoreFrescura: 76,
      scoreCalidad: 82,
      scoreConsistencia: 84,
      scoreComunicacion: 75,
      status: 'DegradedMinor',
      calculatedAt: new Date().toISOString(),
    },
  },
]

const demoIncidents: Incident[] = [
  {
    eventType: 'Pérdida de telemetría',
    detectedAt: new Date(Date.now() - 1000 * 60 * 17).toISOString(),
    notes: 'TRK-021 reporta ventana sin paquetes durante turno mina rajo norte.',
  },
  {
    eventType: 'Frescura degradada',
    detectedAt: new Date(Date.now() - 1000 * 60 * 43).toISOString(),
    notes: 'CNV-118 supera umbral de latencia operacional configurado.',
  },
]

const statusMeta: Record<string, { label: string; tone: string }> = {
  Healthy: { label: 'Saludable', tone: 'good' },
  DegradedMinor: { label: 'Degradación menor', tone: 'warn' },
  DegradedMajor: { label: 'Degradación mayor', tone: 'risk' },
  Critical: { label: 'Crítico', tone: 'bad' },
  DataUnreliable: { label: 'Datos no confiables', tone: 'risk' },
}

const eventLabels: Record<string, string> = {
  Degraded: 'Degradación detectada',
  Critical: 'Estado crítico',
  Recovered: 'Recuperación',
  DataUnreliable: 'Datos no confiables',
}

const scoreKeys: Array<[keyof Score, string]> = [
  ['scoreDisponibilidad', 'Disp.'],
  ['scoreFrescura', 'Fresc.'],
  ['scoreCalidad', 'Calidad'],
  ['scoreConsistencia', 'Cons.'],
  ['scoreComunicacion', 'Com.'],
]

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))

function renderStatus(status: string) {
  const meta = statusMeta[status] ?? { label: status, tone: 'bad' }
  return `<span class="status status--${meta.tone}"><span aria-hidden="true"></span>${escapeHtml(meta.label)}</span>`
}

function renderScoreBreakdown(score: Score | null) {
  if (!score) return '<span class="muted">Sin evaluación</span>'

  return `<div class="score-breakdown">${scoreKeys
    .map(
      ([key, label]) => `
        <span>
          <small>${label}</small>
          <strong>${score[key]}</strong>
        </span>`,
    )
    .join('')}</div>`
}

function renderDashboard(assets: AssetRow[], capability: Capability | null, incidents: Incident[], mode: 'live' | 'demo') {
  const evaluated = assets.filter(asset => asset.lastScore).length
  const criticalAtRisk = assets.filter(asset => asset.isCritical && asset.status !== 'Healthy').length
  const averageScore = capability?.score ?? Math.round(
    assets.reduce((sum, asset) => sum + (asset.lastScore?.scoreTotal ?? 0), 0) / Math.max(evaluated, 1),
  )
  const lowest = [...assets]
    .filter(asset => asset.lastScore)
    .sort((a, b) => (a.lastScore?.scoreTotal ?? 0) - (b.lastScore?.scoreTotal ?? 0))[0]

  const rows = assets
    .map(
      asset => `
        <tr>
          <td>
            <div class="asset-name">
              <strong>${escapeHtml(asset.name)}</strong>
              <span>${escapeHtml(asset.assetType)} · ${escapeHtml(asset.externalId)}</span>
            </div>
          </td>
          <td>${asset.isCritical ? '<span class="pill pill--critical">Crítico · 2x</span>' : '<span class="pill">Normal</span>'}</td>
          <td><strong>${asset.lastScore?.scoreTotal ?? '—'}</strong></td>
          <td>${renderScoreBreakdown(asset.lastScore)}</td>
          <td>${renderStatus(asset.status)}</td>
        </tr>`,
    )
    .join('')

  const incidentItems = incidents.length
    ? incidents
        .slice(0, 5)
        .map(
          incident => `
            <li>
              <span class="incident-marker" aria-hidden="true"></span>
              <div>
                <strong>${escapeHtml(eventLabels[incident.eventType] ?? incident.eventType)}</strong>
                <p>${formatDate(incident.detectedAt)} · ${escapeHtml(incident.notes || 'Sin nota operacional')}</p>
              </div>
            </li>`,
        )
        .join('')
    : '<li><span class="incident-marker is-clear" aria-hidden="true"></span><div><strong>Sin incidentes recientes</strong><p>Los activos evaluados no han superado umbrales de alerta.</p></div></li>'

  const sourceCopy = mode === 'live'
    ? `Datos en vivo desde ${API}`
    : `Modo demostración: no se pudo contactar ${API}`

  return `
    <main class="app-shell">
      <section class="hero-panel" aria-labelledby="page-title">
        <div>
          <p class="eyebrow">Centro operativo · Minería</p>
          <h1 id="page-title">Salud de infraestructura crítica</h1>
          <p class="hero-copy">ALERTA360 consolida señales de sensores, frescura de datos y consistencia operacional para priorizar activos que necesitan atención.</p>
        </div>
        <div class="capability-card" aria-label="Capacidad de alertamiento">
          <span>Alerting capability</span>
          <strong>${averageScore}%</strong>
          <p>${capability?.assetCount ?? assets.length} activos · ${capability?.criticalAssetCount ?? assets.filter(asset => asset.isCritical).length} críticos</p>
        </div>
      </section>

      <section class="toolbar" aria-label="Estado de conexión">
        <div>
          <span class="connection-dot ${mode === 'live' ? 'is-live' : 'is-demo'}" aria-hidden="true"></span>
          <strong>${sourceCopy}</strong>
        </div>
        <button id="refresh" type="button">Recargar evaluación</button>
      </section>

      <section class="metrics-grid" aria-label="Resumen operativo">
        <article class="metric-card">
          <span>Activos evaluados</span>
          <strong>${evaluated}/${assets.length}</strong>
          <p>Cobertura disponible para la última ventana.</p>
        </article>
        <article class="metric-card metric-card--risk">
          <span>Críticos con riesgo</span>
          <strong>${criticalAtRisk}</strong>
          <p>Prioridad alta por ponderación operacional.</p>
        </article>
        <article class="metric-card">
          <span>Peor score</span>
          <strong>${lowest?.lastScore?.scoreTotal ?? '—'}%</strong>
          <p>${lowest ? escapeHtml(lowest.name) : 'Sin activos evaluados'}</p>
        </article>
      </section>

      <section class="content-grid">
        <article class="panel panel--wide">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Inventario monitoreado</p>
              <h2>Estado por activo</h2>
            </div>
            <span>${assets.length} registros</span>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Criticidad</th>
                  <th>Score</th>
                  <th>Dimensiones</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </article>

        <aside class="panel">
          <div class="section-heading section-heading--stacked">
            <p class="eyebrow">Trazabilidad</p>
            <h2>Últimos incidentes</h2>
          </div>
          <ol class="incident-list">${incidentItems}</ol>
        </aside>
      </section>
    </main>`
}

async function load() {
  const app = document.querySelector<HTMLDivElement>('#app')!
  app.setAttribute('aria-busy', 'true')

  try {
    const [assetsRes, capRes, incRes] = await Promise.all([
      fetch(`${API}/api/assets`),
      fetch(`${API}/api/capability/latest`),
      fetch(`${API}/api/dev/incidents`),
    ])

    if (!assetsRes.ok) throw new Error(`API assets: ${assetsRes.status}`)

    const assets = (await assetsRes.json()) as AssetRow[]
    const capability = capRes.ok ? ((await capRes.json()) as Capability) : null
    const incidents = incRes.ok ? ((await incRes.json()) as Incident[]) : []

    app.innerHTML = renderDashboard(assets, capability, incidents, 'live')
  } catch (error) {
    console.warn('ALERTA360 usando datos demo:', error)
    app.innerHTML = renderDashboard(demoAssets, { score: 81, assetCount: 20, criticalAssetCount: 7 }, demoIncidents, 'demo')
  } finally {
    app.removeAttribute('aria-busy')
    document.querySelector<HTMLButtonElement>('#refresh')?.addEventListener('click', load)
  }
}

load()
