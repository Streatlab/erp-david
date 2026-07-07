import { useState } from 'react'
import { Plus } from 'lucide-react'
import { INK, ARENA, BLANCO, GRIS, OLIVA, TERRA, NARANJA, AMBAR, OSW, EUR } from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda, TablaWrap, thNeo, tdNeo, KpiNeo, BotonNeo } from '@/components/neo/NeoUI'

/* Daños vehículos — adaptación del "Daños Menaje" de Binagre a la flota de David,
   datos TEST, neobrutal. */

type Estado = 'reparado' | 'pendiente'

interface Dano { id: string; furgo: string; fecha: string; desc: string; coste: number; estado: Estado }

const INIT: Dano[] = [
  { id: '1', furgo: 'Furgo 01', fecha: '18 jun', desc: 'Golpe parachoques trasero', coste: 180, estado: 'reparado' },
  { id: '2', furgo: 'Furgo 02', fecha: '25 jun', desc: 'Retrovisor derecho roto',   coste: 90,  estado: 'pendiente' },
  { id: '3', furgo: 'Furgo 02', fecha: '01 jul', desc: 'Ruido en freno delantero',  coste: 0,   estado: 'pendiente' },
  { id: '4', furgo: 'Furgo 03', fecha: '10 jun', desc: 'Rayón lateral puerta',      coste: 60,  estado: 'reparado' },
]

export default function DanosVehiculos() {
  const [danos, setDanos] = useState<Dano[]>(INIT)

  const marcar = (id: string) => setDanos(prev => prev.map(d => d.id === id ? { ...d, estado: 'reparado' } : d))
  const nuevo = () => setDanos(prev => [{ id: String(Date.now()), furgo: 'Furgo 01', fecha: 'hoy', desc: 'TEST · Nuevo daño', coste: 0, estado: 'pendiente' }, ...prev])

  const pend = danos.filter(d => d.estado === 'pendiente').length
  const costeTotal = danos.reduce((s, d) => s + d.coste, 0)

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Operaciones" titulo="Daños vehículos">
        <BotonNeo onClick={nuevo}><Plus size={14} style={{ marginRight: 6 }} /> Registrar daño</BotonNeo>
      </CabeceraNeo>

      <Banda bg={AMBAR} style={{ padding: '14px 40px' }}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: INK }}>
          Datos TEST · parte de daños de la flota, misma mecánica que Binagre.
        </div>
      </Banda>

      <Banda bg={BLANCO}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 22 }}>
          <KpiNeo label="Daños registrados" valor={String(danos.length)} color={NARANJA} />
          <KpiNeo label="Pendientes" valor={String(pend)} color={pend > 0 ? TERRA : OLIVA} />
          <KpiNeo label="Coste acumulado" valor={EUR(costeTotal)} color={INK} />
        </div>

        <TablaWrap>
          <thead>
            <tr>
              <th style={thNeo}>Furgoneta</th>
              <th style={thNeo}>Fecha</th>
              <th style={thNeo}>Descripción</th>
              <th style={{ ...thNeo, textAlign: 'right' }}>Coste</th>
              <th style={thNeo}>Estado</th>
              <th style={{ ...thNeo, textAlign: 'right' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {danos.map((d, i) => (
              <tr key={d.id}>
                <td style={{ ...tdNeo(i % 2 === 1), fontFamily: OSW, fontWeight: 700 }}>{d.furgo}</td>
                <td style={{ ...tdNeo(i % 2 === 1), color: GRIS, fontSize: 12 }}>{d.fecha}</td>
                <td style={tdNeo(i % 2 === 1)}>{d.desc}</td>
                <td style={{ ...tdNeo(i % 2 === 1), textAlign: 'right', fontFamily: OSW, fontWeight: 700 }}>{d.coste > 0 ? EUR(d.coste) : '—'}</td>
                <td style={tdNeo(i % 2 === 1)}>
                  <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', background: d.estado === 'reparado' ? OLIVA : TERRA, color: ARENA, border: `2px solid ${INK}`, padding: '2px 8px' }}>{d.estado}</span>
                </td>
                <td style={{ ...tdNeo(i % 2 === 1), textAlign: 'right' }}>
                  {d.estado === 'pendiente'
                    ? <BotonNeo onClick={() => marcar(d.id)} bg={OLIVA}>Reparado</BotonNeo>
                    : <span style={{ color: GRIS }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </TablaWrap>
      </Banda>
    </PageNeo>
  )
}
