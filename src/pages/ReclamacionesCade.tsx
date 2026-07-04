import { useEffect, useMemo, useState } from 'react'
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

export default function ReclamacionesCade() {
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
      <CabeceraNeo eyebrowTxt="Cade" titulo="Reclamaciones">
        <div style={{ fontSize: 13, fontWeight: 600, color: ARENA, opacity: 0.85, maxWidth: 380 }}>
          Recortes e incidencias detectadas en liquidaciones. Todo lo abierto se reclama a Cade.
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
