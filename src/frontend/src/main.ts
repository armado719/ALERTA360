import './style.css'
import {
  API_LABEL,
  escapeHtml,
  renderDashboard,
  renderAssetDetail,
  resolveAssetRoute,
  type AssetRow,
  type AssetDetail,
  type Capability,
  type Incident,
  type Score,
} from './render'

const API = API_LABEL

// ---------------------------------------------------------------------------
// Datos de demostración
//
// Se usan solo si la API no responde. Un operador nunca debe confundir datos
// falsos con datos reales: el render marca visiblemente el modo demo.
// ---------------------------------------------------------------------------

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
    eventType: 'Degraded',
    detectedAt: new Date(Date.now() - 1000 * 60 * 17).toISOString(),
    notes: 'TRK-021 reporta ventana sin paquetes durante turno mina rajo norte.',
  },
  {
    eventType: 'Degraded',
    detectedAt: new Date(Date.now() - 1000 * 60 * 43).toISOString(),
    notes: 'CNV-118 supera umbral de latencia operacional configurado.',
  },
]

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

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
    app.innerHTML = renderDashboard(
      demoAssets,
      { score: 81, assetCount: 20, criticalAssetCount: 7 },
      demoIncidents,
      'demo',
    )
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
// Detalle de activo
// ---------------------------------------------------------------------------

async function loadAsset(id: string) {
  const app = document.querySelector<HTMLDivElement>('#app')!
  app.setAttribute('aria-busy', 'true')

  // encodeURIComponent: aunque el router ya filtra el formato del id, la URL
  // del fetch no debe construirse nunca por concatenación de texto crudo.
  const assetUrl = `${API}/api/assets/${encodeURIComponent(id)}`

  try {
    const [assetRes, scoresRes, incidentsRes] = await Promise.all([
      fetch(assetUrl),
      fetch(`${assetUrl}/scores?limit=120`),
      fetch(`${assetUrl}/incidents?limit=50`),
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
    const scores = scoresRes.ok ? ((await scoresRes.json()) as Score[]) : []
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
  const id = resolveAssetRoute(window.location.hash)
  if (id) loadAsset(id)
  else loadDashboard()
}

window.addEventListener('hashchange', route)
route()