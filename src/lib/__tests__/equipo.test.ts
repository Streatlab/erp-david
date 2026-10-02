import { describe, it, expect } from 'vitest'
import { emisorEn, codigosDe, facturacionPorEmisor } from '@/lib/equipo'
import type { EmisorFila } from '@/lib/equipo'

const F: EmisorFila[] = [
  { transportista: '9392', emisor: 'DAVID', repartidor: 'David', vigente_desde: '2026-01-01', vigente_hasta: null },
  { transportista: '939', emisor: 'DAVID', repartidor: 'Joel', vigente_desde: '2026-01-01', vigente_hasta: '2026-08-31' },
  { transportista: '9391', emisor: 'DAVID', repartidor: 'Saad', vigente_desde: '2026-01-01', vigente_hasta: '2026-08-31' },
  { transportista: '972', emisor: 'JUAN', repartidor: 'Juan', vigente_desde: '2026-01-01', vigente_hasta: null },
  { transportista: '939', emisor: 'JUAN', repartidor: 'Joel', vigente_desde: '2026-09-01', vigente_hasta: null },
  { transportista: '9391', emisor: 'JUAN', repartidor: 'Saad', vigente_desde: '2026-09-01', vigente_hasta: null },
]

describe('equipo', () => {
  it('el emisor cambia según la fecha', () => {
    expect(emisorEn(F, '939', '2026-08-31')?.emisor).toBe('DAVID')
    expect(emisorEn(F, '939', '2026-09-01')?.emisor).toBe('JUAN')
  })
  it('4 repartidores con su código', () => {
    expect(codigosDe(F, 'David', '2026-10-02').map(f => f.transportista)).toEqual(['9392'])
    expect(codigosDe(F, 'Joel', '2026-10-02').map(f => f.transportista)).toEqual(['939'])
    expect(codigosDe(F, 'Saad', '2026-10-02').map(f => f.transportista)).toEqual(['9391'])
    expect(codigosDe(F, 'Juan', '2026-10-02').map(f => f.transportista)).toEqual(['972'])
  })
  it('desde septiembre Juan factura 972, 939 y 9391', () => {
    const p = facturacionPorEmisor(F, '2026-10-02')
    expect(p.DAVID.map(f => f.transportista)).toEqual(['9392'])
    expect(p.JUAN.map(f => f.transportista).sort()).toEqual(['939', '9391', '972'])
  })
})
