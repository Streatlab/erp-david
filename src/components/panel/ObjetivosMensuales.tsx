import { useThemeMode, getTokens, FONT, FS, FW, SPACE } from '@/styles/tokens'
import { CardBase, Label, fmtMoney } from './shared'
import type { ObjetivoFila } from '@/lib/panel/queries'

interface Props { filas: ObjetivoFila[] }

function colorForPct(theme: 'light' | 'dark', pct: number) {
  const t = getTokens(theme)
  if (pct >= 0.8) return t.success
  if (pct >= 0.5) return t.warning
  return t.danger
}

export default function ObjetivosMensuales({ filas }: Props) {
  const theme = useThemeMode()
  const t = getTokens(theme)

  return (
    <CardBase>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Label>Progreso mensual</Label>
        <div style={{ fontFamily: FONT.body, fontSize: FS.xs, color: t.textTertiary }}>
          Facturación Cade + Portes vs objetivo
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[5] }}>
        {filas.map(f => {
          const pctClamped = Math.min(1, Math.max(0, f.pct))
          const color = colorForPct(theme, f.pct)
          const restante = Math.max(0, f.objetivo - f.conseguido)
          return (
            <div key={f.periodo} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: FONT.title, fontSize: FS.sm, fontWeight: FW.bold, color: t.textPrimary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {f.label}
                </span>
                <span style={{ fontFamily: FONT.title, fontSize: FS.md, fontWeight: FW.bold, color }}>
                  {(f.pct * 100).toFixed(0)}%
                </span>
              </div>
              <div style={{ fontFamily: FONT.body, fontSize: FS.xs, color: t.textTertiary }}>
                Faltan {fmtMoney(restante)} de {fmtMoney(f.objetivo)}
              </div>
              <div style={{ height: 8, background: t.borderSubtle, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pctClamped * 100}%`, background: color, transition: 'width 200ms' }} />
              </div>
            </div>
          )
        })}
      </div>
    </CardBase>
  )
}
