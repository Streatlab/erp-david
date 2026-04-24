import { useThemeMode, getTokens, FONT, FS, FW, SPACE } from '@/styles/tokens'
import { CardBase, Label, HugeNumber, fmtPct } from './shared'

interface Props {
  ingresos: number
  gastos: number
  ratioAnterior: number | null
}

const TRAMOS = [
  { label: 'Crítico',  hasta: 0.5,  color: '#A32D2D' },
  { label: 'Alerta',   hasta: 1.0,  color: '#BA7517' },
  { label: 'OK',       hasta: 1.25, color: '#4D8B4F' },
  { label: 'Saludable',hasta: 2.0,  color: '#2D7A4F' },
] as const

function badgeForRatio(r: number) {
  if (r < 0.5)  return { label: 'Crítico',   bg: 'rgba(163, 45, 45, 0.12)',  fg: '#A32D2D' }
  if (r < 1.0)  return { label: 'Alerta',    bg: 'rgba(186, 117, 23, 0.14)', fg: '#BA7517' }
  if (r < 1.25) return { label: 'OK',        bg: 'rgba(77, 139, 79, 0.14)',  fg: '#4D8B4F' }
  return            { label: 'Saludable', bg: 'rgba(45, 122, 79, 0.14)',  fg: '#2D7A4F' }
}

export default function CardRatio({ ingresos, gastos, ratioAnterior }: Props) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  const ratio = gastos > 0 ? ingresos / gastos : 0
  const badge = badgeForRatio(ratio)

  // Posición de marker: clamp [0, 2.0] → [0%, 100%]
  const posPct = Math.min(100, Math.max(0, (ratio / 2.0) * 100))

  const delta = ratioAnterior != null && ratioAnterior > 0
    ? (ratio - ratioAnterior) / ratioAnterior
    : null

  return (
    <CardBase>
      <Label>Ratio Ingresos / Gastos</Label>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: SPACE[3], flexWrap: 'wrap' }}>
        <HugeNumber value={ratio.toFixed(2).replace('.', ',')} size={44} color={t.brandPrimary} />
        <span
          style={{
            background: badge.bg,
            color: badge.fg,
            fontFamily: FONT.title,
            fontSize: FS.xs,
            fontWeight: FW.bold,
            padding: '4px 10px',
            borderRadius: 999,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {badge.label}
        </span>
      </div>

      <div style={{ marginTop: SPACE[2] }}>
        <div style={{ position: 'relative', height: 12, borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
          {TRAMOS.map((tr, i) => {
            const desde = i === 0 ? 0 : TRAMOS[i - 1].hasta
            const w = (tr.hasta - desde) / 2.0
            return (
              <div key={tr.label} style={{ width: `${w * 100}%`, background: tr.color }} />
            )
          })}
          <div
            style={{
              position: 'absolute',
              left: `calc(${posPct}% - 1px)`,
              top: -4,
              width: 2,
              height: 20,
              background: t.textPrimary,
              borderRadius: 2,
              boxShadow: '0 0 0 2px rgba(255,255,255,0.85)',
            }}
          />
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: FONT.title,
          fontSize: FS['2xs'],
          color: t.textTertiary,
          letterSpacing: '0.1em',
          marginTop: 4,
          textTransform: 'uppercase',
        }}>
          <span>0</span><span>0,5</span><span>1,0</span><span>1,25</span><span>2,0+</span>
        </div>
      </div>

      <div style={{
        fontFamily: FONT.body,
        fontSize: FS.sm,
        color: t.textSecondary,
        display: 'flex',
        justifyContent: 'space-between',
        gap: SPACE[3],
      }}>
        <span>Objetivo: ≥ 1,25</span>
        <span>
          {delta == null ? 'sin histórico' : `${delta >= 0 ? '↑' : '↓'} ${fmtPct(Math.abs(delta))} vs anterior`}
        </span>
      </div>
    </CardBase>
  )
}
