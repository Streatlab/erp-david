import { FileBarChart, Send } from 'lucide-react'
import { INK, ARENA, BLANCO, GRIS, OLIVA, TERRA, NARANJA, CELESTE, BERENJENA, AMBAR, MARINO, OSW, LEX, EUR } from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda, TablaWrap, thNeo, tdNeo, KpiNeo, BotonNeo } from '@/components/neo/NeoUI'

/* Panel de Informes — mismo concepto que Binagre (informes generados + envío),
   adaptado a David, datos TEST, neobrutal. */

interface Informe { nombre: string; periodo: string; estado: 'enviado' | 'pendiente'; fecha: string }

const INFORMES: Informe[] = [
  { nombre: 'Resumen mensual de ingresos', periodo: 'Junio 2026', estado: 'enviado',   fecha: '02 jul' },
  { nombre: 'Liquidaciones Cade',          periodo: 'Junio 2026', estado: 'enviado',   fecha: '02 jul' },
  { nombre: 'Coste por furgoneta',         periodo: 'Junio 2026', estado: 'pendiente', fecha: '—' },
  { nombre: 'Recortes reclamados',         periodo: '2º trim.',   estado: 'pendiente', fecha: '—' },
]

export default function Informes() {
  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Informes" titulo="Panel de Informes">
        <BotonNeo onClick={() => { /* TEST */ }}><FileBarChart size={14} style={{ marginRight: 6 }} /> Generar informe</BotonNeo>
      </CabeceraNeo>

      <Banda bg={AMBAR} style={{ padding: '14px 40px' }}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: INK }}>
          Datos TEST · misma idea que Binagre (generar y enviar informes), adaptada a David.
        </div>
      </Banda>

      <Banda bg={MARINO}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <KpiNeo label="Ingresos junio" valor={EUR(18420)} color={CELESTE} bg={BLANCO} />
          <KpiNeo label="Entregas junio" valor="1.240" color={NARANJA} bg={BLANCO} />
          <KpiNeo label="Recortes Cade" valor={EUR(-320)} color={TERRA} bg={BLANCO} />
          <KpiNeo label="Margen neto" valor="41%" color={OLIVA} bg={BLANCO} />
        </div>
      </Banda>

      <Banda bg={BLANCO}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', color: BERENJENA, marginBottom: 14 }}>Informes recientes</div>
        <TablaWrap>
          <thead>
            <tr>
              <th style={thNeo}>Informe</th>
              <th style={thNeo}>Periodo</th>
              <th style={thNeo}>Estado</th>
              <th style={thNeo}>Fecha</th>
              <th style={{ ...thNeo, textAlign: 'right' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {INFORMES.map((r, i) => (
              <tr key={r.nombre}>
                <td style={{ ...tdNeo(i % 2 === 1), fontFamily: OSW, fontWeight: 700 }}>{r.nombre}</td>
                <td style={tdNeo(i % 2 === 1)}>{r.periodo}</td>
                <td style={tdNeo(i % 2 === 1)}>
                  <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', background: r.estado === 'enviado' ? OLIVA : AMBAR, color: r.estado === 'enviado' ? ARENA : INK, border: `2px solid ${INK}`, padding: '2px 8px' }}>
                    {r.estado}
                  </span>
                </td>
                <td style={{ ...tdNeo(i % 2 === 1), color: GRIS, fontSize: 12 }}>{r.fecha}</td>
                <td style={{ ...tdNeo(i % 2 === 1), textAlign: 'right' }}>
                  <BotonNeo onClick={() => { /* TEST */ }} bg={r.estado === 'enviado' ? BLANCO : NARANJA}><Send size={12} style={{ marginRight: 4 }} />{r.estado === 'enviado' ? 'Reenviar' : 'Enviar'}</BotonNeo>
                </td>
              </tr>
            ))}
          </tbody>
        </TablaWrap>
      </Banda>
    </PageNeo>
  )
}
