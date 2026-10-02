import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'
import { leerUltimoAcceso, metodosDisponibles, entrarConPin, crearPin } from '@/lib/accesoRapido'
import type { Metodos } from '@/lib/accesoRapido'
import { huellaDisponible, registrarHuella, entrarConHuella } from '@/lib/passkey'
import { INK, MARINO, ARENA, BLANCO, TERRA, NARANJA, CELESTE, AMBAR, OLIVA, OSW, LEX, SHADOW, BORDER_CARD } from '@/styles/neobrutal'

const labelStyle: CSSProperties = {
  fontFamily: OSW, fontSize: 12, fontWeight: 600, letterSpacing: 2,
  textTransform: 'uppercase', color: INK, marginBottom: 6, display: 'block',
}

const inputStyle: CSSProperties = {
  fontFamily: LEX, fontSize: 14, fontWeight: 600,
  backgroundColor: BLANCO, color: INK,
  border: `2px dashed ${CELESTE}`,
  borderRadius: 0, padding: '11px 12px', outline: 'none',
  width: '100%', boxSizing: 'border-box',
}

const pinInputStyle: CSSProperties = {
  ...inputStyle,
  fontFamily: OSW, fontSize: 24, fontWeight: 700,
  textAlign: 'center', letterSpacing: '14px', paddingLeft: 14, paddingRight: 0,
}

const enlaceStyle: CSSProperties = {
  background: 'none', border: 'none', color: INK, fontFamily: OSW, fontSize: 12, fontWeight: 600,
  letterSpacing: 1.5, textTransform: 'uppercase', textDecoration: 'underline', cursor: 'pointer',
}

function botonStyle(bg: string, color: string, deshabilitado = false): CSSProperties {
  return {
    fontFamily: OSW, fontSize: 16, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
    background: bg, color, border: `3px solid ${INK}`, boxShadow: SHADOW,
    borderRadius: 0, padding: '13px 0', width: '100%',
    cursor: deshabilitado ? 'not-allowed' : 'pointer', opacity: deshabilitado ? 0.6 : 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  }
}

function Caja({ msg, bg = TERRA }: { msg: string; bg?: string }) {
  return (
    <div style={{
      background: bg, color: ARENA, border: BORDER_CARD,
      fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 1,
      textTransform: 'uppercase', textAlign: 'center', padding: '8px 10px',
    }}>{msg}</div>
  )
}

function Titulo({ children }: { children: ReactNode }) {
  return <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 18, textTransform: 'uppercase', color: INK, textAlign: 'center' }}>{children}</div>
}

const soloCifras = (v: string) => v.replace(/\D/g, '').slice(0, 4)

/* PIN de 4 cifras (y huella si este dispositivo la tiene) para un usuario ya conocido */
function EntradaPin({ email, nombre, huella, onOtraCuenta, textoOtra }: {
  email: string; nombre: string; huella: boolean; onOtraCuenta: () => void; textoOtra: string
}) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length !== 4) { setError('El PIN tiene 4 cifras'); return }
    setCargando(true); setError('')
    const err = await entrarConPin(email, pin)
    if (err) { setError(err); setPin('') }
    setCargando(false)
  }

  async function huellaClick() {
    setCargando(true); setError('')
    const err = await entrarConHuella(email)
    if (err) setError(err)
    setCargando(false)
  }

  return (
    <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Titulo>Hola, {nombre}</Titulo>
      <div>
        <label style={labelStyle} htmlFor="login-pin">PIN de este dispositivo</label>
        <input
          id="login-pin" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4}
          autoComplete="current-password" autoFocus value={pin}
          onChange={e => setPin(soloCifras(e.target.value))} style={pinInputStyle}
        />
      </div>
      {error && <Caja msg={error} />}
      <button type="submit" disabled={cargando} style={botonStyle(NARANJA, ARENA, cargando)}>
        {cargando ? 'Entrando…' : 'Entrar →'}
      </button>
      {huella && (
        <button type="button" onClick={huellaClick} disabled={cargando} style={botonStyle(BLANCO, INK, cargando)}>
          Entrar con huella
        </button>
      )}
      <button type="button" onClick={onOtraCuenta} style={enlaceStyle}>{textoOtra}</button>
    </form>
  )
}

/* Primera entrada en el dispositivo: Google o enlace mágico por email */
function EntradaNueva({ onPin, nombrePin }: { onPin?: () => void; nombrePin?: string }) {
  const { loginGoogle, enviarEnlace } = useAuth()
  const [verEnlace, setVerEnlace] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [cargando, setCargando] = useState(false)

  async function pedirEnlace(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true); setError('')
    const err = await enviarEnlace(email)
    if (err) setError(err)
    else setEnviado(true)
    setCargando(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <button type="button" onClick={loginGoogle} style={botonStyle(BLANCO, INK)}>
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
        </svg>
        Entrar con Google
      </button>

      {!verEnlace ? (
        <button type="button" onClick={() => setVerEnlace(true)} style={botonStyle(ARENA, INK)}>
          Recibir enlace por email
        </button>
      ) : enviado ? (
        <Caja msg={`Enlace enviado a ${email.trim()}. Ábrelo en este dispositivo.`} bg={OLIVA} />
      ) : (
        <form onSubmit={pedirEnlace} style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: `2px dashed ${INK}`, paddingTop: 18 }}>
          <div>
            <label style={labelStyle} htmlFor="login-email">Tu correo</label>
            <input id="login-email" type="email" autoComplete="email" autoFocus required value={email}
              onChange={e => setEmail(e.target.value)} style={inputStyle} />
          </div>
          {error && <Caja msg={error} />}
          <button type="submit" disabled={cargando} style={botonStyle(NARANJA, ARENA, cargando)}>
            {cargando ? 'Enviando…' : 'Enviar enlace →'}
          </button>
        </form>
      )}

      {onPin && nombrePin && (
        <button type="button" onClick={onPin} style={enlaceStyle}>Entrar con PIN de {nombrePin}</button>
      )}
    </div>
  )
}

/* Tras la primera entrada: crear PIN y, si el móvil lo permite, registrar huella */
function CrearPin() {
  const { pendiente, pinCreado, logout } = useAuth()
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [ofrecerHuella, setOfrecerHuella] = useState(false)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length !== 4) { setError('El PIN tiene 4 cifras'); return }
    if (pin !== pin2) { setError('Los dos PIN no coinciden'); return }
    setCargando(true); setError('')
    const err = await crearPin(pin)
    setCargando(false)
    if (err) { setError(err); return }
    if (await huellaDisponible()) setOfrecerHuella(true)
    else pinCreado()
  }

  async function huella() {
    if (!pendiente) return
    setCargando(true); setError('')
    const err = await registrarHuella(pendiente.email, pendiente.nombre)
    setCargando(false)
    if (err) { setError(err); return }
    pinCreado()
  }

  if (ofrecerHuella) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Titulo>¿Entrar con huella?</Titulo>
        <div style={{ fontFamily: LEX, fontSize: 14, color: INK, textAlign: 'center' }}>
          La próxima vez podrás entrar en este dispositivo con la huella o la cara.
        </div>
        {error && <Caja msg={error} />}
        <button type="button" onClick={huella} disabled={cargando} style={botonStyle(NARANJA, ARENA, cargando)}>
          {cargando ? 'Registrando…' : 'Activar huella'}
        </button>
        <button type="button" onClick={pinCreado} style={enlaceStyle}>Ahora no</button>
      </div>
    )
  }

  return (
    <form onSubmit={guardar} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Titulo>Crea tu PIN, {pendiente?.nombre}</Titulo>
      <div style={{ fontFamily: LEX, fontSize: 14, color: INK, textAlign: 'center' }}>
        4 cifras para entrar en este dispositivo sin volver a Google.
      </div>
      <div>
        <label style={labelStyle} htmlFor="pin-nuevo">PIN</label>
        <input id="pin-nuevo" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} autoFocus
          autoComplete="new-password" value={pin} onChange={e => setPin(soloCifras(e.target.value))} style={pinInputStyle} />
      </div>
      <div>
        <label style={labelStyle} htmlFor="pin-repetir">Repite el PIN</label>
        <input id="pin-repetir" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4}
          autoComplete="new-password" value={pin2} onChange={e => setPin2(soloCifras(e.target.value))} style={pinInputStyle} />
      </div>
      {error && <Caja msg={error} />}
      <button type="submit" disabled={cargando} style={botonStyle(NARANJA, ARENA, cargando)}>
        {cargando ? 'Guardando…' : 'Guardar PIN →'}
      </button>
      <button type="button" onClick={logout} style={enlaceStyle}>Salir</button>
    </form>
  )
}

export default function Login() {
  const { estado, pendiente, error, logout } = useAuth()
  const ultimo = leerUltimoAcceso()
  const [metodos, setMetodos] = useState<Metodos | null>(null)
  const [otraCuenta, setOtraCuenta] = useState(false)

  const emailConocido = estado === 'bloqueado' ? pendiente?.email : estado === 'fuera' ? ultimo?.email : undefined
  useEffect(() => {
    if (!emailConocido) return
    let vivo = true
    metodosDisponibles(emailConocido).then(m => { if (vivo) setMetodos(m) })
    return () => { vivo = false }
  }, [emailConocido])

  let contenido: ReactNode
  if (estado === 'cargando') {
    contenido = <Titulo>Comprobando acceso…</Titulo>
  } else if (estado === 'crear-pin') {
    contenido = <CrearPin />
  } else if (estado === 'bloqueado' && pendiente) {
    contenido = <EntradaPin email={pendiente.email} nombre={pendiente.nombre} huella={!!metodos?.huella}
      onOtraCuenta={logout} textoOtra="Salir y entrar con otra cuenta" />
  } else if (ultimo && metodos?.pin && !otraCuenta) {
    contenido = <EntradaPin email={ultimo.email} nombre={ultimo.nombre} huella={metodos.huella}
      onOtraCuenta={() => setOtraCuenta(true)} textoOtra="Entrar con Google o enlace" />
  } else {
    contenido = <EntradaNueva
      onPin={ultimo && metodos?.pin ? () => setOtraCuenta(false) : undefined}
      nombrePin={ultimo?.nombre} />
  }

  return (
    <div style={{ minHeight: '100vh', background: MARINO, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: LEX }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{
          background: ARENA, border: `4px solid ${INK}`, boxShadow: `8px 8px 0 ${INK}`,
          borderRadius: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ background: AMBAR, borderBottom: `4px solid ${INK}`, padding: '22px 24px', textAlign: 'center' }}>
            <img src="/logo-davidreparte.svg" alt="David Reparte" style={{ height: 84, width: 'auto', display: 'inline-block' }} />
            <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 22, letterSpacing: '-0.5px', textTransform: 'uppercase', color: INK, marginTop: 10 }}>
              David Reparte
            </div>
            <div style={{ fontFamily: OSW, fontWeight: 600, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: INK, marginTop: 2 }}>
              Alcoi · Ontinyent
            </div>
          </div>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {error && estado === 'fuera' && <Caja msg={error} />}
            {contenido}
          </div>
        </div>
      </div>
    </div>
  )
}
