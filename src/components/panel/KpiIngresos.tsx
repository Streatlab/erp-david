import { useThemeMode, getTokens, FONT, FS, SPACE } from '@/styles/tokens'
import { CardBase, Label, HugeNumber, Separator, DistRow, fmtMoney, fmtDelta } from './shared'
import type { IngresoOperadorRow } from '@/lib/panel/queries'

interface Props {
  total: number
  totalAnterior: number
  filas: IngresoOperadorRow[]
}

export default function KpiIngresos({ total, totalAnterior, filas }: Props) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  const delta = totalAnterior > 0 ? (total - totalAnterior) / totalAnterior : null
  const d = fmtDelta(delta, theme)

  return (
    <CardBase>
      <Label>Ingresos netos</Label>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: SPACE[3], flexWrap: 'wrap' }}>
        <HugeNumber value={fmtMoney(total)} />
        <span style={{ fontSize: FS.sm, color: d.color, fontFamily: FONT.body }}>
          {d.txt}
          <span style={{ color: t.textTertiary, marginLeft: 6 }}>vs período anterior</span>
        </span>
      </div>

      <Separator />

      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[3] }}>
        {filas.map(f => {
          const dd = fmtDelta(f.delta, theme)
          return (
            <DistRow
              key={f.key}
              color={f.color}
              label={f.label}
              importe={fmtMoney(f.importe)}
              deltaTxt={dd.txt}
              deltaColor={dd.color}
              pct={f.pct}
            />
          )
        })}
      </div>
    </CardBase>
  )
}
