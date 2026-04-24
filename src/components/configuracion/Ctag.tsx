import type { CanalAbv } from '@/types/configuracion'
import { useTheme, getTokens, FONT, PALETTE } from '@/styles/tokens'

const LABEL: Record<CanalAbv, string> = {
  UE: 'UE',
  GL: 'GL',
  JE: 'JE',
  WEB: 'WEB',
  DIR: 'DIR',
}

export function Ctag({ abv }: { abv: CanalAbv }) {
  const theme = useTheme()
  const t = getTokens(theme)
  const p = PALETTE[theme]

  // Cromática operadores David: oliva (success), ambar (warning), naranja (accent),
  // terra (danger), marino (info). Se aplica al CanalAbv conservando el TYPE.
  const styles: Record<CanalAbv, { bg: string; color: string }> = {
    UE:  { bg: t.successBg,  color: t.successText },
    GL:  { bg: t.warningBg,  color: t.warningText },
    JE:  { bg: p.naranja[50], color: p.naranja[700] },
    WEB: { bg: t.dangerBg,   color: t.dangerText },
    DIR: { bg: t.infoBg,     color: t.infoText },
  }
  const s = styles[abv]

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 5,
        fontSize: 10,
        letterSpacing: '0.06em',
        fontWeight: 700,
        textTransform: 'uppercase',
        background: s.bg,
        color: s.color,
        fontFamily: FONT.sans,
        marginRight: 4,
      }}
    >
      {LABEL[abv]}
    </span>
  )
}
