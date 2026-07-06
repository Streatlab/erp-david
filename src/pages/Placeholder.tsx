import { useLocation } from 'react-router-dom'
import { Construction } from 'lucide-react'
import { INK, MARINO, ARENA, ARENA_CL, BLANCO, OLIVA, TERRA, NARANJA, CELESTE, AMBAR, OSW, LEX, SHADOW, BORDER_CARD } from '@/styles/neobrutal'
import { PageNeo, Banda, CabeceraNeo } from '@/components/neo/NeoUI'

const LABELS: Record<string, string> = {
  'personal':         'Personal',
  'flota':            'Flota',
  'punto-equilibrio': 'Punto equilibrio',
  'ventas':           'Ventas',
  'tareas':           'Tareas',
  'papeleo':          'Papeleo',
  'checklists':       'Checklists',
  'manuales':         'Manuales',
  'libro-facturas':   'Libro registro de facturas',
  'equipos':          'Equipos',
  'danos-vehiculos':  'Daños vehículos',
  'pedidos':          'Pedidos',
  'inventarios':      'Inventarios',
  'mantenimiento':    'Mantenimiento',
  'informes-equipo':  'Informes equipo',
  'contabilidad':     'Contabilidad',
  'hacienda':         'Hacienda',
  'operativa':        'Operativa',
}

/* Cada sección estrena un acento distinto: viva el color */
const ACENTOS = [NARANJA, CELESTE, OLIVA, AMBAR, TERRA, MARINO]

function acentoDe(slug: string): string {
  let h = 0
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0
  return ACENTOS[h % ACENTOS.length]
}

export default function Placeholder() {
  const location = useLocation()
  const slug = location.pathname.split('/').filter(Boolean).pop() || ''
  const title = LABELS[slug] ?? slug.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase())
  const acento = acentoDe(slug)
  const acentoClaro = acento === AMBAR

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Próximamente" titulo={title} />

      <Banda bg={acento} style={{ padding: '48px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 84, height: 84, background: BLANCO, border: BORDER_CARD, boxShadow: SHADOW, flexShrink: 0,
          }}>
            <Construction size={40} strokeWidth={2} color={INK} />
          </div>
          <div>
            <div style={{
              fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(28px,4vw,52px)',
              lineHeight: 0.95, letterSpacing: '-0.5px', textTransform: 'uppercase',
              color: acentoClaro ? INK : ARENA,
            }}>
              Aquí va a pasar algo <span style={{ background: INK, color: acentoClaro ? AMBAR : ARENA, padding: '0 10px' }}>gordo</span>.
            </div>
            <div style={{ fontFamily: LEX, fontSize: 14, fontWeight: 600, color: acentoClaro ? INK : ARENA, opacity: 0.9, marginTop: 10 }}>
              Sección planificada. Se llena por fases, solo con datos reales.
            </div>
          </div>
        </div>
      </Banda>

      <Banda bg={ARENA_CL}>
        <div style={{ display: 'inline-block', background: BLANCO, border: BORDER_CARD, boxShadow: SHADOW, padding: '10px 16px' }}>
          <span style={{ fontFamily: OSW, fontWeight: 600, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>
            Mientras tanto → Panel Global, Finanzas, Conciliación y Flota ya funcionan con datos reales.
          </span>
        </div>
      </Banda>
    </PageNeo>
  )
}
