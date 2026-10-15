/**
 * EstrellaPantalla.tsx — Interruptor ★ de la pantalla actual (barra superior). Marca o desmarca la pantalla
 * como favorita; las favoritas salen arriba del menú lateral junto a las más usadas.
 */
import { useLocation } from 'react-router-dom'
import { Star } from 'lucide-react'
import { useFavoritos } from '@/lib/favoritos'
import { AMBAR, ARENA } from '@/styles/neobrutal'

export default function EstrellaPantalla() {
  const { pathname } = useLocation()
  const fav = useFavoritos()
  if (!fav) return null
  const on = fav.esFavorito(pathname)
  return (
    <button type="button" aria-pressed={on} onClick={() => { void fav.alternar(pathname) }}
      aria-label={on ? 'Quitar de favoritos' : 'Añadir a favoritos'} title={on ? 'Quitar de favoritos' : 'Añadir a favoritos'}
      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 36, minHeight: 36 }}>
      <Star size={22} strokeWidth={2.2} color={on ? AMBAR : ARENA} fill={on ? AMBAR : 'none'} />
    </button>
  )
}
