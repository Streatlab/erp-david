import { useTheme, getTokens, FONT } from '@/styles/tokens'

export function AbvBadge({
  abv,
  bg,
}: {
  abv: string
  bg?: string
}) {
  const theme = useTheme()
  const t = getTokens(theme)

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 8px',
        background: bg ?? t.brandPrimary,
        color: t.textOnPrimary,
        borderRadius: 4,
        fontSize: 10,
        letterSpacing: '0.04em',
        fontWeight: 700,
        fontFamily: FONT.sans,
        textTransform: 'uppercase',
      }}
    >
      {abv}
    </span>
  )
}
