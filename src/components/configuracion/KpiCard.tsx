import type { ReactNode } from 'react'
import { useThemeMode, getTokens, FONT } from '@/styles/tokens'

type SubTone = 'pos' | 'neg' | 'muted'

export function KpiCard({
  label,
  value,
  unit,
  sub,
  subTone = 'muted',
}: {
  label: string
  value: ReactNode
  unit?: string
  sub?: string
  subTone?: SubTone
}) {
  const theme = useThemeMode()
  const t = getTokens(theme)

  const subColor =
    subTone === 'pos' ? t.success :
    subTone === 'neg' ? t.danger :
    t.textTertiary
  const subPrefix = subTone === 'pos' ? '▲ ' : subTone === 'neg' ? '▼ ' : ''

  return (
    <div
      style={{
        background: t.bgSurface,
        border: `1px solid ${t.borderDefault}`,
        borderRadius: 12,
        padding: '24px 26px',
      }}
    >
      <div
        style={{
          fontFamily: FONT.sans,
          fontSize: 11,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: t.textTertiary,
          fontWeight: 500,
          marginBottom: 12,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: FONT.sans,
          fontSize: 38,
          fontWeight: 700,
          color: t.textPrimary,
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: 24, fontWeight: 700, color: t.textPrimary, marginLeft: 4 }}>
            {unit}
          </span>
        )}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: FONT.sans,
            fontSize: 12,
            color: subColor,
            marginTop: 10,
          }}
        >
          {subPrefix}{sub}
        </div>
      )}
    </div>
  )
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 14,
        marginBottom: 20,
      }}
    >
      {children}
    </div>
  )
}
