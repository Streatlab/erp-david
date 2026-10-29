import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmtEur } from '@/lib/format'
import { OLIVA, NARANJA, TERRA, GRIS, BLANCO, INK, OSW, AMBAR, CELESTE, ARENA_CL } from '@/styles/neobrutal'
import {
  PageNeo, Banda, CabeceraNeo, HeroNeo, AvisoNeo,
  TablaWrap, thNeo, tdNeo, tdEstado, BadgeNeo,
} from '@/components/neo/NeoUI'
import CicloPagoCade from '@/components/facturacion/CicloPagoCade'
import { cuadrar } from '@/lib/liquidacionCade'

/* Estado que escribe el robot lector: qué significa para David y de qué color va */
const ESTADO_LIQ: Record<string, { txt: string; color: string }> = {
  recibida: { txt: 'Recibida', color: AMBAR }, leida: { txt: 'Leída', color: AMBAR }, cuadrada: { txt: 'Cuadrada', color: OLIVA },
  facturada: { txt: 'Facturada', color: CELESTE }, facturada_fuera_erp: { txt: 'Facturada fuera', color: GRIS },
  enviada: { txt: 'Enviada', color: CELESTE }, cobrada: { txt: 'Cobrada', color: OLIVA }, error_cuadre: { txt: 'No cuadra', color: TERRA },
}

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
  total_pdf: number | null
  estado: string | null
  alertas: string[] | null
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
        <CicloPagoCade prefijo="Una liquidación mensual por transportista. " />
      </CabeceraNeo>

      <HeroNeo
        eyebrowTxt="Total liquidado por Cade"
        cifra={loading || liqs.length === 0 ? '—' : fmtEur(kpis.total)}
        frase={loading || liqs.length === 0 ? 'Sin datos todavía'
          : kpis.recortes !== 0 ? `Cade te ha recortado ${fmtEur(Math.abs(kpis.recortes))}. Revisa el detalle y reclama.` : 'Sin recortes. Lo liquidado cuadra.'}
        color={loading || liqs.length === 0 ? undefined : kpis.recortes !== 0 ? NARANJA : OLIVA}
        apoyo={liqs.length === 0 ? undefined : [
          { label: 'Entregas', valor: fmtNum(kpis.entregas) },
          { label: 'Complementos mínimo', valor: fmtEur(kpis.complementos) },
          { label: 'Recortes', valor: fmtEur(kpis.recortes) },
        ]}
      />

      {errMsg && <AvisoNeo>ERROR: {errMsg}</AvisoNeo>}

      {kpis.recortes !== 0 && (
        <AvisoNeo>
          CADE TE HA RECORTADO {fmtEur(Math.abs(kpis.recortes))}. Clic en cada fila con recorte para ver el detalle y reclamar.
        </AvisoNeo>
      )}

      <Banda bg={BLANCO}>
        <TablaWrap>
          <thead>
            <tr>
              {['Mes', 'Transportista', 'Emisor', 'Entregas', 'Importe entregas', 'Complemento', 'Recortes', 'Total', 'Estado', 'Alertas', 'Factura'].map(h => (
                <th key={h} style={thNeo}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={11} style={{ ...tdNeo(false), textAlign: 'center', color: GRIS, padding: 32 }}>Cargando…</td></tr>
            )}
            {!loading && liqs.length === 0 && (
              <tr><td colSpan={11} style={{ ...tdNeo(false), textAlign: 'center', color: GRIS, padding: 32 }}>Sin liquidaciones cargadas todavía.</td></tr>
            )}
            {liqs.map((l, i) => {
              const alt = i % 2 === 1
              const hayRecortes = (l.recortes ?? 0) !== 0
              const alertas = Array.isArray(l.alertas) ? l.alertas : []
              const cuadre = cuadrar([{ fecha: '', entregas: 0, importe_entregas: 0, garantia_aplicada: 0, penalizacion: 0, penalizacion_motivo: null, extra: 0, total_linea: Number(l.total ?? 0) }], l.total_pdf)
              const noCuadra = l.total_pdf != null && !cuadre.cuadra
              const est = ESTADO_LIQ[l.estado ?? ''] ?? (l.estado ? { txt: l.estado, color: GRIS } : null)
              const estadoColor = noCuadra ? TERRA : hayRecortes ? NARANJA : alertas.length ? AMBAR : OLIVA
              const abrible = hayRecortes || alertas.length > 0 || noCuadra
              const open = abierta === l.id
              return (
                <FragmentRow key={l.id}>
                  <tr onClick={abrible ? () => setAbierta(open ? null : l.id) : undefined} style={{ cursor: abrible ? 'pointer' : 'default' }}>
                    <td style={{ ...tdEstado(alt, estadoColor), fontFamily: OSW, fontWeight: 700, textTransform: 'capitalize' }}>{fmtMes(l.mes)}</td>
                    <td style={tdNeo(alt)}>{l.transportista ?? '—'}</td>
                    <td style={tdNeo(alt)}>
                      <BadgeNeo color={(l.emisor ?? '').toUpperCase() === 'JUAN' ? AMBAR : '#16355C'}>{l.emisor ?? '—'}</BadgeNeo>
                    </td>
                    <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{fmtNum(l.entregas)}</td>
                    <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{fmtEur(l.importe_entregas)}</td>
                    <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{fmtEur(l.complemento_minimo)}</td>
                    <td style={{ ...tdNeo(alt), textAlign: 'right', color: hayRecortes ? TERRA : GRIS, fontFamily: OSW, fontWeight: hayRecortes ? 700 : 600 }}>
                      {hayRecortes ? fmtEur(l.recortes) : '—'}
                    </td>
                    <td style={{ ...tdNeo(alt), textAlign: 'right', fontFamily: OSW, fontWeight: 700, fontSize: 15, color: noCuadra ? TERRA : INK }}>{fmtEur(l.total)}</td>
                    <td style={tdNeo(alt)}>{noCuadra ? <BadgeNeo color={TERRA}>No cuadra</BadgeNeo> : est ? <BadgeNeo color={est.color}>{est.txt}</BadgeNeo> : <span style={{ color: GRIS }}>—</span>}</td>
                    <td style={tdNeo(alt)}>{alertas.length ? <BadgeNeo color={AMBAR}>{alertas.length} {open ? '▾' : '▸'}</BadgeNeo> : <span style={{ color: GRIS }}>—</span>}</td>
                    <td style={tdNeo(alt)}>{l.factura_id ? <BadgeNeo color={OLIVA}>Vinculada</BadgeNeo> : <span style={{ color: GRIS }}>—</span>}</td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={11} style={{ padding: '12px 16px', background: ARENA_CL, color: INK, fontSize: 12, fontWeight: 600, whiteSpace: 'pre-wrap', borderBottom: `3px solid ${INK}` }}>
                        {noCuadra && <div style={{ color: TERRA, marginBottom: 6 }}>No cuadra: el ERP suma {fmtEur(cuadre.sumaLineas)} y el PDF de Cade dice {fmtEur(l.total_pdf)} (diferencia {fmtEur(cuadre.diferencia)}). No facturar hasta aclararlo.</div>}
                        {alertas.map((a, k) => <div key={k}>• {a}</div>)}
                        {l.recortes_detalle && <div style={{ marginTop: alertas.length ? 8 : 0, color: TERRA }}>{l.recortes_detalle}</div>}
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
