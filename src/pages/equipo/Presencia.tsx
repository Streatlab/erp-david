import { PageNeo, CabeceraNeo, AvisoNeo, Banda } from '@/components/neo/NeoUI'
import { ARENA, INK, OSW, LEX } from '@/styles/neobrutal'

/* Presencia: aún no hay fichajes reales. Pantalla holder honesta (se mantiene en el menú). */
export default function Presencia() {
  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Equipo" titulo="Presencia" />
      <AvisoNeo>En construcción · sin datos</AvisoNeo>
      <Banda bg={ARENA}>
        <div style={{ fontFamily: LEX, fontSize: 14, fontWeight: 600, color: INK }}>
          Todavía no se registran fichajes. Cuando el equipo fiche (o lleguen las entregas diarias de Cade) aparecerán aquí las jornadas por persona.
        </div>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', color: INK, marginTop: 10 }}>Sin datos inventados.</div>
      </Banda>
    </PageNeo>
  )
}
