import { describe, it, expect } from 'vitest'
import { fechaLimiteCobro } from '@/lib/cicloPagoCade'

describe('ciclo de pago de Cade', () => {
  it('sin día confirmado no hay fecha límite: nada se marca vencido', () => {
    expect(fechaLimiteCobro('2026-09-01', null)).toBeNull()
    expect(fechaLimiteCobro(null, 15)).toBeNull()
  })
  it('con día confirmado, el límite es ese día del mes siguiente al trabajado', () => {
    const f = fechaLimiteCobro('2026-09-01', 15)
    expect(f?.getFullYear()).toBe(2026)
    expect(f?.getMonth()).toBe(9)   // octubre
    expect(f?.getDate()).toBe(15)
    const d = fechaLimiteCobro('2026-12-01', 10)
    expect(d?.getFullYear()).toBe(2027)
    expect(d?.getMonth()).toBe(0)
  })
  it('un periodo mal formado no rompe nada', () => {
    expect(fechaLimiteCobro('no-es-fecha', 15)).toBeNull()
  })
})
