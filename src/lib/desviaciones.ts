/* Alertas de desviación: la última semana con datos de cada repartidor frente a la media de sus 8 semanas
   anteriores. Avisa cuando las entregas por día caen o suben más de un umbral, cuando la garantía pesa
   mucho más de lo normal o cuando hay cargos. Reglas puras, probadas. */

export interface DiaDesv { fecha: string; transportista: string; repartidor: string | null; entregas: number; pagado: number; compensacion_minimo: number; cargo_cade: number }
export interface Desviacion { transportista: string; repartidor: string; semana: string; texto: string; gravedad: 'aviso' | 'alerta'; actual: number; media: number }

export const UMBRAL_PCT = 25
export const SEMANAS_BASE = 8
const r1 = (n: number) => Math.round(n * 10) / 10

/* Lunes de la semana (ISO yyyy-mm-dd) */
export function lunesIso(fechaIso: string): string {
  const d = new Date(fechaIso + 'T00:00:00')
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Semana { lunes: string; dias: number; entregas: number; pagado: number; garantia: number; cargos: number }

function porSemana(dias: DiaDesv[]): Map<string, Semana> {
  const m = new Map<string, Semana>()
  for (const d of dias) {
    const l = lunesIso(d.fecha)
    const s = m.get(l) ?? { lunes: l, dias: 0, entregas: 0, pagado: 0, garantia: 0, cargos: 0 }
    s.dias += 1; s.entregas += Number(d.entregas ?? 0); s.pagado += Number(d.pagado ?? 0)
    s.garantia += Number(d.compensacion_minimo ?? 0); s.cargos += Math.abs(Number(d.cargo_cade ?? 0))
    m.set(l, s)
  }
  return m
}

/* Desviaciones de la última semana completa con datos de cada repartidor */
export function desviacionesRepartidores(dias: DiaDesv[], umbralPct = UMBRAL_PCT, semanasBase = SEMANAS_BASE): Desviacion[] {
  const out: Desviacion[] = []
  const porRep = new Map<string, DiaDesv[]>()
  for (const d of dias) porRep.set(d.transportista, [...(porRep.get(d.transportista) ?? []), d])
  for (const [transportista, lista] of porRep) {
    const semanas = [...porSemana(lista).values()].sort((a, b) => a.lunes.localeCompare(b.lunes))
    if (semanas.length < 3) continue
    const ultima = semanas[semanas.length - 1]
    const base = semanas.slice(Math.max(0, semanas.length - 1 - semanasBase), semanas.length - 1)
    const mediaEntDia = base.reduce((s, w) => s + w.entregas / w.dias, 0) / base.length
    const actualEntDia = ultima.entregas / ultima.dias
    const repartidor = lista[0].repartidor ?? transportista
    const semana = ultima.lunes
    if (mediaEntDia > 0) {
      const pct = ((actualEntDia - mediaEntDia) / mediaEntDia) * 100
      if (pct <= -umbralPct) out.push({ transportista, repartidor, semana, gravedad: pct <= -umbralPct * 2 ? 'alerta' : 'aviso', actual: r1(actualEntDia), media: r1(mediaEntDia), texto: `${repartidor}: ${r1(actualEntDia)} entregas/día la semana del ${fCorta(semana)}, un ${Math.round(-pct)} % menos que su media (${r1(mediaEntDia)}).` })
      else if (pct >= umbralPct) out.push({ transportista, repartidor, semana, gravedad: 'aviso', actual: r1(actualEntDia), media: r1(mediaEntDia), texto: `${repartidor}: ${r1(actualEntDia)} entregas/día la semana del ${fCorta(semana)}, un ${Math.round(pct)} % más que su media (${r1(mediaEntDia)}). Si hay tope, parte se pierde.` })
    }
    const pctGarBase = base.reduce((s, w) => s + (w.pagado > 0 ? w.garantia / w.pagado : 0), 0) / base.length
    const pctGarUlt = ultima.pagado > 0 ? ultima.garantia / ultima.pagado : 0
    if (pctGarUlt >= 0.7 && pctGarUlt - pctGarBase >= 0.15) {
      out.push({ transportista, repartidor, semana, gravedad: 'aviso', actual: r1(pctGarUlt * 100), media: r1(pctGarBase * 100), texto: `${repartidor}: el ${Math.round(pctGarUlt * 100)} % de lo cobrado la semana del ${fCorta(semana)} fue garantía (normalmente ${Math.round(pctGarBase * 100)} %): poca carga de trabajo.` })
    }
    if (ultima.cargos > 0) {
      out.push({ transportista, repartidor, semana, gravedad: 'alerta', actual: ultima.cargos, media: 0, texto: `${repartidor}: Cade aplicó ${ultima.cargos.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € en cargos la semana del ${fCorta(semana)}. Revisar en Reclamaciones.` })
    }
  }
  return out.sort((a, b) => (a.gravedad === b.gravedad ? 0 : a.gravedad === 'alerta' ? -1 : 1))
}

function fCorta(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}
