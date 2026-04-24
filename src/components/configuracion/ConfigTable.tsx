import type { ReactNode, CSSProperties } from 'react'
import { useThemeMode, getTokens, FONT } from '@/styles/tokens'

export function Table({ children }: { children: ReactNode }) {
  return (
    <table
      style={{
        width: '100%',
        fontSize: 13.5,
        borderCollapse: 'collapse',
        fontFamily: FONT.sans,
      }}
    >
      {children}
    </table>
  )
}

export function THead({ children }: { children: ReactNode }) {
  return <thead>{children}</thead>
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>
}

export function TH({
  children,
  num = false,
  style,
}: {
  children: ReactNode
  num?: boolean
  style?: CSSProperties
}) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  return (
    <th
      style={{
        fontSize: 11,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: t.textTertiary,
        padding: 14,
        fontFamily: FONT.sans,
        fontWeight: 500,
        textAlign: num ? 'right' : 'left',
        borderBottom: `1px solid ${t.borderDefault}`,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </th>
  )
}

export function TR({
  children,
  onClick,
  style,
}: {
  children: ReactNode
  onClick?: () => void
  style?: CSSProperties
}) {
  return (
    <tr onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', ...style }}>
      {children}
    </tr>
  )
}

export function TD({
  children,
  num = false,
  bold = false,
  muted = false,
  style,
  colSpan,
}: {
  children: ReactNode
  num?: boolean
  bold?: boolean
  muted?: boolean
  style?: CSSProperties
  colSpan?: number
}) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  return (
    <td
      colSpan={colSpan}
      style={{
        padding: 14,
        borderBottom: `1px solid ${t.borderSubtle}`,
        color: muted ? t.textTertiary : t.textPrimary,
        fontWeight: bold ? 700 : 500,
        textAlign: num ? 'right' : 'left',
        fontVariantNumeric: num ? 'tabular-nums' : 'normal',
        ...style,
      }}
    >
      {children}
    </td>
  )
}

export function TotalTR({ children }: { children: ReactNode }) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  return (
    <tr style={{ borderTop: `2px solid ${t.borderStrong}`, fontWeight: 700 }}>
      {children}
    </tr>
  )
}
