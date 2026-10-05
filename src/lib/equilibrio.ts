// Punto de equilibrio y escenarios con costes reales del banco (conciliación).
// Fijos: préstamos/leasing de furgonetas, seguros, Seguridad Social (cuota autónomo y empresa), alquiler, telefonía, gestoría.
// Variables: resto de gastos de la actividad (media de los últimos 3 meses cerrados).

export const CATEGORIAS_FIJAS = [
  'prestamos-furgonetas', 'leasing-furgonetas', 'seguros', 'seguridad-social',
  'alquiler', 'telefonia', 'gestoria',
]
export const CATEGORIAS_PERSONAL = ['nominas', 'subcontratas', 'extras-empleados', 'extras-en-mano', 'incentivos-en-mano', 'adelantos-nomina']

export interface Mov { fecha: string; importe: number; categoria: string | null }

export interface Costes {
  meses: string[]
  fijos: number
  variables: number
  personal: number
  sinCategorizar: number
  porCategoria: { categoria: string; media: number; fija: boolean }[]
}

/* Meses cerrados anteriores a `hoy` (yyyy-mm) */
export function ultimosMesesCerrados(hoy: Date, n = 3): string[] {
  const out: string[] = []
  for (let i = n; i >= 1; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

export function costesMedios(movs: Mov[], ambito: Record<string, string>, meses: string[]): Costes {
  const n = meses.length || 1
  const porCat = new Map<string, number>()
  let sinCategorizar = 0
  for (const m of movs) {
    if (m.importe >= 0 || !meses.includes(m.fecha.slice(0, 7))) continue
    const cat = m.categoria ?? ''
    const amb = ambito[cat] ?? (cat ? 'actividad' : 'pendiente')
    if (amb === 'pendiente') { sinCategorizar += Math.abs(m.importe); continue }
    if (amb !== 'actividad') continue
    porCat.set(cat, (porCat.get(cat) ?? 0) + Math.abs(m.importe))
  }
  const porCategoria = [...porCat.entries()]
    .map(([categoria, total]) => ({ categoria, media: total / n, fija: CATEGORIAS_FIJAS.includes(categoria) }))
    .sort((a, b) => b.media - a.media)
  const suma = (f: (c: { categoria: string; fija: boolean }) => boolean) => porCategoria.filter(f).reduce((s, c) => s + c.media, 0)
  return {
    meses,
    fijos: suma(c => c.fija),
    personal: suma(c => CATEGORIAS_PERSONAL.includes(c.categoria)),
    variables: suma(c => !c.fija),
    sinCategorizar: sinCategorizar / n,
    porCategoria,
  }
}

export interface Equilibrio { euros: number | null; entregas: number | null; margenContribucion: number | null }

/* PE (€/mes) = fijos ÷ (1 − variables/ingresos). Entregas = PE ÷ € por entrega. */
export function puntoEquilibrio(fijos: number, variables: number, ingresos: number, eurEntrega: number): Equilibrio {
  if (ingresos <= 0) return { euros: null, entregas: null, margenContribucion: null }
  const mc = 1 - variables / ingresos
  if (mc <= 0) return { euros: null, entregas: null, margenContribucion: mc }
  const euros = fijos / mc
  return { euros, entregas: eurEntrega > 0 ? euros / eurEntrega : null, margenContribucion: mc }
}

export interface Supuestos { repartidores: number; entregasDia: number; subidaPct: number }

/* Escenario: ingreso y coste mensuales tras ±repartidores, ±entregas/día (26 días) y subida de garantía/tarifa. */
export function escenario(base: { ingresos: number; fijos: number; variables: number; personal: number; codigos: number; eurEntrega: number }, s: Supuestos) {
  const ingresoPorCodigo = base.codigos > 0 ? base.ingresos / base.codigos : 0
  const costePorRepartidor = base.codigos > 1 ? base.personal / (base.codigos - 1) : 0
  const ingresos = (base.ingresos + s.repartidores * ingresoPorCodigo + s.entregasDia * 26 * base.eurEntrega) * (1 + s.subidaPct / 100)
  const gastos = base.fijos + base.variables + s.repartidores * costePorRepartidor
  return { ingresos, gastos, resultado: ingresos - gastos }
}
