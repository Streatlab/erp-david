import { useState } from 'react'
import { Plus, Check } from 'lucide-react'
import { INK, ARENA, BLANCO, GRIS, OLIVA, TERRA, NARANJA, CELESTE, AMBAR, OSW, LEX } from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda, KpiNeo, PillsNeo, BotonNeo } from '@/components/neo/NeoUI'

/* Tareas — mismo concepto que Binagre (lista de tareas con estado/prioridad),
   datos TEST, neobrutal. */

type Prioridad = 'alta' | 'media' | 'baja'
type Estado = 'pendiente' | 'en_curso' | 'hecha'

interface Tarea { id: string; texto: string; prioridad: Prioridad; estado: Estado }

const INIT: Tarea[] = [
  { id: '1', texto: 'TEST · Reclamar recorte de Cade de junio', prioridad: 'alta',  estado: 'pendiente' },
  { id: '2', texto: 'TEST · Revisar furgoneta 02 (ruido freno)', prioridad: 'alta',  estado: 'en_curso' },
  { id: '3', texto: 'TEST · Subir facturas de combustible',      prioridad: 'media', estado: 'pendiente' },
  { id: '4', texto: 'TEST · Confirmar turnos semana que viene',  prioridad: 'media', estado: 'en_curso' },
  { id: '5', texto: 'TEST · Renovar seguro flota',               prioridad: 'baja',  estado: 'hecha' },
]

const COLOR_PRIO: Record<Prioridad, string> = { alta: TERRA, media: NARANJA, baja: CELESTE }
const LABEL_ESTADO: Record<Estado, string> = { pendiente: 'Pendiente', en_curso: 'En curso', hecha: 'Hecha' }

export default function Tareas() {
  const [tareas, setTareas] = useState<Tarea[]>(INIT)
  const [filtro, setFiltro] = useState('Todas')

  const avanzar = (id: string) => setTareas(prev => prev.map(t => {
    if (t.id !== id) return t
    const next: Estado = t.estado === 'pendiente' ? 'en_curso' : t.estado === 'en_curso' ? 'hecha' : 'pendiente'
    return { ...t, estado: next }
  }))
  const nueva = () => {
    const n = tareas.length + 1
    setTareas(prev => [{ id: String(Date.now()), texto: `TEST · Nueva tarea ${n}`, prioridad: 'media', estado: 'pendiente' }, ...prev])
  }

  const pend = tareas.filter(t => t.estado === 'pendiente').length
  const curso = tareas.filter(t => t.estado === 'en_curso').length
  const hechas = tareas.filter(t => t.estado === 'hecha').length

  const visibles = filtro === 'Todas' ? tareas
    : filtro === 'Pendientes' ? tareas.filter(t => t.estado === 'pendiente')
    : filtro === 'En curso' ? tareas.filter(t => t.estado === 'en_curso')
    : tareas.filter(t => t.estado === 'hecha')

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Tareas" titulo="Tareas">
        <BotonNeo onClick={nueva}><Plus size={14} style={{ marginRight: 6 }} /> Nueva tarea</BotonNeo>
      </CabeceraNeo>

      <Banda bg={AMBAR} style={{ padding: '14px 40px' }}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: INK }}>
          Datos TEST · lista de tareas con estado y prioridad, como en Binagre. Clic en una tarea para avanzar su estado.
        </div>
      </Banda>

      <Banda bg={BLANCO}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 18 }}>
          <KpiNeo label="Pendientes" valor={String(pend)} color={pend > 0 ? NARANJA : OLIVA} />
          <KpiNeo label="En curso" valor={String(curso)} color={CELESTE} />
          <KpiNeo label="Hechas" valor={String(hechas)} color={OLIVA} />
        </div>

        <div style={{ marginBottom: 18 }}>
          <PillsNeo value={filtro} onChange={setFiltro} options={['Todas', 'Pendientes', 'En curso', 'Hechas']} />
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {visibles.map(t => (
            <button key={t.id} onClick={() => avanzar(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', cursor: 'pointer',
                background: t.estado === 'hecha' ? OLIVA : BLANCO, border: `3px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}`, padding: '12px 14px',
              }}>
              <span style={{ width: 26, height: 26, flexShrink: 0, border: `3px solid ${INK}`, background: t.estado === 'hecha' ? INK : BLANCO, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t.estado === 'hecha' && <Check size={16} color={OLIVA} strokeWidth={3} />}
              </span>
              <span style={{ flex: 1, fontFamily: OSW, fontWeight: 700, fontSize: 15, textTransform: 'uppercase', color: t.estado === 'hecha' ? ARENA : INK, textDecoration: t.estado === 'hecha' ? 'line-through' : 'none' }}>{t.texto}</span>
              <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', background: COLOR_PRIO[t.prioridad], color: ARENA, border: `2px solid ${INK}`, padding: '2px 8px' }}>{t.prioridad}</span>
              <span style={{ fontFamily: LEX, fontWeight: 600, fontSize: 12, color: t.estado === 'hecha' ? ARENA : GRIS, minWidth: 78, textAlign: 'right' }}>{LABEL_ESTADO[t.estado]}</span>
            </button>
          ))}
        </div>
      </Banda>
    </PageNeo>
  )
}
