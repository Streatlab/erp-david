import type { CSSProperties } from 'react'
import { useThemeMode, getTokens, FONT, FS, FW, SPACE, RADIUS, TRACKING } from '@/styles/tokens'

export function fmtMoney(v: number, decimals = 0): string {
  if (!isFinite(v)) return '— €'
  return v.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + ' €'
}

export function fmtMoneyShort(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(1).replace('.', ',') + 'M €'
  if (abs >= 10_000)    return Math.round(v / 1000) + 'k €'
  return Math.round(v).toLocaleString('es-ES') + ' €'
}

export function fmtPct(v: number, decimals = 1): string {
  if (!isFinite(v) || isNaN(v)) return '—'
  return (v * 100).toFixed(decimals).replace('.', ',') + '%'
}

export function fmtDelta(delta: number | null, theme: 'light' | 'dark') {
  if (delta == null || !isFinite(delta)) return { txt: 'sin histórico', color: getTokens(theme).textTertiary }
  const t = getTokens(theme)
  const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '·'
  const color = delta > 0 ? t.success : delta < 0 ? t.danger : t.textTertiary
  return { txt: `${arrow} ${(Math.abs(delta) * 100).toFixed(1).replace('.', ',')}%`, color }
}

export function CardBase({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  return (
    <div
      style={{
        background: t.bgSurface,
        border: `0.5px solid ${t.borderDefault}`,
        borderRadius: RADIUS.lg,
        padding: SPACE[6],
        display: 'flex',
        flexDirection: 'column',
        gap: SPACE[4],
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function Label({ children }: { children: React.ReactNode }) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  return (
    <div
      style={{
        fontFamily: FONT.title,
        fontSize: FS.xs,
        letterSpacing: TRACKING.wide,
        textTransform: 'uppercase',
        color: t.textSecondary,
        fontWeight: FW.bold,
      }}
    >
      {children}
    </div>
  )
}

export function HugeNumber({
  value, color, size = 36,
}: { value: string; color?: string; size?: number }) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  return (
    <div
      style={{
        fontFamily: FONT.title,
        fontSize: size,
        fontWeight: FW.bold,
        lineHeight: 1.05,
        color: color ?? t.brandPrimary,
        letterSpacing: '-0.01em',
      }}
    >
      {value}
    </div>
  )
}

export function Separator() {
  const theme = useThemeMode()
  const t = getTokens(theme)
  return <div style={{ height: 1, background: t.borderSubtle, margin: `${SPACE[1]} 0` }} />
}

export function Marker({ color, square = false }: { color: string; square?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 9,
        height: 9,
        background: color,
        borderRadius: square ? 2 : 999,
        flexShrink: 0,
      }}
    />
  )
}

export function MiniBar({ color, pct }: { color: string; pct: number }) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  return (
    <div style={{ height: 3, width: '100%', background: t.borderSubtle, borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, pct * 100))}%`, background: color }} />
    </div>
  )
}

export function DistRow({
  color, label, importe, deltaTxt, deltaColor, pct, square = false,
}: {
  color: string
  label: string
  importe: string
  deltaTxt: string
  deltaColor: string
  pct: number
  square?: boolean
}) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '14px 1fr auto auto',
          gap: SPACE[2],
          alignItems: 'center',
          fontFamily: FONT.body,
          fontSize: FS.sm,
        }}
      >
        <Marker color={color} square={square} />
        <span style={{ color: t.textPrimary }}>{label}</span>
        <span style={{ fontFamily: FONT.title, fontWeight: FW.medium, color: t.textPrimary }}>{importe}</span>
        <span style={{ fontSize: FS.xs, color: deltaColor, minWidth: 64, textAlign: 'right' }}>{deltaTxt}</span>
      </div>
      <div style={{ paddingLeft: 14 + 8 }}>
        <MiniBar color={color} pct={pct} />
      </div>
    </div>
  )
}
