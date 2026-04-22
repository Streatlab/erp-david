import type { CSSProperties } from 'react'
import {
  useTheme,
  groupStyle,
  pageTitleStyle,
  FONT,
} from '@/styles/tokens'

const COLUMNS = ['Fecha', 'Zona', 'Rider', 'Cliente', 'Estado', 'Importe']

export default function Entregas() {
  const { T } = useTheme()

  const thStyle: CSSProperties = {
    fontFamily: FONT.heading,
    fontSize: 11,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    color: T.sec,
    padding: '10px 12px',
    textAlign: 'left',
    borderBottom: `1px solid ${T.brd}`,
    background: T.card,
    whiteSpace: 'nowrap',
  }

  const emptyStyle: CSSProperties = {
    padding: '40px 16px',
    textAlign: 'center',
    fontFamily: FONT.body,
    fontSize: 13,
    color: T.mut,
  }

  return (
    <div>
      <h1 style={pageTitleStyle(T)}>Entregas</h1>

      <div style={groupStyle(T)}>
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
