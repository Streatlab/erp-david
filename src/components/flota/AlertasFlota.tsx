import { AlertTriangle, AlertCircle, Wrench } from 'lucide-react'
import { useThemeMode, getTokens, FONT, FS, FW, SPACE, RADIUS } from '@/styles/tokens'
import { Label } from '@/components/panel/shared'
import type { AlertaFlota } from '@/lib/flota/queries'

interface Props { alertas: AlertaFlota[] }

export default function AlertasFlota({ alertas }: Props) {
  const theme = useThemeMode()
  const t = getTokens(theme)

  if (!alertas.length) {
    return (
      <div style={{
        background: t.bgSurface,
        border: `0.5px solid ${t.borderDefault}`,
        borderRadius: RADIUS.lg,
        padding: SPACE[6],
      }}>
        <Label>Alertas priorizadas</Label>
        <div style={{ marginTop: SPACE[3], fontFamily: FONT.body, fontSize: FS.sm, color: t.textTertiary }}>
          Sin alertas activas. La flota está al día.
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: t.bgSurface,
      border: `0.5px solid ${t.borderDefault}`,
      borderRadius: RADIUS.lg,
      padding: SPACE[6],
      display: 'flex',
      flexDirection: 'column',
      gap: SPACE[4],
    }}>
      <Label>Alertas priorizadas</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[2] }}>
        {alertas.map((a, i) => (
          <AlertCard key={i} a={a} />
        ))}
      </div>
    </div>
  )
}

function AlertCard({ a }: { a: AlertaFlota }) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  const urgente = a.nivel === 'URGENTE'
  const colorBorde = urgente ? '#A32D2D' : '#BA7517'
  const colorTagBg = urgente ? 'rgba(163, 45, 45, 0.14)' : 'rgba(186, 117, 23, 0.18)'
  const Icon = a.tipo === 'MANTENIMIENTO' ? Wrench : urgente ? AlertCircle : AlertTriangle
  const iconBg = urgente ? 'rgba(163, 45, 45, 0.14)' : 'rgba(186, 117, 23, 0.18)'

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '4px 36px 1fr auto',
      gap: SPACE[3],
      padding: SPACE[3],
      background: t.bgSurfaceAlt,
      borderRadius: RADIUS.md,
      alignItems: 'center',
    }}>
      <div style={{ width: 4, height: '100%', background: colorBorde, borderRadius: 2 }} />
      <div style={{
        width: 36, height: 36, borderRadius: 999,
        background: iconBg, color: colorBorde,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} strokeWidth={2} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <div style={{ fontFamily: FONT.title, fontSize: FS.sm, fontWeight: FW.bold, color: t.textPrimary, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {a.titulo}
        </div>
        <div style={{ fontFamily: FONT.body, fontSize: FS.xs, color: t.textTertiary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {a.detalle}
        </div>
      </div>
      <span style={{
        background: colorTagBg, color: colorBorde,
        fontFamily: FONT.title, fontSize: FS['2xs'], fontWeight: FW.bold,
        padding: '4px 10px', borderRadius: 999,
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        {a.nivel === 'URGENTE' ? 'Urgente' : 'Próximo'}
      </span>
    </div>
  )
}
