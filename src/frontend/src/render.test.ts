import { describe, it, expect } from 'vitest'
import { escapeHtml, formatDate, formatTime, renderStatus, statusMeta, eventLabels } from './render'

describe('escapeHtml', () => {
  it('escapa los 5 caracteres que rompen HTML', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
    expect(escapeHtml('a & b')).toBe('a &amp; b')
    expect(escapeHtml('"')).toBe('&quot;')
    expect(escapeHtml("'")).toBe('&#039;')
  })

  it('escapa & antes que el resto para no re-escapar las entidades', () => {
    // Si & se escapara al final, "&lt;" se volvería "&amp;lt;" y el navegador
    // mostraría literalmente "&lt;" en vez de "<".
    expect(escapeHtml('<')).toBe('&lt;')
    expect(escapeHtml('&lt;')).toBe('&amp;lt;')
  })

  it('neutraliza un payload XSS completo', () => {
    const malicious = '<img src=x onerror="alert(1)">'
    const result = escapeHtml(malicious)
    expect(result).not.toContain('<')
    expect(result).not.toContain('>')
    expect(result).toContain('&lt;img')
  })

  it('convierte null y undefined en string vacío, no en "null"', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })

  it('deja intacto el texto sin caracteres especiales', () => {
    expect(escapeHtml('Inclinómetro Talud 06')).toBe('Inclinómetro Talud 06')
  })
})

describe('formatDate / formatTime', () => {
  it('formatea una fecha ISO válida', () => {
    const iso = '2026-10-04T12:54:00Z'
    // es-CL con dateStyle 'short' usa año de 2 dígitos: "04-10-26, 7:54 a. m."
    expect(formatDate(iso)).not.toBe('—')
    expect(formatDate(iso)).toMatch(/04-10-26/)
    expect(formatDate(iso)).toContain('a. m.')
  })

  it('devuelve — en vez de lanzar cuando la fecha es inválida', () => {
    expect(formatDate('no-es-una-fecha')).toBe('—')
    expect(formatDate('')).toBe('—')
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
  })

  it('formatTime también tolera fechas corruptas', () => {
    expect(formatTime('basura')).toBe('—')
    expect(formatTime('2026-10-04T12:54:00Z')).not.toBe('—')
  })
})

describe('renderStatus', () => {
  it('mapea cada estado del dominio a su etiqueta en español', () => {
    expect(renderStatus('Healthy')).toContain('Saludable')
    expect(renderStatus('DegradedMinor')).toContain('Degradación menor')
    expect(renderStatus('DegradedMajor')).toContain('Degradación mayor')
    expect(renderStatus('Critical')).toContain('Crítico')
    expect(renderStatus('DataUnreliable')).toContain('Datos no confiables')
  })

  it('aplica el tono visual correcto por estado', () => {
    expect(renderStatus('Healthy')).toContain('status--good')
    expect(renderStatus('DegradedMinor')).toContain('status--warn')
    expect(renderStatus('Critical')).toContain('status--bad')
  })

  it('DataUnreliable es riesgo, no unhealthy — el veto del Health Score', () => {
    // Principio §9 del Master Lean: Consistencias/Calidad con veto sobre
    // Disponibilidad. Un activo con datos no confiables nunca se muestra verde.
    expect(statusMeta.DataUnreliable.tone).toBe('risk')
    expect(statusMeta.DataUnreliable.tone).not.toBe('good')
  })

  it('un estado desconocido cae a tono bad y escapa la etiqueta', () => {
    const html = renderStatus('<script>alert(1)</script>')
    expect(html).toContain('status--bad')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })
})

describe('eventLabels', () => {
  it('traduce los 4 tipos de evento registrados', () => {
    expect(eventLabels.Degraded).toBe('Degradación detectada')
    expect(eventLabels.Critical).toBe('Estado crítico')
    expect(eventLabels.Recovered).toBe('Recuperación')
    expectLabelsDoNotExistElsewhere()
  })

  it('un evento desconocido queda para que el caller lo escape', () => {
    expect(eventLabels['TipoInexistente']).toBeUndefined()
  })
})

function expectLabelsDoNotExistElsewhere() {
  expect(Object.keys(eventLabels)).toHaveLength(4)
}