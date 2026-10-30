// Iconos propios por tipo de desastre (24×24, trazo blanco redondeado).
// Una sola fuente para el mapa (Leaflet usa HTML en texto) y para React
// (`TypeBadge`). Las zonas con `fill-opacity` dan el efecto de dos tonos.

import { typeColor } from './eventTypes'
// Iconos 3D de clima: "Weather 3D Icons" de Jahanvi (Comunidad de Figma,
// archivo 1:661–1:670). Se exportan con su fondo oscuro (#01040C), por eso la
// insignia 3D usa ese mismo fondo y recorta el icono en círculo.
import heatwave3d from '../assets/icons3d/heatwave.png'
import rain3d from '../assets/icons3d/rain.png'
import snow3d from '../assets/icons3d/snow.png'
import storm3d from '../assets/icons3d/storm.png'

/** Tipos con icono 3D; el resto usa los SVG propios de abajo. */
const ICONS_3D: Record<string, string> = {
  rain: rain3d,
  storm: storm3d,
  snow: snow3d,
  heatwave: heatwave3d,
}

const FILL = 'fill="#fff" fill-opacity=".28" stroke="none"'

const GLYPHS: Record<string, string> = {
  // Sismograma sobre el suelo agrietado
  earthquake:
    '<path d="M2 11h3.2l1.8-4.5 3 9 2.6-7 2 4.5 1.6-2H22"/>' +
    '<path d="M4 19.5h6l1.5-1.6L13 19.5h7"/>',
  // Cono con cráter, lava y columna de ceniza
  volcanic:
    `<path ${FILL} d="M2.5 20.5 8.6 11h6.8l6.1 9.5z"/>` +
    '<path d="M2.5 20.5 8.6 11h6.8l6.1 9.5z"/>' +
    '<path d="m10 11 2 3 2-3"/>' +
    '<path d="M12 8V5.5M8.6 7.6 7.4 5.4M15.4 7.6l1.2-2.2"/>',
  // Ladera con rocas que ruedan
  landslide:
    `<path ${FILL} d="M2.5 20.5 10 8l4.5 6.5 3 6z"/>` +
    '<path d="M2.5 20.5 10 8l4.5 6.5"/><path d="M2.5 20.5h19"/>' +
    '<circle cx="16.8" cy="12.6" r="1.5"/><circle cx="19.6" cy="16.8" r="1.1"/>' +
    '<path d="M14.8 9.6 16 8.4M18.6 12.8l1.2-1"/>',
  // Casa con el agua a media altura
  flood:
    `<path ${FILL} d="M6 13.5V9.8L12 5l6 4.8v3.7z"/>` +
    '<path d="M4 11 12 4.5 20 11"/><path d="M6 9.8v3.4M18 9.8v3.4"/>' +
    '<path d="M2 16.5c1.7 0 1.7-1.2 3.3-1.2s1.7 1.2 3.4 1.2 1.6-1.2 3.3-1.2 1.7 1.2 3.4 1.2 1.6-1.2 3.3-1.2 1.6 1.2 3.3 1.2"/>' +
    '<path d="M2 20.5c1.7 0 1.7-1.2 3.3-1.2s1.7 1.2 3.4 1.2 1.6-1.2 3.3-1.2 1.7 1.2 3.4 1.2 1.6-1.2 3.3-1.2 1.6 1.2 3.3 1.2"/>',
  // Nube con gotas
  rain:
    `<path ${FILL} d="M7 14.5a4 4 0 0 1-.4-8A5.5 5.5 0 0 1 17 7.6a3.5 3.5 0 0 1 .2 6.9z"/>` +
    '<path d="M7 14.5a4 4 0 0 1-.4-8A5.5 5.5 0 0 1 17 7.6a3.5 3.5 0 0 1 .2 6.9z"/>' +
    '<path d="m8.5 17.5-1 2.5M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5"/>',
  // Nube con rayo
  storm:
    `<path ${FILL} d="M7 13.5a4 4 0 0 1-.4-8A5.5 5.5 0 0 1 17 6.6a3.5 3.5 0 0 1 .2 6.9z"/>` +
    '<path d="M7 13.5a4 4 0 0 1-.4-8A5.5 5.5 0 0 1 17 6.6a3.5 3.5 0 0 1 .2 6.9"/>' +
    '<path fill="#fff" stroke-width="1.2" d="m13.2 11.5-3.4 5h2.7l-1.6 5 4.3-6.3h-2.8l1.8-3.7z"/>',
  // Símbolo meteorológico del ciclón tropical
  hurricane:
    `<circle ${FILL} cx="12" cy="12" r="3"/>` +
    '<circle cx="12" cy="12" r="3"/>' +
    '<path d="M14.6 4.2C9.4 3 4.6 6.8 5.2 12.4"/><path d="M9.4 19.8c5.2 1.2 10-2.6 9.4-8.2"/>',
  // Llama con núcleo
  wildfire:
    `<path ${FILL} d="M12 2.8c1.2 3.2 5.4 5 5.4 10.4a5.4 5.4 0 0 1-10.8 0c0-2.4 1.1-3.9 2.3-5 0 2 .9 3.1 2 3.3-.2-3.4-.6-5.6 1.1-8.7z"/>` +
    '<path d="M12 2.8c1.2 3.2 5.4 5 5.4 10.4a5.4 5.4 0 0 1-10.8 0c0-2.4 1.1-3.9 2.3-5 0 2 .9 3.1 2 3.3-.2-3.4-.6-5.6 1.1-8.7z"/>' +
    '<path d="M12 18.6a2 2 0 0 0 2-2c0-1.5-1.2-2.2-2-3.4-.8 1.2-2 1.9-2 3.4a2 2 0 0 0 2 2z"/>',
  // Sol sobre tierra agrietada
  drought:
    `<circle ${FILL} cx="12" cy="8.5" r="3.2"/>` +
    '<circle cx="12" cy="8.5" r="3.2"/>' +
    '<path d="M12 2.5v1.2M6 8.5h1.2M16.8 8.5H18M7.8 4.3l.9.9M16.2 4.3l-.9.9"/>' +
    '<path d="M2.5 15.5h19"/><path d="m7 15.5 1.6 2.2-1 2.8M13 15.5l-.8 2 1.8 1.6-.6 1.4M18 15.5l-1.4 2.6"/>',
  // Termómetro alto con ondas de calor
  heatwave:
    `<circle ${FILL} cx="9" cy="16.6" r="2.4"/>` +
    '<path d="M7 13.7V5a2 2 0 0 1 4 0v8.7a4 4 0 1 1-4 0z"/><path d="M9 14.2V8"/>' +
    '<path d="M15.5 6.5c1 .9 1 1.9 0 2.8s-1 1.9 0 2.8M19 6.5c1 .9 1 1.9 0 2.8s-1 1.9 0 2.8"/>',
  // Copo de nieve
  snow:
    '<path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6"/>' +
    '<path d="m9.6 3.8 2.4 2 2.4-2M9.6 20.2l2.4-2 2.4 2M3.5 10.6l3 .4-1.2 2.8M20.5 13.4l-3-.4 1.2-2.8M5.3 10.2l1.2 2.8-3 .4M18.7 13.8l-1.2-2.8 3-.4"/>',
  // Bruma y viento
  dust:
    '<path d="M3 8h10.5a2.5 2.5 0 1 0-2.5-2.5"/><path d="M3 12.5h15.5a2.5 2.5 0 1 1-2.5 2.5"/>' +
    '<path d="M3 17h7M5 20.5h4.5M14 20.5h2"/>',
}

const FALLBACK = '<circle cx="12" cy="12" r="7"/><path d="M12 8.5v4M12 15.5v.01"/>'

/** `<svg>` blanco del tipo, listo para insertar como HTML. */
export function typeGlyphSvg(type: string, size: number): string {
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#fff" ` +
    `stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
    `${GLYPHS[type] ?? FALLBACK}</svg>`
  )
}

/** Insignia redonda (color del tipo + icono) como HTML; la estiliza `.a360-badge`. */
export function typeBadgeHtml(type: string, size: number): string {
  const icon3d = ICONS_3D[type]
  if (icon3d) {
    return (
      `<span class="a360-badge is-3d" style="--t:${typeColor(type)};width:${size}px;height:${size}px">` +
      `<img src="${icon3d}" alt="" draggable="false" width="${size}" height="${size}"></span>`
    )
  }
  const glyph = Math.round(size * 0.58)
  return (
    `<span class="a360-badge" style="--t:${typeColor(type)};width:${size}px;height:${size}px">` +
    `${typeGlyphSvg(type, glyph)}</span>`
  )
}
