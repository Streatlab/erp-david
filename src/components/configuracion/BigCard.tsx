import type { ReactNode } from 'react'
import { useTheme, getTokens, FONT } from '@/styles/tokens'

export function BigCard({
  title,
  count,
  children,
}: {
  title: ReactNode
  count?: ReactNode
  children: ReactNode
}) {
  const theme = useTheme()
  const t = getTokens(theme)

  return (
    <div
      style={{
        background: t.bgSurface,
        border: `1px solid ${t.borderDefault}`,
        borderRadius: 12,
        padding: '24px 26px',
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontFamily: FONT.sans,
          fontSize: 11,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: t.textTertiary,
          fontWeight: 500,
          marginBottom: 20,
        }}
      >
        {title}
        {count != null && (
          <span
            style={{
              color: t.textPrimary,
              fontWeight: 400,
              marginLeft: 6,
              letterSpacing: '0.04em',
              textTransform: 'none',
            }}
          >
            · {count}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}
