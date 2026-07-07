import { INK, ARENA, ARENA_CL, BLANCO, GRIS, OLIVA, TERRA, NARANJA, CELESTE, AMBAR, OSW, EUR, E, P0 } from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda, TablaWrap, thNeo, tdNeo, KpiNeo } from '@/components/neo/NeoUI'

/* Ventas — para David = ingresos por reparto por supermercado (misma idea que
   "Ventas" de Binagre pero con su realidad), datos TEST, neobrutal. */

interface FilaVenta { operador: string; color: string; entregas: number; importe: number; delta: number }

const VENTAS: FilaVenta[] = [
  { operador: 'Mercadona', color: NARANJA, entregas: 520, importe: 7850, delta: 6 },
  { operador: 'Carrefour', color: OLIVA,   entregas: 310, importe: 4680, delta: -3 },
  { operador: 'Lidl',      color: AMBAR,   entregas: 240, importe: 3520, delta: 12 },
  { operador: 'Día',       color: TERRA,   entregas: 170, importe: 2370, delta: 1 },
]

export default function Ventas() {
  const totalImp = VENTAS.reduce((s, v) => s + v.importe, 0)
  const totalEnt = VENTAS.reduce((s, v) => s + v.entregas, 0)
  const maxImp = Math.max(...VENTAS.map(v => v.importe))

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Finanzas" titulo="Ventas" />

      <Banda bg={AMBAR} style={{ padding: '14px 40px' }}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: INK }}>
          Datos TEST · ingresos por supermercado. Misma vista que Binagre, adaptada al reparto de David.
        </div>
      </Banda>

      <Banda bg={BLANCO}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <KpiNeo label="Ingresos (mes)" valor={EUR(totalImp)} color={OLIVA} />
          <KpiNeo label="Entregas" valor={E(totalEnt)} color={NARANJA} />
          <KpiNeo label="€ por entrega" valor={(totalImp / totalEnt).toFixed(2).replace('.', ',') + ' €'} color={CELESTE} />
        </div>
      </Banda>

      <Banda bg={ARENA_CL}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', color: INK, marginBottom: 18 }}>Ingresos por supermercado</div>
        <div style={{ display: 'grid', gap: 14 }}>
          {VENTAS.map(v => (
            <div key={v.operador} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px,180px) 1fr minmax(160px,220px)', gap: 14, alignItems: 'center' }}>
              <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 15, textTransform: 'uppercase' }}>{v.operador}</span>
              <div style={{ background: ARENA, border: `3px solid ${INK}`, height: 24, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, width: `${(v.importe / maxImp) * 100}%`, background: v.color }} />
              </div>
              <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 18, textAlign: 'right' }}>
                {EUR(v.importe)}
                <span style={{ fontSize: 13, marginLeft: 8, background: v.delta >= 0 ? OLIVA : TERRA, color: ARENA, padding: '1px 6px' }}>{v.delta >= 0 ? '+' : '−'}{Math.abs(v.delta)}%</span>
              </span>
            </div>
          ))}
        </div>
      </Banda>

      <Banda bg={BLANCO}>
        <TablaWrap>
          <thead>
            <tr>
              <th style={thNeo}>Supermercado</th>
              <th style={{ ...thNeo, textAlign: 'right' }}>Entregas</th>
              <th style={{ ...thNeo, textAlign: 'right' }}>Ingresos</th>
              <th style={{ ...thNeo, textAlign: 'right' }}>% del total</th>
            </tr>
          </thead>
          <tbody>
            {VENTAS.map((v, i) => (
              <tr key={v.operador}>
                <td style={{ ...tdNeo(i % 2 === 1), fontFamily: OSW, fontWeight: 700 }}>{v.operador}</td>
                <td style={{ ...tdNeo(i % 2 === 1), textAlign: 'right' }}>{E(v.entregas)}</td>
                <td style={{ ...tdNeo(i % 2 === 1), textAlign: 'right', fontFamily: OSW, fontWeight: 700 }}>{EUR(v.importe)}</td>
                <td style={{ ...tdNeo(i % 2 === 1), textAlign: 'right', color: GRIS }}>{P0((v.importe / totalImp) * 100)}</td>
              </tr>
            ))}
          </tbody>
        </TablaWrap>
      </Banda>
    </PageNeo>
  )
}
