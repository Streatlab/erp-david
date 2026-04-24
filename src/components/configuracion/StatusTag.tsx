import type { ReactNode } from 'react'
import { useThemeMode, getTokens, FONT, PALETTE } from '@/styles/tokens'

type Variant =
  | 'ok' | 'off'
  | 'admin' | 'gestor' | 'cocina'
  | 'fijo' | 'var' | 'pers' | 'mkt'

export function StatusTag({
  variant,
  children,
}: {
  variant: Variant
  children: ReactNode
}) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  const p = PALETTE[theme]

  const styles: Record<Variant, { bg: string; color: string }> = {
    ok:     { bg: t.successBg,   color: t.successText },
    off:    { bg: t.bgSurfaceAlt, color: t.textTertiary },
    admin:  { bg: t.dangerBg,    color: t.dangerText },
    gestor: { bg: t.infoBg,      color: t.infoText },
    cocina: { bg: t.warningBg,   color: t.warningText },
    fijo:   { bg: p.marino[50],  color: p.marino[700] },
    var:    { bg: p.naranja[50], color: p.naranja[700] },
    pers:   { bg: t.infoBg,      color: t.infoText },
    mkt:    { bg: p.terra[50],   color: p.terra[700] },
  }
  const s = styles[variant]

  return (
    <span
      style={{
        display: 'inline-flex',
        padding: '5px 14px',
        borderRadius: 5,
        fontSize: 11,
        letterSpacing: '0.06em',
        fontWeight: 600,
        textTransform: 'uppercase',
        background: s.bg,
        color: s.color,
        fontFamily: FONT.sans,
      }}
    >
      {children}
    </span>
  )
}
