import {
  INK, MARINO, ARENA, BLANCO, GRIS, OLIVA, NARANJA, AMBAR, OSW, LEX,
} from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda } from '@/components/neo/NeoUI'

/* Organigrama — mismo concepto que Binagre (jerarquía de equipo), datos TEST, neobrutal. */

interface Nodo { nombre: string; cargo: string; color: string }

const JEFE: Nodo = { nombre: 'TEST · David Reparte', cargo: 'Administrador', color: MARINO }
const EQUIPO: Nodo[] = [
  { nombre: 'TEST · Repartidor Uno',  cargo: 'Repartidor · Alcoi',    color: NARANJA },
  { nombre: 'TEST · Repartidor Dos',  cargo: 'Repartidor · Ontinyent', color: OLIVA },
  { nombre: 'TEST · Repartidor Tres', cargo: 'Repartidor · Refuerzo',  color: AMBAR },
]

function Caja({ n, ancho }: { n: Nodo; ancho?: number }) {
  const claro = n.color === AMBAR
  return (
    <div style={{ background: n.color, border: `3px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}`, padding: '14px 18px', width: ancho, minWidth: 180 }}>
      <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 16, textTransform: 'uppercase', color: claro ? INK : ARENA, lineHeight: 1.05 }}>{n.nombre}</div>
      <div style={{ fontFamily: LEX, fontWeight: 600, fontSize: 12, color: claro ? INK : ARENA, opacity: 0.85, marginTop: 4 }}>{n.cargo}</div>
    </div>
  )
}

export default function Organigrama() {
  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Equipo" titulo="Organigrama" />

      <Banda bg={AMBAR} style={{ padding: '14px 40px' }}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: INK }}>
          Datos TEST · estructura del equipo de David. Se conectará a las personas reales.
        </div>
      </Banda>

      <Banda bg={BLANCO}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          <Caja n={JEFE} ancho={260} />
          <div style={{ width: 4, height: 28, background: INK }} />
          <div style={{ height: 4, background: INK, width: 'min(720px, 90%)' }} />
          <div style={{ display: 'flex', gap: 24, marginTop: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
            {EQUIPO.map(n => (
              <div key={n.nombre} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 4, height: 28, background: INK, marginTop: -28 }} />
                <Caja n={n} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontFamily: LEX, fontSize: 12, fontWeight: 600, color: GRIS, marginTop: 24 }}>
          Estructura plana: David coordina y los repartidores cubren Alcoi y Ontinyent.
        </div>
      </Banda>
    </PageNeo>
  )
}
