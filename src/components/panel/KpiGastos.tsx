import { useThemeMode, getTokens, FONT, FS, SPACE } from '@/styles/tokens'
import { CardBase, Label, HugeNumber, Separator, DistRow, fmtMoney, fmtDelta } from './shared'
import type { GastoGrupoRow } from '@/lib/panel/queries'

interface Props {
  total: number
  totalAnterior: number
  filas: GastoGrupoRow[]
}

export default function KpiGastos({ total, totalAnterior, filas }: Props) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  const delta = totalAnterior > 0 ? (total - totalAnterior) / totalAnterior : null
  // Para gastos, "subir" es malo; invertimos signo en color sólo:
  const d = fmtDelta(delta == null ? null : -delta, theme)
  const txt = delta == null ? d.txt : `${delta >= 0 ? '↑' : '↓'} ${(Math.abs(delta) * 100).toFixed(1).replace('.', ',')}%`

  return (
    <CardBase>
      <Label>Gastos</Label>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: SPACE[3], flexWrap: 'wrap' }}>
        <HugeNumber value={fmtMoney(total)} color={t.brandPrimary} />
        <span style={{ fontSize: FS.sm, color: d.color, fontFamily: FONT.body }}>
          {txt}
          <span style={{ color: t.textTertiary, marginLeft: 6 }}>vs período anterior</span>
        </span>
      </div>

      <Separator />

      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[3] }}>
        {filas.map(f => {
          const dd = fmtDelta(f.delta == null ? null : -f.delta, theme)
          const txtFila = f.delta == null
            ? dd.txt
            : `${f.delta >= 0 ? '↑' : '↓'} ${(Math.abs(f.delta) * 100).toFixed(1).replace('.', ',')}%`
          return (
            <DistRow
              key={f.key}
              color={f.color}
              label={f.label}
              importe={fmtMoney(f.importe)}
              deltaTxt={txtFila}
              deltaColor={dd.color}
              pct={f.pct}
              square
            />
          )
        })}
      </div>
    </CardBase>
  )
}
