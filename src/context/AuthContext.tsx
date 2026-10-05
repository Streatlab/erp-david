import { createContext, useContext, useState, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { dispositivoId } from '@/lib/dispositivo'
import {
  guardarUltimoAcceso, estaDesbloqueado, marcarDesbloqueado, borrarDesbloqueo,
  consumirAccesoPendiente, marcarAccesoPendiente, metodosDisponibles,
} from '@/lib/accesoRapido'

export interface Usuario {
  id: number
  nombre: string
  perfil: string
  email: string
}

/* cargando → fuera (pantalla de entrada) → crear-pin (primera vez en el dispositivo)
   → bloqueado (sesión abierta pero sin desbloquear) → dentro */
export type EstadoAcceso = 'cargando' | 'fuera' | 'crear-pin' | 'bloqueado' | 'dentro'

interface AuthContextType {
  usuario: Usuario | null
  estado: EstadoAcceso
  pendiente: Usuario | null
  error: string | null
  loginGoogle: () => Promise<void>
  enviarEnlace: (email: string) => Promise<string | null>
  pinCreado: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const PIN_OK = 'david_pin_ok'
const espera = (ms: number) => new Promise(r => setTimeout(r, ms))

function pinMarcado(email: string) {
  try { return localStorage.getItem(PIN_OK) === `${dispositivoId()}|${email.toLowerCase()}` } catch { return false }
}
function marcarPin(email: string) {
  try { localStorage.setItem(PIN_OK, `${dispositivoId()}|${email.toLowerCase()}`) } catch { /* nada */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoAcceso>('cargando')
  const [pendiente, setPendiente] = useState<Usuario | null>(null)
  const [error, setError] = useState<string | null>(null)
  const resolviendo = useRef<string | null>(null)

  useEffect(() => {
    // Restos del login antiguo nombre+PIN
    try { localStorage.removeItem('david_user'); localStorage.removeItem('streatlab_user') } catch { /* nada */ }

    async function resolver(session: Session, interactivo: boolean) {
      const email = session.user.email
      if (!email) return
      const clave = `${session.access_token}|${interactivo}`
      if (resolviendo.current === clave) return
      resolviendo.current = clave

      // Lista blanca: 3 intentos (500 ms / 1500 ms) antes de echar a nadie por un fallo de red
      let fila: Usuario | null = null
      let fallo = false
      for (const pausa of [0, 500, 1500]) {
        if (pausa) await espera(pausa)
        const { data, error: e } = await supabase.rpc('mi_usuario')
        if (e) { fallo = true; continue }
        fallo = false
        fila = (Array.isArray(data) ? data[0] : data) ?? null
        break
      }
      if (fallo) {
        setError('No se pudo comprobar el acceso. Revisa la conexión y recarga.')
        setEstado('fuera')
        return
      }
      if (!fila) {
        await supabase.auth.signOut()
        borrarDesbloqueo()
        setPendiente(null)
        setError('Este correo no tiene acceso al ERP')
        setEstado('fuera')
        return
      }

      setError(null)
      setPendiente(fila)
      guardarUltimoAcceso({ email: fila.email, nombre: fila.nombre })
      if (interactivo) marcarDesbloqueado(fila.email)

      let tienePin = pinMarcado(fila.email)
      if (!tienePin) {
        const m = await metodosDisponibles(fila.email)
        tienePin = m.pin
        if (tienePin) marcarPin(fila.email)
      }
      if (!estaDesbloqueado(fila.email)) { setEstado(tienePin ? 'bloqueado' : 'fuera'); if (!tienePin) await supabase.auth.signOut(); return }
      setEstado(tienePin ? 'dentro' : 'crear-pin')
    }

    const { data: sub } = supabase.auth.onAuthStateChange((evento, session) => {
      // Diferido: no llamar a Supabase dentro del propio callback
      setTimeout(() => {
        if (evento === 'SIGNED_OUT' || !session) {
          resolviendo.current = null
          setPendiente(null)
          setEstado('fuera')
          return
        }
        if (evento === 'INITIAL_SESSION') resolver(session, consumirAccesoPendiente())
        else if (evento === 'SIGNED_IN') resolver(session, consumirAccesoPendiente())
      }, 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function loginGoogle() {
    setError(null)
    marcarAccesoPendiente()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  async function enviarEnlace(email: string): Promise<string | null> {
    const limpio = email.trim().toLowerCase()
    if (!limpio.includes('@')) return 'Escribe un correo válido'
    const { data: ok, error: e } = await supabase.rpc('email_autorizado', { p_email: limpio })
    if (e) return 'No se pudo comprobar el correo. Inténtalo de nuevo.'
    if (!ok) return 'Este correo no tiene acceso al ERP'
    marcarAccesoPendiente()
    const { error: e2 } = await supabase.auth.signInWithOtp({
      email: limpio,
      options: { emailRedirectTo: window.location.origin, shouldCreateUser: false },
    })
    return e2 ? 'No se pudo enviar el enlace. Inténtalo en un minuto.' : null
  }

  function pinCreado() {
    if (!pendiente) return
    marcarPin(pendiente.email)
    marcarDesbloqueado(pendiente.email)
    setEstado('dentro')
  }

  function logout() {
    borrarDesbloqueo()
    resolviendo.current = null
    setPendiente(null)
    setEstado('fuera')
    supabase.auth.signOut().catch(() => {})
  }

  const usuario = estado === 'dentro' ? pendiente : null

  return (
    <AuthContext.Provider value={{ usuario, estado, pendiente, error, loginGoogle, enviarEnlace, pinCreado, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
