import type { ReactNode } from 'react'
import { useThemeMode, getTokens, FONT } from '@/styles/tokens'

export function ModTitle({ children }: { children: ReactNode }) {
  const theme = useThemeMode()
  const t = getTokens(theme)

  return (
    <h1
      style={{
        fontFamily: FONT.sans,
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: '0.22em',
        color: t.brandAccent,
        textTransform: 'uppercase',
        marginBottom: 26,
      }}
    >
      {children}
    </h1>
  )
}
