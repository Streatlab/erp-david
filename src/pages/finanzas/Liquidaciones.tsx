import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmtEur } from '@/lib/format'
import { OLIVA, TERRA, CELESTE, GRIS, ARENA_CL, BLANCO, ARENA, INK, OSW } from '@/styles/neobrutal'
import {
  PageNeo, Banda, CabeceraNeo, KpiNeo, AvisoNeo,
  TablaWrap, thNeo, tdNeo, tdEstado, BadgeNeo,
} from '@/components/neo/NeoUI'

interface Liquidacion {
  id: string
  transportista: string | null
  emisor: string | null
  mes: string | null
  entregas: number | null
  importe_entregas: number | null
  complemento_minimo: number | null
  recortes: number | null
  recortes_detalle: string | null
  total: number | null
  factura_id: string | null
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function fmtMes(mes: string | null): string {
  if (!mes) return '—'
  const d = new Date(mes + 'T00:00:00')
  if (isNaN(d.getTime())) return mes
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`
}

const fmtNum = (n: number | null | undefined) =>
  n == null ? '—' : Math.round(n).toLocaleString('es-ES')

export default function Liquidaciones() {
  const [liqs, setLiqs] = useState<Liquidacion[]>([])
  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [abierta, setAbierta] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('liquidaciones_cade')
        .select('*')
        .order('mes', { ascending: false })
        .order('transportista', { ascending: true })
      if (error) setErrMsg(error.message)
      setLiqs((data ?? []) as Liquidacion[])
      setLoading(false)
    })()
  }, [])

  const kpis = useMemo(() => ({
    total: liqs.reduce((s, l) => s + (l.total ?? 0), 0),
    entregas: liqs.reduce((s, l) => s + (l.entregas ?? 0), 0),
    complementos: liqs.reduce((s, l) => s + (l.complemento_minimo ?? 0), 0),
    recortes: liqs.reduce((s, l) => s + (l.recortes ?? 0), 0),
  }), [liqs])

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Finanzas" titulo="Liquidaciones Cade">
        <div style={{ fontSize: 13, fontWeight: 600, color: ARENA, opacity: 0.85, maxWidth: 380 }}>
          Una liquidación mensual por transportista. Cade paga el 10–15 del mes siguiente.
        </div>
      </CabeceraNeo>

      {errMsg && <AvisoNeo>ERROR: {errMsg}</AvisoNeo>}

      {kpis.recortes !== 0 && (
        <AvisoNeo>
          CADE TE HA RECORTADO {fmtEur(Math.abs(kpis.recortes))}. Clic en cada fila con recorte para ver el detalle y reclamar.
        </AvisoNeo>
      )}

      {/* KPIs: ¿qué me paga y qué me recorta Cade? */}
      <Banda bg={ARENA_CL}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
          <KpiNeo label="Total liquidado" valor={fmtEur(kpis.total)} color={OLIVA} />
          <KpiNeo label="Entregas" valor={fmtNum(kpis.entregas)} />
          <KpiNeo label="Complementos mínimo" valor={fmtEur(kpis.complementos)} color={CELESTE} />
          <KpiNeo label="Recortes detectados" valor={fmtEur(kpis.recortes)} color={kpis.recortes !== 0 ? TERRA : OLIVA} sub={kpis.recortes !== 0 ? 'Dinero que te quitan' : 'Sin recortes'} />
        </div>
      </Banda>

      <Banda bg={BLANCO}>
        <TablaWrap>
          <thead>
            <tr>
              {['Mes', 'Transportista', 'Emisor', 'Entregas', 'Importe entregas', 'Complemento', 'Recortes', 'Total', 'Factura'].map(h => (
                <th key={h} style={thNeo}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} style={{ ...tdNeo(false), textAlign: 'center', color: GRIS, padding: 32 }}>Cargando…</td></tr>
            )}
            {!loading && liqs.length === 0 && (
              <tr><td colSpan={9} style={{ ...tdNeo(false), textAlign: 'center', color: GRIS, padding: 32 }}>Sin liquidaciones cargadas todavía.</td></tr>
            )}
            {liqs.map((l, i) => {
              const alt = i % 2 === 1
              const hayRecortes = (l.recortes ?? 0) !== 0
              const estadoColor = hayRecortes ? TERRA : OLIVA
              const open = abierta === l.id
              return (
                <FragmentRow key={l.id}>
                  <tr onClick={hayRecortes ? () => setAbierta(open ? null : l.id) : undefined} style={{ cursor: hayRecortes ? 'pointer' : 'default' }}>
                    <td style={{ ...tdEstado(alt, estadoColor), fontFamily: OSW, fontWeight: 700, textTransform: 'capitalize' }}>{fmtMes(l.mes)}</td>
                    <td style={tdNeo(alt)}>{l.transportista ?? '—'}</td>
                    <td style={tdNeo(alt)}>
                      <BadgeNeo color={(l.emisor ?? '').toUpperCase() === 'JUAN' ? '#F5B84A' : '#16355C'}>{l.emisor ?? '—'}</BadgeNeo>
                    </td>
                    <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{fmtNum(l.entregas)}</td>
                    <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{fmtEur(l.importe_entregas)}</td>
                    <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{fmtEur(l.complemento_minimo)}</td>
                    <td style={{ ...tdNeo(alt), textAlign: 'right', color: hayRecortes ? TERRA : GRIS, fontFamily: OSW, fontWeight: hayRecortes ? 700 : 600 }}>
                      {hayRecortes ? `${fmtEur(l.recortes)} ${open ? '▾' : '▸'}` : '—'}
                    </td>
                    <td style={{ ...tdNeo(alt), textAlign: 'right', fontFamily: OSW, fontWeight: 700, fontSize: 15 }}>{fmtEur(l.total)}</td>
                    <td style={tdNeo(alt)}>{l.factura_id ? <BadgeNeo color={OLIVA}>VINCULADA</BadgeNeo> : <span style={{ color: GRIS }}>—</span>}</td>
                  </tr>
                  {open && l.recortes_detalle && (
                    <tr>
                      <td colSpan={9} style={{ padding: '12px 16px', background: TERRA, color: ARENA, fontSize: 12, fontWeight: 600, whiteSpace: 'pre-wrap', borderBottom: `3px solid ${INK}` }}>
                        {l.recortes_detalle}
                      </td>
                    </tr>
                  )}
                </FragmentRow>
              )
            })}
          </tbody>
        </TablaWrap>
      </Banda>
    </PageNeo>
  )
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
