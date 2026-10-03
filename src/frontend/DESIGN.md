---
version: alpha
name: ALERTA360 Design System
colors:
  background: "#FFFFFF"
  surface: "#F7F7FA"
  text: "#08060D"
  muted: "#6B6375"
  border: "#E5E4E7"
  accent: "#AA3BFF"
  success: "#138A45"
  warning: "#B7791F"
  danger: "#C7352F"
typography:
  display:
    fontFamily: "system-ui, Segoe UI, sans-serif"
    fontSize: "56px"
    fontWeight: 500
    lineHeight: 1.1
  body:
    fontFamily: "system-ui, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  sm: "4px"
  md: "6px"
  lg: "12px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  app-shell:
    padding: "24px"
  table: {}
  button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
---

## Overview
ALERTA360 es un MVP para monitoreo de salud de infraestructura industrial, con foco inicial en minería, activos críticos, capacidad de alertamiento e incidentes operativos.

## Colors
La base actual usa un esquema claro con texto sobrio, bordes suaves y acento violeta heredado de la plantilla. Los estados operativos deben reservar verde, amarillo/naranja y rojo para salud, degradación e incidentes.

## Typography
La implementación existente utiliza system-ui. Mantener jerarquía simple y legible para dashboards técnicos; evitar párrafos centrados largos en pantallas operativas.

## Layout
El frontend actual es un shell Vite con un panel principal de ancho medio. Las futuras pantallas deberían evolucionar hacia un dashboard de densidad profesional con tarjetas de métricas, tabla de activos e historial de incidentes.

## Elevation & Depth
Usar bordes y superficies ligeras antes que sombras pesadas. La información crítica debe destacarse por estado, contraste y posición, no solo por color.

## Shapes
Radios bajos a medios; el producto debe sentirse técnico, confiable y operativo.

## Components
- Capability score: resumen prominente del score global y conteo de activos críticos.
- Asset table: filas compactas con estado, criticidad y desglose de health.
- Incident list: historial ordenado por fecha con tipo, detección y nota.
- Retry/error state: mensaje claro cuando la API local no responde.

## Do's and Don'ts
- Do: priorizar claridad operacional, trazabilidad y estados accionables.
- Do: alinear el idioma de interfaz a español si el usuario final es local.
- Don't: conservar artefactos visuales de plantilla Vite que no aportan al producto.
- Don't: depender de emoji como único indicador de estado.