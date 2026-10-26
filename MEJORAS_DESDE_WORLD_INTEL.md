# Mejoras que se pueden integrar desde `world-intel-mcp`

**Fecha:** 2026-10-19 · **Versión:** 1.0
**Repo revisado:** `marc-shade/world-intel-mcp` v0.11.0 (MIT, 160 herramientas)
**Método:** leído archivo por archivo en un clon local, y cada API probada en vivo.
Ninguna afirmación sale del README.

**Regla:** una pieza entra si acerca al objetivo — *que una persona en cualquier
lugar del mundo reciba a tiempo la alerta del evento que la afecta*. Si solo hace
más inteligente a un agente conversacional, no entra.

---

## A. Fuentes de eventos (crean `DisasterEvent`)

| # | Mejora | Archivo de referencia | Qué aporta | Medición real | Esf. |
|---|---|---|---|---|---|
| A1 | **NASA EONET** | `sources/environmental.py` | Inundación, deslizamiento, incendio, tormenta, volcán, sismo, sequía | **11 eventos en bbox Colombia / 120 días** (9 inundaciones, 2 incendios) | 3 h |
| A2 | **GDACS** | `environmental.py` (`fetch_disaster_alerts`) | Ciclón, inundación, volcán, incendio, sequía, sismo | **86 eventos globales / 12 meses** (TC 19 · EQ 21 · FL 18 · WF 15 · VO 7 · DR 6) | 3 h |
| A3 | **Meteoalarm** | `sources/meteoalarm.py` | Avisos meteorológicos oficiales | 39 países de Europa · sin clave | 3 h |
| A4 | **Huracanes con cono** | `cyclones.py` + `cyclone_forecasts.py` | Trayectoria y cono de 5 días (NHC/JTWC), no solo el punto | Activo hoy (tormenta Trudy, Pacífico Este) | 4-6 h |
| A5 | **Volcanes GVP** | `sources/volcano.py` | Reporte semanal mundial | **403** desde aquí | spike |

> A1 y A2 comparten archivo porque el repo los implementa juntos; en ALERTA360
> van como dos adaptadores separados en `backend/src/services/sources/`.

---

## B. Inteligencia sobre los eventos (mejoran la alerta sin añadir fuentes)

Esto es lo que más se subestima: no traen más eventos, hacen que el usuario reciba
**mejor** información sobre los que ya hay.

| # | Mejora | Archivo | Qué aporta a ALERTA360 | Esf. |
|---|---|---|---|---|
| B1 | **Población expuesta** | `analysis/exposure.py` | "12.400 personas en riesgo" en vez de solo "sismo M5.4". Usa haversine + dataset de ciudades | 2 h + dataset |
| B2 | **Convergencia geográfica** | `analysis/convergence.py` | Detecta cuando varias señales caen en la misma celda (rejilla 1°): sismo + inundación + tormenta → sube severidad. Evita falsas calmas y falsas alarmas | 3 h |
| B3 | **Escalada de hotspot** | `analysis/escalation.py` | Puntúa si una zona va a peor con el tiempo, no solo el instante | 2 h |
| B4 | **Detección de entrada/salida en zona** | `analysis/aoi.py` | "Un incendio **entró** en tu zona" en vez de solo "hay un evento cerca". Cambia el modelo de notificación | 4-6 h |
| B5 | **Resumen diario citado** | `analysis/daily_digest.py` | Brief matinal por email, con fuentes numeradas. **Ya tenemos SendGrid enviando** | 4 h |
| B6 | **Brief situacional** | `analysis/situation.py`, `world_brief.py` | Resumen de una zona concreta con citas; útil como detalle del evento | 4 h |

> B1 usa una lista estática de ~120 ciudades grandes: sirve para una primera
> versión, pero para Huila o zonas rurales habrá que cargar un dataset propio.

---

## C. Fiabilidad de la ingesta

| # | Mejora | Archivo | Qué resuelve | Esf. |
|---|---|---|---|---|
| C1 | **Circuit breaker + caché con TTL** | `fetcher.py`, `circuit_breaker.py` | Si USGS cae, hoy solo sube un contador: el mapa se ve "tranquilo" y es mentira. Con esto, el estado pasa a `degraded` | 2 h |
| C2 | **Marcas de frescura** | `sources/freshness.py` | `fetched_at`, `_stale`, `_stale_age_seconds`: distinguir dato fresco de dato viejo servido por caché | incl. en C1 |
| C3 | **Rate limit entre procesos** | `shared_floor.py` | Solo importa si se corre más de un proceso contra la misma fuente | diferir |

---

## D. Geolocalización y zonas

| # | Mejora | Archivo | Qué resuelve | Esf. |
|---|---|---|---|---|
| D1 | **Geocodificación inversa** | `sources/geocode.py` | Coordenadas → "Neiva, Huila". Respeta 1 req/s y cachea 30 días | incl. |
| D2 | **Zonas con forma** | `analysis/aoi.py` | Polígono y **corredor** (una vereda a lo largo de una vía), distancia punto→segmento | 1-2 d |
| D3 | **Cruce del antimeridiano** | `analysis/aoi.py` | Un círculo alrededor de Fiyi o Nueva Zelanda cruza los 180°: sin partirlo en dos cajas, la consulta devuelve la mitad del área | incl. en D2 |

> ⚠️ **Corrección:** `geocode.py` **solo hace inversa** (coords → nombre). Para la
> pantalla de ubicación hace falta **directa** (nombre → coords), que el repo **no
> tiene**. Se implementa con el endpoint `/search` de Nominatim, mismo límite y caché.
> En el plan anterior dije que este archivo resolvía el bloqueo 1.1: era inexacto.

---

## E. Lo que NO se integra

| Pieza | Motivo |
|---|---|
| 151 feeds RSS, GDELT, news signals | Son noticias, no desastres: no generan `DisasterEvent` |
| ACLED, UCDP | Conflicto armado + OAuth con registro |
| Mercados, FRED, cripto, bonos, SEC | No son desastres |
| Vuelos, buques, sanciones, arXiv, GitHub | No son desastres |
| Qdrant / vector store | Infraestructura extra; solo indexa lo que captura su collector |
| Dashboard SSE de 47 feeds | Ya tenemos WebSocket propio |
| Prompts, resources y guía MCP | No somos un agente conversacional |
| `history.py` / `collector.py` | Versionado de series; interesante para una fase futura, no ahora |
| `reports.py` (PDF/WeasyPrint) | Trae dependencias nativas pesadas para una función secundaria |

---

## F. Orden recomendado

**Impacto inmediato (lo que cambia lo que recibe un ciudadano):**

1. **A1 EONET** — la única que añade inundación y deslizamiento, que hoy no existen.
2. **C1+C2 frescura y circuit breaker** — un falso "sin eventos" es peor que una caída.
3. **A2 GDACS** — ciclones e inundaciones a escala mundial.
4. **B5 resumen diario** — reutiliza el email que ya envía; alto valor percibido.
5. **B1 población expuesta** — convierte "sismo M5.4" en "afecta a 12.000 personas".

**Después:**

6. A4 huracanes con cono · 7. B4 entrada/salida de zona · 8. B2 convergencia
9. A3 Meteoalarm (Europa) · 10. D2/D3 zonas con forma

**Diferir o descartar:** A5 (403), C3 (multiproceso), E (todo).

---

## G. Resumen

| Categoría | Piezas | Esfuerzo total |
|---|---|---|
| Fuentes de eventos | 4 útiles (+1 spike) | ~13-15 h |
| Inteligencia sobre eventos | 6 | ~19 h |
| Fiabilidad | 2 | ~2 h |
| Geo y zonas | 3 | ~1-2 días |
| **Total aprovechable** | **15** | **~5 días de trabajo** |

Ninguna requiere clave de pago. Todas son MIT con atribución a Phoenix AGI si se
reutiliza código literal.
