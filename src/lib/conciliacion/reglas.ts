import { supabase } from '@/lib/supabase'
import { normalizarConcepto } from './import'
import { matchRegla, type ReglaAprendida, type TipoMatch, type OrigenCategoria } from './categorizar'

export interface MovimientoExistente {
  id: number
  concepto_normalizado: string | null
  subcategoria_id: number | null
  origen_categoria: string | null
}

export interface PropagacionResumen {
  sin_categorizar: MovimientoExistente[]
  con_categoria_distinta: MovimientoExistente[]
}

export async function crearRegla(patron: string, tipo_match: TipoMatch, subcategoria_id: number): Promise<ReglaAprendida> {
  const patronNorm = normalizarConcepto(patron)
  const { data, error } = await supabase
    .from('reglas_aprendidas')
    .insert({
      patron: patronNorm,
      tipo_match,
      subcategoria_id,
      prioridad: 100,
      creada_por: 'MANUAL',
      activa: true,
      veces_aplicada: 0,
    })
    .select('id, patron, tipo_match, subcategoria_id, prioridad, creada_por, veces_aplicada, activa')
    .single()
  if (error) throw error
  return data as ReglaAprendida
}

export async function borrarRegla(id: number): Promise<void> {
  const { error } = await supabase.from('reglas_aprendidas').delete().eq('id', id)
  if (error) throw error
}

export async function toggleReglaActiva(id: number, activa: boolean): Promise<void> {
  const { error } = await supabase.from('reglas_aprendidas').update({ activa }).eq('id', id)
  if (error) throw error
}

/**
 * Busca todos los movimientos cuyo concepto_normalizado case con la regla
 * y los agrupa por si ya tenían otra categoría (conflicto) o estaban SIN_CATEGORIZAR.
 */
export async function buscarMovimientosParaPropagar(
  regla: Pick<ReglaAprendida, 'patron' | 'tipo_match' | 'subcategoria_id'>,
): Promise<PropagacionResumen> {
  const { data, error } = await supabase
    .from('movimientos_banco')
    .select('id, concepto_normalizado, subcategoria_id, origen_categoria')
  if (error) throw error
  const matches = (data ?? []).filter(m => matchRegla(m.concepto_normalizado ?? '', regla)) as MovimientoExistente[]
  const resumen: PropagacionResumen = { sin_categorizar: [], con_categoria_distinta: [] }
  for (const m of matches) {
    if (m.subcategoria_id == null || (m.origen_categoria ?? 'SIN_CATEGORIZAR') === 'SIN_CATEGORIZAR') {
      resumen.sin_categorizar.push(m)
    } else if (m.subcategoria_id !== regla.subcategoria_id) {
      resumen.con_categoria_distinta.push(m)
    }
  }
  return resumen
}

export async function aplicarReglaAMovimientos(
  ids: number[],
  subcategoria_id: number,
  regla_id: number,
): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase
    .from('movimientos_banco')
    .update({
      subcategoria_id,
      regla_id,
      origen_categoria: 'REGLA' satisfies OrigenCategoria,
    })
    .in('id', ids)
  if (error) throw error
  const { data: reg } = await supabase
    .from('reglas_aprendidas')
    .select('veces_aplicada')
    .eq('id', regla_id)
    .single()
  const veces = (reg?.veces_aplicada ?? 0) + ids.length
  await supabase.from('reglas_aprendidas').update({ veces_aplicada: veces }).eq('id', regla_id)
}

export async function actualizarMovimientoManual(
  id: number,
  subcategoria_id: number | null,
): Promise<void> {
  const origen: OrigenCategoria = subcategoria_id == null ? 'SIN_CATEGORIZAR' : 'MANUAL'
  const { error } = await supabase
    .from('movimientos_banco')
    .update({ subcategoria_id, regla_id: null, origen_categoria: origen })
    .eq('id', id)
  if (error) throw error
}
