import { useThemeMode, getTokens, FONT, FS, SPACE } from '@/styles/tokens'
import { CardBase, Label, HugeNumber, Separator, fmtMoney, fmtDelta } from './shared'

interface Props {
  ingresos: number
  gastos: number
  ingresosAnt: number
  gastosAnt: number
}

export default function CardBalanceNeto({ ingresos, gastos, ingresosAnt, gastosAnt }: Props) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  const balance = ingresos - gastos
  const balanceAnt = ingresosAnt - gastosAnt
  const color = balance >= 0 ? t.success : t.danger
  const delta = balanceAnt !== 0 ? (balance - balanceAnt) / Math.abs(balanceAnt) : null
  const d = fmtDelta(delta, theme)

  return (
    <CardBase>
      <Label>Balance neto</Label>

      <HugeNumber value={fmtMoney(balance)} color={color} size={42} />
      <div style={{ fontFamily: FONT.body, fontSize: FS.sm, color: t.textSecondary }}>Ingresos − Gastos</div>

      <Separator />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT.body, fontSize: FS.sm }}>
        <span style={{ color: t.textSecondary }}>vs período anterior</span>
        <span style={{ color: d.color, fontFamily: FONT.title }}>
          {d.txt}
          <span style={{ color: t.textTertiary, marginLeft: 6, fontFamily: FONT.body }}>
            ({fmtMoney(balanceAnt)})
          </span>
        </span>
      </div>
      <div style={{ marginTop: -SPACE[2], display: 'flex', justifyContent: 'space-between', fontFamily: FONT.body, fontSize: FS.xs, color: t.textTertiary }}>
        <span>Ingresos {fmtMoney(ingresos)}</span>
        <span>Gastos {fmtMoney(gastos)}</span>
      </div>
    </CardBase>
  )
}
