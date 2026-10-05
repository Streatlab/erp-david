/**
 * CalendarioLaboral.tsx — Equipo ▸ Calendario laboral (Alcoi y Ontinyent).
 * Fuente única de festivos para facturación y liquidaciones de Cade (tabla `festivos`).
 * Nacionales y de la Comunitat vienen cargados; los locales se añaden aquí cada año.
 */
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { INK, ARENA, ARENA_CL, BLANCO, GRIS, OLIVA, TERRA, NARANJA, CELESTE, AMBAR, OSW, LEX, BORDER_CARD } from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda, KpiNeo, TablaWrap, thNeo, tdNeo, tdEstado, BadgeNeo, BotonNeo, PillsNeo } from '@/components/neo/NeoUI'

interface Festivo { fecha: string; nombre: string; ambito: string }

const AMBITOS = ['Nacional', 'Comunitat Valenciana', 'Alcoi', 'Ontinyent'] as const
const COLOR_AMBITO: Record<string, string> = {
  Nacional: CELESTE, 'Comunitat Valenciana': NARANJA, Alcoi: OLIVA, Ontinyent: AMBAR,
}
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const fechaLarga = (iso: string) => {
  const d = new Date(iso + 'T00:00:00')
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`
}

const inputStyle = {
  border: `2px solid ${INK}`, padding: '7px 10px', fontFamily: LEX, fontSize: 13, background: BLANCO, color: INK,
} as const

export default function CalendarioLaboral() {
  const hoy = new Date()
  const [anio, setAnio] = useState<string>(String(hoy.getFullYear()))
  const [lista, setLista] = useState<Festivo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fecha, setFecha] = useState('')
  const [nombre, setNombre] = useState('')
  const [ambito, setAmbito] = useState<string>('Alcoi')

  async function cargar() {
    setCargando(true)
    const { data, error: e } = await supabase.from('festivos').select('fecha, nombre, ambito').order('fecha')
    if (e) setError(e.message)
    setLista(((data ?? []) as any[]).map(f => ({ fecha: String(f.fecha).slice(0, 10), nombre: f.nombre, ambito: f.ambito })))
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])

  const anios = useMemo(() => {
    const y = hoy.getFullYear()
    const set = new Set<string>([String(y - 1), String(y), String(y + 1)])
    for (const f of lista) set.add(f.fecha.slice(0, 4))
    return Array.from(set).sort()
  }, [lista]) // eslint-disable-line react-hooks/exhaustive-deps

  const delAnio = useMemo(() => lista.filter(f => f.fecha.startsWith(anio)), [lista, anio])
  const locales = delAnio.filter(f => f.ambito === 'Alcoi' || f.ambito === 'Ontinyent').length
  const siguiente = useMemo(() => {
    const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
    return lista.find(f => f.fecha >= iso) ?? null
  }, [lista]) // eslint-disable-line react-hooks/exhaustive-deps

  const anioSiguiente = String(hoy.getFullYear() + 1)
  const localesSiguiente = lista.filter(f => f.fecha.startsWith(anioSiguiente) && (f.ambito === 'Alcoi' || f.ambito === 'Ontinyent')).length
  const avisoRenovar = hoy.getMonth() >= 9 && localesSiguiente === 0

  async function anadir() {
    setError(null)
    if (!fecha || !nombre.trim()) { setError('Pon la fecha y el nombre del festivo'); return }
    const { error: e } = await supabase.from('festivos').insert({ fecha, nombre: nombre.trim(), ambito })
    if (e) { setError(e.message); return }
    setFecha(''); setNombre('')
    cargar()
  }

  async function borrar(f: Festivo) {
    const { error: e } = await supabase.from('festivos').delete().eq('fecha', f.fecha).eq('ambito', f.ambito)
    if (e) { setError(e.message); return }
    cargar()
  }

  const asunto = encodeURIComponent(`Festivos locales ${anioSiguiente} de Alcoi y Ontinyent`)
  const cuerpo = encodeURIComponent(`Hola,\n\nPara el calendario laboral de ${anioSiguiente} necesito los festivos locales de Alcoi y de Ontinyent (los que publica el ayuntamiento). Gracias.`)

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Equipo · Calendario" titulo="Calendario laboral">
        <PillsNeo value={anio} onChange={setAnio} options={anios} />
      </CabeceraNeo>

      {error && (
        <Banda bg={TERRA} style={{ padding: '14px 40px' }}>
          <div style={{ fontFamily: OSW, fontWeight: 700, color: ARENA, textTransform: 'uppercase' }}>{error}</div>
        </Banda>
      )}

      {avisoRenovar && (
        <Banda bg={AMBAR} style={{ padding: '18px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 16, textTransform: 'uppercase', color: INK }}>
              Faltan los festivos locales de {anioSiguiente}. Pídelos a admin@streatlab.com para que los publique.
            </div>
            <a href={`mailto:admin@streatlab.com?subject=${asunto}&body=${cuerpo}`}
              style={{ background: INK, color: AMBAR, border: `2px solid ${INK}`, padding: '8px 14px', fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', textDecoration: 'none' }}>
              Escribir a admin@streatlab.com
            </a>
          </div>
        </Banda>
      )}

      <Banda bg={ARENA_CL}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
          <KpiNeo label={`Festivos en ${anio}`} valor={String(delAnio.length)} color={CELESTE} />
          <KpiNeo label="Locales cargados" valor={String(locales)} color={locales > 0 ? OLIVA : NARANJA}
            sub={locales === 0 ? 'Añade los de Alcoi y Ontinyent' : 'Alcoi y Ontinyent'} />
          <KpiNeo label="Próximo festivo" valor={siguiente ? fechaLarga(siguiente.fecha).replace(/^\S+ /, '') : '—'} color={AMBAR} sub={siguiente?.nombre} />
        </div>
      </Banda>

      <Banda bg={BLANCO}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 16, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, color: INK }}>
          Añadir festivo
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inputStyle} />
          <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre (p. ej. San Jorge)" style={{ ...inputStyle, minWidth: 240 }} />
          <select value={ambito} onChange={e => setAmbito(e.target.value)} style={inputStyle}>
            {AMBITOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <BotonNeo onClick={anadir}>Añadir</BotonNeo>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: GRIS }}>
          Los festivos de este calendario se usan para no marcar como "día sin pagar" los días en que Cade no trabaja.
        </div>
      </Banda>

      <Banda bg={ARENA_CL}>
        <TablaWrap>
          <thead>
            <tr>{['Fecha', 'Festivo', 'Ámbito', ''].map(h => <th key={h} style={thNeo}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {cargando && <tr><td colSpan={4} style={{ ...tdNeo(false), textAlign: 'center', color: GRIS, padding: 28 }}>Cargando…</td></tr>}
            {!cargando && delAnio.length === 0 && (
              <tr><td colSpan={4} style={{ ...tdNeo(false), textAlign: 'center', color: GRIS, padding: 28 }}>No hay festivos cargados en {anio}.</td></tr>
            )}
            {delAnio.map((f, i) => {
              const alt = i % 2 === 1
              return (
                <tr key={`${f.fecha}-${f.ambito}`}>
                  <td style={tdEstado(alt, COLOR_AMBITO[f.ambito] ?? GRIS)}>{fechaLarga(f.fecha)}</td>
                  <td style={tdNeo(alt)}>{f.nombre}</td>
                  <td style={tdNeo(alt)}><BadgeNeo color={COLOR_AMBITO[f.ambito] ?? GRIS}>{f.ambito}</BadgeNeo></td>
                  <td style={{ ...tdNeo(alt), textAlign: 'right' }}>
                    <BotonNeo bg={ARENA} onClick={() => borrar(f)}>Quitar</BotonNeo>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </TablaWrap>
        <div style={{ marginTop: 10, border: BORDER_CARD, background: BLANCO, padding: '10px 14px', fontSize: 12, fontWeight: 600 }}>
          Alcoi (códigos 939, 9391, 9392) y Ontinyent (códigos 972, 9721, 9723) pueden tener festivos locales distintos.
        </div>
      </Banda>
    </PageNeo>
  )
}
