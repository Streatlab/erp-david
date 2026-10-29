import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

/* Ciclo de pago de Cade. Vive en la tabla de configuración y nunca se escribe a mano en pantalla.
   Mientras Rubén no lo confirme, las claves están vacías y el ERP dice "pendiente de confirmar". */
import { CLAVE_TEXTO, CLAVE_DIA } from '@/lib/cicloPagoCade'
export { CLAVE_TEXTO, CLAVE_DIA, TEXTO_SIN_CONFIRMAR, fechaLimiteCobro } from '@/lib/cicloPagoCade'

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
