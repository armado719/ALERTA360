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

type ScorePoint = {
  calculatedAt: string
  scoreTotal: number
  scoreDisponibilidad: number
  scoreFrescura: number
  scoreCalidad: number
  scoreConsistencia: number
  scoreComunicacion: number
  status: string
}

type AssetRow = {
  id: string
  externalId: string
  name: string
  assetType: string
  isCritical: boolean
  status: string
  locationLabel?: string | null
  expectedIntervalSeconds?: number
  lastScore: null | Score
}

type AssetDetail = AssetRow & {
  updatedAt?: string
  incidentCount: number
  readingCount: number
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
  assetId?: string
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

const formatTime = (value: string) =>
  new Intl.DateTimeFormat('es-CL', { timeStyle: 'short' }).format(new Date(value))

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

function renderIncidentItems(incidents: Incident[], emptyTitle: string, emptyCopy: string) {
  return incidents.length
    ? incidents
        .slice(0, 8)
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
    : `<li><span class="incident-marker is-clear" aria-hidden="true"></span><div><strong>${escapeHtml(emptyTitle)}</strong><p>${escapeHtml(emptyCopy)}</p></div></li>`
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

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
        <tr class="asset-row" data-asset-id="${escapeHtml(asset.id)}" tabindex="0" role="link" aria-label="Ver detalle de ${escapeHtml(asset.name)}">
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
            <span>${assets.length} registros · clic para detalle</span>
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
          <ol class="incident-list">${renderIncidentItems(incidents, 'Sin incidentes recientes', 'Los activos evaluados no han superado umbrales de alerta.')}</ol>
        </aside>
      </section>
    </main>`
}

async function loadDashboard() {
  const app = document.querySelector<HTMLDivElement>('#app')!
  app.setAttribute('aria-busy', 'true')

  try {
    const [assetsRes, capRes, incRes] = await Promise.all([
      fetch(`${API}/api/assets`),
      fetch(`${API}/api/capability/latest`),
      fetch(`${API}/api/incidents`),
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
    document.querySelector<HTMLButtonElement>('#refresh')?.addEventListener('click', loadDashboard)
    app.querySelector('tbody')?.addEventListener('click', onRowActivate)
    app.querySelector('tbody')?.addEventListener('keydown', e => {
      if ((e as KeyboardEvent).key === 'Enter') onRowActivate(e)
    })
  }
}

function onRowActivate(event: Event) {
  const target = event.target as HTMLElement
  const row = target.closest<HTMLElement>('tr[data-asset-id]')
  if (row) window.location.hash = `#/activo/${row.dataset.assetId}`
}

// ---------------------------------------------------------------------------
// Detalle de activo + histórico
// ---------------------------------------------------------------------------

function renderChart(points: ScorePoint[]) {
  if (points.length < 2)
    return '<p class="muted chart-empty">Histórico insuficiente: se necesitan al menos 2 evaluaciones.</p>'

  const w = 720
  const h = 260
  const pad = 34
  const innerW = w - pad * 2
  const innerH = h - pad * 2
  const x = (i: number) => pad + (i * innerW) / (points.length - 1)
  const y = (v: number) => h - pad - (v * innerH) / 100

  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.scoreTotal).toFixed(1)}`).join(' ')
  const area = `${x(0).toFixed(1)},${(h - pad).toFixed(1)} ${line} ${x(points.length - 1).toFixed(1)},${(h - pad).toFixed(1)}`

  const grid = [0, 50, 60, 100]
    .map(v => {
      const critical = v === 60
      return `
        <line x1="${pad}" y1="${y(v)}" x2="${w - pad}" y2="${y(v)}"
          stroke="${critical ? 'var(--danger)' : 'var(--border)'}"
          stroke-width="1" ${critical ? 'stroke-dasharray="5 4"' : ''} />
        <text x="${pad - 8}" y="${y(v) + 4}" text-anchor="end" class="chart-label">${v}</text>`
    })
    .join('')

  const first = points[0]!
  const last = points[points.length - 1]!
  const dots = points
    .map(
      (p, i) =>
        `<circle cx="${x(i)}" cy="${y(p.scoreTotal)}" r="${i === points.length - 1 ? 5 : 3}"
          fill="${i === points.length - 1 ? 'var(--accent)' : 'var(--surface-raised)'}"
          stroke="var(--accent)" stroke-width="2">
          <title>${formatDate(p.calculatedAt)} · ${p.scoreTotal}%</title>
        </circle>`,
    )
    .join('')

  return `
    <figure class="score-chart" role="img"
      aria-label="Evolución del score total: ${first.scoreTotal}% el ${formatDate(first.calculatedAt)} hasta ${last.scoreTotal}% el ${formatDate(last.calculatedAt)}">
      <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
        ${grid}
        <polygon points="${area}" fill="rgba(170,59,255,0.10)"></polygon>
        <polyline points="${line}" fill="none" stroke="var(--accent)" stroke-width="2.5"
          stroke-linejoin="round" stroke-linecap="round"></polyline>
        ${dots}
        <text x="${pad}" y="${h - 10}" class="chart-label">${formatTime(last.calculatedAt)} (reciente)</text>
        <text x="${w - pad}" y="${h - 10}" text-anchor="end" class="chart-label">${formatTime(first.calculatedAt)} (antiguo)</text>
        <text x="${w - pad}" y="${y(60) - 7}" text-anchor="end" class="chart-label chart-label--critical">60 · crítico</text>
      </svg>
    </figure>`
}

function renderHistoryTable(points: ScorePoint[]) {
  if (!points.length) return '<p class="muted">Sin evaluaciones registradas.</p>'
  const rows = points
    .slice(0, 12)
    .map(
      p => `
        <tr>
          <td>${formatDate(p.calculatedAt)}</td>
          <td><strong>${p.scoreTotal}</strong></td>
          <td>${p.scoreDisponibilidad}</td>
          <td>${p.scoreFrescura}</td>
          <td>${p.scoreCalidad}</td>
          <td>${p.scoreConsistencia}</td>
          <td>${p.scoreComunicacion}</td>
          <td>${renderStatus(p.status)}</td>
        </tr>`,
    )
    .join('')

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Fecha</th><th>Total</th><th>Disp.</th><th>Fresc.</th>
            <th>Calidad</th><th>Cons.</th><th>Com.</th><th>Estado</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`
}

function renderAssetDetail(asset: AssetDetail, scores: ScorePoint[], incidents: Incident[]) {
  const score = asset.lastScore
  return `
    <main class="app-shell">
      <section class="detail-hero" aria-labelledby="asset-title">
        <div>
          <p class="eyebrow">Detalle de activo</p>
          <h1 id="asset-title">${escapeHtml(asset.name)}</h1>
          <div class="detail-pills">
            ${renderStatus(asset.status)}
            ${asset.isCritical ? '<span class="pill pill--critical">Crítico · pondera 2x</span>' : '<span class="pill">Normal</span>'}
            <span class="pill">${escapeHtml(asset.assetType)}</span>
            <span class="pill">${escapeHtml(asset.externalId)}</span>
          </div>
        </div>
        <button id="back" type="button" class="button-secondary">← Volver al dashboard</button>
      </section>

      <section class="metrics-grid" aria-label="Resumen del activo">
        <article class="metric-card">
          <span>Score actual</span>
          <strong>${score?.scoreTotal ?? '—'}%</strong>
          <p>${score ? `Evaluado ${formatDate(score.calculatedAt)}` : 'Sin evaluación registrada'}</p>
        </article>
        <article class="metric-card ${asset.status !== 'Healthy' ? 'metric-card--risk' : ''}">
          <span>Incidentes</span>
          <strong>${asset.incidentCount}</strong>
          <p>Cambios de estado y alertas registradas.</p>
        </article>
        <article class="metric-card">
          <span>Lecturas</span>
          <strong>${asset.readingCount}</strong>
          <p>${asset.expectedIntervalSeconds ? `Intervalo esperado ${asset.expectedIntervalSeconds}s` : 'Intervalo no configurado'}</p>
        </article>
      </section>

      <section class="content-grid">
        <article class="panel panel--wide">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Histórico</p>
              <h2>Evolución del score</h2>
            </div>
            <span>${scores.length} evaluaciones</span>
          </div>
          <div class="chart-wrap">${renderChart([...scores].reverse())}</div>
          <div class="section-heading">
            <div>
              <p class="eyebrow">Últimas evaluaciones</p>
              <h2>Detalle por dimensión</h2>
            </div>
          </div>
          ${renderHistoryTable(scores)}
        </article>

        <aside class="detail-side">
          <article class="panel">
            <div class="section-heading section-heading--stacked">
              <p class="eyebrow">Trazabilidad del activo</p>
              <h2>Incidentes</h2>
            </div>
            <ol class="incident-list">${renderIncidentItems(incidents, 'Sin incidentes', 'Este activo no ha cruzado umbrales de alerta.')}</ol>
          </article>

          <article class="panel ficha">
            <div class="section-heading section-heading--stacked">
              <p class="eyebrow">Ficha técnica</p>
              <h2>Configuración</h2>
            </div>
            <dl>
              <div><dt>Ubicación</dt><dd>${escapeHtml(asset.locationLabel || 'Sin ubicación registrada')}</dd></div>
              <div><dt>Intervalo esperado</dt><dd>${asset.expectedIntervalSeconds ? `${asset.expectedIntervalSeconds} s` : '—'}</dd></div>
              <div><dt>Criticidad</dt><dd>${asset.isCritical ? 'Crítica (2x)' : 'Normal'}</dd></div>
              <div><dt>Última actualización</dt><dd>${asset.updatedAt ? formatDate(asset.updatedAt) : '—'}</dd></div>
            </dl>
          </article>
        </aside>
      </section>
    </main>`
}

async function loadAsset(id: string) {
  const app = document.querySelector<HTMLDivElement>('#app')!
  app.setAttribute('aria-busy', 'true')

  try {
    const [assetRes, scoresRes, incidentsRes] = await Promise.all([
      fetch(`${API}/api/assets/${id}`),
      fetch(`${API}/api/assets/${id}/scores?limit=120`),
      fetch(`${API}/api/assets/${id}/incidents?limit=50`),
    ])

    if (assetRes.status === 404) {
      app.innerHTML = `
        <main class="app-shell">
          <section class="panel error-state">
            <p class="eyebrow">Activo no encontrado</p>
            <h2>No existe el activo solicitado</h2>
            <p class="muted">Puede que la API se haya reiniciado o que el identificador sea inválido.</p>
            <button id="back" type="button">← Volver al dashboard</button>
          </section>
        </main>`
      return
    }
    if (!assetRes.ok) throw new Error(`API asset: ${assetRes.status}`)

    const asset = (await assetRes.json()) as AssetDetail
    const scores = scoresRes.ok ? ((await scoresRes.json()) as ScorePoint[]) : []
    const incidents = incidentsRes.ok ? ((await incidentsRes.json()) as Incident[]) : []

    app.innerHTML = renderAssetDetail(asset, scores, incidents)
  } catch (error) {
    console.warn('ALERTA360 detalle no disponible:', error)
    app.innerHTML = `
      <main class="app-shell">
        <section class="panel error-state">
          <p class="eyebrow">Sin conexión</p>
          <h2>No se pudo cargar el detalle</h2>
          <p class="muted">La API local (${escapeHtml(API)}) no responde. Verifica que el backend esté corriendo.</p>
          <button id="back" type="button">← Volver al dashboard</button>
        </section>
      </main>`
  } finally {
    app.removeAttribute('aria-busy')
    document.querySelector<HTMLButtonElement>('#back')?.addEventListener('click', () => {
      if (window.location.hash) window.location.hash = ''
      else loadDashboard()
    })
  }
}

// ---------------------------------------------------------------------------
// Router (hash): '' → dashboard · '#/activo/{id}' → detalle
// ---------------------------------------------------------------------------

function route() {
  const match = window.location.hash.match(/^#\/activo\/([0-9a-fA-F-]+)/)
  if (match?.[1]) loadAsset(match[1])
  else loadDashboard()
}

window.addEventListener('hashchange', route)
route()
