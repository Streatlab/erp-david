import { describe, it, expect } from 'vitest'
import { costesMedios, puntoEquilibrio, escenario, ultimosMesesCerrados } from '@/lib/equilibrio'

describe('equilibrio', () => {
  it('meses cerrados', () => {
    expect(ultimosMesesCerrados(new Date(2026, 9, 2))).toEqual(['2026-07', '2026-08', '2026-09'])
  })
  it('fijos = préstamos + seguros + cuotas; pendientes e internos fuera', () => {
    const amb = { 'movimientos-internos': 'interno', 'pendiente-revisar-gasto': 'pendiente', 'gastos-personales': 'personal' }
    const c = costesMedios([
      { fecha: '2026-07-05', importe: -1500, categoria: 'leasing-furgonetas' },
      { fecha: '2026-08-05', importe: -150, categoria: 'seguros' },
      { fecha: '2026-09-05', importe: -300, categoria: 'seguridad-social' },
      { fecha: '2026-09-06', importe: -600, categoria: 'recargas-electricas' },
      { fecha: '2026-09-07', importe: -900, categoria: 'pendiente-revisar-gasto' },
      { fecha: '2026-09-07', importe: -5000, categoria: 'movimientos-internos' },
      { fecha: '2026-09-07', importe: -90, categoria: 'gastos-personales' },
      { fecha: '2026-06-07', importe: -999, categoria: 'seguros' },
    ], amb, ['2026-07', '2026-08', '2026-09'])
    expect(c.fijos).toBe(650)
    expect(c.variables).toBe(200)
    expect(c.sinCategorizar).toBe(300)
  })
  it('punto de equilibrio en € y entregas', () => {
    const pe = puntoEquilibrio(3000, 5000, 10000, 10)
    expect(pe.euros).toBe(6000)
    expect(pe.entregas).toBe(600)
    expect(puntoEquilibrio(3000, 0, 0, 10).euros).toBeNull()
  })
  it('escenario +1 repartidor', () => {
    const base = { ingresos: 16000, fijos: 3000, variables: 9000, personal: 6000, codigos: 4, eurEntrega: 9 }
    expect(escenario(base, { repartidores: 0, entregasDia: 0, subidaPct: 0 }).resultado).toBe(4000)
    expect(escenario(base, { repartidores: 1, entregasDia: 0, subidaPct: 0 }).resultado).toBe(6000)
  })
})
