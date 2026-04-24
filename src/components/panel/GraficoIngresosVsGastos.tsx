import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts'
import { useThemeMode, getTokens, FONT, FS } from '@/styles/tokens'
import { CardBase, Label, fmtMoney } from './shared'
import type { BarraSemana } from '@/lib/panel/queries'

interface Props { data: BarraSemana[] }

export default function GraficoIngresosVsGastos({ data }: Props) {
  const theme = useThemeMode()
  const t = getTokens(theme)

  return (
    <CardBase>
      <Label>Ingresos vs Gastos · Semanal</Label>

      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={t.borderSubtle} vertical={false} />
            <XAxis dataKey="semana" stroke={t.textTertiary} tick={{ fill: t.textTertiary, fontSize: 11, fontFamily: FONT.body }} axisLine={false} tickLine={false} />
            <YAxis stroke={t.textTertiary} tick={{ fill: t.textTertiary, fontSize: 11, fontFamily: FONT.body }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
            <Tooltip
              cursor={{ fill: t.borderSubtle }}
              contentStyle={{
                background: t.bgSurface,
                border: `1px solid ${t.borderDefault}`,
                borderRadius: 8,
                fontFamily: FONT.body,
                fontSize: FS.xs,
              }}
              formatter={(v) => fmtMoney(Number(v ?? 0))}
            />
            <Legend wrapperStyle={{ fontFamily: FONT.body, fontSize: FS.xs }} />
            <Bar dataKey="ingresos" name="Ingresos" fill="#2D7A4F" radius={[4, 4, 0, 0]} />
            <Bar dataKey="gastos"   name="Gastos"   fill="#A32D2D" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CardBase>
  )
}
