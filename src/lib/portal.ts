/**
 * portal.ts — Datos del Portal del empleado (repartidores).
 * Mecanismo calcado de Binagre: pantallas por persona, ficha vinculada
 * (conductor_id), todo filtrado por el repartidor en pantalla.
 */
import { supabase } from './supabase'

/* ── Pantallas del portal ─────────────────────────────────── */
export type Pantalla =
  | 'hoy' | 'trabajo' | 'kilometros' | 'furgoneta' | 'permisos'
  | 'incentivos' | 'acuerdos' | 'carpeta' | 'avisos'

export const PANTALLAS: { key: Pantalla; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'trabajo', label: 'Mi trabajo' },
  { key: 'kilometros', label: 'Kilómetros' },
  { key: 'furgoneta', label: 'Mi furgoneta' },
  { key: 'permisos', label: 'Vacaciones y permisos' },
  { key: 'incentivos', label: 'Mis incentivos' },
  { key: 'acuerdos', label: 'Mis acuerdos' },
  { key: 'carpeta', label: 'Mi carpeta' },
  { key: 'avisos', label: 'Avisos' },
]

/** Pantallas que tiene permitidas un usuario. Sin fila = permitida. */
export async function pantallasPermitidas(usuarioId?: number): Promise<Set<Pantalla>> {
  const todas = new Set<Pantalla>(PANTALLAS.map((p) => p.key))
  if (!usuarioId) return todas
  const { data } = await supabase.from('permisos_portal').select('pantalla, permitido').eq('usuario_id', usuarioId)
  for (const f of (data ?? []) as { pantalla: Pantalla; permitido: boolean }[]) {
    if (!f.permitido) todas.delete(f.pantalla)
  }
  return todas
}

export async function fijarPantalla(usuarioId: number, pantalla: Pantalla, permitido: boolean) {
  return supabase.from('permisos_portal')
    .upsert({ usuario_id: usuarioId, pantalla, permitido, updated_at: new Date().toISOString() }, { onConflict: 'usuario_id,pantalla' })
}

/* ── Fechas ───────────────────────────────────────────────── */
export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function lunesDe(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dia = (x.getDay() + 6) % 7 // 0 = lunes
  x.setDate(x.getDate() - dia)
  return x
}

export const fechaCorta = (s?: string | null) =>
  s ? new Date(s + (s.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '—'

export const fechaLarga = (s?: string | null) =>
  s ? new Date(s + (s.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export const diasHasta = (s?: string | null): number | null => {
  if (!s) return null
  const hoy = new Date(); hoy.setHours(12, 0, 0, 0)
  return Math.round((new Date(s + 'T12:00:00').getTime() - hoy.getTime()) / 86400000)
}

/* ── Ficha del repartidor ─────────────────────────────────── */
export interface Conductor { id: string; nombre: string; apellidos: string | null; fecha_alta: string | null; tipo_contrato: string | null; dias_vacaciones_anuales: number | null; carnet_caducidad: string | null }
export interface Furgoneta {
  id: string; codigo: string; matricula: string; modelo: string | null; ruta: string | null
  km_actual: number | null; km_proxima_revision: number | null; itv_fecha: string | null; seguro_fecha_vencimiento: string | null
}

export async function getConductor(id: string): Promise<Conductor | null> {
  const { data } = await supabase.from('conductores')
    .select('id, nombre, apellidos, fecha_alta, tipo_contrato, dias_vacaciones_anuales, carnet_caducidad').eq('id', id).maybeSingle()
  return (data as Conductor) ?? null
}

export async function getFurgonetaDe(conductorId: string): Promise<Furgoneta | null> {
  const { data } = await supabase.from('furgonetas')
    .select('id, codigo, matricula, modelo, ruta, km_actual, km_proxima_revision, itv_fecha, seguro_fecha_vencimiento')
    .eq('conductor_id', conductorId).neq('activa', false).limit(1)
  return ((data ?? [])[0] as Furgoneta) ?? null
}

export async function getConductoresActivos(): Promise<{ id: string; nombre: string }[]> {
  const { data } = await supabase.from('conductores').select('id, nombre').eq('activo', true).order('nombre')
  return (data ?? []) as { id: string; nombre: string }[]
}

/* ── Entregas (liquidaciones de Cade) ─────────────────────── */
export interface EntregaDia { fecha: string; entregas: number; kilos: number; incidencias: number }

/** Códigos de transportista de Cade del repartidor (por nombre, cualquier vigencia). */
async function codigosDe(nombre: string): Promise<string[]> {
  const { data } = await supabase.from('emisores_transportistas').select('transportista, repartidor')
  return Array.from(new Set(((data ?? []) as { transportista: string; repartidor: string | null }[])
    .filter((r) => (r.repartidor ?? '').toLowerCase() === nombre.toLowerCase()).map((r) => r.transportista)))
}

export async function entregasPorDia(nombre: string, desde: string, hasta: string): Promise<EntregaDia[]> {
  const codigos = await codigosDe(nombre)
  if (codigos.length === 0) return []
  const filas: { fecha: string; kilos: number | null; importe: number | null; ref_cliente: string | null }[] = []
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from('liquidaciones_cade_entregas')
      .select('fecha, kilos, importe, ref_cliente').in('transportista', codigos)
      .gte('fecha', desde).lte('fecha', hasta).order('fecha').range(from, from + 999)
    const lote = (data ?? []) as typeof filas
    filas.push(...lote)
    if (lote.length < 1000) break
  }
  const mapa = new Map<string, EntregaDia>()
  for (const f of filas) {
    const d = mapa.get(f.fecha) ?? { fecha: f.fecha, entregas: 0, kilos: 0, incidencias: 0 }
    if ((f.importe ?? 0) < 0 && !f.ref_cliente) d.incidencias += 1
    else { d.entregas += 1; d.kilos += Number(f.kilos ?? 0) }
    mapa.set(f.fecha, d)
  }
  return Array.from(mapa.values()).sort((a, b) => a.fecha.localeCompare(b.fecha))
}

/** Última fecha con entregas cargadas para el repartidor (las liquidaciones llegan por meses). */
export async function ultimaFechaEntregas(nombre: string): Promise<string | null> {
  const codigos = await codigosDe(nombre)
  if (codigos.length === 0) return null
  const { data } = await supabase.from('liquidaciones_cade_entregas').select('fecha')
    .in('transportista', codigos).order('fecha', { ascending: false }).limit(1)
  return ((data ?? [])[0] as { fecha: string } | undefined)?.fecha ?? null
}

/* ── Kilómetros ───────────────────────────────────────────── */
export interface Lectura {
  id: string; conductor_id: string | null; furgoneta_id: string; fecha: string
  momento: 'inicio_semana' | 'fin_semana' | 'suelto'; km_leido: number; foto_url: string | null
  estado: 'ok' | 'revisar'; nota: string | null; created_at: string
}

export async function lecturasDe(furgonetaId: string, limite = 30): Promise<Lectura[]> {
  const { data } = await supabase.from('kilometros').select('*').eq('furgoneta_id', furgonetaId)
    .order('fecha', { ascending: false }).order('created_at', { ascending: false }).limit(limite)
  return (data ?? []) as Lectura[]
}

/** ¿Falta apuntar km esta semana? Lunes o después sin lectura desde el lunes → sí. */
export function faltaKmSemana(lecturas: Lectura[]): boolean {
  const lunes = ymd(lunesDe(new Date()))
  return !lecturas.some((l) => l.fecha >= lunes)
}

export async function subirFoto(carpeta: string, archivo: File): Promise<string | null> {
  const ext = (archivo.name.split('.').pop() || 'jpg').toLowerCase()
  const ruta = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('portal-fotos').upload(ruta, archivo, { contentType: archivo.type || 'image/jpeg' })
  if (error) return null
  return supabase.storage.from('portal-fotos').getPublicUrl(ruta).data.publicUrl
}

export async function guardarLectura(l: {
  conductor_id: string | null; furgoneta_id: string; momento: Lectura['momento']; km_leido: number; foto_url: string | null; nota?: string
}): Promise<{ ok: boolean; revisar: boolean }> {
  const { data, error } = await supabase.from('kilometros').insert({ ...l, fecha: ymd(new Date()) }).select('id').single()
  if (error || !data) return { ok: false, revisar: false }
  const { data: fila } = await supabase.from('kilometros').select('estado').eq('id', (data as { id: string }).id).single()
  return { ok: true, revisar: (fila as { estado: string } | null)?.estado === 'revisar' }
}

/* ── Permisos (vacaciones) ────────────────────────────────── */
export interface Solicitud {
  id: string; conductor_id: string; tipo: string; fecha_inicio: string; fecha_fin: string
  nota: string | null; estado: 'pendiente' | 'aprobado' | 'rechazado'; respuesta: string | null; created_at: string
}

export const TIPOS_PERMISO: Record<string, string> = {
  vacaciones: 'Vacaciones', asuntos_propios: 'Asuntos propios', baja_medica: 'Baja médica', otro: 'Otro',
}

export const diasPeriodo = (ini: string, fin: string) => {
  const d = Math.round((new Date(fin + 'T12:00:00').getTime() - new Date(ini + 'T12:00:00').getTime()) / 86400000) + 1
  return d > 0 ? d : 0
}

/* ── Incentivos ───────────────────────────────────────────── */
export interface ReglaIncentivo {
  id: string; conductor_id: string | null; nombre: string
  tipo: 'entregas_mes' | 'km_apuntados' | 'sin_incidencias'; umbral: number; premio_eur: number; activa: boolean
}

export interface EstadoIncentivo { regla: ReglaIncentivo; actual: number; objetivo: number; conseguido: boolean; texto: string }

export async function calcularIncentivos(conductorId: string, nombre: string, furgonetaId: string | null): Promise<EstadoIncentivo[]> {
  const { data } = await supabase.from('incentivos_reglas').select('*').eq('activa', true)
  const reglas = ((data ?? []) as ReglaIncentivo[]).filter((r) => !r.conductor_id || r.conductor_id === conductorId)
  if (reglas.length === 0) return []

  const hoy = new Date()
  const ini = ymd(new Date(hoy.getFullYear(), hoy.getMonth(), 1))
  const fin = ymd(hoy)

  const [entregas, lecturas, incid] = await Promise.all([
    reglas.some((r) => r.tipo === 'entregas_mes') ? entregasPorDia(nombre, ini, fin) : Promise.resolve([] as EntregaDia[]),
    furgonetaId ? supabase.from('kilometros').select('fecha').eq('furgoneta_id', furgonetaId).gte('fecha', ini) : Promise.resolve({ data: [] }),
    supabase.from('furgonetas_incidencias').select('id').eq('conductor_id', conductorId).gte('fecha', ini),
  ])

  const totalEntregas = entregas.reduce((s, d) => s + d.entregas, 0)
  const lunesConKm = new Set(((lecturas.data ?? []) as { fecha: string }[]).map((l) => ymd(lunesDe(new Date(l.fecha + 'T12:00:00')))))
  const semanasMes: string[] = []
  for (let d = lunesDe(new Date(ini + 'T12:00:00')); d <= hoy; d.setDate(d.getDate() + 7)) {
    if (ymd(d) >= ymd(lunesDe(new Date(ini + 'T12:00:00')))) semanasMes.push(ymd(d))
  }
  const semanasConKm = semanasMes.filter((s) => lunesConKm.has(s)).length
  const numIncid = (incid.data ?? []).length

  return reglas.map((r) => {
    if (r.tipo === 'entregas_mes') {
      const ok = totalEntregas >= r.umbral
      return { regla: r, actual: totalEntregas, objetivo: r.umbral, conseguido: ok,
        texto: ok ? 'Conseguido' : `Te faltan ${Math.max(0, r.umbral - totalEntregas)} entregas` }
    }
    if (r.tipo === 'km_apuntados') {
      const ok = semanasMes.length > 0 && semanasConKm === semanasMes.length
      return { regla: r, actual: semanasConKm, objetivo: semanasMes.length, conseguido: ok,
        texto: ok ? 'Vas perfecto: todas las semanas apuntadas' : `Llevas ${semanasConKm} de ${semanasMes.length} semanas apuntadas` }
    }
    const ok = numIncid === 0
    return { regla: r, actual: numIncid, objetivo: 0, conseguido: ok,
      texto: ok ? 'Ningún daño ni multa este mes' : `${numIncid} incidencia${numIncid > 1 ? 's' : ''} este mes` }
  })
}

/* ── Acuerdos, carpeta y avisos ───────────────────────────── */
export interface Acuerdo { id: string; conductor_id: string; titulo: string; texto: string | null; pdf_url: string | null; fecha: string; aceptado_at: string | null }
export interface Documento { id: string; conductor_id: string; tipo: string; nombre: string; url: string | null; fecha: string | null }
export interface Aviso { id: string; conductor_id: string | null; texto: string; leido_por: string[]; created_at: string }

export async function avisosDe(conductorId: string): Promise<Aviso[]> {
  const { data } = await supabase.from('avisos_portal').select('*')
    .or(`conductor_id.is.null,conductor_id.eq.${conductorId}`).order('created_at', { ascending: false }).limit(50)
  return (data ?? []) as Aviso[]
}

export async function marcarLeido(avisoId: string, conductorId: string) {
  return supabase.rpc('marcar_aviso_leido', { p_aviso: avisoId, p_conductor: conductorId })
}
