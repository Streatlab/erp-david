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

const COLOR_OP = {
  mercadona: '#F26B1F',
  carrefour: '#7A8B4F',
  lidl: '#C89B2A',
  dia: '#A34E2A',
  prior: '#16355C',
} as const

const COLOR_GRUPO = {
  rrhh: '#7A8B4F',
  renting: '#F26B1F',
  combustible: '#C89B2A',
  controlables: '#A34E2A',
  otros: '#16355C',
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

const norm = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()

function detectarOperador(concepto: string): keyof typeof COLOR_OP | null {
  const c = norm(concepto)
  if (c.includes('MERCADONA')) return 'mercadona'
  if (c.includes('CARREFOUR')) return 'carrefour'
  if (c.includes('LIDL'))      return 'lidl'
  if (/\bDIA\b/.test(c) || c.includes('SUPERMERCADO DIA')) return 'dia'
  return null
}

function detectarPortesPrior(concepto: string): boolean {
  const c = norm(concepto)
  return c.includes('PRIOR') || c.includes('PORTES')
}

/* ─────────────────────── Catálogo Subcat ─────────────────── */

interface SubcatLite { id: number; categoria_id: number; grupo: string | null; nombre: string }
interface CatLite { id: number; tipo: 'INGRESO' | 'GASTO' }

let _catCache: { cats: CatLite[]; subs: SubcatLite[] } | null = null

async function getCatalogo() {
  if (_catCache) return _catCache
  const [cats, subs] = await Promise.all([
    supabase.from('categorias').select('id, tipo'),
    supabase.from('subcategorias').select('id, categoria_id, grupo, nombre'),
  ])
  if (cats.error) throw cats.error
  if (subs.error) throw subs.error
  _catCache = {
    cats: (cats.data ?? []) as CatLite[],
    subs: (subs.data ?? []) as SubcatLite[],
  }
  return _catCache
}

/* ─────────────────────── Movimientos ─────────────────────── */

interface MovRow {
  id: number
  fecha: string
  importe: number
  saldo: number | null
  concepto: string | null
  subcategoria_id: number | null
}

async function fetchMovimientosRango(r: Rango): Promise<MovRow[]> {
  const { data, error } = await supabase
    .from('movimientos_banco')
    .select('id, fecha, importe, saldo, concepto, subcategoria_id')
    .gte('fecha', r.start)
    .lte('fecha', r.end)
    .order('fecha', { ascending: true })
  if (error) throw error
  return (data ?? []) as MovRow[]
}

/* ─────────────────────── Ingresos por operador ───────────── */

export async function getIngresosOperadores(r: Rango): Promise<{
  total: number
  totalAnterior: number
  filas: IngresoOperadorRow[]
}> {
  const { cats, subs } = await getCatalogo()
  const idsIngreso = new Set(cats.filter(c => c.tipo === 'INGRESO').map(c => c.id))
  const subIngreso = new Set(subs.filter(s => idsIngreso.has(s.categoria_id)).map(s => s.id))
  const subCade = new Set(
    subs.filter(s => idsIngreso.has(s.categoria_id) && /CADE/.test((s.nombre || '').toUpperCase())).map(s => s.id)
  )
  const subPortes = new Set(
    subs.filter(s => idsIngreso.has(s.categoria_id) && /PORT/.test((s.nombre || '').toUpperCase())).map(s => s.id)
  )

  const [act, prev] = await Promise.all([
    fetchMovimientosRango(r),
    fetchMovimientosRango(rangoAnterior(r)),
  ])

  function agregar(rows: MovRow[]) {
    const out = { mercadona: 0, carrefour: 0, lidl: 0, dia: 0, prior: 0, cadeOtro: 0, total: 0 }
    for (const m of rows) {
      if (!m.subcategoria_id) continue
      if (!subIngreso.has(m.subcategoria_id)) continue
      if (m.importe < 0) continue
      out.total += m.importe
      if (subCade.has(m.subcategoria_id)) {
        const op = detectarOperador(m.concepto || '')
        if (op) out[op] += m.importe
        else    out.cadeOtro += m.importe
      } else if (subPortes.has(m.subcategoria_id)) {
        out.prior += m.importe
      } else {
        out.cadeOtro += m.importe
      }
    }
    return out
  }
  const ag = agregar(act)
  const agPrev = agregar(prev)

  const total = ag.total
  const filasBase: { key: keyof typeof COLOR_OP | 'cadeOtro'; label: string; importe: number; importeAnterior: number; color: string }[] = [
    { key: 'mercadona', label: 'Cade · Mercadona', color: COLOR_OP.mercadona, importe: ag.mercadona, importeAnterior: agPrev.mercadona },
    { key: 'carrefour', label: 'Cade · Carrefour', color: COLOR_OP.carrefour, importe: ag.carrefour, importeAnterior: agPrev.carrefour },
    { key: 'lidl',      label: 'Cade · Lidl',      color: COLOR_OP.lidl,      importe: ag.lidl,      importeAnterior: agPrev.lidl },
    { key: 'dia',       label: 'Cade · Día',       color: COLOR_OP.dia,       importe: ag.dia,       importeAnterior: agPrev.dia },
    { key: 'prior',     label: 'Portes · Prior',   color: COLOR_OP.prior,     importe: ag.prior,     importeAnterior: agPrev.prior },
  ]
  if (ag.cadeOtro > 0 || agPrev.cadeOtro > 0) {
    filasBase.push({ key: 'cadeOtro' as never, label: 'Cade · Sin operador', color: '#9C8A6E', importe: ag.cadeOtro, importeAnterior: agPrev.cadeOtro })
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

const GRUPOS_GASTO = ['rrhh','renting','combustible','controlables','otros'] as const
type GrupoKey = typeof GRUPOS_GASTO[number]

function mapearGrupoGasto(sub: SubcatLite): GrupoKey {
  const grupo = (sub.grupo || '').toUpperCase()
  const nombre = (sub.nombre || '').toUpperCase()
  // RRHH = todas las subcat de grupos RRHH
  if (grupo.includes('RRHH')) return 'rrhh'
  // Renting / préstamos / alquiler / seguros furgonetas
  if (grupo.includes('RENTING')) return 'renting'
  // Combustible y recargas dentro de "VEHÍCULOS"
  if (grupo.includes('VEHICULOS') || grupo.includes('VEHÍCULOS')) {
    if (nombre.includes('COMBUSTIBLE') || nombre.includes('RECARGA') || nombre.includes('CARBURANTE')) return 'combustible'
    return 'otros'
  }
  // Controlables = grupo "OTROS GASTOS" y similares (categoria_id=5)
  if (grupo.includes('OTROS') || grupo.includes('INTERNET') || grupo.includes('CONTROLABLE')) return 'controlables'
  return 'otros'
}

export async function getGastosPorGrupo(r: Rango): Promise<{
  total: number
  totalAnterior: number
  filas: GastoGrupoRow[]
}> {
  const { cats, subs } = await getCatalogo()
  const idsGasto = new Set(cats.filter(c => c.tipo === 'GASTO').map(c => c.id))
  const subGasto = subs.filter(s => idsGasto.has(s.categoria_id))
  const grupoBySub = new Map<number, GrupoKey>(subGasto.map(s => [s.id, mapearGrupoGasto(s)]))

  const [act, prev] = await Promise.all([
    fetchMovimientosRango(r),
    fetchMovimientosRango(rangoAnterior(r)),
  ])

  function agregar(rows: MovRow[]) {
    const out: Record<GrupoKey, number> = { rrhh: 0, renting: 0, combustible: 0, controlables: 0, otros: 0 }
    let total = 0
    for (const m of rows) {
      if (!m.subcategoria_id) continue
      const g = grupoBySub.get(m.subcategoria_id)
      if (!g) continue
      if (m.importe >= 0) continue
      const abs = -m.importe
      out[g] += abs
      total += abs
    }
    return { ...out, total }
  }
  const ag = agregar(act)
  const agPrev = agregar(prev)

  const META: Record<GrupoKey, { label: string; color: string }> = {
    rrhh:         { label: 'RRHH',                 color: COLOR_GRUPO.rrhh },
    renting:      { label: 'Vehículos · Renting',  color: COLOR_GRUPO.renting },
    combustible:  { label: 'Vehículos · Combustible', color: COLOR_GRUPO.combustible },
    controlables: { label: 'Controlables',         color: COLOR_GRUPO.controlables },
    otros:        { label: 'Otros',                color: COLOR_GRUPO.otros },
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

export async function getTesoreria(): Promise<TesoreriaSnapshot> {
  const hoy = today()
  const hace30 = fmtISO(addDays(hoy, -30))

  const { data: ult } = await supabase
    .from('movimientos_banco')
    .select('fecha, saldo')
    .not('saldo', 'is', null)
    .order('fecha', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)

  const { data: prev } = await supabase
    .from('movimientos_banco')
    .select('fecha, saldo')
    .not('saldo', 'is', null)
    .lte('fecha', hace30)
    .order('fecha', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)

  const cajaActual   = Number(ult?.[0]?.saldo ?? 0)
  const cajaHace30d  = Number(prev?.[0]?.saldo ?? cajaActual)
  const fechaUltima  = ult?.[0]?.fecha ?? null

  // Proyecciones: extrapolación lineal del flujo medio diario últimos 30d
  const flujo30 = cajaActual - cajaHace30d
  const flujoDia = flujo30 / 30
  const proyeccion7d  = cajaActual + flujoDia * 7
  const proyeccion30d = cajaActual + flujoDia * 30

  return {
    cajaActual,
    cajaHace30d,
    proyeccion7d,
    proyeccion30d,
    cobrosPendientes: 0,  // sin tabla de pendientes en David por ahora
    pagosPendientes: 0,
    fechaUltima,
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
  const { cats, subs } = await getCatalogo()
  const idsIngreso = new Set(cats.filter(c => c.tipo === 'INGRESO').map(c => c.id))
  const subIng = new Set(subs.filter(s => idsIngreso.has(s.categoria_id)).map(s => s.id))

  const { data, error } = await supabase
    .from('movimientos_banco')
    .select('importe, subcategoria_id, fecha')
    .gte('fecha', start)
    .lte('fecha', end)
  if (error) return 0
  let total = 0
  for (const m of (data ?? []) as { importe: number; subcategoria_id: number | null }[]) {
    if (!m.subcategoria_id) continue
    if (!subIng.has(m.subcategoria_id)) continue
    if (m.importe <= 0) continue
    total += m.importe
  }
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

/* ─────────────────────── Objetivos diarios ───────────────── */

export async function getObjetivosDiariosSemana(): Promise<ObjetivoDiaFila[]> {
  const hoy = today()
  hoy.setHours(0, 0, 0, 0)
  const ws = inicioSemana(hoy)
  const dias = Array.from({ length: 7 }, (_, i) => addDays(ws, i))

  const fi = fmtISO(ws)
  const ff = fmtISO(addDays(ws, 6))

  const [{ data: objsRaw }, { cats, subs }] = await Promise.all([
    supabase.from('objetivos_diarios').select('fecha, importe_objetivo').gte('fecha', fi).lte('fecha', ff),
    getCatalogo(),
  ])

  const idsIngreso = new Set(cats.filter(c => c.tipo === 'INGRESO').map(c => c.id))
  const subIng = new Set(subs.filter(s => idsIngreso.has(s.categoria_id)).map(s => s.id))

  const { data: movs } = await supabase
    .from('movimientos_banco')
    .select('fecha, importe, subcategoria_id')
    .gte('fecha', fi).lte('fecha', ff)

  const obj = new Map<string, number>()
  for (const o of (objsRaw ?? []) as { fecha: string; importe_objetivo: number }[]) {
    obj.set(o.fecha, Number(o.importe_objetivo))
  }
  const con = new Map<string, number>()
  for (const m of (movs ?? []) as { fecha: string; importe: number; subcategoria_id: number | null }[]) {
    if (!m.subcategoria_id || !subIng.has(m.subcategoria_id)) continue
    if (m.importe <= 0) continue
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

const META_PRESUP: Record<string, { label: string; key: 'rrhh'|'renting'|'combustible'|'controlables' }> = {
  RRHH:              { label: 'RRHH',                  key: 'rrhh' },
  VEHICULOS_RENTING: { label: 'Vehículos · Renting',   key: 'renting' },
  COMBUSTIBLE:       { label: 'Combustible',           key: 'combustible' },
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
  const { data, error } = await supabase
    .from('movimientos_banco')
    .select('fecha, saldo')
    .gte('fecha', fmtISO(inicio))
    .lte('fecha', fmtISO(hoy))
    .not('saldo', 'is', null)
    .order('fecha', { ascending: true })
    .order('id', { ascending: true })
  if (error) return []
  // Quedarse con el último saldo de cada día
  const byDay = new Map<string, number>()
  for (const m of (data ?? []) as { fecha: string; saldo: number }[]) {
    byDay.set(m.fecha, Number(m.saldo))
  }
  // Rellenar huecos con valor anterior
  const out: PuntoSerie[] = []
  let last = 0
  for (let i = 0; i < 30; i++) {
    const d = fmtISO(addDays(inicio, i))
    if (byDay.has(d)) last = byDay.get(d)!
    out.push({ fecha: d, valor: last })
  }
  return out
}

export async function getBarrasSemanas(weeks = 4): Promise<BarraSemana[]> {
  const { cats, subs } = await getCatalogo()
  const idsIng = new Set(cats.filter(c => c.tipo === 'INGRESO').map(c => c.id))
  const idsGas = new Set(cats.filter(c => c.tipo === 'GASTO').map(c => c.id))
  const subIng = new Set(subs.filter(s => idsIng.has(s.categoria_id)).map(s => s.id))
  const subGas = new Set(subs.filter(s => idsGas.has(s.categoria_id)).map(s => s.id))

  const hoy = today()
  const wsActual = inicioSemana(hoy)
  const inicio = addDays(wsActual, -7 * (weeks - 1))
  const fin = addDays(wsActual, 6)

  const { data } = await supabase
    .from('movimientos_banco')
    .select('fecha, importe, subcategoria_id')
    .gte('fecha', fmtISO(inicio))
    .lte('fecha', fmtISO(fin))

  const buckets: { ws: Date; ingresos: number; gastos: number }[] = Array.from({ length: weeks }, (_, i) => ({
    ws: addDays(wsActual, -7 * (weeks - 1 - i)),
    ingresos: 0,
    gastos: 0,
  }))

  for (const m of (data ?? []) as { fecha: string; importe: number; subcategoria_id: number | null }[]) {
    if (!m.subcategoria_id) continue
    const f = new Date(m.fecha + 'T00:00:00')
    const idx = buckets.findIndex(b => f.getTime() >= b.ws.getTime() && f.getTime() < addDays(b.ws, 7).getTime())
    if (idx === -1) continue
    if (subIng.has(m.subcategoria_id) && m.importe > 0) buckets[idx].ingresos += m.importe
    if (subGas.has(m.subcategoria_id) && m.importe < 0) buckets[idx].gastos += -m.importe
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
