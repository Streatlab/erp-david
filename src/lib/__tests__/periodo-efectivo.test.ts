import { describe, it, expect } from 'vitest'
import { lunesDe, rangoSemana, mensualASemanal, isoLocal } from '@/lib/periodo'
import { efectivoPorJustificar, DESTINOS_EFECTIVO } from '@/lib/efectivo'

describe('periodo', () => {
  it('la semana empieza en lunes', () => {
    expect(isoLocal(lunesDe(new Date(2026, 9, 4)))).toBe('2026-09-28') // domingo 4-oct → lunes 28-sep
    expect(isoLocal(lunesDe(new Date(2026, 9, 5)))).toBe('2026-10-05')
    const r = rangoSemana(new Date(2026, 9, 2), -1)
    expect(isoLocal(r.inicio)).toBe('2026-09-21')
    expect(isoLocal(r.fin)).toBe('2026-09-27')
  })
  it('presupuesto mensual a semanal ×12÷52', () => {
    expect(mensualASemanal(520)).toBe(120)
  })
})

describe('efectivo', () => {
  it('por justificar igual que v_efectivo', () => {
    expect(efectivoPorJustificar(null)).toBe(true)
    expect(efectivoPorJustificar('efectivo-retirado')).toBe(true)
    expect(efectivoPorJustificar('pendiente-revisar-gasto')).toBe(true)
    expect(efectivoPorJustificar('devolucion-bi-prior')).toBe(false)
  })
  it('siete destinos, incluido sin justificar', () => {
    expect(DESTINOS_EFECTIVO).toHaveLength(7)
    expect(DESTINOS_EFECTIVO.at(-1)?.codigo).toBe('efectivo-retirado')
  })
})
