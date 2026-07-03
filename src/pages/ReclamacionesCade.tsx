import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'
import {
  useThemeMode, getTokens, cardStyle, badgeStyle,
  fmtEur, fmtDate,
  FONT, FS, FW, SPACE, RADIUS, TRACKING,
} from '@/styles/tokens'

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
const BADGE_VARIANT: Record<string, 'terra' | 'ambar' | 'oliva' | 'marino'> = {
  PENDIENTE: 'terra',
  RECLAMADA: 'ambar',
  RECUPERADA: 'oliva',
  DESESTIMADA: 'marino',
}

export default function ReclamacionesCade() {
  const theme = useThemeMode()
  const t = getTokens(theme)

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[5] }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: FONT.title, fontSize: 22, fontWeight: FW.bold, color: t.brandAccent, letterSpacing: TRACKING.wider, textTransform: 'uppercase' }}>
          Reclamaciones Cade
        </h1>
        <div style={{ marginTop: 4, fontFamily: FONT.body, fontSize: FS.sm, color: t.textTertiary }}>
          Recortes e incidencias detectadas en liquidaciones. Todo lo abierto se reclama a Cade.
        </div>
      </div>

      {errMsg && (
        <div style={{ background: t.dangerBg, color: t.dangerText, border: `1px solid ${t.dangerBorder}`, padding: SPACE[4], borderRadius: RADIUS.md, fontFamily: FONT.body, fontSize: FS.sm }}>
          Error: {errMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: SPACE[4] }}>
        <Kpi label="Reclamable abierto" value={fmtEur(kpis.importeAbierto)} danger={kpis.importeAbierto > 0} sub={`${kpis.abiertas} incidencias`} />
        <Kpi label="Recuperado" value={fmtEur(kpis.recuperado)} />
        <Kpi label="Incidencias totales" value={String(kpis.total)} />
      </div>

      <div style={{ ...cardStyle(theme), padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT.body, fontSize: FS.sm }}>
          <thead>
            <tr>
              {['Fecha', 'Transportista', 'Emisor', 'Concepto', 'Importe', 'Estado', 'Notas', ''].map(h => (
                <th key={h} style={th(t)}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} style={{ ...td(t), textAlign: 'center', color: t.textTertiary, padding: SPACE[8] }}>Cargando…</td></tr>
            )}
            {!loading && recs.length === 0 && (
              <tr><td colSpan={8} style={{ ...td(t), textAlign: 'center', color: t.textTertiary, padding: SPACE[8] }}>Sin incidencias registradas.</td></tr>
            )}
            {recs.map(r => (
              <tr key={r.id}>
                <td style={td(t)}>{fmtDate(r.fecha_incidencia)}</td>
                <td style={td(t)}>{r.transportista ?? '—'}</td>
                <td style={td(t)}>
                  <span style={badgeStyle(theme, (r.emisor ?? '').toUpperCase() === 'JUAN' ? 'ambar' : 'marino')}>{r.emisor ?? '—'}</span>
                </td>
                <td style={{ ...td(t), maxWidth: 280 }}>{r.concepto ?? '—'}</td>
                <td style={{ ...td(t), textAlign: 'right', fontWeight: FW.bold, color: t.dangerText }}>{fmtEur(r.importe)}</td>
                <td style={td(t)}>
                  <span style={badgeStyle(theme, BADGE_VARIANT[r.estado] ?? 'marino')}>{r.estado}</span>
                </td>
                <td style={{ ...td(t), fontSize: FS.xs, color: t.textSecondary, maxWidth: 240 }}>{r.notas ?? ''}</td>
                <td style={td(t)}>
                  <select
                    value={r.estado}
                    disabled={saving === r.id}
                    onChange={e => setEstado(r, e.target.value)}
                    style={{
                      background: t.bgSurfaceAlt, color: t.textPrimary, border: `0.5px solid ${t.borderDefault}`,
                      borderRadius: RADIUS.sm, padding: '4px 8px', fontFamily: FONT.body, fontSize: FS.xs, cursor: 'pointer',
                    }}
                  >
                    {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Kpi({ label, value, sub, danger }: { label: string; value: string; sub?: string; danger?: boolean }) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  return (
    <div style={cardStyle(theme)}>
      <div style={{ fontSize: FS['2xs'], letterSpacing: TRACKING.wide, textTransform: 'uppercase', color: t.textSecondary, fontWeight: FW.medium, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: FS.xl, fontWeight: FW.bold, color: danger ? t.danger : t.textPrimary, lineHeight: 1.15, letterSpacing: TRACKING.tight }}>{value}</div>
      {sub && <div style={{ marginTop: 4, fontSize: FS.xs, color: t.textTertiary, fontFamily: FONT.body }}>{sub}</div>}
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
