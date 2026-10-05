import type { ReactNode } from 'react'
import { PageNeo, CabeceraNeo, AvisoNeo, Banda, HeroNeo } from '@/components/neo/NeoUI'
import { ARENA, INK, LEX, AMBAR } from '@/styles/neobrutal'

/* Pantalla holder honesta: se queda en el menú, sin datos inventados. */
export default function HolderNeo({ eyebrow, titulo, heroTxt, children }: { eyebrow: string; titulo: string; heroTxt: string; children: ReactNode }) {
  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt={eyebrow} titulo={titulo} />
      <HeroNeo eyebrowTxt={heroTxt} cifra="—" frase="Sin datos todavía" color={AMBAR} />
      <AvisoNeo>En construcción · sin datos</AvisoNeo>
      <Banda bg={ARENA}>
        <div style={{ fontFamily: LEX, fontSize: 14, fontWeight: 600, color: INK, maxWidth: 720 }}>{children}</div>
      </Banda>
    </PageNeo>
  )
}
