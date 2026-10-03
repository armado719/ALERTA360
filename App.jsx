const assets = [
  { name: 'Camión autónomo 21', type: 'HaulTruck', id: 'TRK-021', critical: true, score: 68, status: 'Degradación mayor', tone: 'risk', dims: [72, 61, 79, 65, 58] },
  { name: 'Chancador primario', type: 'Crusher', id: 'PLT-004', critical: true, score: 93, status: 'Saludable', tone: 'good', dims: [96, 91, 94, 92, 90] },
  { name: 'Correa transportadora 118', type: 'Conveyor', id: 'CNV-118', critical: false, score: 81, status: 'Degradación menor', tone: 'warn', dims: [88, 76, 82, 84, 75] },
];

const incidents = [
  ['Pérdida de telemetría', 'Hace 17 min · TRK-021 reporta ventana sin paquetes durante turno mina rajo norte.'],
  ['Frescura degradada', 'Hace 43 min · CNV-118 supera umbral de latencia operacional configurado.'],
];

function Status({ tone, children }) {
  return <span className={`status status--${tone}`}><span />{children}</span>;
}

function App() {
  return (
    <main className="app-shell">
      <style>{`
        :root{--background:#fff;--surface:#f7f7fa;--text:#08060d;--muted:#6b6375;--border:#e5e4e7;--accent:#aa3bff;--success:#138a45;--warning:#b7791f;--danger:#c7352f;--risk:#c96c1b;font:16px/1.45 system-ui,'Segoe UI',sans-serif;color:var(--text);background:var(--background)}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top left,rgba(170,59,255,.08),transparent 32rem),linear-gradient(180deg,#fff 0%,#fbfbfd 42%,#f7f7fa 100%)}.app-shell{width:min(1180px,calc(100% - 32px));margin:0 auto;padding:28px 0 42px}.hero-panel{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:24px;align-items:stretch;border:1px solid var(--border);border-radius:12px;background:#fff;box-shadow:0 18px 48px rgba(38,24,58,.08);padding:clamp(24px,4vw,44px)}.eyebrow{color:var(--accent);font-size:.78rem;font-weight:800;letter-spacing:.12em;margin:0 0 10px;text-transform:uppercase}h1,h2,p{margin:0}h1{font-size:clamp(2.35rem,6vw,4.2rem);font-weight:650;letter-spacing:-.055em;line-height:.98;max-width:850px}h2{font-size:clamp(1.2rem,2vw,1.55rem);font-weight:650;letter-spacing:-.025em;line-height:1.1}.hero-copy{color:var(--muted);font-size:clamp(1rem,2vw,1.14rem);margin-top:18px;max-width:720px}.capability-card{border:1px solid color-mix(in srgb,var(--accent) 28%,var(--border));border-radius:12px;background:linear-gradient(145deg,rgba(170,59,255,.14),rgba(255,255,255,.86)),var(--surface);padding:22px}.capability-card span,.metric-card span,.section-heading>span{color:var(--muted);font-size:.86rem;font-weight:700}.capability-card strong{display:block;font-size:clamp(3rem,8vw,5.5rem);letter-spacing:-.08em;line-height:.9;margin:20px 0 12px}.capability-card p,.metric-card p,.incident-list p,.asset-name span{color:var(--muted)}.toolbar{align-items:center;display:flex;gap:16px;justify-content:space-between;margin:18px 0}.toolbar>div{align-items:center;color:var(--muted);display:flex;gap:10px}.toolbar strong{color:var(--text)}button{border:1px solid color-mix(in srgb,var(--accent) 45%,var(--border));border-radius:6px;background:var(--text);color:#fff;cursor:pointer;font-weight:700;padding:.78rem 1rem}.connection-dot,.status span,.incident-marker{border-radius:999px;display:inline-block;flex:0 0 auto}.connection-dot{height:10px;width:10px;background:var(--warning);box-shadow:0 0 0 5px rgba(183,121,31,.14)}.metrics-grid{display:grid;gap:16px;grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:16px}.metric-card,.panel{border:1px solid var(--border);border-radius:12px;background:rgba(255,255,255,.88)}.metric-card{padding:20px}.metric-card strong{display:block;font-size:2.35rem;letter-spacing:-.06em;line-height:1;margin:14px 0 8px}.metric-card--risk{border-color:color-mix(in srgb,var(--risk) 35%,var(--border));background:linear-gradient(180deg,rgba(201,108,27,.09),rgba(255,255,255,.9))}.content-grid{display:grid;gap:16px;grid-template-columns:minmax(0,1fr) 360px}.panel{min-width:0;overflow:hidden}.section-heading{align-items:start;border-bottom:1px solid var(--border);display:flex;gap:16px;justify-content:space-between;padding:22px 22px 18px}.section-heading--stacked{display:block}.table-wrap{overflow-x:auto}table{border-collapse:collapse;min-width:780px;width:100%}th,td{border-bottom:1px solid var(--border);padding:15px 16px;text-align:left;vertical-align:middle}th{color:var(--muted);font-size:.78rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}tbody tr:last-child td{border-bottom:0}.asset-name{display:grid;gap:2px}.pill,.status{align-items:center;border-radius:999px;display:inline-flex;font-size:.82rem;font-weight:800;gap:7px;padding:.28rem .58rem;white-space:nowrap}.pill{background:var(--surface);color:var(--muted)}.pill--critical{background:rgba(170,59,255,.1);color:var(--accent)}.status{border:1px solid currentColor}.status span{height:7px;width:7px}.status--good{color:var(--success)}.status--warn{color:var(--warning)}.status--risk{color:var(--risk)}.status--good span{background:var(--success)}.status--warn span{background:var(--warning)}.status--risk span{background:var(--risk)}.score-breakdown{display:flex;flex-wrap:wrap;gap:6px}.score-breakdown span{background:var(--surface);border-radius:6px;display:grid;gap:1px;min-width:54px;padding:5px 7px}.score-breakdown small{color:var(--muted);font-size:.68rem;font-weight:700}.incident-list{display:grid;list-style:none;margin:0;padding:4px 22px 22px}.incident-list li{display:grid;gap:12px;grid-template-columns:12px minmax(0,1fr);padding:18px 0}.incident-list li+li{border-top:1px solid var(--border)}.incident-marker{background:var(--danger);height:10px;margin-top:7px;width:10px}@media(max-width:920px){.hero-panel,.content-grid{grid-template-columns:1fr}.metrics-grid{grid-template-columns:1fr}.toolbar{align-items:stretch;flex-direction:column}.toolbar button{width:100%}}@media(max-width:560px){.app-shell{width:min(100% - 20px,1180px);padding-top:10px}.hero-panel,.capability-card,.metric-card,.section-heading{padding:18px}.capability-card strong{font-size:4rem}}
      `}</style>

      <section className="hero-panel" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Centro operativo · Minería</p>
          <h1 id="page-title">Salud de infraestructura crítica</h1>
          <p className="hero-copy">ALERTA360 consolida señales de sensores, frescura de datos y consistencia operacional para priorizar activos que necesitan atención.</p>
        </div>
        <div className="capability-card" aria-label="Capacidad de alertamiento">
          <span>Alerting capability</span>
          <strong>81%</strong>
          <p>20 activos · 7 críticos</p>
        </div>
      </section>

      <section className="toolbar" aria-label="Estado de conexión">
        <div><span className="connection-dot" aria-hidden="true" /><strong>Modo demostración: preview visual sin backend local</strong></div>
        <button type="button">Recargar evaluación</button>
      </section>

      <section className="metrics-grid" aria-label="Resumen operativo">
        <article className="metric-card"><span>Activos evaluados</span><strong>3/3</strong><p>Cobertura disponible para la última ventana.</p></article>
        <article className="metric-card metric-card--risk"><span>Críticos con riesgo</span><strong>1</strong><p>Prioridad alta por ponderación operacional.</p></article>
        <article className="metric-card"><span>Peor score</span><strong>68%</strong><p>Camión autónomo 21</p></article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="section-heading"><div><p className="eyebrow">Inventario monitoreado</p><h2>Estado por activo</h2></div><span>3 registros</span></div>
          <div className="table-wrap"><table><thead><tr><th>Activo</th><th>Criticidad</th><th>Score</th><th>Dimensiones</th><th>Estado</th></tr></thead><tbody>{assets.map((asset) => <tr key={asset.id}><td><div className="asset-name"><strong>{asset.name}</strong><span>{asset.type} · {asset.id}</span></div></td><td>{asset.critical ? <span className="pill pill--critical">Crítico · 2x</span> : <span className="pill">Normal</span>}</td><td><strong>{asset.score}</strong></td><td><div className="score-breakdown">{['Disp.','Fresc.','Calidad','Cons.','Com.'].map((label, index) => <span key={label}><small>{label}</small><strong>{asset.dims[index]}</strong></span>)}</div></td><td><Status tone={asset.tone}>{asset.status}</Status></td></tr>)}</tbody></table></div>
        </article>
        <aside className="panel"><div className="section-heading section-heading--stacked"><p className="eyebrow">Trazabilidad</p><h2>Últimos incidentes</h2></div><ol className="incident-list">{incidents.map(([title, copy]) => <li key={title}><span className="incident-marker" aria-hidden="true" /><div><strong>{title}</strong><p>{copy}</p></div></li>)}</ol></aside>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
