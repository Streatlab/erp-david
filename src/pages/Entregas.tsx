import { CELESTE, GRIS, ARENA, BLANCO, OSW } from '@/styles/neobrutal'
import { PageNeo, Banda, CabeceraNeo, TablaWrap, thNeo, tdNeo } from '@/components/neo/NeoUI'

const COLUMNS = ['Fecha', 'Zona', 'Rider', 'Cliente', 'Estado', 'Importe']

export default function Entregas() {
  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Operativa" titulo="Entregas">
        <div style={{ fontSize: 13, fontWeight: 600, color: ARENA, opacity: 0.85 }}>
          Aquí vivirá el registro diario de repartos por operador y furgoneta.
        </div>
      </CabeceraNeo>

      <Banda bg={BLANCO}>
        <TablaWrap>
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th key={col} style={thNeo}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={COLUMNS.length} style={{ ...tdNeo(false), textAlign: 'center', padding: 48 }}>
                <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 22, textTransform: 'uppercase', color: GRIS }}>
                  Sin entregas registradas
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: CELESTE, marginTop: 8 }}>
                  Cuando este módulo se conecte a las liquidaciones de Cade, verás aquí cada reparto.
                </div>
              </td>
            </tr>
          </tbody>
        </TablaWrap>
      </Banda>
    </PageNeo>
  )
}
