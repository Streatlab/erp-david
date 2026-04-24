import type { ReactNode, InputHTMLAttributes, ButtonHTMLAttributes } from 'react'
import { useThemeMode, getTokens, FONT } from '@/styles/tokens'
import { Search } from 'lucide-react'

export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        flexWrap: 'wrap',
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  )
}

export function Spacer() {
  return <div style={{ flex: 1 }} />
}

export function BtnRed({ children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  return (
    <button
      {...rest}
      style={{
        padding: '9px 16px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.04em',
        background: t.brandAccent,
        color: t.textOnAccent,
        border: 'none',
        cursor: 'pointer',
        fontFamily: FONT.sans,
        textTransform: 'uppercase',
        transition: 'filter 0.15s',
        ...rest.style,
      }}
      onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
      onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
    >
      {children}
    </button>
  )
}

export function BtnGhost({ children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  return (
    <button
      {...rest}
      style={{
        padding: '9px 16px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.04em',
        background: t.bgSurface,
        color: t.textPrimary,
        border: `1px solid ${t.borderDefault}`,
        cursor: 'pointer',
        fontFamily: FONT.sans,
        textTransform: 'uppercase',
        transition: 'filter 0.15s',
        ...rest.style,
      }}
    >
      {children}
    </button>
  )
}

export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      <Search
        size={14}
        color={t.textTertiary}
        style={{ position: 'absolute', left: 10, pointerEvents: 'none' }}
      />
      <input
        {...props}
        style={{
          background: t.bgSurfaceAlt,
          border: `1px solid ${t.borderDefault}`,
          borderRadius: 8,
          padding: '8px 12px 8px 30px',
          fontSize: 13,
          color: t.textPrimary,
          fontFamily: FONT.sans,
          outline: 'none',
          minWidth: 260,
          ...props.style,
        }}
      />
    </div>
  )
}
