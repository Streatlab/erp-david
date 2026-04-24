import { useThemeMode, getTokens, FONT, FS, FW, SPACE, RADIUS } from '@/styles/tokens'
import { fmtMoney } from './shared'
import type { PresupuestoCard } from '@/lib/panel/queries'

const SOFT: Record<PresupuestoCard['estado'], { bg: string; border: string; tagBg: string; tagFg: string; barColor: string; tagText: string }> = {
  EN_RITMO:   { bg: 'rgba(45, 122, 79, 0.08)',  border: 'rgba(45, 122, 79, 0.25)',  tagBg: 'rgba(45, 122, 79, 0.18)', tagFg: '#2D7A4F',  barColor: '#2D7A4F', tagText: 'En ritmo' },
  AL_LIMITE:  { bg: 'rgba(186, 117, 23, 0.10)', border: 'rgba(186, 117, 23, 0.30)', tagBg: 'rgba(186, 117, 23, 0.22)', tagFg: '#A87A1E', barColor: '#BA7517', tagText: 'Al límite' },
  SUPERADO:   { bg: 'rgba(163, 45, 45, 0.10)',  border: 'rgba(163, 45, 45, 0.30)',  tagBg: 'rgba(163, 45, 45, 0.18)',  tagFg: '#A32D2D', barColor: '#A32D2D', tagText: 'Superado' },
}

export default function CardPresupuestoComp({ card }: { card: PresupuestoCard }) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  const s = SOFT[card.estado]
  const pctClamp = Math.min(100, card.pct * 100)

  return (
    <div style={{
      background: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: RADIUS.lg,
      padding: SPACE[5],
      display: 'flex',
      flexDirection: 'column',
      gap: SPACE[3],
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontFamily: FONT.title, fontSize: FS.xs, fontWeight: FW.bold, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.textSecondary }}>
          {card.label}
        </div>
        <span style={{
          fontFamily: FONT.title, fontSize: FS['2xs'], fontWeight: FW.bold, padding: '3px 8px',
          borderRadius: 999, background: s.tagBg, color: s.tagFg,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {s.tagText}
        </span>
      </div>

      <div>
        <div style={{ fontFamily: FONT.title, fontSize: 24, fontWeight: FW.bold, color: t.textPrimary, lineHeight: 1.05 }}>
          {fmtMoney(card.consumido)}
        </div>
        <div style={{ fontFamily: FONT.body, fontSize: FS.xs, color: t.textTertiary }}>tope {fmtMoney(card.tope)}</div>
      </div>

      <div style={{ height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pctClamp}%`, background: s.barColor }} />
      </div>

      <div style={{ fontFamily: FONT.body, fontSize: FS.xs, color: t.textSecondary, display: 'flex', justifyContent: 'space-between' }}>
        <span>Consumido {(card.pct * 100).toFixed(0)}%</span>
        <span>Ritmo {fmtMoney(card.ritmoPorDia)}/día · quedan {card.diasRestantes}d</span>
      </div>
    </div>
  )
}
