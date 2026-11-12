import { describe, it, expect } from 'vitest'
import {
  cuadrar, diasConGarantiaAlta, pctGarantia, penalizaciones, referenciasRepetidas,
  alertasLiquidacion, emisorDe, textoReclamacion, asuntoReclamacion, type LineaDia,
} from '@/lib/liquidacionCade'

/* Caso de referencia REAL: liquidación de Cade del transportista 972, septiembre 2026
   (tal y como la leyó el robot y está guardada en la base). 26 días, 267 entregas en los totales diarios,
   base 1.490,33 · complemento 1.809,00 · total PDF 3.299,33 · un SPC de −80,67 el 25/09. */
const L = (fecha: string, entregas: number, imp: number, gar: number, pen = 0, motivo: string | null = null): LineaDia =>
  ({ fecha, entregas, importe_entregas: imp, garantia_aplicada: gar, penalizacion: pen, penalizacion_motivo: motivo, extra: 0, total_linea: Math.round((imp + gar) * 100) / 100 })

const LINEAS_972_SEP: LineaDia[] = [
  L('2026-09-01', 15, 85.5, 44.5), L('2026-09-02', 10, 61, 69), L('2026-09-03', 10, 64, 66), L('2026-09-04', 13, 74.5, 55.5),
  L('2026-09-05', 13, 71.5, 58.5), L('2026-09-07', 11, 69.5, 60.5), L('2026-09-08', 9, 61.5, 68.5), L('2026-09-09', 6, 36, 94),
  L('2026-09-10', 13, 74.5, 55.5), L('2026-09-11', 8, 50, 80), L('2026-09-12', 8, 44, 86), L('2026-09-14', 10, 58, 72),
  L('2026-09-15', 11, 69.5, 60.5), L('2026-09-16', 7, 38.5, 91.5), L('2026-09-17', 7, 38.5, 91.5), L('2026-09-18', 12, 72, 58),
  L('2026-09-19', 5, 27.5, 102.5), L('2026-09-21', 9, 49.5, 80.5), L('2026-09-22', 9, 52.5, 77.5), L('2026-09-23', 9, 49.5, 80.5),
  L('2026-09-24', 11, 63.5, 66.5), L('2026-09-25', 15, 5.33, 44, 80.67, 'SPC'), L('2026-09-26', 14, 86, 44), L('2026-09-28', 12, 69, 61),
  L('2026-09-29', 12, 69, 61), L('2026-09-30', 8, 50, 80),
]
const TOTAL_PDF_972_SEP = 3299.33

const ENTREGAS_972_SEP = [
  { fecha: '2026-09-04', ref_cliente: '0651202609041031' }, { fecha: '2026-09-04', ref_cliente: '0651202609041031' },
  { fecha: '2026-09-04', ref_cliente: '0651202609041102' },
  { fecha: '2026-09-12', ref_cliente: '0651202609120749' }, { fecha: '2026-09-12', ref_cliente: '0651202609120749' },
  { fecha: '2026-09-13', ref_cliente: '0651202609041031' }, // misma ref otro día: no cuenta
  { fecha: '2026-09-15', ref_cliente: null },
]

/* Quién factura cada código desde el 1-sep-2026 (datos de negocio fijos del tren) */
const EMISORES = [
  { transportista: '972', emisor: 'JUAN', vigente_desde: '2026-01-01', vigente_hasta: null },
  { transportista: '939', emisor: 'DAVID', vigente_desde: '2026-01-01', vigente_hasta: '2026-08-31' },
  { transportista: '939', emisor: 'JUAN', vigente_desde: '2026-09-01', vigente_hasta: null },
  { transportista: '9391', emisor: 'DAVID', vigente_desde: '2026-01-01', vigente_hasta: '2026-08-31' },
  { transportista: '9391', emisor: 'JUAN', vigente_desde: '2026-09-01', vigente_hasta: null },
  { transportista: '9392', emisor: 'DAVID', vigente_desde: '2026-01-01', vigente_hasta: null },
]

describe('liquidación Cade · cuadre', () => {
  it('los 26 días del 972 de septiembre suman exactamente el total del PDF', () => {
    const c = cuadrar(LINEAS_972_SEP, TOTAL_PDF_972_SEP)
    expect(c.sumaLineas).toBe(3299.33)
    expect(c.diferencia).toBe(0)
    expect(c.cuadra).toBe(true)
    expect(LINEAS_972_SEP.reduce((s, l) => s + l.entregas, 0)).toBe(267)
    expect(LINEAS_972_SEP.reduce((s, l) => s + l.importe_entregas, 0)).toBeCloseTo(1490.33, 2)
    expect(LINEAS_972_SEP.reduce((s, l) => s + l.garantia_aplicada, 0)).toBeCloseTo(1809, 2)
  })
  it('una diferencia de un céntimo se tolera; de un euro, no', () => {
    expect(cuadrar(LINEAS_972_SEP, 3299.34).cuadra).toBe(true)
    expect(cuadrar(LINEAS_972_SEP, 3300.33).cuadra).toBe(false)
    expect(cuadrar(LINEAS_972_SEP, 3300.33).diferencia).toBe(-1)
  })
  it('sin total de PDF no se puede dar por cuadrada', () => {
    expect(cuadrar(LINEAS_972_SEP, null).cuadra).toBe(false)
  })
})

describe('liquidación Cade · alertas', () => {
  it('detecta el SPC de −80,67 € del 25/09', () => {
    expect(penalizaciones(LINEAS_972_SEP)).toEqual([{ fecha: '2026-09-25', importe: -80.67, motivo: 'SPC' }])
  })
  it('5 días con más del 70 % de garantía (poca carga de trabajo)', () => {
    const d = diasConGarantiaAlta(LINEAS_972_SEP).map(l => l.fecha)
    expect(d).toHaveLength(5)
    expect(d).toContain('2026-09-19')
    expect(d).toContain('2026-09-25')
    expect(d).not.toContain('2026-09-01')
  })
  it('la garantía supone el 55 % de lo liquidado', () => {
    expect(Math.round(pctGarantia(LINEAS_972_SEP) * 100)).toBe(55)
  })
  it('2 referencias repetidas el mismo día; la misma referencia en días distintos no cuenta', () => {
    const r = referenciasRepetidas(ENTREGAS_972_SEP)
    expect(r.map(x => x.ref)).toEqual(['0651202609041031', '0651202609120749'])
    expect(r.every(x => x.n === 2)).toBe(true)
  })
  it('los textos de alerta coinciden con los que escribe el robot lector', () => {
    const a = alertasLiquidacion(LINEAS_972_SEP, ENTREGAS_972_SEP, TOTAL_PDF_972_SEP)
    expect(a).toEqual([
      '2 referencia(s) repetida(s) el mismo día: 0651202609041031, 0651202609120749',
      '5 día(s) con más del 70% de garantía (poca carga de trabajo)',
    ])
    expect(alertasLiquidacion(LINEAS_972_SEP, [], 3300.33)[0]).toMatch(/^No cuadra/)
  })
})

describe('liquidación Cade · quién factura', () => {
  it('desde septiembre de 2026 Juan factura 972, 939 y 9391; David solo 9392', () => {
    expect(emisorDe(EMISORES, '972', '2026-09-15')).toBe('JUAN')
    expect(emisorDe(EMISORES, '939', '2026-09-01')).toBe('JUAN')
    expect(emisorDe(EMISORES, '939', '2026-08-31')).toBe('DAVID')
    expect(emisorDe(EMISORES, '9391', '2026-10-01')).toBe('JUAN')
    expect(emisorDe(EMISORES, '9392', '2026-10-01')).toBe('DAVID')
    expect(emisorDe(EMISORES, '000', '2026-10-01')).toBeNull()
  })
})

describe('liquidación Cade · reclamación', () => {
  it('el correo lista los cargos por fecha, suma el total y firma el emisor', () => {
    const t = textoReclamacion([
      { fecha: '2026-09-25', transportista: '972', codigo: 'SPC', importe: -80.67 },
      { fecha: '2026-09-03', transportista: '939', codigo: 'DIA NO PAGADO', importe: -130 },
    ], 'JUAN RUS MARTÍNEZ')
    expect(t.indexOf('03/09/2026')).toBeLessThan(t.indexOf('25/09/2026'))
    expect(t).toContain('Total: 210,67 €')
    expect(t.trimEnd().endsWith('JUAN RUS MARTÍNEZ')).toBe(true)
    expect(asuntoReclamacion('JUAN RUS MARTÍNEZ', ['972', '939'])).toBe('Revisión de cargos en liquidaciones — JUAN RUS MARTÍNEZ — transportistas 972, 939')
  })
})
