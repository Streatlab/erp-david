/**
 * Menú de la cuenta (círculo con las iniciales, arriba a la derecha).
 * Mismo esquema que Binagre: quién está dentro, cambiar de ERP y cerrar sesión.
 */
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { otrosErpsPara } from '@/lib/otrosErps'
import { supabase } from '@/lib/supabase'
import { OSW, INK, MARINO, ARENA, BLANCO, AMBAR } from '@/styles/neobrutal'

/** "RM" a partir de "Rubén Martínez"; sin nombre, un punto. */
export function iniciales(nombre?: string | null): string {
  if (!nombre) return '·'
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '·'
  return (partes[0][0] + (partes[1]?.[0] ?? '')).toUpperCase()
}

const ROL: Record<string, string> = { admin: 'Administrador' }

export default function MenuCuenta() {
  const { usuario, logout } = useAuth()
  const [abierto, setAbierto] = useState(false)
  const caja = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => { if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc) }
  }, [abierto])

  if (!usuario) return null
  const otrosErps = otrosErpsPara(usuario.email)

  async function cerrarTodos() {
    if (!window.confirm('¿Cerrar sesión en todos los aparatos?')) return
    await supabase.auth.signOut({ scope: 'global' }).catch(() => {})
    setAbierto(false)
    logout()
  }

  const etiqueta: React.CSSProperties = { fontFamily: OSW, textTransform: 'uppercase', fontSize: 12, letterSpacing: '0.04em', opacity: 0.7 }
  const boton: React.CSSProperties = {
    fontFamily: OSW, fontWeight: 700, textTransform: 'uppercase', fontSize: 14, letterSpacing: '0.04em',
    textDecoration: 'none', color: INK, background: AMBAR, border: `2px solid ${INK}`, padding: '8px 12px',
    cursor: 'pointer', textAlign: 'left',
  }

  return (
    <div ref={caja} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setAbierto(a => !a)}
        aria-label="Mi cuenta"
        aria-expanded={abierto}
        title={usuario.nombre}
        style={{
          width: 38, height: 38, borderRadius: '50%', background: AMBAR, color: INK,
          border: `3px solid ${INK}`, fontFamily: OSW, fontWeight: 800, fontSize: 15, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {iniciales(usuario.nombre)}
      </button>

      {abierto && (
        <div
          role="dialog"
          aria-label="Mi cuenta"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 60, width: 270,
            background: BLANCO, color: INK, border: `3px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}`,
            padding: 14, display: 'flex', flexDirection: 'column', gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 40, height: 40, borderRadius: '50%', background: MARINO, color: ARENA, fontFamily: OSW, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {iniciales(usuario.nombre)}
            </span>
            <div style={{ minWidth: 0 }}>
              <b style={{ display: 'block', fontFamily: OSW, textTransform: 'uppercase' }}>{usuario.nombre}</b>
              <span style={{ fontSize: 12, opacity: 0.7, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={usuario.email}>{usuario.email}</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={etiqueta}>Rol</span>
            <span style={{ fontSize: 13 }}>{ROL[usuario.perfil] ?? usuario.perfil}</span>
          </div>

          {otrosErps.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={etiqueta}>Cambiar de ERP</span>
              {otrosErps.map(e => (
                <a key={e.id} href={e.url} style={boton}>{e.nombre}</a>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button type="button" style={{ ...boton, background: ARENA }} onClick={() => { setAbierto(false); logout() }}>
              Cerrar sesión
            </button>
            <button type="button" onClick={() => void cerrarTodos()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, textDecoration: 'underline', color: INK, textAlign: 'left', padding: 0 }}>
              Cerrar sesión en todos los aparatos
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
