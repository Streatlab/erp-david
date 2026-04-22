import { useLocation } from 'react-router-dom'
import { FONT, useTheme, pageTitleStyle, groupStyle } from '@/styles/tokens'

const LABELS: Record<string, string> = {
  'personal':         'Personal',
  'flota':            'Flota',
  'liquidacion-cade': 'Liquidación Cade',
  'punto-equilibrio': 'Punto Equilibrio',
  'contabilidad':     'Contabilidad',
  'hacienda':         'Hacienda',
  'operativa':        'Operativa',
}

export default function Placeholder() {
  const location = useLocation()
  const { T } = useTheme()
  const slug = location.pathname.split('/').filter(Boolean).pop() || ''
  const title = LABELS[slug] ?? slug.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase())

  return (
    <div>
      <h1 style={pageTitleStyle(T)}>{title}</h1>

      <div style={{ ...groupStyle(T), padding: '48px 28px', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: T.card,
            border: `1px solid ${T.brd}`,
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 24 }}>🚧</span>
        </div>
        <p style={{ fontFamily: FONT.heading, fontSize: 14, color: T.sec, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          En construcción
        </p>
        <p style={{ fontFamily: FONT.body, fontSize: 13, color: T.mut, marginTop: 8 }}>
          Este módulo está planificado y se implementará próximamente.
        </p>
        <code
          style={{
            display: 'inline-block',
            marginTop: 20,
            padding: '4px 12px',
            borderRadius: 4,
            fontFamily: 'monospace',
            fontSize: 11,
            background: T.bg,
            color: '#66aaff',
            border: `1px solid ${T.brd}`,
          }}
        >
          {location.pathname}
        </code>
      </div>
    </div>
  )
}
