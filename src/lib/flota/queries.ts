import { supabase } from '@/lib/supabase'

export interface Furgoneta {
  id: string
  codigo: string
  nombre_corto: string
  conductor: string
  matricula: string | null
  modelo: string | null
  ruta: string | null
  km_actual: number | null
  km_proxima_revision: number | null
  itv_fecha: string | null
  seguro_fecha_vencimiento: string | null
  prestamo_mensual: number | null
  seguro_anual: number | null
  alquiler_mensual: number | null
  estado: 'OPERATIVA' | 'EN_REVISION' | 'FUERA_SERVICIO' | null
  activa: boolean
}

export interface MantenimientoRow {
  id: number
  furgoneta_id: string
  fecha: string
  km_al_momento: number | null
  tipo: string | null
  descripcion: string | null
  coste: number | null
}

export interface AlertaFlota {
  furgoId: string
  furgoNombre: string
  matricula: string | null
  tipo: 'ITV' | 'SEGURO' | 'MANTENIMIENTO'
  nivel: 'URGENTE' | 'PROXIMO'
  titulo: string
  detalle: string
  diasRestantes?: number
  kmRestantes?: number
}

export interface CostesFlotaMes {
  total: number
  prestamosAlquiler: number
  combustible: number
  combustiblePorFurgoId: Map<string, number>
}

export async function getFurgonetas(): Promise<Furgoneta[]> {
  // Intento con todas las columnas (post-migración 015)
  const full = await supabase
    .from('furgonetas')
    .select('id, codigo, nombre_corto, conductor, matricula, modelo, ruta, km_actual, km_proxima_revision, itv_fecha, seguro_fecha_vencimiento, prestamo_mensual, seguro_anual, alquiler_mensual, estado, activa')
    .order('codigo', { ascending: true })
  if (!full.error) return (full.data ?? []) as Furgoneta[]

  // Fallback: columnas básicas (pre-migración 015)
  const basic = await supabase
    .from('furgonetas')
    .select('id, codigo, nombre_corto, conductor, matricula, modelo, activa')
    .order('codigo', { ascending: true })
  if (basic.error) throw basic.error
  return (basic.data ?? []).map((f: Record<string, unknown>) => ({
    id: f.id as string,
    codigo: f.codigo as string,
    nombre_corto: f.nombre_corto as string,
    conductor: f.conductor as string,
    matricula: (f.matricula as string) ?? null,
    modelo: (f.modelo as string) ?? null,
    ruta: null,
    km_actual: null,
    km_proxima_revision: null,
    itv_fecha: null,
    seguro_fecha_vencimiento: null,
    prestamo_mensual: null,
    seguro_anual: null,
    alquiler_mensual: null,
    estado: null,
    activa: (f.activa as boolean) ?? true,
  }))
}

export async function actualizarFurgoneta(id: string, patch: Partial<Furgoneta>) {
  const { error } = await supabase.from('furgonetas').update(patch).eq('id', id)
  if (error) throw error
}

export async function listarMantenimientos(furgoId: string): Promise<MantenimientoRow[]> {
  const { data, error } = await supabase
    .from('furgonetas_mantenimientos')
    .select('id, furgoneta_id, fecha, km_al_momento, tipo, descripcion, coste')
    .eq('furgoneta_id', furgoId)
    .order('fecha', { ascending: false })
  if (error) {
    if (/(does not exist|relation|schema cache)/i.test(error.message)) return []
    throw error
  }
  return (data ?? []) as MantenimientoRow[]
}

export async function registrarMantenimiento(input: Omit<MantenimientoRow, 'id'>) {
  const { error } = await supabase.from('furgonetas_mantenimientos').insert(input)
  if (error) throw error
}

const fmtISO = (d: Date) => d.toISOString().slice(0, 10)
const today = () => new Date()
const startOfMonth = (d = today()) => new Date(d.getFullYear(), d.getMonth(), 1)
const endOfMonth = (d = today()) => new Date(d.getFullYear(), d.getMonth() + 1, 0)
const daysBetween = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 86400000)

export function calcularAlertas(furgos: Furgoneta[]): AlertaFlota[] {
  const hoy = today(); hoy.setHours(0, 0, 0, 0)
  const out: AlertaFlota[] = []
  for (const f of furgos) {
    if (!f.activa) continue

    if (f.itv_fecha) {
      const fecha = new Date(f.itv_fecha + 'T00:00:00')
      const dias = daysBetween(fecha, hoy)
      if (dias <= 30) {
        out.push({
          furgoId: f.id,
          furgoNombre: f.conductor || f.nombre_corto,
          matricula: f.matricula,
          tipo: 'ITV',
          nivel: dias <= 10 ? 'URGENTE' : 'PROXIMO',
          titulo: `ITV · ${f.conductor || f.nombre_corto}`,
          detalle: `${f.matricula ?? '—'} · vence ${fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} · ${dias < 0 ? `vencida hace ${-dias}d` : `en ${dias}d`}`,
          diasRestantes: dias,
        })
      }
    }
    if (f.seguro_fecha_vencimiento) {
      const fecha = new Date(f.seguro_fecha_vencimiento + 'T00:00:00')
      const dias = daysBetween(fecha, hoy)
      if (dias <= 30) {
        out.push({
          furgoId: f.id,
          furgoNombre: f.conductor || f.nombre_corto,
          matricula: f.matricula,
          tipo: 'SEGURO',
          nivel: dias <= 10 ? 'URGENTE' : 'PROXIMO',
          titulo: `Seguro · ${f.conductor || f.nombre_corto}`,
          detalle: `${f.matricula ?? '—'} · vence ${fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} · ${dias < 0 ? `vencido hace ${-dias}d` : `en ${dias}d`}`,
          diasRestantes: dias,
        })
      }
    }
    if (f.km_proxima_revision != null && f.km_actual != null) {
      const restantes = f.km_proxima_revision - f.km_actual
      if (restantes <= 1000) {
        out.push({
          furgoId: f.id,
          furgoNombre: f.conductor || f.nombre_corto,
          matricula: f.matricula,
          tipo: 'MANTENIMIENTO',
          nivel: restantes <= 0 ? 'URGENTE' : 'PROXIMO',
          titulo: `Mantenimiento · ${f.conductor || f.nombre_corto}`,
          detalle: `${f.matricula ?? '—'} · ${restantes <= 0 ? `${-restantes} km vencidos` : `faltan ${restantes} km`} (próx revisión ${f.km_proxima_revision} km)`,
          kmRestantes: restantes,
        })
      }
    }
  }
  // ordenar URGENTE primero, luego por días/kms restantes
  out.sort((a, b) => {
    if (a.nivel !== b.nivel) return a.nivel === 'URGENTE' ? -1 : 1
    const ar = a.diasRestantes ?? a.kmRestantes ?? 0
    const br = b.diasRestantes ?? b.kmRestantes ?? 0
    return ar - br
  })
  return out
}

/* ───────────── Coste flota mensual ───────────── */

interface SubcatLite { id: number; categoria_id: number; grupo: string | null; nombre: string }
interface CatLite { id: number; tipo: 'INGRESO' | 'GASTO' }

async function getCatalogo() {
  const [cats, subs] = await Promise.all([
    supabase.from('categorias').select('id, tipo'),
    supabase.from('subcategorias').select('id, categoria_id, grupo, nombre'),
  ])
  return {
    cats: ((cats.data ?? []) as CatLite[]),
    subs: ((subs.data ?? []) as SubcatLite[]),
  }
}

export async function getCostesFlotaMes(furgos: Furgoneta[]): Promise<CostesFlotaMes> {
  // Préstamos + alquiler — directo de la tabla furgonetas
  const prestamosAlquiler = furgos.reduce(
    (s, f) => s + (Number(f.prestamo_mensual ?? 0) + Number(f.alquiler_mensual ?? 0)),
    0
  )

  // Combustible / Recargas mes en curso desde movimientos_banco
  const r = { start: fmtISO(startOfMonth()), end: fmtISO(endOfMonth()) }
  const { subs } = await getCatalogo()
  const subsCombustible = new Set(
    subs
      .filter(s => /VEHIC/.test((s.grupo || '').toUpperCase()) &&
                  (/COMBUSTIBLE|RECARGA|CARBURANTE/.test((s.nombre || '').toUpperCase())))
      .map(s => s.id)
  )

  const { data } = await supabase
    .from('movimientos_banco')
    .select('importe, subcategoria_id, fecha')
    .gte('fecha', r.start).lte('fecha', r.end)

  let combustible = 0
  for (const m of (data ?? []) as { importe: number; subcategoria_id: number | null }[]) {
    if (!m.subcategoria_id || !subsCombustible.has(m.subcategoria_id)) continue
    if (m.importe < 0) combustible += -m.importe
  }

  // Atribución por furgoneta: prorrateo equitativo entre activas
  const activas = furgos.filter(f => f.activa)
  const porFurgo = new Map<string, number>()
  if (activas.length > 0) {
    const cuota = combustible / activas.length
    for (const f of activas) porFurgo.set(f.id, cuota)
  }

  return {
    total: prestamosAlquiler + combustible,
    prestamosAlquiler,
    combustible,
    combustiblePorFurgoId: porFurgo,
  }
}

export function costeMensualFurgo(f: Furgoneta, combustibleAtribuido: number): number {
  const prestamo = Number(f.prestamo_mensual ?? 0)
  const alquiler = Number(f.alquiler_mensual ?? 0)
  const seguroProrr = Number(f.seguro_anual ?? 0) / 12
  return prestamo + alquiler + seguroProrr + combustibleAtribuido
}
