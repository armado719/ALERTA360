/**
 * Utilidades puras de formato y presentación.
 * Extraído de main.ts para poder testearlo sin DOM ni fetch.
 */

/**
 * URL de la API local. Se inyecta en los textos visibles del dashboard, por eso
 * vive aquí y no se re-declara en cada función de render.
 */
export const API_LABEL = 'http://localhost:5000'

export type StatusTone = 'good' | 'warn' | 'risk' | 'bad'

export type StatusMeta = {
  label: string
  tone: StatusTone
}

export const statusMeta: Record<string, StatusMeta> = {
  Healthy: { label: 'Saludable', tone: 'good' },
  DegradedMinor: { label: 'Degradación menor', tone: 'warn' },
  DegradedMajor: { label: 'Degradación mayor', tone: 'risk' },
  Critical: { label: 'Crítico', tone: 'bad' },
  DataUnreliable: { label: 'Datos no confiables', tone: 'risk' },
}

export const eventLabels: Record<string, string> = {
  Degraded: 'Degradación detectada',
  Critical: 'Estado crítico',
  Recovered: 'Recuperación',
  DataUnreliable: 'Datos no confiables',
}

export type Score = {
  scoreTotal: number
  scoreDisponibilidad: number
  scoreFrescura: number
  scoreCalidad: number
  scoreConsistencia: number
  scoreComunicacion: number
  status: string
  calculatedAt: string
}

export type ScorePoint = {
  calculatedAt: string
  scoreTotal: number
  scoreDisponibilidad: number
  scoreFrescura: number
  scoreCalidad: number
  scoreConsistencia: number
  scoreComunicacion: number
  status: string
}

export type AssetRow = {
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

export type AssetDetail = AssetRow & {
  updatedAt?: string
  incidentCount: number
  readingCount: number
}

export type Capability = {
  score: number
  assetCount: number
  criticalAssetCount: number
}

export type Incident = {
  eventType: string
  detectedAt: string
  notes?: string
  assetId?: string
}

export const scoreKeys: Array<[keyof Score, string]> = [
  ['scoreDisponibilidad', 'Disp.'],
  ['scoreFrescura', 'Fresc.'],
  ['scoreCalidad', 'Calidad'],
  ['scoreConsistencia', 'Cons.'],
  ['scoreComunicacion', 'Com.'],
]

/**
 * Escapa los 5 caracteres que rompen HTML. Es la única barrera contra XSS:
 * los valores vienen de la API y se inyectan en innerHTML.
 * El orden importa: & primero, o las entidades se re-escapan.
 */
export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const dateTimeFormat = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'short',
  timeStyle: 'short',
})

const timeFormat = new Intl.DateTimeFormat('es-CL', { timeStyle: 'short' })

/**
 * Formatea una fecha ISO. Si el valor no es una fecha válida devuelve '—'
 * en vez de lanzar RangeError: una fecha corrupta de la API no debe
 * tumbar el render completo del dashboard.
 */
export const formatDate = (value: string | null | undefined): string => {
  const date = new Date(value ?? '')
  if (Number.isNaN(date.getTime())) return '—'
  return dateTimeFormat.format(date)
}

export const formatTime = (value: string | null | undefined): string => {
  const date = new Date(value ?? '')
  if (Number.isNaN(date.getTime())) return '—'
  return timeFormat.format(date)
}

export const renderStatus = (status: string): string => {
  const meta = statusMeta[status] ?? { label: status, tone: 'bad' }
  return `<span class="status status--${meta.tone}"><span aria-hidden="true"></span>${escapeHtml(meta.label)}</span>`
}

// ---------------------------------------------------------------------------
// Componentes de presentación
// ---------------------------------------------------------------------------

export const renderScoreBreakdown = (score: Score | null): string => {
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

const MAX_INCIDENTS_SHOWN = 8

export const renderIncidentItems = (
  incidents: Incident[],
  emptyTitle: string,
  emptyCopy: string,
): string =>
  incidents.length
    ? incidents
        .slice(0, MAX_INCIDENTS_SHOWN)
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

export type DashboardMetrics = {
  evaluated: number
  criticalAtRisk: number
  averageScore: number
  lowest: AssetRow | undefined
}

/**
 * Calcula las tarjetas de resumen del dashboard.
 * Extraído del render para poder testear la aritmética (incluido el
 * divide-por-cero cuando no hay ningún activo con score) sin tocar el DOM.
 */
export const computeDashboardMetrics = (
  assets: AssetRow[],
  capability: Capability | null,
): DashboardMetrics => {
  const evaluated = assets.filter(asset => asset.lastScore).length
  const criticalAtRisk = assets.filter(
    asset => asset.isCritical && asset.status !== 'Healthy',
  ).length

  const averageScore =
    capability?.score ??
    Math.round(
      assets.reduce((sum, asset) => sum + (asset.lastScore?.scoreTotal ?? 0), 0) /
        Math.max(evaluated, 1),
    )

  const lowest = [...assets]
    .filter(asset => asset.lastScore)
    .sort((a, b) => (a.lastScore?.scoreTotal ?? 0) - (b.lastScore?.scoreTotal ?? 0))[0]

  return { evaluated, criticalAtRisk, averageScore, lowest }
}

export const renderDashboard = (
  assets: AssetRow[],
  capability: Capability | null,
  incidents: Incident[],
  mode: 'live' | 'demo',
): string => {
  const { evaluated, criticalAtRisk, averageScore, lowest } = computeDashboardMetrics(
    assets,
    capability,
  )

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

  const sourceCopy =
    mode === 'live'
      ? `Datos en vivo desde ${API_LABEL}`
      : `Modo demostración: no se pudo contactar ${API_LABEL}`

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

const CRITICAL_THRESHOLD = 60

export const renderChart = (points: ScorePoint[]): string => {
  if (points.length < 2)
    return '<p class="muted chart-empty">Histórico insuficiente: se necesitan al menos 2 evaluaciones.</p>'

  const w = 720
  const h = 260
  const pad = 34
  const innerW = w - pad * 2
  const innerH = h - pad * 2
  const x = (i: number) => pad + (i * innerW) / (points.length - 1)
  // El score se acota a 0-100: si el backend devolviera algo fuera de rango,
  // el SVG sigue siendo válido en vez de dibujar fuera del viewBox.
  const y = (v: number) => h - pad - ((Math.min(100, Math.max(0, v)) * innerH) / 100)

  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.scoreTotal).toFixed(1)}`).join(' ')
  const area = `${x(0).toFixed(1)},${(h - pad).toFixed(1)} ${line} ${x(points.length - 1).toFixed(1)},${(h - pad).toFixed(1)}`

  const grid = [0, 50, 60, 100]
    .map(v => {
      const critical = v === CRITICAL_THRESHOLD
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
        `<circle cx="${x(i).toFixed(1)}" cy="${y(p.scoreTotal).toFixed(1)}" r="${i === points.length - 1 ? 5 : 3}"
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
        <text x="${w - pad}" y="${y(CRITICAL_THRESHOLD) - 7}" text-anchor="end" class="chart-label chart-label--critical">60 · crítico</text>
      </svg>
    </figure>`
}

const MAX_HISTORY_ROWS = 12

export const renderHistoryTable = (points: ScorePoint[]): string => {
  if (!points.length) return '<p class="muted">Sin evaluaciones registradas.</p>'

  const rows = points
    .slice(0, MAX_HISTORY_ROWS)
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

export const renderAssetDetail = (
  asset: AssetDetail,
  scores: ScorePoint[],
  incidents: Incident[],
): string => {
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

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

/**
 * Extrae el id de activo de un hash de ruta.
 * Solo acepta caracteres de un GUID: el id se interpola luego en la URL del
 * fetch, así que un hash manipulado no debe poder alterar la ruta solicitada.
 * Devuelve null (→ dashboard) ante cualquier ruta no reconocida.
 */
export const resolveAssetRoute = (hash: string): string | null => {
  const match = hash.match(/^#\/activo\/([0-9a-fA-F-]+)$/)
  return match?.[1] ?? null
}