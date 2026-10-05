import { supabase } from '@/lib/supabase'

/* ───────────────────────── Tipos ─────────────────────────── */

export type PeriodoKey =
  | 'mes-actual'
  | 'mes-anterior'
  | 'ultimos-30'
  | 'trimestre'
  | 'anio'
  | 'personalizado'

export interface Rango {
  start: string  // YYYY-MM-DD
  end: string    // YYYY-MM-DD
}

export interface IngresoOperadorRow {
  key: string
  label: string
  color: string
  importe: number
  importeAnterior: number
  pct: number
  delta: number | null
}

export interface GastoGrupoRow {
  key: string
  label: string
  color: string
  importe: number
  importeAnterior: number
  pct: number
  delta: number | null
}

export interface TesoreriaSnapshot {
  cajaActual: number
  cajaHace30d: number
  proyeccion7d: number
  proyeccion30d: number
  cobrosPendientes: number
  pagosPendientes: number
  fechaUltima: string | null
}

export interface ObjetivoFila {
  periodo: 'semanal' | 'mensual' | 'anual'
  label: string
  fechaInicio: string
  fechaFin: string
  objetivo: number
  conseguido: number
  pct: number
}

export interface ObjetivoDiaFila {
  fecha: string         // YYYY-MM-DD
  diaSemana: string     // 'lun'..'dom'
  esHoy: boolean
  esFuturo: boolean
  objetivo: number
  conseguido: number
  pct: number
}

export interface PresupuestoCard {
  key: string
  label: string
  consumido: number
  tope: number
  pct: number
  estado: 'EN_RITMO' | 'AL_LIMITE' | 'SUPERADO'
  ritmoPorDia: number
  diasRestantes: number
}

export interface PuntoSerie { fecha: string; valor: number }

export interface BarraSemana { semana: string; ingresos: number; gastos: number }

/* ───────────────────────── Helpers ───────────────────────── */

/* Ingresos de David: solo tres conceptos.
   Cade liquida 2-3 veces al mes y llega AGRUPADO en el banco, no desglosado
   por Mercadona/Carrefour/Lidl/Dia. Prior factura cada quince dias (David esta
   en modulos y Prior le devuelve el IVA). Portes son trabajos por cuenta propia. */
const COLOR_OP = {
  cade: '#F26B1F',
  prior: '#16355C',
  portes: '#7A8B4F',
} as const

/* Gastos de David en cuatro grupos reales. No hay renting: las furgonetas son
   suyas y se pagan con prestamos de cuota fija. Las recargas electricas van
   aparte porque son un gasto variable diario, no una cuota. */
const COLOR_GRUPO = {
  rrhh: '#7A8B4F',
  vehiculos: '#F26B1F',
  recargas: '#C89B2A',
  controlables: '#A34E2A',
  sinCategorizar: '#9C8A6E',
} as const

const fmtISO = (d: Date) => d.toISOString().slice(0, 10)
const today = () => new Date()
const startOfMonth = (d = today()) => new Date(d.getFullYear(), d.getMonth(), 1)
const endOfMonth = (d = today()) => new Date(d.getFullYear(), d.getMonth() + 1, 0)
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, d.getDate())

export function rangoPara(p: PeriodoKey): Rango {
  const hoy = today()
  switch (p) {
    case 'mes-anterior': {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
      const fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
      return { start: fmtISO(inicio), end: fmtISO(fin) }
    }
    case 'ultimos-30':
      return { start: fmtISO(addDays(hoy, -29)), end: fmtISO(hoy) }
    case 'trimestre': {
      const q = Math.floor(hoy.getMonth() / 3)
      const inicio = new Date(hoy.getFullYear(), q * 3, 1)
      const fin = new Date(hoy.getFullYear(), q * 3 + 3, 0)
      return { start: fmtISO(inicio), end: fmtISO(fin) }
    }
    case 'anio': {
      const inicio = new Date(hoy.getFullYear(), 0, 1)
      const fin = new Date(hoy.getFullYear(), 11, 31)
      return { start: fmtISO(inicio), end: fmtISO(fin) }
    }
    case 'mes-actual':
    default:
      return { start: fmtISO(startOfMonth(hoy)), end: fmtISO(endOfMonth(hoy)) }
  }
}

export function rangoAnterior(r: Rango): Rango {
  const a = new Date(r.start + 'T00:00:00')
  const b = new Date(r.end + 'T00:00:00')
  const dias = Math.round((b.getTime() - a.getTime()) / 86400000) + 1
  return { start: fmtISO(addDays(a, -dias)), end: fmtISO(addDays(a, -1)) }
}

export const NOMBRE_MES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
]

export function inicioSemana(d = today()) {
  const x = new Date(d)
  const diff = (x.getDay() + 6) % 7  // lunes=0
  x.setDate(x.getDate() - diff)
  x.setHours(0, 0, 0, 0)
  return x
}
export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayN = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - dayN)
  const yStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return Math.ceil(((t.getTime() - yStart.getTime()) / 86400000 + 1) / 7)
}

/* ─────────────────────── Catálogo de categorías ─────────────
   Los movimientos reales viven en `conciliacion` (los trae el robot del banco).
   Cada categoría tiene un ámbito: actividad (cuenta en el negocio), personal, interno
   (traspasos entre cuentas) o pendiente (sin clasificar). El Panel solo cuenta
   actividad + pendiente; lo personal y los traspasos internos no inflan ni ingresos ni gastos. */

interface CatInfo { grupo: string | null; ambito: string }
interface Catalogo { gastos: Map<string, CatInfo>; ingresos: Map<string, CatInfo> }

let _catCache: Catalogo | null = null

async function getCatalogo(): Promise<Catalogo> {
  if (_catCache) return _catCache
  const [g, i] = await Promise.all([
    supabase.from('categorias_contables_gastos').select('codigo, grupo, ambito'),
    supabase.from('categorias_contables_ingresos').select('codigo, canal_abv, ambito'),
  ])
  if (g.error) throw g.error
  if (i.error) throw i.error
  _catCache = {
    gastos: new Map((g.data ?? []).map((c: { codigo: string; grupo: string | null; ambito: string | null }) => [c.codigo, { grupo: c.grupo, ambito: c.ambito ?? 'actividad' }])),
    ingresos: new Map((i.data ?? []).map((c: { codigo: string; canal_abv: string | null; ambito: string | null }) => [c.codigo, { grupo: c.canal_abv, ambito: c.ambito ?? 'actividad' }])),
  }
  return _catCache
}

/** Cuenta para el negocio: actividad o pendiente de clasificar. Personal e interno quedan fuera. */
const cuenta = (ambito: string) => ambito === 'actividad' || ambito === 'pendiente'

/* ─────────────────────── Movimientos ─────────────────────── */

interface MovRow {
  fecha: string
  importe: number
  categoria: string | null
  concepto: string | null
}

/** Lee `conciliacion` por páginas (el servidor corta en 1.000 filas). */
async function fetchMovimientosRango(r: Rango): Promise<MovRow[]> {
  const out: MovRow[] = []
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase
      .from('conciliacion')
      .select('fecha, importe, categoria, concepto')
      .gte('fecha', r.start)
      .lte('fecha', r.end)
      .order('fecha', { ascending: true })
      .order('id', { ascending: true })
      .range(desde, desde + 999)
    if (error) throw error
    const filas = (data ?? []) as MovRow[]
    out.push(...filas.map(f => ({ ...f, importe: Number(f.importe) })))
    if (filas.length < 1000) break
  }
  return out
}

/** Ingreso operativo de un movimiento: devuelve la fila de origen o null si no cuenta. */
function origenIngreso(m: MovRow, cat: Catalogo): 'cade' | 'prior' | 'portes' | 'otros' | 'sinClasificar' | null {
  if (m.importe <= 0) return null
  const c = m.categoria ?? ''
  if (c === 'pendiente-revisar-ingreso') return 'sinClasificar'
  const info = cat.ingresos.get(c)
  if (!info || !cuenta(info.ambito)) return null
  if (c === 'cade' || c === 'cade-juan') return 'cade'
  if (c === 'prior-bruto') return 'prior'
  if (c === 'portes') return 'portes'
  return 'otros'
}

/* ─────────────────────── Ingresos por origen ─────────────── */

export async function getIngresosOperadores(r: Rango): Promise<{
  total: number
  totalAnterior: number
  filas: IngresoOperadorRow[]
}> {
  const cat = await getCatalogo()
  const [act, prev] = await Promise.all([
    fetchMovimientosRango(r),
    fetchMovimientosRango(rangoAnterior(r)),
  ])

  function agregar(rows: MovRow[]) {
    const out = { cade: 0, prior: 0, portes: 0, otros: 0, sinClasificar: 0, total: 0 }
    for (const m of rows) {
      const o = origenIngreso(m, cat)
      if (!o) continue
      out[o] += m.importe
      out.total += m.importe
    }
    return out
  }
  const ag = agregar(act)
  const agPrev = agregar(prev)

  const total = ag.total
  const filasBase: { key: string; label: string; importe: number; importeAnterior: number; color: string }[] = [
    { key: 'cade',   label: 'Cade',   color: COLOR_OP.cade,   importe: ag.cade,   importeAnterior: agPrev.cade },
    { key: 'prior',  label: 'Prior',  color: COLOR_OP.prior,  importe: ag.prior,  importeAnterior: agPrev.prior },
    { key: 'portes', label: 'Portes', color: COLOR_OP.portes, importe: ag.portes, importeAnterior: agPrev.portes },
  ]
  if (ag.otros > 0 || agPrev.otros > 0) filasBase.push({ key: 'otros', label: 'Otros ingresos', color: '#9C8A6E', importe: ag.otros, importeAnterior: agPrev.otros })
  if (ag.sinClasificar > 0 || agPrev.sinClasificar > 0) {
    filasBase.push({ key: 'sinClasificar', label: 'Sin clasificar', color: '#9C8A6E', importe: ag.sinClasificar, importeAnterior: agPrev.sinClasificar })
  }

  const filas: IngresoOperadorRow[] = filasBase.map(f => ({
    key: f.key,
    label: f.label,
    color: f.color,
    importe: f.importe,
    importeAnterior: f.importeAnterior,
    pct: total > 0 ? f.importe / total : 0,
    delta: f.importeAnterior > 0 ? (f.importe - f.importeAnterior) / f.importeAnterior : null,
  }))

  return { total, totalAnterior: agPrev.total, filas }
}

/* ─────────────────────── Gastos por grupo ────────────────── */

const GRUPOS_GASTO = ['rrhh','vehiculos','recargas','controlables','prior','sinCategorizar'] as const
type GrupoKey = typeof GRUPOS_GASTO[number]

function grupoDeGasto(codigo: string, info: CatInfo): GrupoKey | null {
  if (!cuenta(info.ambito)) return null
  if (info.ambito === 'pendiente') return 'sinCategorizar'
  if (codigo === 'recargas-electricas' || codigo === 'combustible') return 'recargas'
  if (codigo === 'devolucion-bi-prior') return 'prior'
  const g = (info.grupo ?? '').toUpperCase()
  if (g === 'PERSONAL') return 'rrhh'
  if (g.startsWith('VEH')) return 'vehiculos'
  return 'controlables'
}

export async function getGastosPorGrupo(r: Rango): Promise<{
  total: number
  totalAnterior: number
  filas: GastoGrupoRow[]
}> {
  const cat = await getCatalogo()
  const [act, prev] = await Promise.all([
    fetchMovimientosRango(r),
    fetchMovimientosRango(rangoAnterior(r)),
  ])

  function agregar(rows: MovRow[]) {
    const out: Record<GrupoKey, number> = { rrhh: 0, vehiculos: 0, recargas: 0, controlables: 0, prior: 0, sinCategorizar: 0 }
    let total = 0
    for (const m of rows) {
      const c = m.categoria ?? ''
      if (c === 'pendiente-revisar-gasto') { out.sinCategorizar += -m.importe; total += -m.importe; continue }
      const info = cat.gastos.get(c)
      if (!info) continue
      const g = grupoDeGasto(c, info)
      if (!g) continue
      // Los reembolsos (importe positivo en una categoría de gasto) restan del gasto
      out[g] += -m.importe
      total += -m.importe
    }
    return { ...out, total }
  }
  const ag = agregar(act)
  const agPrev = agregar(prev)

  const META: Record<GrupoKey, { label: string; color: string }> = {
    rrhh:           { label: 'RRHH',            color: COLOR_GRUPO.rrhh },
    vehiculos:      { label: 'Vehículos',       color: COLOR_GRUPO.vehiculos },
    recargas:       { label: 'Recargas',        color: COLOR_GRUPO.recargas },
    controlables:   { label: 'Controlables',    color: COLOR_GRUPO.controlables },
    prior:          { label: 'Entregas a Prior', color: '#16355C' },
    sinCategorizar: { label: 'Sin categorizar', color: COLOR_GRUPO.sinCategorizar },
  }

  const filas: GastoGrupoRow[] = GRUPOS_GASTO.map(k => {
    const importe = ag[k]
    const importeAnt = agPrev[k]
    return {
      key: k,
      label: META[k].label,
      color: META[k].color,
      importe,
      importeAnterior: importeAnt,
      pct: ag.total > 0 ? importe / ag.total : 0,
      delta: importeAnt > 0 ? (importe - importeAnt) / importeAnt : null,
    }
  })

  return { total: ag.total, totalAnterior: agPrev.total, filas }
}

/* ─────────────────────── Tesorería ───────────────────────── */

/** Saldo real de las cuentas del negocio (lo guarda el robot de saldos cada noche). */
async function saldoCuentas(): Promise<{ total: number; fecha: string | null }> {
  const { data } = await supabase.from('cuentas_bancarias').select('saldo_actual, saldo_fecha, personal, activa')
  const filas = ((data ?? []) as { saldo_actual: number | null; saldo_fecha: string | null; personal: boolean | null; activa: boolean | null }[])
    .filter(c => c.activa !== false && !c.personal)
  const total = filas.reduce((s, c) => s + Number(c.saldo_actual ?? 0), 0)
  const fecha = filas.map(c => c.saldo_fecha).filter(Boolean).sort().pop() ?? null
  return { total, fecha: fecha ? String(fecha).slice(0, 10) : null }
}

/** Movimientos de las cuentas propias desde `desde` (excluye las cuentas personales). */
async function movimientosDesde(desde: string): Promise<MovRow[]> {
  const filas = await fetchMovimientosRango({ start: desde, end: fmtISO(addDays(today(), 1)) })
  return filas.filter(m => !(m.categoria ?? '').startsWith('pendiente-personal'))
}

export async function getTesoreria(): Promise<TesoreriaSnapshot> {
  const hoy = today()
  const hace30 = fmtISO(addDays(hoy, -30))
  const [saldo, movs] = await Promise.all([saldoCuentas(), movimientosDesde(hace30)])

  const cajaActual = saldo.total
  // Saldo de hace 30 días = saldo de hoy menos todo lo que se ha movido desde entonces
  const cajaHace30d = cajaActual - movs.filter(m => m.fecha > hace30).reduce((s, m) => s + m.importe, 0)

  // Proyecciones: extrapolación lineal del flujo medio diario últimos 30d
  const flujoDia = (cajaActual - cajaHace30d) / 30
  return {
    cajaActual,
    cajaHace30d,
    proyeccion7d: cajaActual + flujoDia * 7,
    proyeccion30d: cajaActual + flujoDia * 30,
    cobrosPendientes: 0,
    pagosPendientes: 0,
    fechaUltima: saldo.fecha,
  }
}

/* ─────────────────────── Objetivos ───────────────────────── */

interface ObjetivoFactRow {
  id: number
  periodo: 'semanal' | 'mensual' | 'anual'
  fecha_inicio: string
  fecha_fin: string
  importe_objetivo: number
}

async function getOrCreateObjetivoSemanaActual(weekStart: Date): Promise<ObjetivoFactRow | null> {
  const fi = fmtISO(weekStart)
  const ff = fmtISO(addDays(weekStart, 6))
  const { data, error } = await supabase
    .from('objetivos_facturacion')
    .select('id, periodo, fecha_inicio, fecha_fin, importe_objetivo')
    .eq('periodo', 'semanal')
    .eq('fecha_inicio', fi)
    .maybeSingle()
  if (error) {
    if (/(does not exist|schema cache|relation)/i.test(error.message)) return null
    return null
  }
  if (data) return data as ObjetivoFactRow

  const def = 4500
  const { data: ins } = await supabase
    .from('objetivos_facturacion')
    .insert({ periodo: 'semanal', fecha_inicio: fi, fecha_fin: ff, importe_objetivo: def })
    .select('id, periodo, fecha_inicio, fecha_fin, importe_objetivo')
    .maybeSingle()
  return (ins as ObjetivoFactRow) ?? null
}

async function calcularConseguido(start: string, end: string): Promise<number> {
  const cat = await getCatalogo()
  let movs: MovRow[]
  try { movs = await fetchMovimientosRango({ start, end }) } catch { return 0 }
  let total = 0
  for (const m of movs) if (origenIngreso(m, cat)) total += m.importe
  return total
}

export async function getObjetivosMensuales(): Promise<ObjetivoFila[]> {
  const hoy = today()
  const ws = inicioSemana(hoy)
  const we = addDays(ws, 6)
  const ms = startOfMonth(hoy)
  const me = endOfMonth(hoy)
  const ys = new Date(hoy.getFullYear(), 0, 1)
  const ye = new Date(hoy.getFullYear(), 11, 31)

  const { data, error } = await supabase
    .from('objetivos_facturacion')
    .select('id, periodo, fecha_inicio, fecha_fin, importe_objetivo')
  const rows: ObjetivoFactRow[] = (error ? [] : (data ?? [])) as ObjetivoFactRow[]

  // Asegura semanal en curso
  let sem = rows.find(r => r.periodo === 'semanal' && r.fecha_inicio === fmtISO(ws))
  if (!sem) {
    const created = await getOrCreateObjetivoSemanaActual(ws)
    if (created) sem = created
  }
  const men = rows.find(r => r.periodo === 'mensual' && r.fecha_inicio === fmtISO(ms))
  const anu = rows.find(r => r.periodo === 'anual'   && r.fecha_inicio === fmtISO(ys))

  const [conS, conM, conA] = await Promise.all([
    calcularConseguido(fmtISO(ws), fmtISO(we)),
    calcularConseguido(fmtISO(ms), fmtISO(me)),
    calcularConseguido(fmtISO(ys), fmtISO(ye)),
  ])

  const semanaNum = isoWeek(hoy)
  const mesNombre = NOMBRE_MES[hoy.getMonth()]

  const base: ObjetivoFila[] = [
    {
      periodo: 'semanal',
      label: `Semanal · S${semanaNum}`,
      fechaInicio: fmtISO(ws), fechaFin: fmtISO(we),
      objetivo: Number(sem?.importe_objetivo ?? 4500),
      conseguido: conS,
      pct: 0,
    },
    {
      periodo: 'mensual',
      label: `Mensual · ${mesNombre}`,
      fechaInicio: fmtISO(ms), fechaFin: fmtISO(me),
      objetivo: Number(men?.importe_objetivo ?? 18000),
      conseguido: conM,
      pct: 0,
    },
    {
      periodo: 'anual',
      label: `Anual · ${hoy.getFullYear()}`,
      fechaInicio: fmtISO(ys), fechaFin: fmtISO(ye),
      objetivo: Number(anu?.importe_objetivo ?? 216000),
      conseguido: conA,
      pct: 0,
    },
  ]
  return base.map(f => ({ ...f, pct: f.objetivo > 0 ? f.conseguido / f.objetivo : 0 }))
}

export async function setObjetivoMensual(periodo: 'semanal' | 'mensual' | 'anual', fecha_inicio: string, fecha_fin: string, importe: number) {
  const { data: existing } = await supabase
    .from('objetivos_facturacion')
    .select('id')
    .eq('periodo', periodo)
    .eq('fecha_inicio', fecha_inicio)
    .maybeSingle()
  if (existing?.id) {
    await supabase.from('objetivos_facturacion').update({ importe_objetivo: importe }).eq('id', existing.id)
  } else {
    await supabase.from('objetivos_facturacion').insert({ periodo, fecha_inicio, fecha_fin, importe_objetivo: importe })
  }
}

/* ─────────────────────── Objetivos diarios ───────────────────
   DEPRECADO en el Panel: David no tiene objetivo diario de facturación.
   Cade liquida 2-3 veces al mes y Prior cada quince días, así que un objetivo
   por día no mide nada útil. Se mantiene la función por si algún módulo futuro
   (Entregas) necesita metas diarias de VOLUMEN, que sí tienen sentido.        */

export async function getObjetivosDiariosSemana(): Promise<ObjetivoDiaFila[]> {
  const hoy = today()
  hoy.setHours(0, 0, 0, 0)
  const ws = inicioSemana(hoy)
  const dias = Array.from({ length: 7 }, (_, i) => addDays(ws, i))

  const fi = fmtISO(ws)
  const ff = fmtISO(addDays(ws, 6))

  const [{ data: objsRaw }, cat, movs] = await Promise.all([
    supabase.from('objetivos_diarios').select('fecha, importe_objetivo').gte('fecha', fi).lte('fecha', ff),
    getCatalogo(),
    fetchMovimientosRango({ start: fi, end: ff }),
  ])

  const obj = new Map<string, number>()
  for (const o of (objsRaw ?? []) as { fecha: string; importe_objetivo: number }[]) {
    obj.set(o.fecha, Number(o.importe_objetivo))
  }
  const con = new Map<string, number>()
  for (const m of movs) {
    if (!origenIngreso(m, cat)) continue
    con.set(m.fecha, (con.get(m.fecha) ?? 0) + m.importe)
  }

  const NOM_DIA = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM']

  return dias.map((d, i) => {
    const k = fmtISO(d)
    const objetivo = obj.get(k) ?? 750
    const conseguido = con.get(k) ?? 0
    const esHoy = k === fmtISO(hoy)
    const esFuturo = d.getTime() > hoy.getTime()
    return {
      fecha: k,
      diaSemana: NOM_DIA[i],
      esHoy,
      esFuturo,
      objetivo,
      conseguido,
      pct: objetivo > 0 ? conseguido / objetivo : 0,
    }
  })
}

export async function setObjetivoDia(fecha: string, importe: number) {
  const { data: existing } = await supabase
    .from('objetivos_diarios')
    .select('id')
    .eq('fecha', fecha)
    .maybeSingle()
  if (existing?.id) {
    await supabase.from('objetivos_diarios').update({ importe_objetivo: importe, updated_at: new Date().toISOString() }).eq('id', existing.id)
  } else {
    await supabase.from('objetivos_diarios').insert({ fecha, importe_objetivo: importe })
  }
}

/* ─────────────────────── Presupuestos ────────────────────── */

const META_PRESUP: Record<string, { label: string; key: 'rrhh'|'vehiculos'|'recargas'|'controlables' }> = {
  RRHH:              { label: 'RRHH',                  key: 'rrhh' },
  VEHICULOS_RENTING: { label: 'Vehículos',             key: 'vehiculos' },
  COMBUSTIBLE:       { label: 'Recargas',              key: 'recargas' },
  CONTROLABLES:      { label: 'Controlables',          key: 'controlables' },
}

export async function getPresupuestos(): Promise<PresupuestoCard[]> {
  const hoy = today()
  const anio = hoy.getFullYear()
  const mes = hoy.getMonth() + 1
  const diasMes = endOfMonth(hoy).getDate()
  const diasTrans = hoy.getDate()
  const diasRest = diasMes - diasTrans

  const r: Rango = { start: fmtISO(startOfMonth(hoy)), end: fmtISO(endOfMonth(hoy)) }
  const { filas } = await getGastosPorGrupo(r)
  const consumoPorKey = new Map<string, number>(filas.map(f => [f.key, f.importe]))

  const { data, error } = await supabase
    .from('presupuestos_mensuales')
    .select('categoria, tope')
    .eq('anio', anio).eq('mes', mes)

  let presupuestos: { categoria: string; tope: number }[] = []
  if (error || !data || data.length === 0) {
    presupuestos = [
      { categoria: 'RRHH',              tope: 6500 },
      { categoria: 'VEHICULOS_RENTING', tope: 1840 },
      { categoria: 'COMBUSTIBLE',       tope: 950 },
      { categoria: 'CONTROLABLES',      tope: 600 },
    ]
  } else {
    presupuestos = data as { categoria: string; tope: number }[]
  }

  const out: PresupuestoCard[] = []
  for (const p of presupuestos) {
    const meta = META_PRESUP[p.categoria]
    if (!meta) continue
    const consumido = consumoPorKey.get(meta.key) ?? 0
    const pct = p.tope > 0 ? consumido / p.tope : 0
    const ritmoPorDia = diasTrans > 0 ? consumido / diasTrans : 0
    const proyeccion = ritmoPorDia * diasMes
    let estado: PresupuestoCard['estado'] = 'EN_RITMO'
    if (consumido > p.tope) estado = 'SUPERADO'
    else if (proyeccion > p.tope) estado = 'AL_LIMITE'
    out.push({
      key: meta.key,
      label: meta.label,
      consumido,
      tope: Number(p.tope),
      pct,
      estado,
      ritmoPorDia,
      diasRestantes: diasRest,
    })
  }
  return out
}

/* ─────────────────────── Series gráficos ─────────────────── */

export async function getSerieSaldoUlt30d(): Promise<PuntoSerie[]> {
  const hoy = today()
  const inicio = addDays(hoy, -29)
  const [saldo, movs] = await Promise.all([saldoCuentas(), movimientosDesde(fmtISO(inicio))])
  // Se reconstruye hacia atrás: el saldo de cada día es el de hoy menos lo movido después de ese día
  const out: PuntoSerie[] = []
  for (let i = 0; i < 30; i++) {
    const d = fmtISO(addDays(inicio, i))
    const despues = movs.filter(m => m.fecha > d).reduce((s, m) => s + m.importe, 0)
    out.push({ fecha: d, valor: saldo.total - despues })
  }
  return out
}

export async function getBarrasSemanas(weeks = 4): Promise<BarraSemana[]> {
  const cat = await getCatalogo()
  const hoy = today()
  const wsActual = inicioSemana(hoy)
  const inicio = addDays(wsActual, -7 * (weeks - 1))
  const fin = addDays(wsActual, 6)

  const data = await fetchMovimientosRango({ start: fmtISO(inicio), end: fmtISO(fin) })

  const buckets: { ws: Date; ingresos: number; gastos: number }[] = Array.from({ length: weeks }, (_, i) => ({
    ws: addDays(wsActual, -7 * (weeks - 1 - i)),
    ingresos: 0,
    gastos: 0,
  }))

  for (const m of data) {
    const f = new Date(m.fecha + 'T00:00:00')
    const idx = buckets.findIndex(b => f.getTime() >= b.ws.getTime() && f.getTime() < addDays(b.ws, 7).getTime())
    if (idx === -1) continue
    if (origenIngreso(m, cat)) { buckets[idx].ingresos += m.importe; continue }
    const c = m.categoria ?? ''
    const info = cat.gastos.get(c)
    if (c === 'pendiente-revisar-gasto' || (info && cuenta(info.ambito))) buckets[idx].gastos += -m.importe
  }
  return buckets.map(b => ({
    semana: `S${isoWeek(b.ws)}`,
    ingresos: Math.round(b.ingresos),
    gastos: Math.round(b.gastos),
  }))
}

/* ─────────────────────── Bundle Panel ────────────────────── */

export interface PanelBundle {
  rango: Rango
  ingresos: Awaited<ReturnType<typeof getIngresosOperadores>>
  gastos: Awaited<ReturnType<typeof getGastosPorGrupo>>
  tesoreria: TesoreriaSnapshot
  objetivos: ObjetivoFila[]
  objetivosDia: ObjetivoDiaFila[]
  presupuestos: PresupuestoCard[]
  serieSaldo: PuntoSerie[]
  barrasSemanas: BarraSemana[]
}

export async function cargarPanel(periodo: PeriodoKey, custom?: Rango): Promise<PanelBundle> {
  const rango = periodo === 'personalizado' && custom ? custom : rangoPara(periodo)
  const [ingresos, gastos, tesoreria, objetivos, objetivosDia, presupuestos, serieSaldo, barrasSemanas] = await Promise.all([
    getIngresosOperadores(rango),
    getGastosPorGrupo(rango),
    getTesoreria(),
    getObjetivosMensuales(),
    getObjetivosDiariosSemana(),
    getPresupuestos(),
    getSerieSaldoUlt30d(),
    getBarrasSemanas(4),
  ])
  return { rango, ingresos, gastos, tesoreria, objetivos, objetivosDia, presupuestos, serieSaldo, barrasSemanas }
}

export const PALETA = { COLOR_OP, COLOR_GRUPO }

// Para tests de rango anterior expuesto
export { addDays, addMonths }
