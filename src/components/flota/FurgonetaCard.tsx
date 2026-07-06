import type { Furgoneta } from '../../lib/flota/queries'
import { INK, MARINO, ARENA, ARENA_CL, BLANCO, GRIS, OLIVA, TERRA, NARANJA, CELESTE, AMBAR, OSW, LEX, SHADOW, BORDER_CARD } from '@/styles/neobrutal'

export default function FurgonetaCard({
  furgoneta,
  costeMes,
  combustibleMes,
  onClick,
}: {
  furgoneta: Furgoneta
  costeMes: number
  combustibleMes: number
  onClick: () => void
}) {
  const fmtEur = (n: number) =>
    n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })

  const estado = furgoneta.estado
  const estadoColor = estado === 'OPERATIVA' ? OLIVA : estado === 'EN_REVISION' ? AMBAR : TERRA
  const estadoClaro = estadoColor === AMBAR

  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left', background: BLANCO, border: BORDER_CARD, boxShadow: SHADOW,
        borderRadius: 0, padding: 0, cursor: 'pointer', fontFamily: LEX, color: INK,
        display: 'block', width: '100%', overflow: 'hidden',
      }}
    >
      {/* Franja superior marino con matrícula gigante */}
      <div style={{ background: MARINO, borderBottom: BORDER_CARD, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 22, lineHeight: 0.95, letterSpacing: '-0.5px', textTransform: 'uppercase', color: ARENA }}>
            {furgoneta.matricula}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: ARENA, opacity: 0.8, marginTop: 4 }}>
            {furgoneta.conductor} · {furgoneta.modelo} · {furgoneta.ruta ?? '—'}
          </div>
        </div>
        <span style={{
          fontFamily: OSW, fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
          background: estadoColor, color: estadoClaro ? INK : ARENA, border: `2px solid ${INK}`, padding: '2px 8px',
        }}>
          {estado}
        </span>
      </div>

      {/* Datos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        <Celda label="Coste mes" valor={fmtEur(costeMes)} color={NARANJA} borde />
        <Celda label="Combustible" valor={fmtEur(combustibleMes)} color={AMBAR === '#F5B84A' ? '#B8860B' : AMBAR} />
        <Celda label="ITV próxima" valor={furgoneta.itv_fecha ?? '—'} color={CELESTE} borde bg={ARENA_CL} />
        <Celda label="Seguro vence" valor={furgoneta.seguro_fecha_vencimiento ?? '—'} color={MARINO} bg={ARENA_CL} />
      </div>

      {/* CTA naranja */}
      <div style={{ background: NARANJA, borderTop: BORDER_CARD, padding: '8px 16px', fontFamily: OSW, fontWeight: 700, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: ARENA }}>
        Ver ficha completa →
      </div>
    </button>
  )
}

function Celda({ label, valor, color, borde, bg }: { label: string; valor: string; color: string; borde?: boolean; bg?: string }) {
  return (
    <div style={{ padding: '10px 16px', borderRight: borde ? `2px solid ${ARENA_CL}` : 'none', background: bg ?? BLANCO }}>
      <div style={{ fontFamily: OSW, fontWeight: 600, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: GRIS }}>{label}</div>
      <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 18, color, marginTop: 2 }}>{valor}</div>
    </div>
  )
}
