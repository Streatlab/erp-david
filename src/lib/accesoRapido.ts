// Entrada rápida sin sesión: PIN por dispositivo y huella, vía la función Supabase `acceso`.
import { supabase } from '@/lib/supabase'
import { dispositivoId } from '@/lib/dispositivo'

export interface UltimoAcceso { email: string; nombre: string }
export interface Metodos { pin: boolean; huella: boolean; bloqueado_hasta: string | null }

const ULTIMO = 'david_ultimo_acceso'
const ACCESOS = 'david_accesos'
const MAX_ACCESOS = 8
const DESBLOQUEO = 'david_desbloqueo'
const PENDIENTE = 'david_acceso_pendiente'

/** Cuentas que han entrado en este aparato, la más reciente primero (para entrar con un toque). */
export function leerAccesos(): UltimoAcceso[] {
  try {
    const lista = JSON.parse(localStorage.getItem(ACCESOS) || 'null') as UltimoAcceso[] | null
    const v = Array.isArray(lista) ? lista.filter(x => x && typeof x.email === 'string' && x.email) : []
    if (v.length > 0) return v
    const antiguo = JSON.parse(localStorage.getItem(ULTIMO) || 'null') as UltimoAcceso | null
    return antiguo?.email ? [antiguo] : []
  } catch { return [] }
}

function escribirAccesos(lista: UltimoAcceso[]) {
  try { localStorage.setItem(ACCESOS, JSON.stringify(lista.slice(0, MAX_ACCESOS))) } catch { /* sin almacenamiento */ }
}

export function leerUltimoAcceso(): UltimoAcceso | null {
  return leerAccesos()[0] ?? null
}
export function guardarUltimoAcceso(u: UltimoAcceso) {
  const email = u.email.toLowerCase()
  escribirAccesos([{ email, nombre: u.nombre }, ...leerAccesos().filter(x => x.email.toLowerCase() !== email)])
  try { localStorage.setItem(ULTIMO, JSON.stringify({ email, nombre: u.nombre })) } catch { /* sin almacenamiento */ }
}

/** Pone esa cuenta la primera: es la que el login deja elegida al volver. */
export function priorizarAcceso(email: string) {
  const e = email.toLowerCase()
  const lista = leerAccesos()
  const dentro = lista.find(x => x.email.toLowerCase() === e)
  if (!dentro) return
  escribirAccesos([dentro, ...lista.filter(x => x !== dentro)])
  try { localStorage.setItem(ULTIMO, JSON.stringify(dentro)) } catch { /* sin almacenamiento */ }
}

/* Desbloqueo persistente por dispositivo + usuario: F5 y pestaña nueva no piden PIN. */
export function estaDesbloqueado(email: string): boolean {
  try { return localStorage.getItem(DESBLOQUEO) === `${dispositivoId()}|${email.toLowerCase()}` } catch { return false }
}
export function marcarDesbloqueado(email: string) {
  try { localStorage.setItem(DESBLOQUEO, `${dispositivoId()}|${email.toLowerCase()}`) } catch { /* nada */ }
}
export function borrarDesbloqueo() {
  try { localStorage.removeItem(DESBLOQUEO) } catch { /* nada */ }
}

/* Marca que el próximo SIGNED_IN viene de una entrada interactiva (Google, enlace, PIN, huella). */
export function marcarAccesoPendiente() {
  try { localStorage.setItem(PENDIENTE, String(Date.now())) } catch { /* nada */ }
}
export function consumirAccesoPendiente(): boolean {
  try {
    const v = localStorage.getItem(PENDIENTE)
    localStorage.removeItem(PENDIENTE)
    return !!v && Date.now() - Number(v) < 60 * 60 * 1000
  } catch { return false }
}

type Respuesta = { error?: string; bloqueado_hasta?: string | null; restantes?: number; token_hash?: string; email?: string; nombre?: string; reto?: string; credenciales?: string[]; ok?: boolean } & Partial<Metodos>

export async function llamarAcceso(accion: string, datos: Record<string, unknown> = {}): Promise<Respuesta> {
  const { data, error } = await supabase.functions.invoke('acceso', {
    body: { accion, dispositivo: dispositivoId(), ...datos },
  })
  if (error) {
    // Respuestas 4xx traen el motivo en el cuerpo
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.json === 'function') {
      try { return await ctx.json() } catch { /* sin cuerpo */ }
    }
    return { error: 'No se pudo conectar. Inténtalo de nuevo.' }
  }
  return data as Respuesta
}

export async function metodosDisponibles(email: string): Promise<Metodos> {
  const r = await llamarAcceso('metodos', { email })
  return { pin: !!r.pin, huella: !!r.huella, bloqueado_hasta: r.bloqueado_hasta ?? null }
}

/* Canjea el token devuelto por pin-entrar / huella-entrar por una sesión real de Supabase. */
export async function canjearToken(token_hash: string): Promise<string | null> {
  marcarAccesoPendiente()
  const { error } = await supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })
  return error ? 'No se pudo abrir la sesión. Entra con Google o con enlace.' : null
}

export function textoError(r: Respuesta): string {
  if (r.error === 'bloqueado') {
    const h = r.bloqueado_hasta ? new Date(r.bloqueado_hasta).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''
    return `Demasiados intentos. Dispositivo bloqueado${h ? ` hasta las ${h}` : ' 15 minutos'}.`
  }
  if (r.error === 'incorrecto') return `PIN incorrecto. Te quedan ${r.restantes ?? 0} intentos.`
  if (r.error === 'sin_pin') return 'Este dispositivo no tiene PIN. Entra con Google o con enlace.'
  return r.error ?? 'Error desconocido'
}

export async function entrarConPin(email: string, pin: string): Promise<string | null> {
  const r = await llamarAcceso('pin-entrar', { email, pin })
  if (!r.token_hash) return textoError(r)
  return canjearToken(r.token_hash)
}

export async function crearPin(pin: string): Promise<string | null> {
  const r = await llamarAcceso('pin-crear', { pin })
  return r.ok ? null : textoError(r)
}
