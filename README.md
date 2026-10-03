# ALERTA360 — Infrastructure Health

Plataforma de observabilidad especializada en infraestructura de sistemas de alerta temprana (sensores, estaciones, sirenas). Responde una sola pregunta: *¿está funcionando el sistema que debería avisarnos si ocurre una emergencia, ahora mismo?*

La conversación y la documentación del proyecto están en **español**.

---

## Orden de lectura

1. **`docs/gobernanza/ALERTA360_Project_Master.md`** — documento de control de fases. Gobierna el avance con checklists de salida: **sin checklist completado, no se avanza de fase**. Empezar aquí.
2. **`docs/gobernanza/ALERTA360_Project_Master_Lean.md`** — complemento de detalle de la Fase 1 (problema, ICP, Health Score, riesgos, criterios de éxito). No gobierna fases; si diverge algo con el Master, manda el Master.
3. Luego, según la fase en la que se esté trabajando (ver abajo).

---

## Estructura de documentación

```
README.md                          ← este índice
docs/
├── gobernanza/                    ← control del proyecto
│   ├── ALERTA360_Project_Master.md          (GOBIERNA: fases + checklists)
│   └── ALERTA360_Project_Master_Lean.md     (complemento detalle Fase 1)
├── fase0-validacion-campo/        ← FASE 0: validar problema/cliente/vertical
│   ├── ALERTA360_Protocolo_Validacion_Campo.md    (guion + rúbrica + decisión)
│   ├── ALERTA360_Logistica_Seguimiento_Entrevistas.md  (outreach + mensajes)
│   ├── ALERTA360_Checklist_Levantamiento_Tecnico.md    (ficha técnica por piloto)
│   ├── ALERTA360_Seguimiento_Contactos.csv             (tracker de outreach)
│   └── ALERTA360_Matriz_Comparativa_Plantilla.csv      (fuente única de la matriz)
├── fase1-mvp/                     ← FASE 1: desarrollo del MVP
│   ├── ALERTA360_Especificacion_Funcional_MVP_Plantilla.md
│   └── ALERTA360_Arquitectura_Tecnica_Detallada.md
├── fase2-piloto/                  ← FASE 2: piloto con cliente real
│   └── ALERTA360_Acuerdo_Piloto_Plantilla.md
└── archivo/                       ← documentos superados, NO usar como referencia
    ├── ALERTA360_Nota_Continuidad.md               (snapshot 2026-09-06, obsoleto)
    └── ALERTA360_Project_Master_v.4.md.txt          (vacío)
```

---

## Estado actual (resumen — la fuente de verdad es el Registro de avance del Master, sección 7)

| Fase | Estado |
|---|---|
| **Fase 0** — Validación de campo | **EN EJECUCIÓN** — checklist NO completo (faltan 6 entrevistas + validación técnica) |
| **Fase 1** — MVP | Técnicamente completa con datos **simulados** — telemetría real bloqueada hasta cerrar Fase 0 |
| **Fase 2** — Piloto | CERRADA SIN EJECUTAR — sin cliente piloto no hay piloto posible |
| **Fase 3+** — Visión largo plazo | Fuera de alcance hasta nueva decisión |

**Regla dura:** ningún documento ni código de Fase 1 en adelante es definitivo mientras el checklist de Fase 0 no esté 100% completo con evidencia real.

---

## Resto del repositorio

| Ruta | Qué es |
|---|---|
| `src/Alerta360.Api/` | Backend ASP.NET Core (C#) + PostgreSQL |
| `src/Alerta360.Tests/` | Tests xUnit del motor Health Score y notificaciones |
| `src/frontend/` | Frontend TypeScript + Vite (sin framework — DOM directo) |
| `src/frontend/DESIGN.md` | **Fuente autoritativa** de tokens visuales (colores, tipografía, componentes) |
| `App.jsx` | Preview autónomo del dashboard, para validar visual sin flujo Vite/TS |
| `MEMORY.md` | Memoria de workspace autogenerada (plugin `.remember`) — no editar a mano |
| `docker-compose.yml` | Solo levanta PostgreSQL (`alerta360-db`) — no levanta frontend ni backend |
| `.github/workflows/ci.yml` | CI: build + tests backend, build frontend (se activa al subir a GitHub) |
| `NO BORRAR.txt` | Comandos y credenciales locales de Docker/Postgres ⚠️ ver nota de seguridad |

Para levantar el entorno local (detalle en `docs/archivo/ALERTA360_Nota_Continuidad.md`, aunque obsoleto, sigue siendo válido para comandos):

```
docker compose up -d db
dotnet run --urls "http://localhost:5000"    # en src/Alerta360.Api
npm.cmd run dev -- --port 5173               # en src/frontend
```

Verificación (build + tests):

```
dotnet build src/Alerta360.Api
dotnet test src/Alerta360.Tests
npm run build                                 # en src/frontend
```

---

## Auth mínima (API key)

Header `X-API-Key`. Protegido: **`/api/dev/*` (siempre)** y **cualquier escritura** (POST/PUT/PATCH/DELETE). Público: GET del dashboard y `/health`.

- Dev: la key está en `src/Alerta360.Api/appsettings.Development.json` → `alerta360-dev-key`
- Producción: definir env `Security__ApiKey` (sin configurar → los endpoints protegidos responden **503**, fail-closed)
- Comparación de key en tiempo fijo (`FixedTimeEquals`)

```
curl -X POST http://localhost:5000/api/dev/seed -H "X-API-Key: alerta360-dev-key"
```

---

## Notas y deudas conocidas

- **⚠️ Credenciales en git:** `NO BORRAR.txt` contiene credenciales de la DB local (`alerta360_dev`) y está trackeado. Son de desarrollo, no de producción, pero conviene sacarlo del repo y pasarlo a `.gitignore` (pendiente).
- **`src/frontend/DESIGN.md`** se movió desde la raíz para vivir junto a su código; `MEMORY.md` ya apunta a la nueva ruta.
- La **referencia al nombre del CSV de matriz** estaba rota en el Protocolo y la Logística (`Matriz_Comparativa.csv`) — corregida a `ALERTA360_Matriz_Comparativa_Plantilla.csv`.
