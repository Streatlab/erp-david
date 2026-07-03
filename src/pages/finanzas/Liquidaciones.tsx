import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'
import {
  useThemeMode, getTokens, cardStyle, badgeStyle,
  fmtEur, fmtNum,
  FONT, FS, FW, SPACE, RADIUS, TRACKING,
} from '@/styles/tokens'

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

export default function Liquidaciones() {
  const theme = useThemeMode()
  const t = getTokens(theme)

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[5] }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: FONT.title, fontSize: 22, fontWeight: FW.bold, color: t.brandAccent, letterSpacing: TRACKING.wider, textTransform: 'uppercase' }}>
          Liquidaciones Cade
        </h1>
        <div style={{ marginTop: 4, fontFamily: FONT.body, fontSize: FS.sm, color: t.textTertiary }}>
          Una liquidación mensual por código de transportista. Cade paga el 10–15 del mes siguiente.
        </div>
      </div>

      {errMsg && (
        <div style={{ background: t.dangerBg, color: t.dangerText, border: `1px solid ${t.dangerBorder}`, padding: SPACE[4], borderRadius: RADIUS.md, fontFamily: FONT.body, fontSize: FS.sm }}>
          Error: {errMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: SPACE[4] }}>
        <Kpi label="Total liquidado" value={fmtEur(kpis.total)} />
        <Kpi label="Entregas" value={fmtNum(kpis.entregas)} />
        <Kpi label="Complementos mínimo" value={fmtEur(kpis.complementos)} />
        <Kpi label="Recortes detectados" value={fmtEur(kpis.recortes)} danger={kpis.recortes !== 0} />
      </div>

      <div style={{ ...cardStyle(theme), padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT.body, fontSize: FS.sm }}>
          <thead>
            <tr>
              {['Mes', 'Transportista', 'Emisor', 'Entregas', 'Importe entregas', 'Complemento', 'Recortes', 'Total', 'Factura'].map(h => (
                <th key={h} style={th(t)}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} style={{ ...td(t), textAlign: 'center', color: t.textTertiary, padding: SPACE[8] }}>Cargando…</td></tr>
            )}
            {!loading && liqs.length === 0 && (
              <tr><td colSpan={9} style={{ ...td(t), textAlign: 'center', color: t.textTertiary, padding: SPACE[8] }}>Sin liquidaciones cargadas todavía.</td></tr>
            )}
            {liqs.map(l => (
              <LiqRow key={l.id} l={l} abierta={abierta === l.id} onToggle={() => setAbierta(abierta === l.id ? null : l.id)} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LiqRow({ l, abierta, onToggle }: { l: Liquidacion; abierta: boolean; onToggle: () => void }) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  const hayRecortes = (l.recortes ?? 0) !== 0
  return (
    <>
      <tr onClick={hayRecortes ? onToggle : undefined} style={{ cursor: hayRecortes ? 'pointer' : 'default' }}>
        <td style={{ ...td(t), fontWeight: FW.bold, textTransform: 'capitalize' }}>{fmtMes(l.mes)}</td>
        <td style={td(t)}>{l.transportista ?? '—'}</td>
        <td style={td(t)}>
          <span style={badgeStyle(theme, (l.emisor ?? '').toUpperCase() === 'JUAN' ? 'ambar' : 'marino')}>{l.emisor ?? '—'}</span>
        </td>
        <td style={{ ...td(t), textAlign: 'right' }}>{fmtNum(l.entregas)}</td>
        <td style={{ ...td(t), textAlign: 'right' }}>{fmtEur(l.importe_entregas)}</td>
        <td style={{ ...td(t), textAlign: 'right' }}>{fmtEur(l.complemento_minimo)}</td>
        <td style={{ ...td(t), textAlign: 'right', color: hayRecortes ? t.dangerText : t.textSecondary, fontWeight: hayRecortes ? FW.bold : FW.regular }}>
          {hayRecortes ? `${fmtEur(l.recortes)} ${abierta ? '▾' : '▸'}` : '—'}
        </td>
        <td style={{ ...td(t), textAlign: 'right', fontWeight: FW.bold }}>{fmtEur(l.total)}</td>
        <td style={td(t)}>{l.factura_id ? <span style={badgeStyle(theme, 'oliva')}>VINCULADA</span> : <span style={{ color: t.textTertiary }}>—</span>}</td>
      </tr>
      {abierta && l.recortes_detalle && (
        <tr>
          <td colSpan={9} style={{ ...td(t), background: t.dangerBg, color: t.dangerText, fontSize: FS.xs, whiteSpace: 'pre-wrap' }}>
            {l.recortes_detalle}
          </td>
        </tr>
      )}
    </>
  )
}

function Kpi({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  return (
    <div style={cardStyle(theme)}>
      <div style={{ fontSize: FS['2xs'], letterSpacing: TRACKING.wide, textTransform: 'uppercase', color: t.textSecondary, fontWeight: FW.medium, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: FS.xl, fontWeight: FW.bold, color: danger ? t.danger : t.textPrimary, lineHeight: 1.15, letterSpacing: TRACKING.tight }}>{value}</div>
    </div>
  )
}

function th(t: ReturnType<typeof getTokens>): CSSProperties {
  return {
    textAlign: 'left', padding: '10px 12px', fontSize: FS['2xs'], letterSpacing: TRACKING.wide,
    textTransform: 'uppercase', color: t.textSecondary, fontWeight: FW.medium,
    borderBottom: `0.5px solid ${t.borderDefault}`, whiteSpace: 'nowrap',
  }
}

function td(t: ReturnType<typeof getTokens>): CSSProperties {
  return { padding: '8px 12px', borderBottom: `0.5px solid ${t.borderSubtle}`, color: t.textPrimary }
}
