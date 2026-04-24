import { Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Area, ComposedChart } from 'recharts'
import { useThemeMode, getTokens, FONT, FS } from '@/styles/tokens'
import { CardBase, Label, fmtMoney } from './shared'
import type { PuntoSerie } from '@/lib/panel/queries'

interface Props { data: PuntoSerie[] }

export default function GraficoSaldoBBVA({ data }: Props) {
  const theme = useThemeMode()
  const t = getTokens(theme)

  const display = data.map(p => ({
    fecha: p.fecha,
    label: new Date(p.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
    valor: p.valor,
  }))

  return (
    <CardBase>
      <Label>Evolución · Saldo BBVA</Label>

      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer>
          <ComposedChart data={display} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="grad-saldo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={t.brandAccent} stopOpacity={0.32} />
                <stop offset="100%" stopColor={t.brandAccent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={t.borderSubtle} vertical={false} />
            <XAxis
              dataKey="label"
              stroke={t.textTertiary}
              tick={{ fill: t.textTertiary, fontSize: 11, fontFamily: FONT.body }}
              axisLine={false}
              tickLine={false}
              interval={Math.max(0, Math.floor(display.length / 6) - 1)}
            />
            <YAxis
              stroke={t.textTertiary}
              tick={{ fill: t.textTertiary, fontSize: 11, fontFamily: FONT.body }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
            />
            <Tooltip
              contentStyle={{
                background: t.bgSurface,
                border: `1px solid ${t.borderDefault}`,
                borderRadius: 8,
                fontFamily: FONT.body,
                fontSize: FS.xs,
              }}
              formatter={(v) => [fmtMoney(Number(v ?? 0)), 'Saldo']}
              labelFormatter={(l) => String(l)}
            />
            <Area type="monotone" dataKey="valor" fill="url(#grad-saldo)" stroke="none" />
            <Line type="monotone" dataKey="valor" stroke={t.brandAccent} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </CardBase>
  )
}
