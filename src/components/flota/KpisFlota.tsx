import { useThemeMode, getTokens, FONT, FS, FW, SPACE } from '@/styles/tokens'
import { CardBase, Label, HugeNumber, Separator, fmtMoney } from '@/components/panel/shared'
import type { CostesFlotaMes, AlertaFlota, Furgoneta } from '@/lib/flota/queries'

interface Props {
  furgonetas: Furgoneta[]
  costes: CostesFlotaMes
  alertas: AlertaFlota[]
}

export default function KpisFlota({ furgonetas, costes, alertas }: Props) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  const operativas = furgonetas.filter(f => f.estado === 'OPERATIVA' || (f.estado == null && f.activa)).length
  const enRevision = furgonetas.filter(f => f.estado === 'EN_REVISION').length
  const fuera = furgonetas.filter(f => f.estado === 'FUERA_SERVICIO').length

  const alertItv = alertas.filter(a => a.tipo === 'ITV').length
  const alertSeg = alertas.filter(a => a.tipo === 'SEGURO').length
  const alertMant = alertas.filter(a => a.tipo === 'MANTENIMIENTO').length

  const total = furgonetas.length
  const pctDispon = total > 0 ? Math.round((operativas / total) * 100) : 0

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: SPACE[5],
    }}>
      {/* CARD 1 — Activas */}
      <CardBase>
        <Label>Furgonetas activas</Label>
        <HugeNumber value={String(operativas)} />
        <div style={{ fontFamily: FONT.body, fontSize: FS.sm, color: t.success }}>
          {pctDispon}% disponibles
        </div>
        <Separator />
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[2] }}>
          <FilaSimple color="#2D7A4F" label="Operativas" valor={`${operativas}`} />
          <FilaSimple color="#BA7517" label="En revisión" valor={`${enRevision}`} />
          <FilaSimple color="#A32D2D" label="Fuera servicio" valor={`${fuera}`} />
        </div>
      </CardBase>

      {/* CARD 2 — Coste flota mensual */}
      <CardBase>
        <Label>Coste flota · este mes</Label>
        <HugeNumber value={fmtMoney(costes.total)} />
        <div style={{ fontFamily: FONT.body, fontSize: FS.sm, color: t.textTertiary }}>
          {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
        </div>
        <Separator />
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[3] }}>
          <FilaConBarra color={t.brandPrimary} label="Préstamos + alquiler" valor={fmtMoney(costes.prestamosAlquiler)} pct={costes.total > 0 ? costes.prestamosAlquiler / costes.total : 0} />
          <FilaConBarra color={t.brandAccent} label="Combustible / Recargas" valor={fmtMoney(costes.combustible)} pct={costes.total > 0 ? costes.combustible / costes.total : 0} />
        </div>
      </CardBase>

      {/* CARD 3 — Alertas */}
      <CardBase>
        <Label>Alertas activas</Label>
        <HugeNumber value={String(alertas.length)} color={alertas.length > 0 ? t.danger : t.brandPrimary} />
        <div style={{ fontFamily: FONT.body, fontSize: FS.sm, color: t.textTertiary }}>
          {alertas.length > 0 ? 'Requieren atención' : 'Todo en orden'}
        </div>
        <Separator />
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[2] }}>
          <FilaSimple color={alertItv > 0 ? '#A32D2D' : '#2D7A4F'} label="ITV próximas" valor={String(alertItv)} />
          <FilaSimple color={alertSeg > 0 ? '#A32D2D' : '#2D7A4F'} label="Seguros renovar" valor={String(alertSeg)} />
          <FilaSimple color={alertMant > 0 ? '#BA7517' : '#2D7A4F'} label="Mantenimiento" valor={String(alertMant)} />
        </div>
      </CardBase>
    </div>
  )
}

function FilaSimple({ color, label, valor }: { color: string; label: string; valor: string }) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[2], fontFamily: FONT.body, fontSize: FS.sm }}>
      <span style={{ width: 8, height: 8, background: color, borderRadius: 999 }} />
      <span style={{ color: t.textSecondary, flex: 1 }}>{label}</span>
      <span style={{ color: t.textPrimary, fontFamily: FONT.title, fontWeight: FW.medium }}>{valor}</span>
    </div>
  )
}

function FilaConBarra({ color, label, valor, pct }: { color: string; label: string; valor: string; pct: number }) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[2], fontFamily: FONT.body, fontSize: FS.sm }}>
        <span style={{ width: 8, height: 8, background: color, borderRadius: 999 }} />
        <span style={{ color: t.textSecondary, flex: 1 }}>{label}</span>
        <span style={{ color: t.textPrimary, fontFamily: FONT.title, fontWeight: FW.medium }}>{valor}</span>
      </div>
      <div style={{ paddingLeft: 16, height: 3, background: t.borderSubtle, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, pct * 100))}%`, background: color }} />
      </div>
    </div>
  )
}
