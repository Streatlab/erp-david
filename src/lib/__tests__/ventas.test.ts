import { describe, it, expect } from 'vitest'
import { agruparVentas } from '@/lib/ventas'

const f = (transportista: string | null, repartidor: string | null, emisor: string, total: number) =>
  ({ mes: '2026-09-01', transportista, repartidor, emisor, facturas: 1, base: total / 1.21, iva: total - total / 1.21, total })

describe('ventas', () => {
  it('desde septiembre 939/9391 los emite Juan y suman al total del negocio', () => {
    const r = agruparVentas([
      f('9392', 'David', 'DAVID', 4000),
      f('939', 'Joel', 'JUAN', 4500),
      f('9391', 'Saad', 'JUAN', 4400),
      f('972', 'Juan', 'JUAN', 3900),
    ])
    expect(r.total).toBe(16800)
    expect(r.david).toBe(4000)
    expect(r.juan).toBe(12800)
    expect(r.cade).toBe(16800)
    expect(r.porRepartidor[0].repartidor).toBe('Joel')
  })
  it('otros clientes no cuentan como Cade', () => {
    const r = agruparVentas([f(null, null, 'DAVID', 2904)])
    expect(r.cade).toBe(0)
    expect(r.porRepartidor[0].repartidor).toBe('Otros clientes')
  })
})
