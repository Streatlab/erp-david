/**
 * favoritos.tsx — Pantallas favoritas de cada usuario.
 * Se marcan con la estrella de la cabecera y aparecen arriba del menú lateral.
 * Se guardan en Supabase (favoritos_usuario), así siguen al usuario en cualquier dispositivo.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

interface Ctx {
  favoritos: string[]
  esFavorito: (path: string) => boolean
  alternar: (path: string) => Promise<void>
}

const FavCtx = createContext<Ctx | null>(null)

export function FavoritosProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  const [favoritos, setFavoritos] = useState<string[]>([])

  useEffect(() => {
    if (!usuario) { setFavoritos([]); return }
    supabase.from('favoritos_usuario').select('path').eq('usuario_id', usuario.id).order('orden').order('created_at')
      .then(({ data }) => setFavoritos(((data ?? []) as { path: string }[]).map(r => r.path)))
  }, [usuario])

  const alternar = useCallback(async (path: string) => {
    if (!usuario) return
    if (favoritos.includes(path)) {
      setFavoritos(f => f.filter(p => p !== path))
      const { error } = await supabase.from('favoritos_usuario').delete().eq('usuario_id', usuario.id).eq('path', path)
      if (error) setFavoritos(f => [...f, path])
    } else {
      setFavoritos(f => [...f, path])
      const { error } = await supabase.from('favoritos_usuario').insert({ usuario_id: usuario.id, path, orden: favoritos.length })
      if (error) setFavoritos(f => f.filter(p => p !== path))
    }
  }, [usuario, favoritos])

  const valor = useMemo<Ctx>(() => ({ favoritos, esFavorito: p => favoritos.includes(p), alternar }), [favoritos, alternar])
  return <FavCtx.Provider value={valor}>{children}</FavCtx.Provider>
}

/* Devuelve null fuera del ERP (portal de empleados), donde no hay favoritos */
export function useFavoritos(): Ctx | null {
  return useContext(FavCtx)
}
