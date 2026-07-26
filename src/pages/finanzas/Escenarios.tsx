import { INK, ARENA, BLANCO, GRIS, OLIVA, TERRA, NARANJA, CELESTE, AMBAR, MARINO, OSW, LEX, EUR } from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda } from '@/components/neo/NeoUI'

/* Escenarios de tesorería — versión simple para David (optimista/realista/pesimista),
   datos TEST, neobrutal. (En Binagre es multicanal; aquí adaptado al reparto Cade.) */

interface Escenario { key: string; label: string; color: string; caja30: number; supuesto: string }

const CAJA_HOY = 4820

const ESCENARIOS: Escenario[] = [
  { key: 'opt', label: 'Optimista',  color: OLIVA,   caja30: 7200, supuesto: 'Cade paga a tiempo, sin recortes, 3ª furgoneta a pleno.' },
  { key: 'real', label: 'Realista',  color: CELESTE, caja30: 5400, supuesto: 'Cobro habitual, recortes normales, gastos estables.' },
  { key: 'pes', label: 'Pesimista',  color: TERRA,   caja30: 2100, supuesto: 'Retraso de Cade + recortes + avería de furgoneta.' },
]

export default function Escenarios() {
  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Finanzas" titulo="Escenarios de tesorería" />

      <Banda bg={AMBAR} style={{ padding: '14px 40px' }}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: INK }}>
          Datos TEST · proyección de caja a 30 días. Versión simple del módulo de Binagre, a medida de David.
        </div>
      </Banda>

      <Banda bg={MARINO}>
        <span style={{ display: 'inline-block', background: AMBAR, color: INK, border: `2px solid ${INK}`, fontFamily: OSW, fontWeight: 600, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', padding: '4px 12px' }}>Caja hoy</span>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(40px,6vw,80px)', color: AMBAR, lineHeight: 0.95, marginTop: 14 }}>{EUR(CAJA_HOY)}</div>
        <div style={{ fontFamily: LEX, fontSize: 13, fontWeight: 600, color: ARENA, opacity: 0.85, marginTop: 8 }}>Punto de partida para las tres proyecciones a 30 días.</div>
      </Banda>

      <Banda bg={BLANCO}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {ESCENARIOS.map(e => {
            const diff = e.caja30 - CAJA_HOY
            return (
              <div key={e.key} style={{ background: BLANCO, border: `3px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}` }}>
                <div style={{ background: e.color, borderBottom: `3px solid ${INK}`, padding: '10px 16px', fontFamily: OSW, fontWeight: 700, fontSize: 16, letterSpacing: 1, textTransform: 'uppercase', color: ARENA }}>{e.label}</div>
                <div style={{ padding: 18 }}>
                  <div style={{ fontFamily: OSW, fontWeight: 600, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: GRIS }}>Caja a 30 días</div>
                  <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(30px,4vw,48px)', color: e.color, lineHeight: 1 }}>{EUR(e.caja30)}</div>
                  <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 14, marginTop: 6, color: diff >= 0 ? OLIVA : TERRA }}>
                    {diff >= 0 ? '+' : '−'}{EUR(Math.abs(diff)).replace(' €', '')} € vs hoy
                  </div>
                  <div style={{ fontFamily: LEX, fontSize: 13, fontWeight: 600, color: INK, marginTop: 12, borderTop: `2px dashed ${INK}`, paddingTop: 10 }}>{e.supuesto}</div>
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ fontFamily: LEX, fontSize: 12, fontWeight: 600, color: GRIS, marginTop: 18 }}>
          Cuando conectemos los movimientos reales de BBVA y el calendario de cobros de Cade, estas cifras se calcularán solas.
        </div>
      </Banda>
    </PageNeo>
  )
}
