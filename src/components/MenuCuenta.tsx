/**
 * Menú de la cuenta (círculo con las iniciales, arriba a la derecha).
 * Igual que Binagre: quién está dentro, rol, último acceso, PIN y huella de este
 * aparato, cambiar de ERP, cambiar de cuenta y cerrar sesión (aquí o en todos).
 */
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useAuth } from '@/context/AuthContext'
import { otrosErpsPara } from '@/lib/otrosErps'
import { supabase } from '@/lib/supabase'
import { crearPin, leerAccesos, metodosDisponibles, priorizarAcceso } from '@/lib/accesoRapido'
import { huellaDisponible, registrarHuella } from '@/lib/passkey'
import { toast } from '@/lib/toastStore'
import { OSW, INK, MARINO, ARENA, BLANCO, AMBAR } from '@/styles/neobrutal'

/** "RM" a partir de "Rubén Martínez"; sin nombre, un punto. */
export function iniciales(nombre?: string | null): string {
  if (!nombre) return '·'
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '·'
  return (partes[0][0] + (partes[1]?.[0] ?? '')).toUpperCase()
}

const ROL: Record<string, string> = { admin: 'Administrador' }

/** "hoy, 09:41" · "ayer, 22:10" · "28 sep, 22:10" — en hora de Madrid. */
function textoUltimoAcceso(iso?: string | null, ahora = new Date()): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const dia = (x: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid' }).format(x)
  const hora = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' }).format(d)
  if (dia(d) === dia(ahora)) return `hoy, ${hora}`
  if (dia(d) === dia(new Date(ahora.getTime() - 86400000))) return `ayer, ${hora}`
  const fecha = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'short' }).format(d).replace('.', '')
  return `${fecha}, ${hora}`
}

interface EstadoAparato { pin: boolean | null; huella: boolean | null; huellaSoportada: boolean }

export default function MenuCuenta() {
  const { usuario, logout } = useAuth()
  const [abierto, setAbierto] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [ultimo, setUltimo] = useState<string | null>(null)
  const [aparato, setAparato] = useState<EstadoAparato>({ pin: null, huella: null, huellaSoportada: false })
  const caja = useRef<HTMLDivElement>(null)

  const email = usuario?.email ?? ''

  async function cargarAparato() {
    if (!email) return
    const [m, soportada, ses] = await Promise.all([
      metodosDisponibles(email),
      huellaDisponible(),
      supabase.auth.getSession(),
    ])
    setAparato({ pin: m.pin, huella: m.huella, huellaSoportada: soportada })
    setUltimo(ses.data.session?.user?.last_sign_in_at ?? null)
  }

  useEffect(() => { if (abierto) void cargarAparato() }, [abierto]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => { if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc) }
  }, [abierto])

  if (!usuario) return null
  const otrosErps = otrosErpsPara(email)
  const otras = leerAccesos().filter(a => a.email.toLowerCase() !== email.toLowerCase())

  /** Cambio rápido: cierra esta sesión y deja el login con esa cuenta elegida, listo para el PIN. */
  function cambiarA(correo: string) {
    priorizarAcceso(correo)
    setAbierto(false)
    logout()
  }

  async function cambiarPin() {
    const nuevo = window.prompt(`${aparato.pin ? 'Cambiar PIN' : 'Crear PIN'}: cuatro cifras. Vale en cualquier aparato.`)
    if (nuevo === null) return
    const limpio = nuevo.trim()
    if (!/^[0-9]{4}$/.test(limpio)) { toast.error('El PIN son 4 cifras.'); return }
    setOcupado(true)
    const error = await crearPin(limpio)
    setOcupado(false)
    if (error) { toast.error(error); return }
    toast.success('PIN guardado.')
    void cargarAparato()
  }

  async function activarHuella() {
    setOcupado(true)
    const error = await registrarHuella(email, usuario!.nombre)
    setOcupado(false)
    if (error) { toast.error(error); return }
    toast.success('Huella activada en este aparato.')
    void cargarAparato()
  }

  async function cerrarTodos() {
    if (!window.confirm('¿Cerrar sesión en todos los aparatos? Tendrás que volver a entrar en cada móvil y ordenador.')) return
    await supabase.auth.signOut({ scope: 'global' }).catch(() => {})
    setAbierto(false)
    logout()
  }

  const etiqueta: CSSProperties = { fontFamily: OSW, textTransform: 'uppercase', fontSize: 12, letterSpacing: '0.04em', opacity: 0.7 }
  const boton: CSSProperties = {
    fontFamily: OSW, fontWeight: 700, textTransform: 'uppercase', fontSize: 14, letterSpacing: '0.04em',
    textDecoration: 'none', color: INK, background: AMBAR, border: `2px solid ${INK}`, padding: '8px 12px',
    cursor: 'pointer', textAlign: 'left',
  }
  const fila: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }

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
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 60, width: 290,
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
              <span style={{ fontSize: 12, opacity: 0.7, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={email}>{email}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={fila}><span style={etiqueta}>Rol</span><span style={{ fontSize: 13 }}>{ROL[usuario.perfil] ?? usuario.perfil}</span></div>
            <div style={fila}><span style={etiqueta}>Último acceso</span><span style={{ fontSize: 13 }}>{textoUltimoAcceso(ultimo)}</span></div>
            <div style={fila}>
              <span style={etiqueta}>PIN</span>
              <span style={{ fontSize: 13, fontWeight: aparato.pin ? 700 : 400 }}>{aparato.pin === null ? '…' : aparato.pin ? 'Activo' : 'Sin crear'}</span>
            </div>
            <div style={fila}>
              <span style={etiqueta}>Huella en este aparato</span>
              <span style={{ fontSize: 13, fontWeight: aparato.huella ? 700 : 400 }}>
                {aparato.huella === null ? '…' : aparato.huella ? 'Activa' : aparato.huellaSoportada ? 'Sin activar' : 'No disponible'}
              </span>
            </div>
          </div>

          {otrosErps.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={etiqueta}>Cambiar de ERP</span>
              {otrosErps.map(e => (
                <a key={e.id} href={e.url} style={boton}>{e.nombre}</a>
              ))}
            </div>
          )}

          {otras.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={etiqueta}>Cambiar de cuenta</span>
              {otras.map(a => (
                <button key={a.email} type="button" title={a.email} onClick={() => cambiarA(a.email)} style={{ ...boton, background: ARENA, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', background: MARINO, color: ARENA, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {iniciales(a.nombre || a.email)}
                  </span>
                  <span>{(a.nombre || a.email).split(' ')[0]}</span>
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button type="button" style={boton} disabled={ocupado} onClick={() => void cambiarPin()}>
              {aparato.pin ? 'Cambiar PIN' : 'Crear PIN'}
            </button>
            {aparato.huellaSoportada && aparato.huella === false && (
              <button type="button" style={boton} disabled={ocupado} onClick={() => void activarHuella()}>
                Activar huella
              </button>
            )}
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
