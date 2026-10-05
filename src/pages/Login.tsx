/**
 * Acceso al ERP de David. Misma pantalla que la de Binagre, con el estilo de David:
 *   · PIN (teclado grande, arriba: lo que más se usa)
 *   · Huella · Enlace por email · Google (tres botones iguales, debajo)
 *   · El aparato recuerda las cuentas que han entrado: se elige con un toque y se saluda por el nombre.
 * Solo entra quien está en la lista blanca (la comprueba AuthContext).
 * Estilos: src/styles/acceso.css
 */
import { useEffect, useRef, useState } from 'react'
import { Delete, Fingerprint, Mail, Plus, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { leerAccesos, olvidarAcceso, entrarConPin, crearPin, LONGITUD_PIN } from '@/lib/accesoRapido'
import { huellaDisponible, registrarHuella, entrarConHuella } from '@/lib/passkey'
import '@/styles/acceso.css'

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
const ESPERA_REENVIO = 60

const iniciales = (t: string) => t.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()
const soportaHuella = () => typeof window !== 'undefined' && !!window.PublicKeyCredential

function Marca() {
  return (
    <div className="acc-marca">
      <img src="/logo-davidreparte.svg" alt="David Reparte" />
      <b>David Reparte</b>
      <span>Alcoi · Ontinyent</span>
    </div>
  )
}

function Puntos({ n, mal, cargando }: { n: number; mal: boolean; cargando: boolean }) {
  return (
    <div className={`acc-pin${mal ? ' acc-pin--error' : ''}${cargando ? ' acc-pin--cargando' : ''}`} role="status" aria-label={`PIN: ${n} de ${LONGITUD_PIN} cifras`}>
      {Array.from({ length: LONGITUD_PIN }, (_, i) => (
        <span key={i} className={`acc-punto${i < n ? ' acc-punto--on' : ''}`} />
      ))}
    </div>
  )
}

function Teclado({ onDigito, onBorrar, deshabilitado }: { onDigito: (d: string) => void; onBorrar: () => void; deshabilitado: boolean }) {
  return (
    <div className="acc-teclado">
      {TECLAS.map(d => (
        <button key={d} type="button" className="acc-tecla" disabled={deshabilitado} onClick={() => onDigito(d)}>{d}</button>
      ))}
      <span className="acc-tecla acc-tecla--vacia" aria-hidden="true" />
      <button type="button" className="acc-tecla" disabled={deshabilitado} onClick={() => onDigito('0')}>0</button>
      <button type="button" className="acc-tecla acc-tecla--borrar" aria-label="Borrar" disabled={deshabilitado} onClick={onBorrar}>
        <Delete aria-hidden="true" />
      </button>
    </div>
  )
}

/* Teclado del ordenador: cifras y borrar, salvo que se esté escribiendo en un campo. */
function useTecladoFisico(activo: boolean, onDigito: (d: string) => void, onBorrar: () => void) {
  useEffect(() => {
    if (!activo) return
    function alTeclear(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (/^[0-9]$/.test(e.key)) onDigito(e.key)
      else if (e.key === 'Backspace') onBorrar()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  })
}

function Pantalla({ children }: { children: React.ReactNode }) {
  return (
    <div className="acc">
      <div className="acc-card">
        <Marca />
        <div className="acc-cuerpo">{children}</div>
      </div>
    </div>
  )
}

/* ── Primera vez en el aparato: crear PIN (dos veces) y, si se puede, huella ── */
function CrearPin() {
  const { pendiente, pinCreado, logout } = useAuth()
  const [fase, setFase] = useState<'nuevo' | 'repetir' | 'huella'>('nuevo')
  const [primero, setPrimero] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [mal, setMal] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  async function completar(valor: string) {
    if (fase === 'nuevo') { setPrimero(valor); setPin(''); setFase('repetir'); return }
    if (valor !== primero) {
      setPin(''); setPrimero(''); setFase('nuevo'); setError('Los dos PIN no coinciden. Empieza otra vez.')
      setMal(true); setTimeout(() => setMal(false), 400)
      return
    }
    setOcupado(true)
    const err = await crearPin(valor)
    setOcupado(false)
    if (err) { setPin(''); setPrimero(''); setFase('nuevo'); setError(err); return }
    if (await huellaDisponible()) setFase('huella')
    else pinCreado()
  }

  function pulsar(d: string) {
    if (ocupado || fase === 'huella') return
    setError('')
    const nuevo = (pin + d).slice(0, LONGITUD_PIN)
    setPin(nuevo)
    if (nuevo.length === LONGITUD_PIN) void completar(nuevo)
  }
  function borrar() { if (!ocupado) setPin(p => p.slice(0, -1)) }
  useTecladoFisico(fase !== 'huella', pulsar, borrar)

  async function activarHuella() {
    if (!pendiente) return
    setOcupado(true); setError('')
    const err = await registrarHuella(pendiente.email, pendiente.nombre)
    setOcupado(false)
    if (err) { setError(err); return }
    pinCreado()
  }

  if (fase === 'huella') {
    return (
      <Pantalla>
        <div className="acc-correo"><Fingerprint aria-hidden="true" /></div>
        <div className="acc-hola">
          <h1>¿Entrar con huella?</h1>
          <p>La próxima vez podrás entrar en este dispositivo con la huella o la cara.</p>
        </div>
        <p className="acc-msg" role="alert">{error}</p>
        <button className="acc-reenvio" type="button" disabled={ocupado} onClick={() => void activarHuella()}>
          {ocupado ? 'Registrando…' : 'Activar huella'}
        </button>
        <button className="acc-cambiar" type="button" onClick={pinCreado}>Ahora no</button>
      </Pantalla>
    )
  }

  return (
    <Pantalla>
      <div className="acc-hola">
        <h1>{fase === 'nuevo' ? `Crea tu PIN, ${pendiente?.nombre?.split(' ')[0] ?? ''}` : 'Repite el PIN'}</h1>
        <p>{fase === 'nuevo' ? '4 cifras para entrar en este dispositivo sin volver a Google' : 'Escríbelo otra vez para confirmarlo'}</p>
      </div>
      <Puntos n={pin.length} mal={mal} cargando={ocupado} />
      <p className="acc-msg" role="alert">{error}</p>
      <Teclado onDigito={pulsar} onBorrar={borrar} deshabilitado={ocupado} />
      <button className="acc-cambiar" type="button" onClick={logout}>Salir</button>
    </Pantalla>
  )
}

/* ── Entrada normal ── */
function Entrada() {
  const { estado, pendiente, error: errorAcceso, loginGoogle, enviarEnlace, logout } = useAuth()
  const bloqueado = estado === 'bloqueado' && !!pendiente

  const [accesos, setAccesos] = useState(leerAccesos)
  const [editandoEmail, setEditandoEmail] = useState(false)
  const [email, setEmail] = useState(() => (bloqueado ? pendiente!.email : leerAccesos()[0]?.email) || '')
  const [paso, setPaso] = useState<'entrar' | 'revisa'>('entrar')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [pinMal, setPinMal] = useState(false)
  const [entrandoRapido, setEntrandoRapido] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [entrandoGoogle, setEntrandoGoogle] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const emailRef = useRef<HTMLInputElement>(null)

  const ocupado = enviando || entrandoGoogle || entrandoRapido
  const correo = email.trim().toLowerCase()
  const guardado = accesos.find(a => a.email.toLowerCase() === correo)
  const conocido = (accesos.length > 0 || bloqueado) && !editandoEmail && !!email
  const nombre = (guardado?.nombre ?? (bloqueado ? pendiente?.nombre : undefined) ?? '').split(' ')[0]

  function elegir(e: string) {
    if (ocupado) return
    setEmail(e); setEditandoEmail(false); setPin(''); setError('')
  }

  function quitar(e: string) {
    olvidarAcceso(e)
    const resto = leerAccesos()
    setAccesos(resto)
    if (e.toLowerCase() === correo) {
      if (resto[0]) elegir(resto[0].email)
      else { setEmail(''); setEditandoEmail(true) }
    }
  }

  useEffect(() => {
    if (segundos <= 0) return
    const t = setInterval(() => setSegundos(s => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [segundos])

  function pedirEmail(mensaje: string) {
    setEditandoEmail(true)
    setError(mensaje)
    setTimeout(() => emailRef.current?.focus(), 0)
  }

  async function probarPin(valor: string) {
    if (!correo) { setPin(''); pedirEmail('Primero escribe tu correo.'); return }
    setError('')
    setEntrandoRapido(true)
    const err = await entrarConPin(correo, valor)
    setEntrandoRapido(false)
    if (err) {
      setPin('')
      setError(err)
      setPinMal(true)
      setTimeout(() => setPinMal(false), 400)
    }
  }

  function pulsar(d: string) {
    if (ocupado || paso !== 'entrar') return
    setError('')
    const nuevo = (pin + d).slice(0, LONGITUD_PIN)
    setPin(nuevo)
    if (nuevo.length === LONGITUD_PIN) void probarPin(nuevo)
  }
  function borrar() { if (!ocupado) setPin(p => p.slice(0, -1)) }
  useTecladoFisico(paso === 'entrar', pulsar, borrar)

  async function conHuella() {
    if (ocupado) return
    if (!correo) { pedirEmail('Primero escribe tu correo.'); return }
    setError('')
    setEntrandoRapido(true)
    const err = await entrarConHuella(correo)
    setEntrandoRapido(false)
    if (err) setError(err)
  }

  async function pedirEnlace() {
    if (enviando) return
    if (!email.trim()) { pedirEmail('Primero escribe tu correo.'); return }
    setError('')
    setEnviando(true)
    let fallo: string | null
    try { fallo = await enviarEnlace(email.trim()) }
    catch { fallo = 'Sin conexión. Comprueba tu internet e inténtalo otra vez.' }
    setEnviando(false)
    if (fallo) { setError(fallo); return }
    setPaso('revisa')
    setSegundos(ESPERA_REENVIO)
  }

  async function conGoogle() {
    if (entrandoGoogle) return
    setError('')
    setEntrandoGoogle(true)
    try { await loginGoogle() }
    catch { setError('Sin conexión. Comprueba tu internet e inténtalo otra vez.'); setEntrandoGoogle(false) }
    // Sin fallo, la página navega fuera hacia Google: no hace falta más.
  }

  const aviso = error || errorAcceso || ''

  if (paso === 'revisa') {
    return (
      <Pantalla>
        <div className="acc-correo"><Mail aria-hidden="true" /></div>
        <div className="acc-hola">
          <h1>Revisa tu correo</h1>
          <p>Te hemos enviado un enlace a <b>{email.trim()}</b>. Ábrelo desde este mismo dispositivo para entrar.</p>
        </div>
        {aviso && <p className="acc-msg" role="alert">{aviso}</p>}
        <button className="acc-reenvio" type="button" disabled={segundos > 0 || enviando} onClick={() => void pedirEnlace()}>
          {segundos > 0 ? `Reenviar enlace (${segundos}s)` : 'Reenviar enlace'}
        </button>
        <button className="acc-cambiar" type="button" onClick={() => { setPaso('entrar'); setError('') }}>Volver</button>
      </Pantalla>
    )
  }

  return (
    <Pantalla>
      {accesos.length > 0 && (
        <div className="acc-cuentas" role="list" aria-label="Cuentas de este aparato">
          {accesos.map(a => (
            <div key={a.email} role="listitem" className="acc-cuenta-caja">
              <button type="button" disabled={ocupado} onClick={() => elegir(a.email)}
                className={`acc-cuenta${!editandoEmail && a.email.toLowerCase() === correo ? ' acc-cuenta--on' : ''}`}
                title={a.email} aria-pressed={!editandoEmail && a.email.toLowerCase() === correo}>
                <span className="acc-cuenta-ic" aria-hidden="true">{iniciales(a.nombre || a.email)}</span>
                <span className="acc-cuenta-nom">{(a.nombre || a.email).split(' ')[0]}</span>
              </button>
              <button type="button" className="acc-cuenta-x" aria-label={`Quitar ${a.email} de este aparato`} onClick={() => quitar(a.email)}>
                <X aria-hidden="true" />
              </button>
            </div>
          ))}
          <div role="listitem" className="acc-cuenta-caja">
            <button type="button" disabled={ocupado} className={`acc-cuenta${editandoEmail ? ' acc-cuenta--on' : ''}`}
              onClick={() => { setEditandoEmail(true); setEmail(''); setPin(''); setError(''); setTimeout(() => emailRef.current?.focus(), 0) }}>
              <span className="acc-cuenta-ic" aria-hidden="true"><Plus /></span>
              <span className="acc-cuenta-nom">Otra</span>
            </button>
          </div>
        </div>
      )}

      {conocido ? (
        <div className="acc-hola">
          <h1>Hola, {nombre || 'de nuevo'}</h1>
          <p>Pon tu PIN para entrar</p>
        </div>
      ) : (
        <div className="acc-hola">
          <h1>Entrar</h1>
          <input
            ref={emailRef}
            className="acc-email"
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="tu@correo.com"
            aria-label="Correo"
            value={email}
            disabled={ocupado}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') emailRef.current?.blur() }}
          />
        </div>
      )}

      <Puntos n={pin.length} mal={pinMal} cargando={entrandoRapido} />
      <p className="acc-msg" role="alert">{aviso}</p>
      <Teclado onDigito={pulsar} onBorrar={borrar} deshabilitado={ocupado} />

      <div className="acc-otras">
        <div className="acc-otras-tit">o entra con</div>
        <div className="acc-otras-fila">
          {soportaHuella() && (
            <button className="acc-otra" type="button" disabled={ocupado} onClick={() => void conHuella()}>
              <Fingerprint aria-hidden="true" /> Huella
            </button>
          )}
          <button className="acc-otra" type="button" disabled={ocupado} onClick={() => void pedirEnlace()}>
            <Mail aria-hidden="true" /> {enviando ? 'Enviando…' : 'Enlace'}
          </button>
          <button className="acc-otra" type="button" disabled={ocupado} onClick={() => void conGoogle()}>
            <span className="acc-g" aria-hidden="true">G</span> {entrandoGoogle ? 'Entrando…' : 'Google'}
          </button>
        </div>
      </div>

      {bloqueado && <button className="acc-cambiar" type="button" onClick={logout}>Salir y entrar con otra cuenta</button>}
      <p className="acc-pie">¿Sin acceso? Pídeselo a Rubén.</p>
    </Pantalla>
  )
}

export default function Login() {
  const { estado } = useAuth()
  if (estado === 'cargando') {
    return <Pantalla><div className="acc-hola"><h1>Comprobando acceso…</h1></div></Pantalla>
  }
  if (estado === 'crear-pin') return <CrearPin />
  return <Entrada />
}
