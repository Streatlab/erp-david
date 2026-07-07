import { INK, ARENA, BLANCO, GRIS, OLIVA, TERRA, NARANJA, CELESTE, AMBAR, OSW } from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda, TablaWrap, thNeo, tdNeo, KpiNeo } from '@/components/neo/NeoUI'

/* Informes de equipo — rendimiento por repartidor, datos TEST, neobrutal. */

interface Fila { nombre: string; entregas: number; horas: number; incidencias: number }

const FILAS: Fila[] = [
  { nombre: 'TEST · Repartidor Uno',  entregas: 512, horas: 168, incidencias: 3 },
  { nombre: 'TEST · Repartidor Dos',  entregas: 468, horas: 160, incidencias: 5 },
  { nombre: 'TEST · Repartidor Tres', entregas: 260, horas: 88,  incidencias: 1 },
]

export default function InformesEquipo() {
  const totalEnt = FILAS.reduce((s, f) => s + f.entregas, 0)
  const totalInc = FILAS.reduce((s, f) => s + f.incidencias, 0)

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Informes" titulo="Informes de equipo" />

      <Banda bg={AMBAR} style={{ padding: '14px 40px' }}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: INK }}>
          Datos TEST · rendimiento por repartidor (entregas, horas, incidencias).
        </div>
      </Banda>

      <Banda bg={BLANCO}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 22 }}>
          <KpiNeo label="Entregas equipo" valor={totalEnt.toLocaleString('es-ES')} color={NARANJA} />
          <KpiNeo label="Repartidores" valor={String(FILAS.length)} color={CELESTE} />
          <KpiNeo label="Incidencias" valor={String(totalInc)} color={totalInc > 5 ? TERRA : OLIVA} />
        </div>

        <TablaWrap>
          <thead>
            <tr>
              <th style={thNeo}>Repartidor</th>
              <th style={{ ...thNeo, textAlign: 'right' }}>Entregas</th>
              <th style={{ ...thNeo, textAlign: 'right' }}>Horas</th>
              <th style={{ ...thNeo, textAlign: 'right' }}>Entregas/hora</th>
              <th style={{ ...thNeo, textAlign: 'right' }}>Incidencias</th>
            </tr>
          </thead>
          <tbody>
            {FILAS.map((f, i) => (
              <tr key={f.nombre}>
                <td style={{ ...tdNeo(i % 2 === 1), fontFamily: OSW, fontWeight: 700 }}>{f.nombre}</td>
                <td style={{ ...tdNeo(i % 2 === 1), textAlign: 'right', fontFamily: OSW, fontWeight: 700 }}>{f.entregas}</td>
                <td style={{ ...tdNeo(i % 2 === 1), textAlign: 'right', color: GRIS }}>{f.horas}</td>
                <td style={{ ...tdNeo(i % 2 === 1), textAlign: 'right', fontFamily: OSW, fontWeight: 700, color: OLIVA }}>{(f.entregas / f.horas).toFixed(1).replace('.', ',')}</td>
                <td style={{ ...tdNeo(i % 2 === 1), textAlign: 'right', color: f.incidencias > 4 ? TERRA : INK, fontWeight: 700 }}>{f.incidencias}</td>
              </tr>
            ))}
          </tbody>
        </TablaWrap>
      </Banda>
    </PageNeo>
  )
}
