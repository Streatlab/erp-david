import type { CSSProperties } from 'react'
import {
  useTheme,
  getTokens,
  FONT,
  FS,
  FW,
  RADIUS,
  SPACE,
  TRACKING,
} from '@/styles/tokens'

const COLUMNS = ['Fecha', 'Zona', 'Rider', 'Cliente', 'Estado', 'Importe']

export default function Entregas() {
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

  const tableWrapStyle: CSSProperties = {
    background: t.bgSurface,
    border: `0.5px solid ${t.borderDefault}`,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  }

  const thStyle: CSSProperties = {
    fontFamily: FONT.sans,
    fontSize: FS['2xs'],
    letterSpacing: TRACKING.wide,
    textTransform: 'uppercase',
    fontWeight: FW.medium,
    color: t.textSecondary,
    padding: '12px 14px',
    textAlign: 'left',
    borderBottom: `0.5px solid ${t.borderSubtle}`,
    background: t.bgSurfaceAlt,
    whiteSpace: 'nowrap',
  }

  const emptyStyle: CSSProperties = {
    padding: '48px 16px',
    textAlign: 'center',
    fontFamily: FONT.sans,
    fontSize: FS.sm,
    color: t.textSecondary,
  }

  return (
    <div>
      <h1 style={pageTitleStyle}>Entregas</h1>

      <div style={tableWrapStyle}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {COLUMNS.map(col => (
                  <th key={col} style={thStyle}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={COLUMNS.length} style={emptyStyle}>
                  Sin entregas registradas.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
