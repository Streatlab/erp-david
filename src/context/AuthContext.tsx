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

  /* El PIN se verifica en el servidor (función login_pin). La web ya no puede
     leer la tabla de usuarios ni ningún PIN: solo recibe nombre + perfil si acierta. */
  async function login(nombre: string, pin: string): Promise<string | null> {
    const { supabase } = await import('@/lib/supabase')

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
