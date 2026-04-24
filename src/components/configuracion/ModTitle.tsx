import type { ReactNode } from 'react'
import { FONT } from '@/styles/tokens'

export function ModTitle({ children }: { children: ReactNode }) {
  return (
    <h1
      style={{
        fontFamily: FONT.sans,
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: '0.22em',
        color: '#B01D23',
        textTransform: 'uppercase',
        marginBottom: 26,
      }}
    >
      {children}
    </h1>
  )
}
