import { describe, it, expect } from 'vitest'
import { diasHasta, sesionPorBanco } from '@/lib/bancos'

describe('bancos', () => {
  it('días hasta caducidad', () => {
    expect(diasHasta('2026-12-28T08:00:00Z', new Date('2026-12-20T08:00:00Z'))).toBe(8)
    expect(diasHasta(null)).toBeNull()
  })
  it('elige la sesión autorizada aunque haya intentos posteriores', () => {
    const m = sesionPorBanco([
      { id: 3, banco: 'BBVA', estado: 'autorizada', valida_hasta: '2026-12-28', created_at: '' },
      { id: 7, banco: 'BBVA', estado: 'esperando_autorizacion', valida_hasta: null, created_at: '' },
      { id: 6, banco: 'CaixaBank', estado: 'esperando_autorizacion', valida_hasta: null, created_at: '' },
    ])
    expect(m.get('BBVA')?.id).toBe(3)
    expect(m.get('CaixaBank')?.estado).toBe('esperando_autorizacion')
  })
})
