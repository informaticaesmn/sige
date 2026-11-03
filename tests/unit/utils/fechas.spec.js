/**
 * Tests unitarios para src/utils/fechas.js
 */
import { describe, it, expect } from 'vitest'
import { formatearFechaHora } from '@/utils/fechas.js'

describe('formatearFechaHora', () => {
  it('devuelve "—" para valores vacíos o inválidos', () => {
    expect(formatearFechaHora(null)).toBe('—')
    expect(formatearFechaHora(undefined)).toBe('—')
    expect(formatearFechaHora('')).toBe('—')
    expect(formatearFechaHora('no-es-fecha')).toBe('—')
  })

  it('formatea un Date', () => {
    const texto = formatearFechaHora(new Date('2026-11-02T12:00:00Z'))
    expect(typeof texto).toBe('string')
    expect(texto).not.toBe('—')
  })

  it('acepta un Timestamp de Firestore (toDate)', () => {
    const timestamp = { toDate: () => new Date('2026-11-02T12:00:00Z') }
    const texto = formatearFechaHora(timestamp)
    expect(texto).not.toBe('—')
  })
})
