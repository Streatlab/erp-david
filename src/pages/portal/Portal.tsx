import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import {
  PANTALLAS, pantallasPermitidas, getConductor, getFurgonetaDe, getConductoresActivos, entregasPorDia, ultimaFechaEntregas,
  lecturasDe, faltaKmSemana, calcularIncentivos, avisosDe, marcarLeido, lunesDe, ymd, fechaCorta, diasPeriodo, TIPOS_PERMISO,
  type Pantalla, type Conductor, type Furgoneta, type EntregaDia, type EstadoIncentivo, type Aviso, type Solicitud, type Acuerdo, type Documento,
} from '@/lib/portal'
import { INK, ARENA, ARENA_CL, BLANCO, GRIS, OLIVA, TERRA, NARANJA, AMBAR, CELESTE, MARINO, OSW, LEX } from '@/styles/neobrutal'
import { Tarjeta, Titulo, Texto, Cifra, BotonGrande, Vacio, Pildora, campo, etiquetaCampo, rejilla, columna } from './ui'
import PortalKm from './PortalKm'
import PortalFurgoneta from './PortalFurgoneta'

/* Portal del repartidor: cada uno ve SOLO lo suyo (la base lo garantiza con RLS por rol).
   Pantallas: Hoy · Mi trabajo · Kilómetros · Mi furgoneta · Vacaciones y permisos · Mis incentivos ·
   Mis acuerdos · Mi carpeta · Avisos. El admin puede verlo "como" cualquier repartidor. Letra grande, móvil primero. */

export default function Portal() {
  const { usuario } = useAuth()
  const admin = usuario?.perfil === 'admin'
  const [conductores, setConductores] = useState<{ id: string; nombre: string }[]>([])
  const [verComo, setVerComo] = useState<string>('')
  const conductorId = admin ? (verComo || usuario?.conductor_id || '') : (usuario?.conductor_id ?? '')
  const [permitidas, setPermitidas] = useState<Set<Pantalla>>(new Set(PANTALLAS.map(p => p.key)))
  const [pantalla, setPantalla] = useState<Pantalla>('hoy')
  const [conductor, setConductor] = useState<Conductor | null>(null)
  const [furgoneta, setFurgoneta] = useState<Furgoneta | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => { if (admin) getConductoresActivos().then(setConductores) }, [admin])
  useEffect(() => { if (usuario?.id && !admin) pantallasPermitidas(usuario.id).then(setPermitidas) }, [usuario?.id, admin])
  useEffect(() => {
    if (!conductorId) { setConductor(null); setFurgoneta(null); return }
    getConductor(conductorId).then(setConductor)
    getFurgonetaDe(conductorId).then(setFurgoneta)
  }, [conductorId, tick])

  const tabs = PANTALLAS.filter(p => permitidas.has(p.key))
  const nombre = conductor?.nombre ?? usuario?.nombre ?? ''

  if (!conductorId) {
    return (
      <div style={{ padding: 20, maxWidth: 720, margin: '0 auto' }}>
        <Tarjeta>
          <Titulo>Portal del repartidor</Titulo>
          {admin ? (
            <>
              <Texto suave>Elige a quién quieres ver. Cada repartidor ve exactamente esto cuando entra con su cuenta.</Texto>
              <SelectorVerComo conductores={conductores} value={verComo} onChange={setVerComo} />
            </>
          ) : (
            <Texto>Tu usuario no está vinculado a ninguna ficha de repartidor. Pídeselo a Rubén o a David.</Texto>
          )}
        </Tarjeta>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 0 40px' }}>
      <div style={{ background: MARINO, color: ARENA, padding: '14px 16px', borderBottom: `4px solid ${INK}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: OSW, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.85 }}>Portal del repartidor</div>
            <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 26, lineHeight: 1 }}>Hola, {nombre.split(' ')[0]}</div>
          </div>
          {admin && <SelectorVerComo conductores={conductores} value={verComo || conductorId} onChange={setVerComo} compacto />}
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 12, paddingBottom: 2 }}>
          {tabs.map(t => (
            <button key={t.key} type="button" onClick={() => setPantalla(t.key)}
              style={{ fontFamily: OSW, fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', padding: '8px 12px', border: `2px solid ${INK}`, cursor: 'pointer', background: pantalla === t.key ? NARANJA : ARENA, color: pantalla === t.key ? ARENA : INK }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: 16, fontFamily: LEX }}>
        {pantalla === 'hoy' && <Hoy conductorId={conductorId} nombre={nombre} furgoneta={furgoneta} ir={setPantalla} />}
        {pantalla === 'trabajo' && <MiTrabajo nombre={nombre} />}
        {pantalla === 'kilometros' && <PortalKm conductorId={conductorId} furgoneta={furgoneta} onGuardado={() => setTick(t => t + 1)} />}
        {pantalla === 'furgoneta' && <PortalFurgoneta conductorId={conductorId} furgoneta={furgoneta} />}
        {pantalla === 'permisos' && <Permisos conductorId={conductorId} conductor={conductor} />}
        {pantalla === 'incentivos' && <Incentivos conductorId={conductorId} nombre={nombre} furgonetaId={furgoneta?.id ?? null} />}
        {pantalla === 'acuerdos' && <Acuerdos conductorId={conductorId} />}
        {pantalla === 'carpeta' && <Carpeta conductorId={conductorId} />}
        {pantalla === 'avisos' && <Avisos conductorId={conductorId} />}
      </div>
    </div>
  )
}

function SelectorVerComo({ conductores, value, onChange, compacto }: { conductores: { id: string; nombre: string }[]; value: string; onChange: (v: string) => void; compacto?: boolean }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: OSW, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: compacto ? ARENA : INK }}>
      Ver como
      <select id="portal-ver-como" value={value} onChange={e => onChange(e.target.value)} style={{ ...campo, width: 'auto', minWidth: 140 }}>
        <option value="">— elegir —</option>
        {conductores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select>
    </label>
  )
}

/* ── Hoy: lo que importa ahora, en tres tarjetas ─────────────────────── */
function Hoy({ conductorId, nombre, furgoneta, ir }: { conductorId: string; nombre: string; furgoneta: Furgoneta | null; ir: (p: Pantalla) => void }) {
  const [semana, setSemana] = useState<EntregaDia[]>([])
  const [ultima, setUltima] = useState<string | null>(null)
  const [faltaKm, setFaltaKm] = useState(false)
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [incentivos, setIncentivos] = useState<EstadoIncentivo[]>([])
  useEffect(() => {
    let vivo = true
    ultimaFechaEntregas(nombre).then(async f => {
      if (!vivo) return
      setUltima(f)
      if (!f) { setSemana([]); return }
      const lunes = lunesDe(new Date(f + 'T12:00:00'))
      const dias = await entregasPorDia(nombre, ymd(lunes), f)
      if (vivo) setSemana(dias)
    })
    if (furgoneta?.id) lecturasDe(furgoneta.id, 10).then(l => { if (vivo) setFaltaKm(faltaKmSemana(l)) })
    avisosDe(conductorId).then(a => { if (vivo) setAvisos(a.filter(x => !(x.leido_por ?? []).includes(conductorId))) })
    calcularIncentivos(conductorId, nombre, furgoneta?.id ?? null).then(i => { if (vivo) setIncentivos(i) })
    return () => { vivo = false }
  }, [conductorId, nombre, furgoneta?.id])

  const entregas = semana.reduce((s, d) => s + d.entregas, 0)
  const porDia = semana.length ? Math.round((entregas / semana.length) * 10) / 10 : 0
  return (
    <div style={columna}>
      {faltaKm && (
        <Tarjeta bg={AMBAR} color={INK}>
          <Titulo>Te falta apuntar los kilómetros de esta semana</Titulo>
          <BotonGrande onClick={() => ir('kilometros')}>Apuntar ahora</BotonGrande>
        </Tarjeta>
      )}
      {avisos.length > 0 && (
        <Tarjeta bg={NARANJA} color={ARENA}>
          <Titulo color={ARENA}>{avisos.length} aviso{avisos.length > 1 ? 's' : ''} sin leer</Titulo>
          <BotonGrande bg={ARENA} color={INK} onClick={() => ir('avisos')}>Leer</BotonGrande>
        </Tarjeta>
      )}
      <Tarjeta>
        <Titulo>Tu última semana con datos</Titulo>
        {!ultima ? <Vacio>Aún no hay entregas tuyas cargadas. Llegan cuando Cade manda la liquidación del mes.</Vacio> : (
          <>
            <div style={rejilla(140)}>
              <div><Cifra color={OLIVA}>{entregas}</Cifra><Texto suave>entregas · semana del {fechaCorta(ymd(lunesDe(new Date(ultima + 'T12:00:00'))))}</Texto></div>
              <div><Cifra color={CELESTE}>{porDia}</Cifra><Texto suave>entregas al día</Texto></div>
              <div><Cifra>{semana.reduce((s, d) => s + d.incidencias, 0)}</Cifra><Texto suave>incidencias</Texto></div>
            </div>
            <Texto suave style={{ marginTop: 8 }}>Datos hasta el {fechaCorta(ultima)}.</Texto>
          </>
        )}
      </Tarjeta>
      {incentivos.length > 0 && (
        <Tarjeta>
          <Titulo>Tus incentivos este mes</Titulo>
          {incentivos.map(i => (
            <div key={i.regla.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${ARENA_CL}` }}>
              <div><b>{i.regla.nombre}</b><Texto suave>{i.texto}</Texto></div>
              <Pildora texto={i.conseguido ? `+${i.regla.premio_eur} €` : `${i.actual}/${i.objetivo}`} bg={i.conseguido ? OLIVA : GRIS} />
            </div>
          ))}
        </Tarjeta>
      )}
    </div>
  )
}

/* ── Mi trabajo: entregas por día de las últimas 4 semanas con datos ─── */
function MiTrabajo({ nombre }: { nombre: string }) {
  const [dias, setDias] = useState<EntregaDia[]>([])
  const [ultima, setUltima] = useState<string | null>(null)
  useEffect(() => {
    ultimaFechaEntregas(nombre).then(async f => {
      setUltima(f)
      if (!f) return
      const desde = new Date(f + 'T12:00:00'); desde.setDate(desde.getDate() - 27)
      setDias(await entregasPorDia(nombre, ymd(lunesDe(desde)), f))
    })
  }, [nombre])
  const semanas = useMemo(() => {
    const m = new Map<string, EntregaDia[]>()
    for (const d of dias) { const l = ymd(lunesDe(new Date(d.fecha + 'T12:00:00'))); m.set(l, [...(m.get(l) ?? []), d]) }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [dias])
  if (!ultima) return <Vacio>Aún no hay entregas tuyas cargadas.</Vacio>
  return (
    <div style={columna}>
      {semanas.map(([lunes, ds]) => (
        <Tarjeta key={lunes}>
          <Titulo>Semana del {fechaCorta(lunes)} · {ds.reduce((s, d) => s + d.entregas, 0)} entregas</Titulo>
          {ds.map(d => (
            <div key={d.fecha} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 10, padding: '6px 0', borderBottom: `1px solid ${ARENA_CL}`, fontSize: 15, fontWeight: 600 }}>
              <span>{new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })}</span>
              <span style={{ fontFamily: OSW, color: OLIVA }}>{d.entregas} entr.</span>
              <span style={{ color: GRIS }}>{Math.round(d.kilos)} kg</span>
              <span style={{ color: d.incidencias ? TERRA : GRIS }}>{d.incidencias ? `${d.incidencias} inc.` : '—'}</span>
            </div>
          ))}
        </Tarjeta>
      ))}
    </div>
  )
}

/* ── Vacaciones y permisos ───────────────────────────────────────────── */
function Permisos({ conductorId, conductor }: { conductorId: string; conductor: Conductor | null }) {
  const [lista, setLista] = useState<Solicitud[]>([])
  const [tipo, setTipo] = useState('vacaciones')
  const [ini, setIni] = useState('')
  const [fin, setFin] = useState('')
  const [nota, setNota] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const cargar = () => supabase.from('solicitudes_permisos').select('*').eq('conductor_id', conductorId).order('created_at', { ascending: false }).then(({ data }) => setLista((data ?? []) as Solicitud[]))
  useEffect(() => { cargar() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [conductorId])
  const anio = new Date().getFullYear()
  const usados = lista.filter(s => s.estado === 'aprobado' && s.tipo === 'vacaciones' && s.fecha_inicio.startsWith(String(anio))).reduce((s, x) => s + diasPeriodo(x.fecha_inicio, x.fecha_fin), 0)
  async function pedir() {
    if (!ini || !fin || fin < ini) { setMsg('Revisa las fechas.'); return }
    const { error } = await supabase.from('solicitudes_permisos').insert({ conductor_id: conductorId, tipo, fecha_inicio: ini, fecha_fin: fin, nota: nota || null, estado: 'pendiente' })
    setMsg(error ? `No se pudo enviar: ${error.message}` : 'Solicitud enviada. Te avisaremos cuando esté respondida.')
    if (!error) { setIni(''); setFin(''); setNota(''); cargar() }
  }
  const color: Record<string, string> = { pendiente: AMBAR, aprobado: OLIVA, rechazado: TERRA }
  return (
    <div style={columna}>
      <Tarjeta>
        <Titulo>Vacaciones {anio}</Titulo>
        <div style={rejilla(140)}>
          <div><Cifra color={OLIVA}>{usados}</Cifra><Texto suave>días disfrutados</Texto></div>
          <div><Cifra>{conductor?.dias_vacaciones_anuales != null ? Math.max(0, conductor.dias_vacaciones_anuales - usados) : '—'}</Cifra><Texto suave>{conductor?.dias_vacaciones_anuales != null ? `te quedan de ${conductor.dias_vacaciones_anuales}` : 'días anuales sin fijar'}</Texto></div>
        </div>
      </Tarjeta>
      <Tarjeta>
        <Titulo>Pedir días</Titulo>
        <div style={rejilla(150)}>
          <label style={etiquetaCampo}>Tipo<select id="permiso-tipo" value={tipo} onChange={e => setTipo(e.target.value)} style={campo}>{Object.entries(TIPOS_PERMISO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label style={etiquetaCampo}>Desde<input id="permiso-ini" type="date" value={ini} onChange={e => setIni(e.target.value)} style={campo} /></label>
          <label style={etiquetaCampo}>Hasta<input id="permiso-fin" type="date" value={fin} onChange={e => setFin(e.target.value)} style={campo} /></label>
        </div>
        <label style={{ ...etiquetaCampo, marginTop: 10 }}>Nota (opcional)<input id="permiso-nota" value={nota} onChange={e => setNota(e.target.value)} style={campo} /></label>
        <div style={{ marginTop: 12 }}><BotonGrande onClick={() => void pedir()}>Enviar solicitud{ini && fin && fin >= ini ? ` · ${diasPeriodo(ini, fin)} días` : ''}</BotonGrande></div>
        {msg && <Texto style={{ marginTop: 8 }}>{msg}</Texto>}
      </Tarjeta>
      <Tarjeta>
        <Titulo>Mis solicitudes</Titulo>
        {lista.length === 0 ? <Vacio>Todavía no has pedido ningún día.</Vacio> : lista.map(s => (
          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${ARENA_CL}` }}>
            <div><b>{TIPOS_PERMISO[s.tipo] ?? s.tipo}</b> · {fechaCorta(s.fecha_inicio)} a {fechaCorta(s.fecha_fin)} ({diasPeriodo(s.fecha_inicio, s.fecha_fin)} d){s.respuesta ? <Texto suave>{s.respuesta}</Texto> : null}</div>
            <Pildora texto={s.estado} bg={color[s.estado] ?? GRIS} color={s.estado === 'pendiente' ? INK : ARENA} />
          </div>
        ))}
      </Tarjeta>
    </div>
  )
}

function Incentivos({ conductorId, nombre, furgonetaId }: { conductorId: string; nombre: string; furgonetaId: string | null }) {
  const [lista, setLista] = useState<EstadoIncentivo[] | null>(null)
  useEffect(() => { calcularIncentivos(conductorId, nombre, furgonetaId).then(setLista) }, [conductorId, nombre, furgonetaId])
  if (lista === null) return <Texto suave>Cargando…</Texto>
  if (lista.length === 0) return <Vacio>No tienes incentivos configurados este mes.</Vacio>
  return (
    <div style={columna}>
      {lista.map(i => (
        <Tarjeta key={i.regla.id} color={i.conseguido ? OLIVA : INK}>
          <Titulo>{i.regla.nombre}</Titulo>
          <div style={rejilla(140)}>
            <div><Cifra color={i.conseguido ? OLIVA : INK}>{i.actual}</Cifra><Texto suave>de {i.objetivo}</Texto></div>
            <div><Cifra color={OLIVA}>{i.regla.premio_eur} €</Cifra><Texto suave>{i.conseguido ? 'Conseguido' : i.texto}</Texto></div>
          </div>
        </Tarjeta>
      ))}
    </div>
  )
}

function Acuerdos({ conductorId }: { conductorId: string }) {
  const [lista, setLista] = useState<Acuerdo[]>([])
  const cargar = () => supabase.from('acuerdos_empleado').select('*').eq('conductor_id', conductorId).order('fecha', { ascending: false }).then(({ data }) => setLista((data ?? []) as Acuerdo[]))
  useEffect(() => { cargar() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [conductorId])
  async function aceptar(id: string) { await supabase.from('acuerdos_empleado').update({ aceptado_at: new Date().toISOString() }).eq('id', id); cargar() }
  if (lista.length === 0) return <Vacio>No tienes acuerdos registrados.</Vacio>
  return (
    <div style={columna}>
      {lista.map(a => (
        <Tarjeta key={a.id} color={a.aceptado_at ? OLIVA : AMBAR}>
          <Titulo>{a.titulo}</Titulo>
          <Texto suave>{fechaCorta(a.fecha)}</Texto>
          {a.texto && <Texto style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{a.texto}</Texto>}
          {a.pdf_url && <a href={a.pdf_url} target="_blank" rel="noreferrer" style={{ color: CELESTE, fontWeight: 700 }}>Abrir documento</a>}
          <div style={{ marginTop: 10 }}>
            {a.aceptado_at ? <Pildora texto={`Aceptado el ${fechaCorta(a.aceptado_at.slice(0, 10))}`} bg={OLIVA} /> : <BotonGrande bg={OLIVA} onClick={() => void aceptar(a.id)}>He leído y acepto</BotonGrande>}
          </div>
        </Tarjeta>
      ))}
    </div>
  )
}

function Carpeta({ conductorId }: { conductorId: string }) {
  const [lista, setLista] = useState<Documento[]>([])
  useEffect(() => { supabase.from('empleado_documentos').select('*').eq('conductor_id', conductorId).order('fecha', { ascending: false }).then(({ data }) => setLista((data ?? []) as Documento[])) }, [conductorId])
  if (lista.length === 0) return <Vacio>Tu carpeta está vacía. Aquí aparecerán nóminas, contratos y lo que te compartan.</Vacio>
  return (
    <Tarjeta>
      <Titulo>Mis documentos</Titulo>
      {lista.map(d => (
        <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: `1px solid ${ARENA_CL}`, fontWeight: 600 }}>
          <span><Pildora texto={d.tipo} bg={ARENA_CL} color={INK} /> {d.nombre}</span>
          <span>{d.fecha ? fechaCorta(d.fecha) : ''} {d.url && <a href={d.url} target="_blank" rel="noreferrer" style={{ color: CELESTE, marginLeft: 8 }}>Abrir</a>}</span>
        </div>
      ))}
    </Tarjeta>
  )
}

function Avisos({ conductorId }: { conductorId: string }) {
  const [lista, setLista] = useState<Aviso[]>([])
  const cargar = () => avisosDe(conductorId).then(setLista)
  useEffect(() => { cargar() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [conductorId])
  async function leer(id: string) { await marcarLeido(id, conductorId); cargar() }
  if (lista.length === 0) return <Vacio>Sin avisos.</Vacio>
  return (
    <div style={columna}>
      {lista.map(a => {
        const leido = (a.leido_por ?? []).includes(conductorId)
        return (
          <Tarjeta key={a.id} color={leido ? GRIS : NARANJA} bg={leido ? BLANCO : ARENA}>
            <Texto style={{ whiteSpace: 'pre-wrap', fontWeight: leido ? 500 : 700 }}>{a.texto}</Texto>
            <Texto suave>{new Date(a.created_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Texto>
            {!leido && <div style={{ marginTop: 8 }}><BotonGrande bg={OLIVA} onClick={() => void leer(a.id)}>Leído</BotonGrande></div>}
          </Tarjeta>
        )
      })}
    </div>
  )
}
