/**
 * favoritos.tsx — Favoritos y Más usadas (mismo sistema que el ERP de Streat Lab, adaptado a David).
 *  - ★ en la barra de arriba marca o desmarca la pantalla en la que estás (favoritos_usuario).
 *  - Cada vez que alguien entra en una pantalla se suma 1 en uso_pantallas (persona, pantalla, día de Madrid).
 *  - «Más usadas» = lo que más ha abierto esa persona en los últimos 30 días. Se recalcula solo.
 * Todo vive en el menú lateral: sección Favoritos + Más usadas.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export interface UsoRuta { ruta: string; veces: number }

interface Ctx {
  favoritos: string[]
  esFavorito: (path: string) => boolean
  alternar: (path: string) => Promise<void>
  masUsadas: UsoRuta[]
}

const FavCtx = createContext<Ctx | null>(null)

/* Rutas que no cuentan (pantallas de entrada o de paso) */
const NO_CUENTA = ['/login']
const TTL_USO = 5 * 60_000

export function FavoritosProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  const { pathname } = useLocation()
  const [favoritos, setFavoritos] = useState<string[]>([])
  const [masUsadas, setMasUsadas] = useState<UsoRuta[]>([])

  useEffect(() => {
    if (!usuario) { setFavoritos([]); return }
    supabase.from('favoritos_usuario').select('path').eq('usuario_id', usuario.id).order('orden').order('created_at')
      .then(({ data }) => setFavoritos(((data ?? []) as { path: string }[]).map(r => r.path)))
  }, [usuario])

  /* Suma una visita a la pantalla en la que se entra. Una vez por pantalla cada 30 s, para no inflar el contador. */
  useEffect(() => {
    if (!usuario || NO_CUENTA.some(r => pathname.startsWith(r))) return
    const clave = `david_uso_${pathname}`
    try {
      const ultima = Number(sessionStorage.getItem(clave) ?? 0)
      if (Date.now() - ultima < 30_000) return
      sessionStorage.setItem(clave, String(Date.now()))
    } catch { /* sin almacenamiento: se cuenta igual */ }
    void supabase.rpc('fn_registrar_uso', { p_usuario: usuario.id, p_ruta: pathname }).then(() => {})
  }, [usuario, pathname])

  /* Lo más usado por esta persona en los últimos 30 días. Se refresca cada 5 minutos. */
  useEffect(() => {
    if (!usuario) { setMasUsadas([]); return }
    let vivo = true
    const leer = async () => {
      const d = new Date(); d.setDate(d.getDate() - 30)
      const desde = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const { data, error } = await supabase.from('uso_pantallas').select('ruta, veces').eq('usuario_id', usuario.id).gte('dia', desde).limit(5000)
      if (error || !vivo) return
      const porRuta = new Map<string, number>()
      for (const f of (data ?? []) as UsoRuta[]) porRuta.set(f.ruta, (porRuta.get(f.ruta) ?? 0) + f.veces)
      setMasUsadas([...porRuta.entries()].map(([ruta, veces]) => ({ ruta, veces })).sort((a, b) => b.veces - a.veces))
    }
    void leer()
    const t = window.setInterval(() => { void leer() }, TTL_USO)
    return () => { vivo = false; window.clearInterval(t) }
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

  const valor = useMemo<Ctx>(() => ({ favoritos, esFavorito: p => favoritos.includes(p), alternar, masUsadas }), [favoritos, alternar, masUsadas])
  return <FavCtx.Provider value={valor}>{children}</FavCtx.Provider>
}

/* Devuelve null fuera del ERP (portal de empleados), donde no hay favoritos */
export function useFavoritos(): Ctx | null {
  return useContext(FavCtx)
}
