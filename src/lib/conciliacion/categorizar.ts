import { supabase } from '@/lib/supabase'
import { normalizarConcepto } from './import'

export type TipoMatch = 'CONTIENE' | 'EXACTO' | 'EMPIEZA'
export type OrigenCategoria = 'SIN_CATEGORIZAR' | 'REGLA' | 'MANUAL' | 'IA'

export interface ReglaAprendida {
  id: number
  patron: string
  tipo_match: TipoMatch
  subcategoria_id: number
  prioridad: number
  creada_por: string | null
  veces_aplicada: number
  activa: boolean
}

export interface MovimientoLite {
  id: number
  concepto_normalizado: string | null
}

export interface Asignacion {
  subcategoria_id: number
  regla_id: number
}

export function matchRegla(conceptoNorm: string, regla: Pick<ReglaAprendida, 'patron' | 'tipo_match'>): boolean {
  if (!conceptoNorm || !regla.patron) return false
  const patron = normalizarConcepto(regla.patron)
  switch (regla.tipo_match) {
    case 'EXACTO':  return conceptoNorm === patron
    case 'EMPIEZA': return conceptoNorm.startsWith(patron)
    case 'CONTIENE':
    default:        return conceptoNorm.includes(patron)
  }
}

/**
 * Devuelve la primera regla activa (mayor prioridad) que case con el concepto.
 * Preparado para encadenar en el futuro con IA: si no hay regla → llamar a IA;
 * si IA tampoco decide → dejar SIN_CATEGORIZAR. Hoy solo devuelve null.
 */
export function emparejarReglaLocal(conceptoNorm: string, reglas: ReglaAprendida[]): ReglaAprendida | null {
  for (const r of reglas) {
    if (!r.activa) continue
    if (matchRegla(conceptoNorm, r)) return r
  }
  return null
}

export async function cargarReglasActivas(): Promise<ReglaAprendida[]> {
  const { data, error } = await supabase
    .from('reglas_aprendidas')
    .select('id, patron, tipo_match, subcategoria_id, prioridad, creada_por, veces_aplicada, activa')
    .eq('activa', true)
    .order('prioridad', { ascending: false })
    .order('id', { ascending: true })
  if (error) throw error
  return (data ?? []) as ReglaAprendida[]
}

/**
 * Categoriza en lote movimientos SIN_CATEGORIZAR usando las reglas pasadas.
 * Actualiza movimientos_banco y veces_aplicada de cada regla que haya aplicado.
 * Retorna cuántos fueron categorizados.
 */
export async function categorizarPendientes(
  movimientos: MovimientoLite[],
  reglas: ReglaAprendida[],
): Promise<number> {
  const contadorPorRegla = new Map<number, number>()
  let total = 0
  for (const m of movimientos) {
    const conceptoNorm = m.concepto_normalizado ?? ''
    const regla = emparejarReglaLocal(conceptoNorm, reglas)
    if (!regla) continue
    const { error } = await supabase
      .from('movimientos_banco')
      .update({
        subcategoria_id: regla.subcategoria_id,
        origen_categoria: 'REGLA' satisfies OrigenCategoria,
        regla_id: regla.id,
      })
      .eq('id', m.id)
    if (error) { console.error('categorizarPendientes update:', error.message); continue }
    contadorPorRegla.set(regla.id, (contadorPorRegla.get(regla.id) ?? 0) + 1)
    total++
  }
  for (const [reglaId, inc] of contadorPorRegla) {
    const regla = reglas.find(r => r.id === reglaId)
    if (!regla) continue
    await supabase
      .from('reglas_aprendidas')
      .update({ veces_aplicada: (regla.veces_aplicada ?? 0) + inc })
      .eq('id', reglaId)
  }
  return total
}

/**
 * Sugiere la palabra más distintiva del concepto para un patrón CONTIENE.
 * Heurística: primera palabra de ≥4 caracteres que no sea stopword y no sea sólo números.
 */
const STOP_WORDS = new Set([
  'ADEUDO','COMPRA','PAGO','PAGOS','TRASPASO','TRANSFERENCIA','RECIBO','EUR','ES','CON','POR','DEL','LOS','LAS',
  'EN','AL','AL.','DE','DE.','Y','A','EL','LA','SU','SUS','UN','UNA','QUE','PARA','SIN','SL','SA','SAU','SLU',
  'BIZUM','ONLINE','CARD','TARJ','TARJETA','NUM','NUMERO','REF','FECHA','VALOR','CONCEPTO','OP','OPERACION',
])

export function sugerirPatron(concepto: string): string {
  const norm = normalizarConcepto(concepto)
  const palabras = norm.split(/\s+/)
  for (const p of palabras) {
    if (p.length < 4) continue
    if (STOP_WORDS.has(p)) continue
    if (/^\d+$/.test(p)) continue
    return p
  }
  return norm.slice(0, 20)
}
