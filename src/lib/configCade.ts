import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

/* Ciclo de pago de Cade. Vive en la tabla de configuración y nunca se escribe a mano en pantalla.
   Mientras Rubén no lo confirme, las claves están vacías y el ERP dice "pendiente de confirmar". */
export const CLAVE_TEXTO = 'cade_ciclo_pago_texto'
export const CLAVE_DIA = 'cade_dia_cobro_limite'
export const TEXTO_SIN_CONFIRMAR = 'Ciclo de pago de Cade pendiente de confirmar.'

export interface CicloPagoCade { texto: string | null; diaLimite: number | null; cargando: boolean }

export function useCicloPagoCade(): CicloPagoCade & { recargar: () => void } {
  const [v, setV] = useState<CicloPagoCade>({ texto: null, diaLimite: null, cargando: true })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let vivo = true
    supabase.from('configuracion').select('clave, valor').in('clave', [CLAVE_TEXTO, CLAVE_DIA]).then(({ data }) => {
      if (!vivo) return
      const m = new Map<string, string>()
      for (const r of (data ?? []) as { clave: string; valor: string | null }[]) m.set(r.clave, (r.valor ?? '').trim())
      const dia = Number(m.get(CLAVE_DIA) ?? '')
      setV({
        texto: m.get(CLAVE_TEXTO) || null,
        diaLimite: Number.isInteger(dia) && dia >= 1 && dia <= 31 ? dia : null,
        cargando: false,
      })
    })
    return () => { vivo = false }
  }, [tick])
  return { ...v, recargar: () => setTick(t => t + 1) }
}

export async function guardarCicloPagoCade(texto: string, diaLimite: number | null): Promise<string | null> {
  const filas = [
    { clave: CLAVE_TEXTO, valor: texto.trim() },
    { clave: CLAVE_DIA, valor: diaLimite ? String(diaLimite) : '' },
  ]
  const { error } = await supabase.from('configuracion').upsert(filas, { onConflict: 'clave' })
  return error ? error.message : null
}

/* Fecha límite de cobro de una factura de Cade a partir del mes trabajado: el día límite del mes siguiente.
   Sin día confirmado no hay fecha límite y nada se marca como vencido. */
export function fechaLimiteCobro(periodo: string | null | undefined, diaLimite: number | null): Date | null {
  if (!periodo || !diaLimite) return null
  const p = new Date(periodo + 'T00:00:00')
  if (isNaN(p.getTime())) return null
  return new Date(p.getFullYear(), p.getMonth() + 1, diaLimite)
}
