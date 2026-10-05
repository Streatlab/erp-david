import type { ReactNode } from 'react'
import { PageNeo, CabeceraNeo, AvisoNeo, Banda } from '@/components/neo/NeoUI'
import { ARENA, INK, LEX } from '@/styles/neobrutal'

/* Pantalla holder honesta: se queda en el menú, sin datos inventados. */
export default function HolderNeo({ eyebrow, titulo, children }: { eyebrow: string; titulo: string; children: ReactNode }) {
  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt={eyebrow} titulo={titulo} />
      <AvisoNeo>En construcción · sin datos</AvisoNeo>
      <Banda bg={ARENA}>
        <div style={{ fontFamily: LEX, fontSize: 14, fontWeight: 600, color: INK, maxWidth: 720 }}>{children}</div>
      </Banda>
    </PageNeo>
  )
}
