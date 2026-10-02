import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

interface Usuario {
  nombre: string
  perfil: 'admin' | 'cocina'
  rol?: 'admin' | 'cocina' | null
}

interface AuthContextType {
  usuario: Usuario | null
  login: (nombre: string, pin: string) => Promise<string | null>
  loginGoogle: () => Promise<void>
  logout: () => void
  errorGoogle: string | null
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const saved = localStorage.getItem('david_user')
    return saved ? JSON.parse(saved) : null
  })
  const [errorGoogle, setErrorGoogle] = useState<string | null>(null)

  useEffect(() => {
    if (usuario) {
      localStorage.setItem('david_user', JSON.stringify(usuario))
    } else {
      localStorage.removeItem('david_user')
      localStorage.removeItem('streatlab_user')
    }
  }, [usuario])

  /* Vuelta de Google: si hay sesión de Supabase, se resuelve el perfil por email.
     Solo entran los emails dados de alta en usuarios; el resto se desconecta. */
  useEffect(() => {
    async function resolver(email: string | undefined | null) {
      if (!email) return
      const { data, error } = await supabase.rpc('login_google', { p_email: email })
      const fila = Array.isArray(data) ? data[0] : data
      if (error || !fila) {
        await supabase.auth.signOut()
        setErrorGoogle(`La cuenta ${email} no tiene acceso a este ERP.`)
        return
      }
      setErrorGoogle(null)
      setUsuario({ nombre: fila.nombre, perfil: fila.perfil })
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.email && !usuario) resolver(data.session.user.email)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session?.user?.email) resolver(session.user.email)
    })
    return () => sub.subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* PIN verificado en el servidor (login_pin). La web no puede leer la tabla de usuarios. */
  async function login(nombre: string, pin: string): Promise<string | null> {
    const { data, error } = await supabase.rpc('login_pin', {
      p_nombre: nombre.trim(),
      p_pin: String(pin).trim(),
    })
    if (error) return 'No se pudo comprobar el acceso. Inténtalo de nuevo.'
    const fila = Array.isArray(data) ? data[0] : data
    if (!fila) return 'Usuario o PIN incorrecto'
    setUsuario({ nombre: fila.nombre, perfil: fila.perfil })
    return null
  }

  async function loginGoogle() {
    setErrorGoogle(null)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  function logout() {
    supabase.auth.signOut().catch(() => {})
    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{ usuario, login, loginGoogle, logout, errorGoogle }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
