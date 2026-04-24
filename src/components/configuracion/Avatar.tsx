import { useTheme, getTokens, FONT } from '@/styles/tokens'

export function Avatar({
  letter,
  color,
}: {
  letter: string
  color?: string | null
}) {
  const theme = useTheme()
  const t = getTokens(theme)

  return (
    <span
      style={{
        display: 'inline-flex',
        width: 32,
        height: 32,
        borderRadius: '50%',
        alignItems: 'center',
        justifyContent: 'center',
        color: t.textOnAccent,
        fontWeight: 700,
        fontSize: 12,
        marginRight: 10,
        verticalAlign: 'middle',
        background: color ?? t.brandAccent,
        fontFamily: FONT.sans,
      }}
    >
      {letter}
    </span>
  )
}
