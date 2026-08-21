import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

interface Usuario {
  nombre: string
  perfil: 'admin' | 'cocina'
  rol?: 'admin' | 'cocina' | null
}

interface AuthContextType {
  usuario: Usuario | null
  login: (nombre: string, pin: string) => Promise<string | null>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const saved = localStorage.getItem('david_user')
    return saved ? JSON.parse(saved) : null
  })

  useEffect(() => {
    if (usuario) {
      localStorage.setItem('david_user', JSON.stringify(usuario))
    } else {
      localStorage.removeItem('david_user')
      localStorage.removeItem('streatlab_user')
    }
  }, [usuario])

  async function login(nombre: string, pin: string): Promise<string | null> {
    const { supabase } = await import('@/lib/supabase')

    const { data, error } = await supabase
      .from('usuarios')
      .select('nombre, perfil, pin')
      .eq('nombre', nombre)
      .maybeSingle()

    if (error || !data) return 'Usuario o PIN incorrecto'
    if (String(data.pin) !== String(pin)) return 'Usuario o PIN incorrecto'

    setUsuario({ nombre: data.nombre, perfil: data.perfil })
    return null
  }

  function logout() {
    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
