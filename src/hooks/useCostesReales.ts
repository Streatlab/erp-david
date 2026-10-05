import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { costesMedios, ultimosMesesCerrados } from '@/lib/equilibrio'
import type { Costes } from '@/lib/equilibrio'

export interface DatosReales {
  costes: Costes
  ingresos: number          // base media mensual facturada (últimos 3 meses con facturas)
  mesesIngreso: string[]
  codigos: number           // códigos Cade activos
  eurEntrega: number        // total liquidado ÷ entregas (liquidaciones Cade)
  entregasLiquidadas: number
  sueldoDavid: number       // media mensual de lo que David envía a la familia (su sueldo), últimos 3 meses cerrados
  nombres: Record<string, string>
}

/* Costes y bases reales para Punto de equilibrio y Escenarios. Sin datos inventados. */
export function useCostesReales() {
  const [datos, setDatos] = useState<DatosReales | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const meses = ultimosMesesCerrados(new Date())
      const desde = `${meses[0]}-01`
      const [mov, cg, ci, liq, fac, sue] = await Promise.all([
        supabase.from('conciliacion').select('fecha, importe, categoria').gte('fecha', desde).lt('importe', 0),
        supabase.from('categorias_contables_gastos').select('codigo, nombre, ambito'),
        supabase.from('categorias_contables_ingresos').select('codigo, nombre, ambito'),
        supabase.from('liquidaciones_cade').select('entregas, total'),
        supabase.from('v_facturacion_consolidada').select('mes, transportista, base'),
        supabase.from('v_familia_mov').select('mes, importe').eq('categoria', 'aportacion-david').in('mes', meses),
      ])
      const err = mov.error ?? cg.error ?? ci.error ?? liq.error ?? fac.error ?? sue.error
      if (err) { setError(err.message); return }
      const ambito: Record<string, string> = {}
      const nombres: Record<string, string> = {}
      for (const c of [...(cg.data ?? []), ...(ci.data ?? [])] as any[]) { ambito[c.codigo] = c.ambito; nombres[c.codigo] = c.nombre }
      const costes = costesMedios(((mov.data ?? []) as any[]).map(m => ({ ...m, importe: Number(m.importe) })), ambito, meses)

      const facs = (fac.data ?? []) as { mes: string; transportista: string | null; base: number }[]
      const mesesFac = [...new Set(facs.map(f => f.mes))].sort().slice(-3)
      const ingresos = mesesFac.length
        ? facs.filter(f => mesesFac.includes(f.mes)).reduce((s, f) => s + Number(f.base), 0) / mesesFac.length : 0
      const codigos = new Set(facs.filter(f => mesesFac.includes(f.mes) && f.transportista).map(f => f.transportista)).size

      const ls = (liq.data ?? []) as { entregas: number | null; total: number | null }[]
      const entregas = ls.reduce((s, l) => s + Number(l.entregas ?? 0), 0)
      const total = ls.reduce((s, l) => s + Number(l.total ?? 0), 0)
      const sueldoDavid = ((sue.data ?? []) as { importe: number }[]).reduce((a, r) => a + Number(r.importe), 0) / meses.length
      setDatos({ costes, ingresos, mesesIngreso: mesesFac, codigos, eurEntrega: entregas ? total / entregas : 0, entregasLiquidadas: entregas, sueldoDavid, nombres })
    })()
  }, [])

  return { datos, error, cargando: !datos && !error }
}
