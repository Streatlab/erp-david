import { useThemeMode, getTokens, FONT, FS, FW, SPACE, RADIUS } from '@/styles/tokens'
import { fmtMoney } from '@/components/panel/shared'
import type { Furgoneta } from '@/lib/flota/queries'

interface Props {
  furgo: Furgoneta
  costeMes: number
  onEdit: () => void
}

const fmtFecha = (s: string | null) => s ? new Date(s + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'
const fmtKm = (n: number | null) => n != null ? n.toLocaleString('es-ES') + ' km' : '—'

function diasHasta(s: string | null): number | null {
  if (!s) return null
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const f = new Date(s + 'T00:00:00')
  return Math.round((f.getTime() - hoy.getTime()) / 86400000)
}

export default function FurgonetaCard({ furgo, costeMes, onEdit }: Props) {
  const theme = useThemeMode()
  const t = getTokens(theme)

  const itvDias = diasHasta(furgo.itv_fecha)
  const segDias = diasHasta(furgo.seguro_fecha_vencimiento)
  const kmRest = (furgo.km_proxima_revision != null && furgo.km_actual != null)
    ? furgo.km_proxima_revision - furgo.km_actual : null

  // Estado badge
  let estadoTag: { txt: string; bg: string; fg: string } = { txt: 'OK', bg: 'rgba(45, 122, 79, 0.14)', fg: '#2D7A4F' }
  if (itvDias != null && itvDias <= 10)            estadoTag = { txt: `ITV ${itvDias}d`, bg: 'rgba(163, 45, 45, 0.14)', fg: '#A32D2D' }
  else if (segDias != null && segDias <= 10)       estadoTag = { txt: `Seg ${segDias}d`, bg: 'rgba(163, 45, 45, 0.14)', fg: '#A32D2D' }
  else if (kmRest != null && kmRest <= 0)          estadoTag = { txt: 'Mant.',           bg: 'rgba(163, 45, 45, 0.14)', fg: '#A32D2D' }
  else if (kmRest != null && kmRest <= 1000)       estadoTag = { txt: `Mant ${kmRest}km`, bg: 'rgba(186, 117, 23, 0.18)', fg: '#A87A1E' }
  else if (itvDias != null && itvDias <= 30)       estadoTag = { txt: `ITV ${itvDias}d`, bg: 'rgba(186, 117, 23, 0.18)', fg: '#A87A1E' }
  else if (segDias != null && segDias <= 30)       estadoTag = { txt: `Seg ${segDias}d`, bg: 'rgba(186, 117, 23, 0.18)', fg: '#A87A1E' }
  if (furgo.estado === 'EN_REVISION')              estadoTag = { txt: 'En revisión',     bg: 'rgba(186, 117, 23, 0.18)', fg: '#A87A1E' }
  if (furgo.estado === 'FUERA_SERVICIO')           estadoTag = { txt: 'Fuera servicio',  bg: 'rgba(163, 45, 45, 0.14)', fg: '#A32D2D' }

  return (
    <button
      onClick={onEdit}
      style={{
        background: t.bgSurface,
        border: `0.5px solid ${t.borderDefault}`,
        borderRadius: RADIUS.lg,
        padding: SPACE[5],
        display: 'flex',
        flexDirection: 'column',
        gap: SPACE[3],
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: FONT.body,
        color: t.textPrimary,
        transition: 'border-color 120ms, transform 120ms',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = t.brandAccent }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = t.borderDefault }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontFamily: FONT.title, fontSize: 22, fontWeight: FW.bold, textTransform: 'uppercase', letterSpacing: '0.04em', color: t.textPrimary }}>
            {furgo.conductor || furgo.nombre_corto}
          </div>
          <div style={{ fontFamily: FONT.body, fontSize: FS.xs, color: t.textTertiary, marginTop: 2 }}>
            {furgo.matricula ?? '—'} · {furgo.modelo ?? '—'}
          </div>
        </div>
        <span style={{
          background: estadoTag.bg, color: estadoTag.fg,
          fontFamily: FONT.title, fontSize: FS['2xs'], fontWeight: FW.bold,
          padding: '4px 10px', borderRadius: 999,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {estadoTag.txt}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[2] }}>
        <Row label="Km" valor={fmtKm(furgo.km_actual)} subValor={kmRest != null ? `próx ${fmtKm(furgo.km_proxima_revision)}` : undefined} alert={kmRest != null && kmRest <= 1000} warn={kmRest != null && kmRest <= 5000} />
        <Row label="ITV" valor={fmtFecha(furgo.itv_fecha)} subValor={itvDias != null ? (itvDias < 0 ? `vencida ${-itvDias}d` : `en ${itvDias}d`) : undefined} alert={itvDias != null && itvDias <= 10} warn={itvDias != null && itvDias <= 30} />
        <Row label="Seguro" valor={fmtFecha(furgo.seguro_fecha_vencimiento)} subValor={segDias != null ? (segDias < 0 ? `vencido ${-segDias}d` : `en ${segDias}d`) : undefined} alert={segDias != null && segDias <= 10} warn={segDias != null && segDias <= 30} />
        <Row label="Conductor" valor={furgo.conductor || '—'} />
        <Row label="Ruta" valor={furgo.ruta || '—'} />
      </div>

      <div style={{
        marginTop: SPACE[2],
        paddingTop: SPACE[3],
        borderTop: `1px dashed ${t.borderSubtle}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontFamily: FONT.body, fontSize: FS.xs, color: t.textTertiary }}>Coste mes</span>
        <span style={{ fontFamily: FONT.title, fontSize: FS.md, fontWeight: FW.bold, color: t.brandPrimary }}>
          {fmtMoney(costeMes)}
        </span>
      </div>
    </button>
  )
}

function Row({ label, valor, subValor, alert, warn }: { label: string; valor: string; subValor?: string; alert?: boolean; warn?: boolean }) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  const color = alert ? '#A32D2D' : warn ? '#A87A1E' : t.textPrimary
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr auto', gap: SPACE[2], alignItems: 'baseline', fontSize: FS.sm }}>
      <span style={{ color: t.textTertiary, fontFamily: FONT.title, fontSize: FS.xs, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      <span style={{ color, fontFamily: FONT.body }}>{valor}</span>
      {subValor && <span style={{ color: alert || warn ? color : t.textTertiary, fontSize: FS.xs }}>{subValor}</span>}
    </div>
  )
}
