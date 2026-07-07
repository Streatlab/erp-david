import { INK, ARENA, BLANCO, GRIS, OLIVA, TERRA, NARANJA, AMBAR, CELESTE, OSW, LEX } from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda, TablaWrap, thNeo, tdNeo, KpiNeo } from '@/components/neo/NeoUI'

/* Mantenimiento — plan de mantenimiento de la flota de David (ITV, revisiones,
   neumáticos), datos TEST, neobrutal. */

type Estado = 'al_dia' | 'proximo' | 'vencido'

interface Mant { furgo: string; tipo: string; proxima: string; estado: Estado }

const MANT: Mant[] = [
  { furgo: 'Furgo 01', tipo: 'ITV',           proxima: '12 sep 2026', estado: 'al_dia' },
  { furgo: 'Furgo 01', tipo: 'Revisión',      proxima: '20 jul 2026', estado: 'proximo' },
  { furgo: 'Furgo 02', tipo: 'Neumáticos',    proxima: '05 jul 2026', estado: 'vencido' },
  { furgo: 'Furgo 02', tipo: 'ITV',           proxima: '30 nov 2026', estado: 'al_dia' },
  { furgo: 'Furgo 03', tipo: 'Revisión',      proxima: '18 jul 2026', estado: 'proximo' },
]

const COLOR: Record<Estado, string> = { al_dia: OLIVA, proximo: AMBAR, vencido: TERRA }
const LABEL: Record<Estado, string> = { al_dia: 'Al día', proximo: 'Próximo', vencido: 'Vencido' }

export default function Mantenimiento() {
  const venc = MANT.filter(m => m.estado === 'vencido').length
  const prox = MANT.filter(m => m.estado === 'proximo').length

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Operaciones" titulo="Mantenimiento" />

      <Banda bg={AMBAR} style={{ padding: '14px 40px' }}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: INK }}>
          Datos TEST · calendario de mantenimiento de la flota (ITV, revisiones, neumáticos).
        </div>
      </Banda>

      <Banda bg={BLANCO}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 22 }}>
          <KpiNeo label="Revisiones" valor={String(MANT.length)} color={CELESTE} />
          <KpiNeo label="Próximas" valor={String(prox)} color={NARANJA} />
          <KpiNeo label="Vencidas" valor={String(venc)} color={venc > 0 ? TERRA : OLIVA} />
        </div>

        {venc > 0 && (
          <div style={{ background: TERRA, color: ARENA, border: `3px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}`, padding: '12px 16px', marginBottom: 20, fontFamily: OSW, fontWeight: 700, fontSize: 14, letterSpacing: 1, textTransform: 'uppercase' }}>
            Hay {venc} mantenimiento vencido · programar cuanto antes
          </div>
        )}

        <TablaWrap>
          <thead>
            <tr>
              <th style={thNeo}>Furgoneta</th>
              <th style={thNeo}>Tipo</th>
              <th style={thNeo}>Próxima fecha</th>
              <th style={thNeo}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {MANT.map((m, i) => (
              <tr key={`${m.furgo}-${m.tipo}`}>
                <td style={{ ...tdNeo(i % 2 === 1), fontFamily: OSW, fontWeight: 700 }}>{m.furgo}</td>
                <td style={tdNeo(i % 2 === 1)}>{m.tipo}</td>
                <td style={{ ...tdNeo(i % 2 === 1), fontFamily: OSW, fontWeight: 700 }}>{m.proxima}</td>
                <td style={tdNeo(i % 2 === 1)}>
                  <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', background: COLOR[m.estado], color: m.estado === 'proximo' ? INK : ARENA, border: `2px solid ${INK}`, padding: '2px 8px' }}>{LABEL[m.estado]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </TablaWrap>
        <div style={{ fontFamily: LEX, fontSize: 12, fontWeight: 600, color: GRIS, marginTop: 12 }}>
          Sobre datos TEST. Se conectará al calendario real de la flota de David.
        </div>
      </Banda>
    </PageNeo>
  )
}
