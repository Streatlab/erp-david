import { FileText, Download } from 'lucide-react'
import { INK, ARENA, BLANCO, GRIS, CELESTE, OLIVA, NARANJA, BERENJENA, AMBAR, OSW, LEX } from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda } from '@/components/neo/NeoUI'

/* Manuales — mismo concepto que Binagre (biblioteca de documentos), TEST, neobrutal. */

interface Manual { titulo: string; desc: string; cat: string; color: string; paginas: number }

const MANUALES: Manual[] = [
  { titulo: 'Protocolo de reparto Cade', desc: 'Ruta, horarios y trato al cliente final.', cat: 'Operativa', color: NARANJA, paginas: 12 },
  { titulo: 'Uso y carga de PDA', desc: 'Escaneo, incidencias y sincronización.', cat: 'Operativa', color: NARANJA, paginas: 6 },
  { titulo: 'Furgoneta eléctrica', desc: 'Carga, autonomía y buenas prácticas.', cat: 'Flota', color: CELESTE, paginas: 9 },
  { titulo: 'Prevención de riesgos', desc: 'Manipulación de carga y seguridad vial.', cat: 'Seguridad', color: OLIVA, paginas: 15 },
  { titulo: 'Reclamaciones a Cade', desc: 'Cómo documentar y reclamar recortes.', cat: 'Finanzas', color: BERENJENA, paginas: 4 },
]

export default function Manuales() {
  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Operaciones" titulo="Manuales" />

      <Banda bg={AMBAR} style={{ padding: '14px 40px' }}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: INK }}>
          Datos TEST · biblioteca de manuales, como en Binagre.
        </div>
      </Banda>

      <Banda bg={BLANCO}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
          {MANUALES.map(m => {
            const claro = m.color === AMBAR
            return (
              <div key={m.titulo} style={{ background: BLANCO, border: `3px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}` }}>
                <div style={{ background: m.color, borderBottom: `3px solid ${INK}`, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: claro ? INK : ARENA }}>{m.cat}</span>
                  <FileText size={18} color={claro ? INK : ARENA} />
                </div>
                <div style={{ padding: '14px' }}>
                  <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 17, textTransform: 'uppercase', color: INK, lineHeight: 1.05 }}>{m.titulo}</div>
                  <div style={{ fontFamily: LEX, fontSize: 13, fontWeight: 600, color: GRIS, marginTop: 8 }}>{m.desc}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                    <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 12, color: GRIS }}>{m.paginas} pág.</span>
                    <button style={{ background: INK, color: ARENA, border: 'none', padding: '7px 12px', cursor: 'pointer', fontFamily: OSW, fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Download size={13} /> Abrir
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Banda>
    </PageNeo>
  )
}
