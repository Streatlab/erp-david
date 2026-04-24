import { useThemeMode, getTokens, FONT, FS, FW, SPACE } from '@/styles/tokens'
import { CardBase, Label, HugeNumber, Separator, fmtMoney, fmtDelta } from './shared'
import type { TesoreriaSnapshot } from '@/lib/panel/queries'

interface Props { snap: TesoreriaSnapshot }

export default function KpiTesoreria({ snap }: Props) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  const delta = snap.cajaHace30d > 0 ? (snap.cajaActual - snap.cajaHace30d) / snap.cajaHace30d : null
  const d = fmtDelta(delta, theme)

  const filas = [
    { label: 'Caja líquida BBVA', valor: fmtMoney(snap.cajaActual), color: t.textPrimary },
    { label: 'Cobros pendientes Cade', valor: fmtMoney(snap.cobrosPendientes), color: t.success },
    { label: 'Pagos pendientes', valor: fmtMoney(snap.pagosPendientes), color: t.danger },
    { label: 'Proyección 7d', valor: fmtMoney(snap.proyeccion7d), color: t.textSecondary },
    { label: 'Proyección 30d', valor: fmtMoney(snap.proyeccion30d), color: t.textSecondary },
  ]

  // Barra de progreso Hoy → 30d
  const minVal = Math.min(snap.cajaActual, snap.proyeccion30d)
  const maxVal = Math.max(snap.cajaActual, snap.proyeccion30d, 1)
  const pct = maxVal > 0 ? Math.min(100, Math.max(0, (snap.cajaActual - minVal) / (maxVal - minVal) * 100)) : 0

  return (
    <CardBase>
      <Label>Tesorería · hoy</Label>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: SPACE[3], flexWrap: 'wrap' }}>
        <HugeNumber value={fmtMoney(snap.cajaActual)} color={t.brandAccent} />
        <span style={{ fontSize: FS.sm, color: d.color, fontFamily: FONT.body }}>
          {d.txt}
          <span style={{ color: t.textTertiary, marginLeft: 6 }}>vs hace 30d</span>
        </span>
      </div>

      <Separator />

      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[2] }}>
        {filas.map(f => (
          <div
            key={f.label}
            style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT.body, fontSize: FS.sm }}
          >
            <span style={{ color: t.textSecondary }}>{f.label}</span>
            <span style={{ fontFamily: FONT.title, fontWeight: FW.medium, color: f.color }}>{f.valor}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: SPACE[2] }}>
        <div style={{
          fontSize: FS.xs,
          color: t.textTertiary,
          fontFamily: FONT.body,
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}>
          <span>Hoy</span><span>30d</span>
        </div>
        <div style={{ height: 6, background: t.borderSubtle, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: t.brandAccent }} />
        </div>
      </div>
    </CardBase>
  )
}
