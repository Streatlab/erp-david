import { INK, ARENA, BLANCO, GRIS, OLIVA, TERRA, AMBAR, CELESTE, OSW, LEX } from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda, TablaWrap, thNeo, tdNeo, KpiNeo } from '@/components/neo/NeoUI'

/* Libro de Equipos — mismo concepto que Binagre (inventario de equipos/menaje),
   adaptado a David (PDA, móvil, uniforme...), datos TEST, neobrutal. */

type Estado = 'operativo' | 'revision' | 'averiado'

interface Equipo { id: string; nombre: string; asignado: string; estado: Estado; ultima: string }

const EQUIPOS: Equipo[] = [
  { id: 'PDA-01', nombre: 'PDA Zebra TC21',   asignado: 'TEST · Repartidor Uno',  estado: 'operativo', ultima: '01 jul' },
  { id: 'PDA-02', nombre: 'PDA Zebra TC21',   asignado: 'TEST · Repartidor Dos',  estado: 'revision',  ultima: '28 jun' },
  { id: 'MOV-01', nombre: 'Móvil Samsung A15', asignado: 'TEST · Repartidor Uno',  estado: 'operativo', ultima: '15 jun' },
  { id: 'MOV-02', nombre: 'Móvil Samsung A15', asignado: '—',                      estado: 'averiado',  ultima: '20 jun' },
  { id: 'UNI-03', nombre: 'Uniforme + EPI',    asignado: 'TEST · Repartidor Tres', estado: 'operativo', ultima: '10 jun' },
]

const COLOR: Record<Estado, string> = { operativo: OLIVA, revision: AMBAR, averiado: TERRA }

export default function LibroEquipos() {
  const op = EQUIPOS.filter(e => e.estado === 'operativo').length
  const av = EQUIPOS.filter(e => e.estado === 'averiado').length

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Operaciones" titulo="Libro de Equipos" />

      <Banda bg={AMBAR} style={{ padding: '14px 40px' }}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: INK }}>
          Datos TEST · inventario de equipos, misma ficha que Binagre.
        </div>
      </Banda>

      <Banda bg={BLANCO}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 22 }}>
          <KpiNeo label="Equipos totales" valor={String(EQUIPOS.length)} color={CELESTE} />
          <KpiNeo label="Operativos" valor={String(op)} color={OLIVA} />
          <KpiNeo label="Averiados" valor={String(av)} color={TERRA} />
        </div>

        <TablaWrap>
          <thead>
            <tr>
              <th style={thNeo}>Código</th>
              <th style={thNeo}>Equipo</th>
              <th style={thNeo}>Asignado a</th>
              <th style={thNeo}>Estado</th>
              <th style={thNeo}>Última revisión</th>
            </tr>
          </thead>
          <tbody>
            {EQUIPOS.map((e, i) => (
              <tr key={e.id}>
                <td style={{ ...tdNeo(i % 2 === 1), fontFamily: OSW, fontWeight: 700 }}>{e.id}</td>
                <td style={tdNeo(i % 2 === 1)}>{e.nombre}</td>
                <td style={{ ...tdNeo(i % 2 === 1), color: e.asignado === '—' ? GRIS : INK }}>{e.asignado}</td>
                <td style={tdNeo(i % 2 === 1)}>
                  <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', background: COLOR[e.estado], color: e.estado === 'revision' ? INK : ARENA, border: `2px solid ${INK}`, padding: '2px 8px' }}>
                    {e.estado}
                  </span>
                </td>
                <td style={{ ...tdNeo(i % 2 === 1), color: GRIS, fontSize: 12 }}>{e.ultima}</td>
              </tr>
            ))}
          </tbody>
        </TablaWrap>
      </Banda>
    </PageNeo>
  )
}
