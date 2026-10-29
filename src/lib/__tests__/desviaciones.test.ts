import { describe, it, expect } from 'vitest'
import { desviacionesRepartidores, lunesIso, type DiaDesv } from '@/lib/desviaciones'

/* 9 semanas de un repartidor: 8 semanas a 20 entregas/día y la última a 12 (−40 %) con un cargo */
function semanas(transportista: string, repartidor: string, entregasUltima: number, cargoUltima = 0, garantiaUltima = 0): DiaDesv[] {
  const out: DiaDesv[] = []
  const lunes1 = new Date('2026-08-03T00:00:00')
  for (let w = 0; w < 9; w++) {
    for (let d = 0; d < 5; d++) {
      const f = new Date(lunes1); f.setDate(f.getDate() + w * 7 + d)
      const fecha = f.toISOString().slice(0, 10)
      const ultima = w === 8
      const entregas = ultima ? entregasUltima : 20
      out.push({ fecha, transportista, repartidor, entregas, pagado: 150, compensacion_minimo: ultima ? garantiaUltima : 30, cargo_cade: ultima && d === 2 ? -cargoUltima : 0 })
    }
  }
  return out
}

describe('alertas de desviación', () => {
  it('el lunes de la semana', () => {
    expect(lunesIso('2026-10-29')).toBe('2026-10-26')  // jueves → lunes 26
    expect(lunesIso('2026-10-26')).toBe('2026-10-26')
    expect(lunesIso('2026-11-01')).toBe('2026-10-26')  // domingo
  })
  it('caída del 40 % en entregas por día: alerta; cargo de Cade: alerta', () => {
    const d = desviacionesRepartidores(semanas('9721', 'David', 12, 58.95))
    const caida = d.find(x => x.texto.includes('menos que su media'))!
    expect(caida).toBeDefined()
    expect(caida.gravedad).toBe('aviso')
    expect(caida.actual).toBe(12)
    expect(caida.media).toBe(20)
    expect(d.some(x => x.texto.includes('cargos'))).toBe(true)
    expect(d[0].gravedad).toBe('alerta')
  })
  it('semana normal: sin avisos', () => {
    expect(desviacionesRepartidores(semanas('972', 'Juan', 21))).toEqual([])
  })
  it('garantía disparada: aviso de poca carga', () => {
    const d = desviacionesRepartidores(semanas('9723', 'Saad', 20, 0, 120))
    expect(d.some(x => x.texto.includes('garantía'))).toBe(true)
  })
  it('con menos de 3 semanas no se opina', () => {
    const pocas = semanas('939', 'Saad', 5).filter(x => x.fecha >= '2026-09-21')
    expect(desviacionesRepartidores(pocas)).toEqual([])
  })
})
