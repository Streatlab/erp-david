/**
 * reposicion.ts — Fondo de reposición de flota (sinking fund).
 *
 * Responde a: ¿cuándo hay que cambiar cada furgoneta y cuánto tengo que
 * apartar cada mes desde hoy para pagarla sin pedir otro préstamo?
 *
 * Método:
 *  1. Vida útil = el que llegue antes entre límite de km y límite de años.
 *  2. Coste futuro = precio de la furgo nueva hoy inflado hasta esa fecha.
 *  3. Necesidad = coste futuro − valor residual de la vieja − ahorro ya hecho.
 *  4. Cuota mensual = necesidad / meses que faltan.
 *
 * Los parámetros del plan se guardan en Supabase (tabla furgonetas_reposicion_params),
 * con el navegador como respaldo si la base de datos no responde.
 * Los datos duros (km, préstamos) vienen de Supabase.
 */
import { supabase } from '../supabase'
import { getFurgonetas, type Furgoneta } from './queries'

/* ── Parámetros editables por furgoneta ─────────────────────── */
export interface ParamsReposicion {
  furgonetaId: string
  fechaCompra: string        // YYYY-MM-DD
  kmActual: number
  kmAnio: number             // km reales al año
  vidaKm: number             // km de vida útil objetivo
  vidaAnios: number          // tope de años (batería/garantía)
  precioNuevoHoy: number     // lo que cuesta hoy una furgo equivalente
  inflacion: number          // % anual de encarecimiento
  residualPct: number        // % del precio nuevo que te dan por la vieja
  ahorroAcumulado: number    // € ya apartados para esta furgoneta
}

export const DEFAULTS: Omit<ParamsReposicion, 'furgonetaId'> = {
  fechaCompra: '',
  kmActual: 0,
  kmAnio: 0,
  vidaKm: 200000,
  vidaAnios: 8,
  precioNuevoHoy: 0,
  inflacion: 3,
  residualPct: 12,
  ahorroAcumulado: 0,
}

/* ── Resultado calculado ────────────────────────────────────── */
export interface ResultadoReposicion {
  furgoneta: Furgoneta
  params: ParamsReposicion
  completo: boolean            // hay datos suficientes para calcular
  limitante: 'KM' | 'EDAD' | '—'
  aniosHasta: number
  mesesHasta: number
  fechaReposicion: string      // YYYY-MM
  costeFuturo: number
  residual: number
  necesidad: number            // lo que falta por reunir
  cuotaMensual: number         // lo que hay que apartar cada mes desde hoy
  cuotaPrestamo: number        // cuota del préstamo vivo hoy
  finPrestamo: string | null   // YYYY-MM-DD
  solapa: boolean              // toca cambiar antes de terminar de pagar
  esfuerzoMensual: number      // préstamo + ahorro
}

/* ── Persistencia local (respaldo si Supabase falla) ────────── */
const LS_KEY = 'david.reposicion.params.v1'
const TABLA_PARAMS = 'furgonetas_reposicion_params'

export function cargarParams(): Record<string, ParamsReposicion> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return {}
    const obj = JSON.parse(raw)
    return obj && typeof obj === 'object' ? (obj as Record<string, ParamsReposicion>) : {}
  } catch {
    return {}
  }
}

export function guardarParams(map: Record<string, ParamsReposicion>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map))
  } catch {
    /* noop */
  }
}

/* ── Persistencia remota (fuente de verdad) ─────────────────── */

interface FilaParams {
  furgoneta_id: string
  fecha_compra: string | null
  km_actual: number | null
  km_anio: number | null
  vida_km: number | null
  vida_anios: number | null
  precio_nuevo_hoy: number | null
  inflacion: number | null
  residual_pct: number | null
  ahorro_acumulado: number | null
}

function filaAParams(f: FilaParams): ParamsReposicion {
  return {
    furgonetaId: f.furgoneta_id,
    fechaCompra: f.fecha_compra ?? '',
    kmActual: Number(f.km_actual ?? 0),
    kmAnio: Number(f.km_anio ?? 0),
    vidaKm: Number(f.vida_km ?? DEFAULTS.vidaKm),
    vidaAnios: Number(f.vida_anios ?? DEFAULTS.vidaAnios),
    precioNuevoHoy: Number(f.precio_nuevo_hoy ?? 0),
    inflacion: Number(f.inflacion ?? DEFAULTS.inflacion),
    residualPct: Number(f.residual_pct ?? DEFAULTS.residualPct),
    ahorroAcumulado: Number(f.ahorro_acumulado ?? 0),
  }
}

function paramsAFila(p: ParamsReposicion): FilaParams {
  return {
    furgoneta_id: p.furgonetaId,
    fecha_compra: p.fechaCompra || null,
    km_actual: p.kmActual,
    km_anio: p.kmAnio,
    vida_km: p.vidaKm,
    vida_anios: p.vidaAnios,
    precio_nuevo_hoy: p.precioNuevoHoy,
    inflacion: p.inflacion,
    residual_pct: p.residualPct,
    ahorro_acumulado: p.ahorroAcumulado,
  }
}

/** Lee el plan guardado en la base de datos. Nunca lanza: si falla, devuelve {}. */
export async function cargarParamsRemoto(): Promise<Record<string, ParamsReposicion>> {
  try {
    const { data, error } = await supabase.from(TABLA_PARAMS).select('*')
    if (error || !data) return {}
    const out: Record<string, ParamsReposicion> = {}
    for (const fila of data as FilaParams[]) {
      if (!fila.furgoneta_id) continue
      out[fila.furgoneta_id] = filaAParams(fila)
    }
    return out
  } catch {
    return {}
  }
}

/** Guarda el plan de una furgoneta. Devuelve false si no se pudo (sin lanzar). */
export async function guardarParamRemoto(p: ParamsReposicion): Promise<boolean> {
  if (!p.furgonetaId) return false
  try {
    const { error } = await supabase
      .from(TABLA_PARAMS)
      .upsert(paramsAFila(p), { onConflict: 'furgoneta_id' })
    return !error
  } catch {
    return false
  }
}

/* ── Datos duros desde Supabase ─────────────────────────────── */

/** km reales al año por furgoneta, a partir de los partes semanales de km. */
export async function getKmAnioPorFurgo(): Promise<Record<string, number>> {
  const desde = new Date()
  desde.setFullYear(desde.getFullYear() - 1)
  const desdeStr = desde.toISOString().slice(0, 10)

  const { data } = await supabase
    .from('furgonetas_partes_km')
    .select('furgoneta_id, semana_lunes, km_recorridos')
    .gte('semana_lunes', desdeStr)

  const acc: Record<string, { km: number; semanas: number }> = {}
  for (const p of (data ?? []) as { furgoneta_id: string; km_recorridos: number | null }[]) {
    const km = Number(p.km_recorridos ?? 0)
    if (!p.furgoneta_id || km <= 0) continue
    if (!acc[p.furgoneta_id]) acc[p.furgoneta_id] = { km: 0, semanas: 0 }
    acc[p.furgoneta_id].km += km
    acc[p.furgoneta_id].semanas += 1
  }

  const out: Record<string, number> = {}
  for (const [id, v] of Object.entries(acc)) {
    if (v.semanas > 0) out[id] = Math.round((v.km / v.semanas) * 52)
  }
  return out
}

export interface PrestamoVivo {
  cuotaMensual: number
  fechaFin: string | null
  fechaInicio: string | null
}

export async function getPrestamosPorFurgo(): Promise<Record<string, PrestamoVivo>> {
  const { data } = await supabase
    .from('furgonetas_prestamos')
    .select('furgoneta_id, cuota_mensual, fecha_fin, fecha_inicio')

  const out: Record<string, PrestamoVivo> = {}
  for (const p of (data ?? []) as {
    furgoneta_id: string
    cuota_mensual: number | null
    fecha_fin: string | null
    fecha_inicio: string | null
  }[]) {
    if (!p.furgoneta_id) continue
    out[p.furgoneta_id] = {
      cuotaMensual: Number(p.cuota_mensual ?? 0),
      fechaFin: p.fecha_fin ?? null,
      fechaInicio: p.fecha_inicio ?? null,
    }
  }
  return out
}

/* ── Carga completa: furgonetas + params precargados ────────── */
export interface DatosReposicion {
  furgonetas: Furgoneta[]
  params: Record<string, ParamsReposicion>
  prestamos: Record<string, PrestamoVivo>
}

export async function cargarDatos(): Promise<DatosReposicion> {
  const [furgos, kmAnio, prestamos, remotos] = await Promise.all([
    getFurgonetas(),
    getKmAnioPorFurgo(),
    getPrestamosPorFurgo(),
    cargarParamsRemoto(),
  ])

  const activas = furgos.filter((f) => f.activa !== false)
  const locales = cargarParams()
  const params: Record<string, ParamsReposicion> = {}
  const aMigrar: ParamsReposicion[] = []

  for (const f of activas) {
    // La base de datos manda. El navegador solo se usa si el remoto no
    // tiene todavía nada para esta furgoneta (plan guardado antes de la
    // migración), y en ese caso se sube.
    const remoto = remotos[f.id]
    const prev = remoto ?? locales[f.id]

    const p: ParamsReposicion = {
      ...DEFAULTS,
      furgonetaId: f.id,
      fechaCompra: prev?.fechaCompra || prestamos[f.id]?.fechaInicio || '',
      kmActual: prev?.kmActual || Number(f.km_actual ?? 0),
      kmAnio: prev?.kmAnio || kmAnio[f.id] || 0,
      vidaKm: prev?.vidaKm ?? DEFAULTS.vidaKm,
      vidaAnios: prev?.vidaAnios ?? DEFAULTS.vidaAnios,
      precioNuevoHoy: prev?.precioNuevoHoy ?? 0,
      inflacion: prev?.inflacion ?? DEFAULTS.inflacion,
      residualPct: prev?.residualPct ?? DEFAULTS.residualPct,
      ahorroAcumulado: prev?.ahorroAcumulado ?? 0,
    }

    params[f.id] = p
    if (!remoto && locales[f.id]) aMigrar.push(p)
  }

  // Migración silenciosa de lo que ya había en este navegador.
  if (aMigrar.length > 0) {
    await Promise.all(aMigrar.map((p) => guardarParamRemoto(p)))
  }

  return { furgonetas: activas, params, prestamos }
}

/* ── Cálculo ────────────────────────────────────────────────── */
const MS_ANIO = 365.25 * 24 * 3600 * 1000

function sumarMeses(base: Date, meses: number): Date {
  const d = new Date(base)
  d.setMonth(d.getMonth() + meses)
  return d
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function calcular(
  furgoneta: Furgoneta,
  params: ParamsReposicion,
  prestamo?: PrestamoVivo,
): ResultadoReposicion {
  const hoy = new Date()
  const cuotaPrestamo = prestamo?.cuotaMensual ?? Number(furgoneta.prestamo_mensual ?? 0)
  const finPrestamo = prestamo?.fechaFin ?? null

  const completo = params.precioNuevoHoy > 0 && params.kmAnio > 0

  const vacio: ResultadoReposicion = {
    furgoneta,
    params,
    completo: false,
    limitante: '—',
    aniosHasta: 0,
    mesesHasta: 0,
    fechaReposicion: '—',
    costeFuturo: 0,
    residual: 0,
    necesidad: 0,
    cuotaMensual: 0,
    cuotaPrestamo,
    finPrestamo,
    solapa: false,
    esfuerzoMensual: cuotaPrestamo,
  }
  if (!completo) return vacio

  /* Límite por kilómetros */
  const kmRestantes = Math.max(params.vidaKm - params.kmActual, 0)
  const aniosPorKm = kmRestantes / params.kmAnio

  /* Límite por edad */
  let aniosPorEdad = Number.POSITIVE_INFINITY
  if (params.fechaCompra) {
    const compra = new Date(params.fechaCompra)
    if (!isNaN(compra.getTime())) {
      const limite = new Date(compra)
      limite.setFullYear(limite.getFullYear() + params.vidaAnios)
      aniosPorEdad = Math.max((limite.getTime() - hoy.getTime()) / MS_ANIO, 0)
    }
  }

  const aniosHasta = Math.max(Math.min(aniosPorKm, aniosPorEdad), 0)
  const limitante: 'KM' | 'EDAD' = aniosPorKm <= aniosPorEdad ? 'KM' : 'EDAD'
  const mesesHasta = Math.max(Math.round(aniosHasta * 12), 0)
  const fechaRepo = sumarMeses(hoy, mesesHasta)

  const costeFuturo = params.precioNuevoHoy * Math.pow(1 + params.inflacion / 100, aniosHasta)
  const residual = params.precioNuevoHoy * (params.residualPct / 100)
  const necesidad = Math.max(costeFuturo - residual - params.ahorroAcumulado, 0)
  const cuotaMensual = mesesHasta > 0 ? necesidad / mesesHasta : necesidad

  const solapa = !!finPrestamo && ymd(fechaRepo) < finPrestamo

  return {
    furgoneta,
    params,
    completo: true,
    limitante,
    aniosHasta,
    mesesHasta,
    fechaReposicion: ymd(fechaRepo).slice(0, 7),
    costeFuturo,
    residual,
    necesidad,
    cuotaMensual,
    cuotaPrestamo,
    finPrestamo,
    solapa,
    esfuerzoMensual: cuotaPrestamo + cuotaMensual,
  }
}

/* ── Agregados de flota ─────────────────────────────────────── */
export interface ResumenFlota {
  cuotaMensualTotal: number
  necesidadTotal: number
  prestamoMensualTotal: number
  esfuerzoMensualTotal: number
  ahorroAcumuladoTotal: number
  proxima: ResultadoReposicion | null
  conSolape: number
  incompletas: number
}

export function resumirFlota(res: ResultadoReposicion[]): ResumenFlota {
  const validos = res.filter((r) => r.completo)
  const ordenados = [...validos].sort((a, b) => a.mesesHasta - b.mesesHasta)
  return {
    cuotaMensualTotal: validos.reduce((s, r) => s + r.cuotaMensual, 0),
    necesidadTotal: validos.reduce((s, r) => s + r.necesidad, 0),
    prestamoMensualTotal: res.reduce((s, r) => s + r.cuotaPrestamo, 0),
    esfuerzoMensualTotal: res.reduce((s, r) => s + r.esfuerzoMensual, 0),
    ahorroAcumuladoTotal: res.reduce((s, r) => s + r.params.ahorroAcumulado, 0),
    proxima: ordenados[0] ?? null,
    conSolape: validos.filter((r) => r.solapa).length,
    incompletas: res.length - validos.length,
  }
}

/** Aportación total que hay que hacer cada año natural hasta la última reposición. */
export interface AportacionAnual {
  anio: string
  aportacion: number
  reposiciones: number
}

export function aportacionPorAnio(res: ResultadoReposicion[]): AportacionAnual[] {
  const hoy = new Date()
  const mapa: Record<string, { aportacion: number; reposiciones: number }> = {}

  for (const r of res) {
    if (!r.completo) continue
    for (let m = 0; m < r.mesesHasta; m++) {
      const anio = String(sumarMeses(hoy, m).getFullYear())
      if (!mapa[anio]) mapa[anio] = { aportacion: 0, reposiciones: 0 }
      mapa[anio].aportacion += r.cuotaMensual
    }
    const anioRepo = r.fechaReposicion.slice(0, 4)
    if (!mapa[anioRepo]) mapa[anioRepo] = { aportacion: 0, reposiciones: 0 }
    mapa[anioRepo].reposiciones += 1
  }

  return Object.entries(mapa)
    .map(([anio, v]) => ({ anio, aportacion: Math.round(v.aportacion), reposiciones: v.reposiciones }))
    .sort((a, b) => a.anio.localeCompare(b.anio))
}
