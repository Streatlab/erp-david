import type { CSSProperties } from 'react'
import {
  useTheme,
  groupStyle,
  cardStyle,
  kpiLabelStyle,
  kpiValueStyle,
  pageTitleStyle,
  FONT,
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
  const { T } = useTheme()

  const hintStyle: CSSProperties = {
    fontFamily: FONT.body,
    fontSize: 11,
    color: T.mut,
    marginTop: 6,
  }

  return (
    <div>
      <h1 style={pageTitleStyle(T)}>Panel Global</h1>

      <div style={groupStyle(T)}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 14,
          }}
        >
          {KPIS.map(kpi => (
            <div key={kpi.label} style={cardStyle(T)}>
              <div style={kpiLabelStyle(T)}>{kpi.label}</div>
              <div style={{ ...kpiValueStyle(T), marginTop: 8 }}>{kpi.value}</div>
              <div style={hintStyle}>{kpi.hint}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
