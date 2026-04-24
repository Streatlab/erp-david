import type { CSSProperties } from 'react'
import { useLocation } from 'react-router-dom'
import { Construction } from 'lucide-react'
import {
  useThemeMode,
  getTokens,
  cardStyle,
  FONT,
  FS,
  FW,
  RADIUS,
  SPACE,
  TRACKING,
} from '@/styles/tokens'

const LABELS: Record<string, string> = {
  'personal':         'Personal',
  'flota':            'Flota',
  'liquidacion-cade': 'Liquidación Cade',
  'punto-equilibrio': 'Punto equilibrio',
  'contabilidad':     'Contabilidad',
  'hacienda':         'Hacienda',
  'operativa':        'Operativa',
}

export default function Placeholder() {
  const location = useLocation()
  const theme = useThemeMode()
  const t = getTokens(theme)
  const slug = location.pathname.split('/').filter(Boolean).pop() || ''
  const title = LABELS[slug] ?? slug.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase())

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

  return (
    <div>
      <h1 style={pageTitleStyle}>{title}</h1>

      <div style={{ ...cardStyle(theme), padding: '48px 28px', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: RADIUS.pill,
            background: t.bgSurfaceAlt,
            border: `0.5px solid ${t.borderDefault}`,
            color: t.brandPrimary,
            marginBottom: SPACE[4],
          }}
        >
          <Construction size={24} strokeWidth={1.5} />
        </div>
        <p style={{
          fontFamily: FONT.sans,
          fontSize: FS.xs,
          color: t.textSecondary,
          letterSpacing: TRACKING.wide,
          textTransform: 'uppercase',
          fontWeight: FW.medium,
          margin: 0,
        }}>
          En construcción
        </p>
        <p style={{
          fontFamily: FONT.sans,
          fontSize: FS.sm,
          color: t.textSecondary,
          marginTop: SPACE[2],
        }}>
          Este módulo está planificado y se implementará próximamente.
        </p>
        <code
          style={{
            display: 'inline-block',
            marginTop: SPACE[5],
            padding: '4px 12px',
            borderRadius: RADIUS.sm,
            fontFamily: FONT.mono,
            fontSize: FS.xs,
            background: t.bgSurfaceAlt,
            color: t.brandPrimary,
            border: `0.5px solid ${t.borderSubtle}`,
            fontWeight: FW.medium,
          }}
        >
          {location.pathname}
        </code>
      </div>
    </div>
  )
}
