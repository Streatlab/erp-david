import type { CSSProperties } from 'react'
import {
  useTheme,
  getTokens,
  cardStyle,
  labelStyle,
  kpiStyle,
  FONT,
  FS,
  FW,
  SPACE,
  TRACKING,
} from '@/styles/tokens'

interface KpiCard {
  label: string
  value: string
  hint: string
}

const KPIS: KpiCard[] = [
  { label: 'Entregas hoy',    value: '—', hint: 'Pendiente integrar' },
  { label: 'Riders activos',  value: '—', hint: 'Pendiente integrar' },
  { label: 'Rutas en curso',  value: '—', hint: 'Pendiente integrar' },
  { label: 'Facturación mes', value: '—', hint: 'Pendiente integrar' },
]

export default function Dashboard() {
  const theme = useTheme()
  const t = getTokens(theme)

  const pageTitleStyle: CSSProperties = {
    fontFamily: FONT.sans,
    fontSize: FS.xs,
    letterSpacing: TRACKING.wider,
    color: t.brandAccent,
    textTransform: 'uppercase',
    fontWeight: FW.bold,
    margin: 0,
    marginBottom: SPACE[4],
  }

  const hintStyle: CSSProperties = {
    fontFamily: FONT.sans,
    fontSize: FS.xs,
    color: t.textTertiary,
    marginTop: SPACE[1],
  }

  return (
    <div>
      <h1 style={pageTitleStyle}>Panel global</h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: SPACE[4],
        }}
      >
        {KPIS.map(kpi => (
          <div key={kpi.label} style={cardStyle(theme)}>
            <div style={labelStyle(theme)}>{kpi.label}</div>
            <div style={{ ...kpiStyle(theme), marginTop: SPACE[2] }}>{kpi.value}</div>
            <div style={hintStyle}>{kpi.hint}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
