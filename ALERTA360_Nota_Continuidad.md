# ALERTA360 — Nota de continuidad (2026-09-06)
*Punto de retomada: seguimos desde aquí.*

## Dónde estamos
- **Fase 0 REACTIVADA / EN EJECUCIÓN** — faltan las 6 entrevistas + validación técnica (trabajo de campo, no delegable).
- **Fase 1 técnica cerrada con simulados** — backend + worker + dashboard corriendo en local.
- **Fase 2 CERRADA SIN EJECUTAR** — reapertura solo con Fase 0 cerrada.

## Qué corre en local
- DB `alerta360` (contenedor `alerta360-db`, Postgres 16): 1 cliente ficticio, 20 activos, 112 lecturas, capability 90.
- API `http://localhost:5000` (`/health`, `/api/assets`, `/api/capability/latest`, `/api/dev/*`).
- Web `http://localhost:5173` (dashboard mínimo).
- Para levantar: `docker compose up -d db` + `dotnet run --urls "http://localhost:5000"` (en `src/Alerta360.Api`) + `npm.cmd run dev -- --port 5173` (en `src/frontend`).

## Siguiente paso al retomar
1. Conseguir 8-10 contactos por vertical y registrarlos en `ALERTA360_Seguimiento_Contactos.csv`.
2. Hacer las 6 entrevistas con el guion del Protocolo; traer notas → se llenan registro + matriz + checklist aquí.
3. Con vertical/activo/protocolo reales: re-cierre de Espec/Arq, ingesta real, Fase 1 al 100%.

## Reglas vigentes (Master manda)
- Sin ingesta real hasta Fase 0 cerrada. Sin copias en paralelo: `C:\Desarrollador\ALERTA360` es la única fuente de verdad.
