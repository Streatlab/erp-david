import { useEffect, useMemo, useState } from 'react'
import type React from 'react'
import { supabase } from '@/lib/supabase'
import { fmtEur, fmtDate } from '@/lib/format'
import { OLIVA, TERRA, NARANJA, MARINO, AMBAR, GRIS, ARENA, ARENA_CL, BLANCO, INK, OSW, LEX } from '@/styles/neobrutal'
import {
  PageNeo, Banda, CabeceraNeo, KpiNeo, AvisoNeo,
  TablaWrap, thNeo, tdNeo, tdEstado, BadgeNeo,
} from '@/components/neo/NeoUI'

interface Reclamacion {
  id: string
  transportista: string | null
  emisor: string | null
  fecha_incidencia: string | null
  concepto: string | null
  importe: number | null
  estado: string
  notas: string | null
}

const ESTADOS = ['PENDIENTE', 'RECLAMADA', 'RECUPERADA', 'DESESTIMADA'] as const
const COLOR_ESTADO: Record<string, string> = {
  PENDIENTE: TERRA,
  RECLAMADA: AMBAR,
  RECUPERADA: OLIVA,
  DESESTIMADA: MARINO,
}

function HistoricoAnterior() {
  const [recs, setRecs] = useState<Reclamacion[]>([])
  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  async function cargar() {
    const { data, error } = await supabase
      .from('reclamaciones_cade')
      .select('*')
      .order('fecha_incidencia', { ascending: false })
    if (error) setErrMsg(error.message)
    setRecs((data ?? []) as Reclamacion[])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const kpis = useMemo(() => {
    const abiertas = recs.filter(r => r.estado === 'PENDIENTE' || r.estado === 'RECLAMADA')
    return {
      abiertas: abiertas.length,
      importeAbierto: abiertas.reduce((s, r) => s + (r.importe ?? 0), 0),
      recuperado: recs.filter(r => r.estado === 'RECUPERADA').reduce((s, r) => s + (r.importe ?? 0), 0),
      total: recs.length,
    }
  }, [recs])

  async function setEstado(r: Reclamacion, estado: string) {
    setSaving(r.id)
    const { error } = await supabase.from('reclamaciones_cade').update({ estado }).eq('id', r.id)
    if (error) setErrMsg(error.message)
    else await cargar()
    setSaving(null)
  }

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Cade" titulo="Histórico anterior">
        <div style={{ fontSize: 13, fontWeight: 600, color: ARENA, opacity: 0.85, maxWidth: 380 }}>
          Incidencias registradas a mano antes de leer las liquidaciones automáticamente.
        </div>
      </CabeceraNeo>

      {errMsg && <AvisoNeo>ERROR: {errMsg}</AvisoNeo>}

      {kpis.importeAbierto > 0 && (
        <AvisoNeo>
          TIENES {fmtEur(kpis.importeAbierto)} SIN RECLAMAR O SIN RESOLVER · {kpis.abiertas} incidencias abiertas.
        </AvisoNeo>
      )}

      <Banda bg={ARENA_CL}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
          <KpiNeo label="Reclamable abierto" valor={fmtEur(kpis.importeAbierto)} color={kpis.importeAbierto > 0 ? TERRA : OLIVA} sub={`${kpis.abiertas} incidencias`} />
          <KpiNeo label="Recuperado" valor={fmtEur(kpis.recuperado)} color={OLIVA} sub="Dinero que has salvado" />
          <KpiNeo label="Incidencias totales" valor={String(kpis.total)} />
        </div>
      </Banda>

      <Banda bg={BLANCO}>
        <TablaWrap>
          <thead>
            <tr>
              {['Fecha', 'Transportista', 'Emisor', 'Concepto', 'Importe', 'Estado', 'Notas', ''].map(h => (
                <th key={h} style={thNeo}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} style={{ ...tdNeo(false), textAlign: 'center', color: GRIS, padding: 32 }}>Cargando…</td></tr>
            )}
            {!loading && recs.length === 0 && (
              <tr><td colSpan={8} style={{ ...tdNeo(false), textAlign: 'center', color: GRIS, padding: 32 }}>Sin incidencias registradas.</td></tr>
            )}
            {recs.map((r, i) => {
              const alt = i % 2 === 1
              const c = COLOR_ESTADO[r.estado] ?? MARINO
              return (
                <tr key={r.id}>
                  <td style={{ ...tdEstado(alt, c), fontFamily: OSW, fontWeight: 700 }}>{fmtDate(r.fecha_incidencia ?? '')}</td>
                  <td style={tdNeo(alt)}>{r.transportista ?? '—'}</td>
                  <td style={tdNeo(alt)}>
                    <BadgeNeo color={(r.emisor ?? '').toUpperCase() === 'JUAN' ? AMBAR : MARINO}>{r.emisor ?? '—'}</BadgeNeo>
                  </td>
                  <td style={{ ...tdNeo(alt), maxWidth: 280 }}>{r.concepto ?? '—'}</td>
                  <td style={{ ...tdNeo(alt), textAlign: 'right', fontFamily: OSW, fontWeight: 700, fontSize: 15, color: r.estado === 'RECUPERADA' ? OLIVA : TERRA }}>{fmtEur(r.importe)}</td>
                  <td style={tdNeo(alt)}>
                    <BadgeNeo color={c}>{r.estado}</BadgeNeo>
                  </td>
                  <td style={{ ...tdNeo(alt), fontSize: 12, color: GRIS, maxWidth: 240 }}>{r.notas ?? ''}</td>
                  <td style={tdNeo(alt)}>
                    <select
                      value={r.estado}
                      disabled={saving === r.id}
                      onChange={e => setEstado(r, e.target.value)}
                      style={{
                        background: ARENA, color: INK, border: `2px dashed ${NARANJA}`,
                        borderRadius: 0, padding: '4px 8px', fontFamily: LEX, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </TablaWrap>
      </Banda>
    </PageNeo>
  )
}

interface Incidencia {
  id: number
  transportista: string | null
  fecha: string | null
  codigo: string
  importe: number
  descripcion: string | null
  estado: string
}

const ESTADOS_INC = ['propuesta', 'reclamada', 'recuperada', 'descartada'] as const
type EstadoInc = typeof ESTADOS_INC[number]
const TXT_ESTADO: Record<EstadoInc, string> = { propuesta: 'Por decidir', reclamada: 'Reclamadas', recuperada: 'Recuperadas', descartada: 'Descartadas' }
const COLOR_INC: Record<EstadoInc, string> = { propuesta: TERRA, reclamada: AMBAR, recuperada: OLIVA, descartada: MARINO }

function textoReclamacion(items: Incidencia[]): string {
  const lineas = items
    .slice()
    .sort((a, b) => (a.fecha ?? '').localeCompare(b.fecha ?? ''))
    .map(i => `- ${fmtDate(i.fecha ?? '')} · transportista ${i.transportista ?? '—'} · ${i.codigo} · ${fmtEur(Math.abs(i.importe))}`)
  const total = items.reduce((s, i) => s + Math.abs(i.importe), 0)
  return `Buenos días,\n\nRevisando las liquidaciones vemos los siguientes cargos que no son habituales y que solicitamos revisar:\n\n${lineas.join('\n')}\n\nTotal: ${fmtEur(total)}\n\nQuedamos a la espera de su respuesta.\n\nUn saludo`
}

export default function ReclamacionesCade() {
  const [incs, setIncs] = useState<Incidencia[]>([])
  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState<number | null>(null)
  const [vista, setVista] = useState<EstadoInc>('propuesta')
  const [copiado, setCopiado] = useState(false)

  async function cargar() {
    const { data, error } = await supabase
      .from('liquidaciones_cade_incidencias')
      .select('id, transportista, fecha, codigo, importe, descripcion, estado')
      .order('fecha', { ascending: false })
    if (error) setErrMsg(error.message)
    setIncs((data ?? []) as Incidencia[])
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  const totales = useMemo(() => {
    const t: Record<EstadoInc, { n: number; eur: number }> = {
      propuesta: { n: 0, eur: 0 }, reclamada: { n: 0, eur: 0 }, recuperada: { n: 0, eur: 0 }, descartada: { n: 0, eur: 0 },
    }
    for (const i of incs) {
      const e = (ESTADOS_INC as readonly string[]).includes(i.estado) ? (i.estado as EstadoInc) : 'propuesta'
      t[e].n += 1; t[e].eur += Math.abs(i.importe)
    }
    return t
  }, [incs])

  const visibles = incs.filter(i => i.estado === vista)
  const grupos = useMemo(() => {
    const m = new Map<string, Incidencia[]>()
    for (const i of visibles) m.set(i.codigo, [...(m.get(i.codigo) ?? []), i])
    return [...m.entries()].map(([codigo, items]) => ({ codigo, items, eur: items.reduce((s, x) => s + Math.abs(x.importe), 0) }))
      .sort((a, b) => b.eur - a.eur)
  }, [visibles])

  async function cambiar(ids: number[], estado: EstadoInc) {
    if (!ids.length) return
    setSaving(ids[0])
    const { error } = await supabase.from('liquidaciones_cade_incidencias').update({ estado }).in('id', ids)
    if (error) setErrMsg(error.message)
    else await cargar()
    setSaving(null)
  }

  async function copiar() {
    try { await navigator.clipboard.writeText(textoReclamacion(visibles)); setCopiado(true); setTimeout(() => setCopiado(false), 2500) }
    catch { setErrMsg('No se pudo copiar. Selecciona el texto a mano.') }
  }

  const btn = (color: string, relleno = false): React.CSSProperties => ({
    background: relleno ? color : ARENA, color: relleno ? BLANCO : INK, border: `2px solid ${color}`, borderRadius: 0,
    padding: '4px 10px', fontFamily: LEX, fontSize: 12, fontWeight: 700, cursor: 'pointer',
  })

  return (
    <>
      <PageNeo>
        <CabeceraNeo eyebrowTxt="Cade" titulo="Reclamaciones">
          <div style={{ fontSize: 13, fontWeight: 600, color: ARENA, opacity: 0.85, maxWidth: 420 }}>
            Cargos no habituales que aparecen en las liquidaciones (SPC negativos y deducciones). Tú decides cuáles se reclaman.
          </div>
        </CabeceraNeo>

        {errMsg && <AvisoNeo>ERROR: {errMsg}</AvisoNeo>}
        {totales.propuesta.eur > 0 && (
          <AvisoNeo>HAY {fmtEur(totales.propuesta.eur)} POR DECIDIR · {totales.propuesta.n} cargos.</AvisoNeo>
        )}

        <Banda bg={ARENA_CL}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18 }}>
            <KpiNeo label="Por decidir" valor={fmtEur(totales.propuesta.eur)} color={totales.propuesta.eur > 0 ? TERRA : OLIVA} sub={`${totales.propuesta.n} cargos`} />
            <KpiNeo label="Reclamadas" valor={fmtEur(totales.reclamada.eur)} color={AMBAR} sub={`${totales.reclamada.n} cargos · esperando a Cade`} />
            <KpiNeo label="Recuperadas" valor={fmtEur(totales.recuperada.eur)} color={OLIVA} sub={`${totales.recuperada.n} cargos`} />
          </div>
        </Banda>

        <Banda bg={BLANCO}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
            {ESTADOS_INC.map(e => (
              <button key={e} onClick={() => setVista(e)} style={btn(COLOR_INC[e], vista === e)}>
                {TXT_ESTADO[e]} ({totales[e].n})
              </button>
            ))}
            {visibles.length > 0 && (
              <button onClick={copiar} style={{ ...btn(NARANJA, true), marginLeft: 'auto' }}>
                {copiado ? 'Texto copiado' : 'Copiar texto para Cade'}
              </button>
            )}
          </div>

          {loading && <div style={{ color: GRIS, padding: 24, textAlign: 'center' }}>Cargando…</div>}
          {!loading && grupos.length === 0 && (
            <div style={{ color: GRIS, padding: 24, textAlign: 'center' }}>Nada en «{TXT_ESTADO[vista]}».</div>
          )}

          {grupos.map(g => (
            <div key={g.codigo} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 16, color: INK, textTransform: 'uppercase' }}>{g.codigo}</span>
                <BadgeNeo color={COLOR_INC[vista]}>{g.items.length} cargos · {fmtEur(g.eur)}</BadgeNeo>
                {vista === 'propuesta' && (
                  <>
                    <button style={btn(AMBAR, true)} onClick={() => cambiar(g.items.map(i => i.id), 'reclamada')}>Reclamar todos</button>
                    <button style={btn(MARINO)} onClick={() => cambiar(g.items.map(i => i.id), 'descartada')}>Descartar todos</button>
                  </>
                )}
              </div>
              <TablaWrap>
                <thead>
                  <tr>{['Fecha', 'Transportista', 'Importe', 'Detalle', ''].map(h => <th key={h} style={thNeo}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {g.items.map((i, k) => {
                    const alt = k % 2 === 1
                    return (
                      <tr key={i.id}>
                        <td style={{ ...tdEstado(alt, COLOR_INC[vista]), fontFamily: OSW, fontWeight: 700 }}>{fmtDate(i.fecha ?? '')}</td>
                        <td style={tdNeo(alt)}>{i.transportista ?? '—'}</td>
                        <td style={{ ...tdNeo(alt), textAlign: 'right', fontFamily: OSW, fontWeight: 700, fontSize: 15, color: TERRA }}>{fmtEur(Math.abs(i.importe))}</td>
                        <td style={{ ...tdNeo(alt), fontSize: 12, color: GRIS, maxWidth: 320 }}>{i.descripcion ?? ''}</td>
                        <td style={tdNeo(alt)}>
                          <select
                            value={i.estado}
                            disabled={saving === i.id}
                            onChange={e => cambiar([i.id], e.target.value as EstadoInc)}
                            style={{ background: ARENA, color: INK, border: `2px dashed ${NARANJA}`, borderRadius: 0, padding: '4px 8px', fontFamily: LEX, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                          >
                            {ESTADOS_INC.map(e => <option key={e} value={e}>{TXT_ESTADO[e]}</option>)}
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </TablaWrap>
            </div>
          ))}
        </Banda>
      </PageNeo>
      <HistoricoAnterior />
    </>
  )
}
