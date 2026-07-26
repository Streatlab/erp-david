import { useState } from 'react'
import { Check } from 'lucide-react'
import { INK, ARENA, BLANCO, GRIS, OLIVA, NARANJA, AMBAR, OSW, LEX } from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda, PillsNeo } from '@/components/neo/NeoUI'

/* Checklists — mismo concepto que Binagre (listas de verificación), TEST, neobrutal. */

interface Item { id: string; texto: string; ok: boolean }
interface Lista { key: string; label: string; items: Item[] }

const LISTAS_INIT: Lista[] = [
  {
    key: 'apertura', label: 'Apertura furgoneta',
    items: [
      { id: 'a1', texto: 'Revisar niveles (aceite, agua)', ok: true },
      { id: 'a2', texto: 'Comprobar presión de ruedas', ok: true },
      { id: 'a3', texto: 'Carga de PDA y móvil', ok: false },
      { id: 'a4', texto: 'Documentación y seguro a bordo', ok: false },
      { id: 'a5', texto: 'Zona de carga limpia', ok: false },
    ],
  },
  {
    key: 'cierre', label: 'Cierre de jornada',
    items: [
      { id: 'c1', texto: 'Descargar pedidos no entregados', ok: false },
      { id: 'c2', texto: 'Repostar / enchufar eléctrica', ok: false },
      { id: 'c3', texto: 'Parte de incidencias del día', ok: false },
      { id: 'c4', texto: 'Cerrar y aparcar en base', ok: false },
    ],
  },
]

export default function Checklists() {
  const [listas, setListas] = useState<Lista[]>(LISTAS_INIT)
  const [activa, setActiva] = useState(LISTAS_INIT[0].label)

  const lista = listas.find(l => l.label === activa)!
  const hechos = lista.items.filter(i => i.ok).length
  const pct = Math.round((hechos / lista.items.length) * 100)

  const toggle = (itemId: string) => {
    setListas(prev => prev.map(l => l.label !== activa ? l : {
      ...l, items: l.items.map(it => it.id === itemId ? { ...it, ok: !it.ok } : it),
    }))
  }

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Operaciones" titulo="Checklists">
        <PillsNeo value={activa} onChange={setActiva} options={listas.map(l => l.label)} />
      </CabeceraNeo>

      <Banda bg={AMBAR} style={{ padding: '14px 40px' }}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: INK }}>
          Datos TEST · misma mecánica que Binagre (marcar/desmarcar tareas).
        </div>
      </Banda>

      <Banda bg={BLANCO}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(28px,4vw,44px)', color: pct === 100 ? OLIVA : NARANJA }}>{pct}%</div>
          <div style={{ flex: 1, background: ARENA, border: `3px solid ${INK}`, height: 26, position: 'relative', maxWidth: 420 }}>
            <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: pct === 100 ? OLIVA : NARANJA }} />
          </div>
          <div style={{ fontFamily: LEX, fontWeight: 600, fontSize: 13, color: GRIS }}>{hechos}/{lista.items.length}</div>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {lista.items.map(it => (
            <button key={it.id} onClick={() => toggle(it.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer',
                background: it.ok ? OLIVA : BLANCO, border: `3px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}`,
                padding: '12px 14px',
              }}>
              <span style={{ width: 26, height: 26, flexShrink: 0, border: `3px solid ${INK}`, background: it.ok ? INK : BLANCO, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {it.ok && <Check size={16} color={OLIVA} strokeWidth={3} />}
              </span>
              <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 15, textTransform: 'uppercase', color: it.ok ? ARENA : INK, textDecoration: it.ok ? 'line-through' : 'none' }}>{it.texto}</span>
            </button>
          ))}
        </div>
      </Banda>
    </PageNeo>
  )
}
