import { describe, it, expect } from 'vitest'
import { gastosRecurrentes, proyectarGastos, proyectarCaja, semaforoCaja } from '@/lib/previsionCaja'

const ACT = new Set(['nominas', 'leasing-furgonetas', 'multas', 'devolucion-bi-prior'])
const HIST = [
  { fecha: '2026-07-27', importe: -5000, categoria: 'nominas' }, { fecha: '2026-08-28', importe: -5200, categoria: 'nominas' }, { fecha: '2026-09-27', importe: -5600, categoria: 'nominas' },
  { fecha: '2026-07-12', importe: -1812.09, categoria: 'leasing-furgonetas' }, { fecha: '2026-08-12', importe: -1812.09, categoria: 'leasing-furgonetas' }, { fecha: '2026-09-12', importe: -1812.09, categoria: 'leasing-furgonetas' },
  { fecha: '2026-09-16', importe: -100, categoria: 'multas' },                 // un solo mes: puntual, no se proyecta
  { fecha: '2026-09-05', importe: -3400, categoria: 'devolucion-bi-prior' },   // excluida: es dinero de Prior que pasa por caja
  { fecha: '2026-09-20', importe: -500, categoria: 'alimentacion' },           // personal: fuera
  { fecha: '2026-09-21', importe: 6000, categoria: 'cade' },                   // ingreso: fuera
]

describe('previsión de caja · gastos que se repiten', () => {
  it('media mensual y día típico por categoría de actividad; lo puntual y lo personal quedan fuera', () => {
    const r = gastosRecurrentes(HIST, ACT)
    expect(r.map(x => x.categoria)).toEqual(['nominas', 'leasing-furgonetas'])
    expect(r[0]).toMatchObject({ mediaMes: 5266.67, diaTipico: 27, meses: 3 })
    expect(r[1]).toMatchObject({ mediaMes: 1812.09, diaTipico: 12 })
  })
})

describe('previsión de caja · calendario', () => {
  it('coloca cada gasto en su día típico y no repite lo ya pagado este mes', () => {
    const rec = gastosRecurrentes(HIST, ACT)
    const sin = proyectarGastos(rec, '2026-10-01', 60, new Set())
    expect(sin.map(m => m.fecha)).toEqual(['2026-10-12', '2026-10-27', '2026-11-12', '2026-11-27'])
    const con = proyectarGastos(rec, '2026-10-15', 60, new Set(['leasing-furgonetas']))
    expect(con.map(m => m.fecha)).toEqual(['2026-10-27', '2026-11-12', '2026-11-27', '2026-12-12'])  // 60 días desde el 15-oct llegan al 14-dic
  })
  it('el día 31 se recorta al último día del mes corto', () => {
    const r = proyectarGastos([{ categoria: 'ss', mediaMes: 1600, diaTipico: 31, meses: 3 }], '2026-11-01', 30, new Set())
    expect(r[0].fecha).toBe('2026-11-30')
  })
  it('saldo día a día, mínimo y final', () => {
    const p = proyectarCaja(10000, [
      { fecha: '2026-10-12', importe: -1812.09, concepto: 'Leasing', tipo: 'gasto' },
      { fecha: '2026-10-15', importe: 4000, concepto: 'Cade', tipo: 'cobro' },
      { fecha: '2026-10-27', importe: -5266.67, concepto: 'Nóminas', tipo: 'gasto' },
    ], '2026-10-10', 20)
    expect(p.serie).toHaveLength(21)
    expect(p.minimo).toEqual({ fecha: '2026-10-27', saldo: 6921.24 })
    expect(p.final).toBe(6921.24)
    expect(p.serie[0]).toEqual({ fecha: '2026-10-10', saldo: 10000 })
  })
  it('semáforo', () => {
    expect(semaforoCaja(-1, 12000)).toBe('mal')
    expect(semaforoCaja(3000, 12000)).toBe('justo')
    expect(semaforoCaja(9000, 12000)).toBe('bien')
  })
})
