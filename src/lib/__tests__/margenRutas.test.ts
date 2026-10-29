import { describe, it, expect } from 'vitest'
import {
  normalizaDestino, resumenRepartidores, resumenRutas, fraccionMesEnPeriodo, costeActividad,
  precioMinimoEntrega, ingresoDia, deltaPct, type DiaRep,
} from '@/lib/margenRutas'

/* Días REALES de la vista v_dia_repartidor (24 a 26 de septiembre de 2026) */
const D = (fecha: string, transportista: string, repartidor: string, entregas: number, por_pedidos: number, compensacion_minimo: number, recorte_tope: number, cargo_cade: number, pagado: number): DiaRep =>
  ({ fecha, transportista, repartidor, entregas, por_pedidos, compensacion_minimo, recorte_tope, cargo_cade, pagado })
const DIAS: DiaRep[] = [
  D('2026-09-24', '9391', 'Joel', 25, 137.5, 12.5, 0, 0, 150), D('2026-09-24', '972', 'Juan', 11, 63.5, 66.5, 0, 0, 130),
  D('2026-09-24', '9721', 'David', 41, 228.5, 0, -78.5, 0, 150), D('2026-09-24', '9723', 'Saad', 10, 55, 95, 0, 0, 150),
  D('2026-09-25', '9391', 'Joel', 29, 159.5, 0, -9.5, 0, 150), D('2026-09-25', '972', 'Juan', 15, 86, 44, 0, -80.67, 49.33),
  D('2026-09-25', '9721', 'David', 36, 198.5, 0, -48.5, -58.95, 91.05), D('2026-09-25', '9723', 'Saad', 14, 77, 73, 0, 0, 150),
  D('2026-09-26', '9391', 'Joel', 17, 93.5, 56.5, 0, 0, 150), D('2026-09-26', '972', 'Juan', 14, 86, 44, 0, 0, 130),
  D('2026-09-26', '9721', 'David', 15, 85.5, 64.5, 0, 0, 150), D('2026-09-26', '9723', 'Saad', 5, 27.5, 122.5, 0, 0, 150),
]

describe('rutas y margen · repartidores', () => {
  it('agrupa por código: días, entregas al día, pagado, garantía, recorte por tope y cargos', () => {
    const r = resumenRepartidores(DIAS)
    const david = r.find(x => x.transportista === '9721')!
    expect(david.repartidor).toBe('David')
    expect(david.dias).toBe(3)
    expect(david.entregas).toBe(92)
    expect(david.entregasDia).toBe(30.67)
    expect(david.pagado).toBe(391.05)
    expect(david.recorteTope).toBe(127)      // 78,5 + 48,5 que Cade no paga por el tope diario
    expect(david.cargos).toBe(58.95)
    expect(david.eurPorEntrega).toBe(4.25)
    const saad = r.find(x => x.transportista === '9723')!
    expect(Math.round(saad.pctGarantia * 100)).toBe(65) // 290,5 de 450 es garantía
  })
  it('ordena por lo pagado, de más a menos', () => {
    const r = resumenRepartidores(DIAS)
    expect(r[0].pagado).toBeGreaterThanOrEqual(r[r.length - 1].pagado)
  })
})

describe('rutas y margen · rutas', () => {
  it('limpia el destino de Cade (quita la cola numérica) y agrupa', () => {
    expect(normalizaDestino('CARREFOUR COCENTAI 5,00')).toBe('CARREFOUR COCENTAI')
    expect(normalizaDestino('  CONSUM-0651-ONTINYE ')).toBe('CONSUM-0651-ONTINYE')
    expect(normalizaDestino(null)).toBe('(sin destino)')
    const r = resumenRutas([
      { fecha: '2026-09-01', transportista: '9721', cliente: '77', destino: 'CARREFOUR COCENTAI 5,00', kilos: 4, importe_base: 8.5, importe: 8.5 },
      { fecha: '2026-09-01', transportista: '9721', cliente: '77', destino: 'CARREFOUR COCENTAI 6,00', kilos: 5, importe_base: 8.5, importe: 8.5 },
      { fecha: '2026-09-02', transportista: '972', cliente: '4091', destino: 'SUPECO ONTINYENT', kilos: 2, importe_base: 8.5, importe: 8.5 },
      { fecha: '2026-09-02', transportista: '972', cliente: 'CONSUM-0', destino: 'CONSUM-0651-ONTINYE', kilos: 6, importe_base: 5.5, importe: 5.5 },
      { fecha: '2026-09-03', transportista: '972', cliente: 'CONSUM-0', destino: 'CONSUM-0651-ONTINYE', kilos: 7, importe_base: 5.5, importe: 5.5 },
    ])
    expect(r[0]).toMatchObject({ ruta: 'CARREFOUR COCENTAI', n: 2, kilos: 9, base: 17, dias: 1, entregasDia: 2, precioMedio: 8.5, codigos: ['9721'] })
    expect(r.find(x => x.ruta === 'CONSUM-0651-ONTINYE')).toMatchObject({ n: 2, dias: 2, entregasDia: 1, precioMedio: 5.5 })
  })
})

describe('rutas y margen · coste y precio mínimo', () => {
  it('prorratea el mes por los días que caen dentro del periodo', () => {
    expect(fraccionMesEnPeriodo('2026-09-01', '2026-09-01', '2026-09-30')).toBe(1)
    expect(fraccionMesEnPeriodo('2026-09-01', '2026-09-16', '2026-09-30')).toBeCloseTo(0.5, 5)
    expect(fraccionMesEnPeriodo('2026-09-01', '2026-10-01', '2026-10-31')).toBe(0)
  })
  it('suma solo gastos de actividad y deja fuera el efectivo de Prior y lo personal', () => {
    const c = costeActividad([
      { mes: '2026-09-01', ambito: 'actividad', signo: 'gasto', importe: -3950, grupo: 'Personal', categoria: 'nominas' },
      { mes: '2026-09-01', ambito: 'actividad', signo: 'gasto', importe: -1812.09, grupo: 'Vehículos', categoria: 'leasing-furgonetas' },
      { mes: '2026-09-01', ambito: 'actividad', signo: 'gasto', importe: -3400, grupo: 'Operación', categoria: 'devolucion-bi-prior' },
      { mes: '2026-09-01', ambito: 'personal', signo: 'gasto', importe: -1126.21, grupo: 'Hogar', categoria: 'alimentacion' },
      { mes: '2026-09-01', ambito: 'actividad', signo: 'ingreso', importe: 16992.94, grupo: 'Ingresos', categoria: 'cade' },
    ], '2026-09-01', '2026-09-30')
    expect(c.total).toBe(5762.09)
    expect(c.porGrupo[0]).toEqual({ grupo: 'Personal', importe: 3950 })
  })
  it('precio mínimo = coste del día entre entregas del día', () => {
    expect(precioMinimoEntrega(120, 30)).toBe(4)
    expect(precioMinimoEntrega(120, 0)).toBeNull()
  })
  it('reglas de Cade: suelo y techo en la garantía cuando hay tope', () => {
    expect(ingresoDia(41, 5.5, 150, true)).toBe(150)       // 225,5 por entregas, pero el tope lo deja en 150
    expect(ingresoDia(41, 5.5, 150, false)).toBe(225.5)    // sin tope cobraría todo
    expect(ingresoDia(10, 5.5, 150, true)).toBe(150)       // 55 por entregas, la garantía sube a 150
    expect(ingresoDia(10, 5.5, null, true)).toBe(55)       // sin garantía, solo entregas
    expect(ingresoDia(10, 5.5, 150, true, 20)).toBe(130)   // menos los cargos medios del día
  })
  it('variación frente al periodo anterior', () => {
    expect(deltaPct(110, 100)).toBe(10)
    expect(deltaPct(90, 100)).toBe(-10)
    expect(deltaPct(5, 0)).toBeNull()
  })
})
