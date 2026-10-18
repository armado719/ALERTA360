# Mapa: capas, satélite y vista 3D

## Panel de capas (botón «Capas» abajo a la derecha del mapa)

| Capa | Fuente | Notas |
|---|---|---|
| **Oscuro** | Esri Dark Gray Canvas | base del diseño, sin API key |
| **Satélite** | Esri World Imagery | imagen real (Maxar/Earthstar) |
| **Terreno** | Esri World Topo Map | invertido por CSS para que quede en modo oscuro |
| **Relieve** | Esri World Shaded Relief | sombreado de relieve, invertido por CSS |
| **Etiquetas** | Esri Reference / Boundaries & Places | toggle independiente sobre satélite y oscuro |
| **Vista 3D** | MapLibre GL 4.7 | globo 3D + terreno real (DEM) |

## Vista 3D (tipo Google Earth)

- Motor: **MapLibre GL JS 4.7** (open source, sin API key ni cuenta).
- Proyección **globo** (`setProjection({type:'globe'})`) + `pitch` de 38° al abrir.
- **Terreno real** desde `elevation-tiles-prod` (AWS Terrain Tiles, terrarium, sin key).
- **Piel satelital** Esri World Imagery.
- Marcadores HUD propios (halo + punto con glow) dibujados como `HTMLElement`, no imagen.
- `flyTo` al seleccionar un evento desde la lista o el mapa.
- `ResizeObserver` para que el canvas siga al panel cuando cambia de tamaño.
- La vista 3D se carga con `React.lazy` → no pesa en el bundle inicial del 2D.

## Notas técnicas

- El worker de MapLibre necesita que el paquete pase por el dep optimizer de Vite
  (no agregar `optimizeDeps.exclude`), por eso el import usa namespace + interop
  (`ns.default ?? ns`) para funcionar tanto en dev como en build.
- El CSS de `maplibre-gl` pone `position: relative` en el contenedor: el div del mapa
  debe tener altura real (`h-full min-h-[300px]`), no `absolute inset-0`, o el canvas queda en 0 px.
- Los mapas claros (Terreno/Relieve) se oscurecen con `filter: invert() hue-rotate() brightness()`
  en `.leaflet-tile-pane` según `data-basemap`.


## Mapa de calor de densidad

- Disponible en **2D y 3D** desde el panel de capas («Mapa de calor»).
- 2D: `leaflet.heat` con degradado azul → cian → ámbar → naranja → rojo.
- 3D: capa nativa `heatmap` de MapLibre sobre GeoJSON, con radio e intensidad
  interpolados por zoom (26 px a escala mundo, 74 px a zoom 12), opacidad 0.9.
- El peso de cada evento depende de la severidad: crítico 1.0 · alto 0.72 ·
  medio 0.45 · bajo 0.2.
- Al activarlo, los marcadores bajan a 35 % de opacidad para no saturar la lectura.

## Edificios 3D

- Fuente: **OpenFreeMap** (`tiles.openfreemap.org`, OpenMapTiles, sin API key),
  capa `building` con altura real (`render_height` / `building:levels`).
- Se muestran a partir de **zoom 13** y solo en vista 3D.
- Al activar el interruptor, la cámara vuela a una ciudad: el evento seleccionado
  o **Bogotá** por defecto, a zoom 15 y 62° de inclinación.
- Color por altura (azul profundo → cian) con degradado vertical, para que encaje
  con la paleta del panel.
- Topónimos: capa `place` de la misma fuente vectorial (Noto Sans desde
  demotiles.maplibre.org), con halo oscuro.

## Agrupación de eventos (clusters)

- **2D**: `ClusterLayer` agrupa los eventos por celdas de 56 px en la proyección
  actual y fusiona los grupos cuyos centroides quedan a menos de 40 px, para que
  las burbujas nunca se pisen. Cada burbuja muestra el número de eventos y se
  pinta cian, o naranja si el grupo contiene algún evento alto/crítico.
- **3D**: fuente GeoJSON `eventosCluster` con `cluster: true`, `clusterRadius: 46`
  y `clusterMaxZoom: 6`; halo, disco y contador como tres capas `circle` con
  texto en `Open Sans Semibold`.
- **Clic en un grupo** → `easeTo` al centro del grupo y zoom de expansión
  (se pide a MapLibre; si no responde en ~400 ms se usa un paso por tamaño del
  grupo: +2.6 con 50+ eventos, +2.2 con 10+, +1.8 con menos), siempre con tope 12.
- **Clic en un evento suelto** → se selecciona y se abre su ficha, igual que en la lista.
- Con el mapa de calor activo, burbujas y puntos bajan de opacidad.

## Línea de tiempo (últimas 24 h)

- Interruptor «Línea de tiempo» en el panel de capas; la barra aparece abajo,
  centrada, y el panel de capas se eleva para no taparla.
- Filtra los eventos a la ventana `[ahora − 24 h, ahora − horasAgo]`, así que
  al reproducir el mapa se va poblando desde la izquierda hasta «ahora».
- **Play/pausa** avanza en pasos de 15 min cada 110 ms (≈ 2.9 s para 24 h) y el
  slider (paso 0.25 h) permite saltar a cualquier instante; arrastrarlo pausa.
- El calor, las burbujas y los contadores del panel lateral se recalculan con la
  ventana, de modo que el mapa «respira» durante la reproducción.
- Al activarla arranca en «ahora» con las 24 h completas; al pulsar play se
  rebobina al inicio.
- La ventana activa se muestra como `18:40 → ahora` sobre el slider y las
  atribuciones del mapa se suben 92 px para dejar libre la barra.

## Capturas

`mapa-capas.png`, `mapa-satelite.png`, `mapa-3d.png`, `mapa-3d-zoom.png`,
`mapa-terreno.png`, `heat-2d.png`, `heat-3d.png`, `edificios-3d.png`,
`clusters-mapa.png`, `clusters-zoom.png`, `clusters-3d.png`,
`timeline-24h.png`, `timeline-replay.png`, `timeline-3d.png`.
