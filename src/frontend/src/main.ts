import './style.css'

const API = 'http://localhost:5000'

type AssetRow = {
  id: string; externalId: string; name: string; assetType: string;
  isCritical: boolean; status: string;
  lastScore: null | {
    scoreTotal: number; scoreDisponibilidad: number; scoreFrescura: number;
    scoreCalidad: number; scoreConsistencia: number; scoreComunicacion: number;
    status: string; calculatedAt: string;
  };
}

const dot = (s: string) =>
  s === 'Healthy' ? '🟢' : s === 'DegradedMinor' ? '🟡' : s === 'DegradedMajor' ? '🟠' : '🔴'

async function load() {
  const app = document.querySelector<HTMLDivElement>('#app')!
  try {
    const [assetsRes, capRes, incRes] = await Promise.all([
      fetch(`${API}/api/assets`),
      fetch(`${API}/api/capability/latest`),
      fetch(`${API}/api/dev/incidents`),
    ])
    if (!assetsRes.ok) throw new Error(`API assets: ${assetsRes.status}`)
    const assets = (await assetsRes.json()) as AssetRow[]
    const cap = capRes.ok ? await capRes.json() : null
    const incidents = incRes.ok ? await incRes.json() : []

    const rows = assets.map(a => `
      <tr>
        <td>${dot(a.status)} ${a.name}</td>
        <td>${a.externalId}</td>
        <td>${a.isCritical ? 'sí (2x)' : 'no'}</td>
        <td><b>${a.lastScore?.scoreTotal ?? '—'}</b> <small>${a.lastScore ? `D${a.lastScore.scoreDisponibilidad}/F${a.lastScore.scoreFrescura}/C${a.lastScore.scoreCalidad}/Co${a.lastScore.scoreConsistencia}/Cm${a.lastScore.scoreComunicacion}` : ''}</small></td>
        <td>${a.status}</td>
      </tr>`).join('')

    const inc = (incidents as any[]).slice(0, 10).map(i =>
      `<li><b>${i.eventType}</b> — ${new Date(i.detectedAt).toLocaleString()} — ${i.notes ?? ''}</li>`).join('')

    app.innerHTML = `
      <main style="max-width:960px;margin:0 auto;padding:24px;font-family:system-ui">
        <h1>ALERTA360 — Infrastructure Health (MVP esqueleto)</h1>
        <p>Escenario de trabajo: Minería · 20 sensores · intervalo 5 min · <b>Fase 0 pendiente, datos simulados</b></p>
        <h2>Alerting Capability: ${cap ? `<b>${cap.score}%</b> <small>(${cap.assetCount} activos, ${cap.criticalAssetCount} críticos)</small>` : 'sin datos — POST /api/dev/evaluate'}</h2>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">
          <thead><tr><th>Activo</th><th>ID</th><th>Crítico</th><th>Health</th><th>Estado</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <h2>Últimos incidentes</h2>
        <ul>${inc || '<li>sin incidentes</li>'}</ul>
        <p><button id="refresh">Recargar</button> <small>API: ${API}</small></p>
      </main>`
    document.querySelector('#refresh')!.addEventListener('click', load)
  } catch (e) {
    app.innerHTML = `<main style="padding:24px;font-family:system-ui"><h1>ALERTA360</h1><p style="color:red">API no reachable en ${API} — arranca el backend y recarga. (${e})</p><p><button onclick="location.reload()">Reintentar</button></p></main>`
  }
}

load()
