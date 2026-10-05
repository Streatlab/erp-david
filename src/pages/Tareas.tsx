import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fmtDate } from '@/lib/format'
import { INK, ARENA, BLANCO, GRIS, OLIVA, TERRA, NARANJA, CELESTE, AMBAR, OSW, BORDER_CARD } from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda, KpiNeo, BotonNeo, AvisoNeo, HeroNeo } from '@/components/neo/NeoUI'
import { campo, Etiqueta } from '@/components/flota/FormFlota'

/* Tareas reales (tabla tareas). Clic en una tarea avanza su estado: pendiente → en curso → hecha. */

interface Tarea { id: string; titulo: string; prioridad: string | null; estado: string; fecha_limite: string | null; asignado: string | null }

const SIGUIENTE: Record<string, string> = { PENDIENTE: 'EN_CURSO', EN_CURSO: 'HECHA', HECHA: 'PENDIENTE' }
const COLOR_EST: Record<string, string> = { PENDIENTE: AMBAR, EN_CURSO: CELESTE, HECHA: OLIVA }
const COLOR_PRIO: Record<string, string> = { ALTA: TERRA, NORMAL: NARANJA, BAJA: GRIS }

export default function Tareas() {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [nueva, setNueva] = useState<{ titulo: string; prioridad: string; fecha_limite: string; asignado: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    supabase.from('tareas').select('id, titulo, prioridad, estado, fecha_limite, asignado').order('created_at', { ascending: false })
      .then(({ data, error: e }) => { if (e) setError(e.message); else setTareas((data ?? []) as Tarea[]) })
  }, [tick])

  async function avanzar(t: Tarea) {
    const { error: e } = await supabase.from('tareas').update({ estado: SIGUIENTE[t.estado] ?? 'PENDIENTE' }).eq('id', t.id)
    if (e) setError(e.message); else setTick(x => x + 1)
  }

  async function crear() {
    if (!nueva?.titulo.trim()) return
    const { error: e } = await supabase.from('tareas').insert({
      titulo: nueva.titulo.trim(), prioridad: nueva.prioridad, estado: 'PENDIENTE',
      fecha_limite: nueva.fecha_limite || null, asignado: nueva.asignado || null,
    })
    if (e) setError(e.message); else { setNueva(null); setTick(x => x + 1) }
  }

  const hoyIso = new Date().toISOString().slice(0, 10)
  const abiertas = tareas.filter(t => t.estado !== 'HECHA')
  const vencidas = abiertas.filter(t => t.fecha_limite && t.fecha_limite < hoyIso).length
  const cuenta = (e: string) => tareas.filter(t => t.estado === e).length

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Tareas" titulo="Tareas">
        <BotonNeo onClick={() => setNueva({ titulo: '', prioridad: 'NORMAL', fecha_limite: '', asignado: '' })}><Plus size={14} style={{ marginRight: 6 }} /> Nueva tarea</BotonNeo>
      </CabeceraNeo>
      <HeroNeo
        eyebrowTxt="Tareas abiertas"
        cifra={tareas.length === 0 ? '—' : String(abiertas.length)}
        color={tareas.length === 0 ? AMBAR : vencidas > 0 ? NARANJA : OLIVA}
        frase={tareas.length === 0 ? 'Sin datos todavía' : vencidas > 0 ? `${vencidas} con la fecha límite pasada: empieza por esas.` : abiertas.length === 0 ? 'Todo al día, no queda nada pendiente.' : 'Ninguna vencida, vas al día.'}
        apoyo={tareas.length === 0 ? undefined : [{ label: 'Vencidas', valor: String(vencidas) }, { label: 'En curso', valor: String(cuenta('EN_CURSO')) }, { label: 'Hechas', valor: String(cuenta('HECHA')) }]}
      />
      {error && <AvisoNeo>ERROR: {error}</AvisoNeo>}

      {nueva && (
        <Banda bg={BLANCO}>
          <div style={{ background: ARENA, border: BORDER_CARD, padding: 18, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <div style={{ gridColumn: '1 / -1' }}><Etiqueta txt="Tarea"><input style={campo} autoFocus value={nueva.titulo} onChange={e => setNueva({ ...nueva, titulo: e.target.value })} /></Etiqueta></div>
            <Etiqueta txt="Prioridad">
              <select style={campo} value={nueva.prioridad} onChange={e => setNueva({ ...nueva, prioridad: e.target.value })}>
                <option value="ALTA">Alta</option><option value="NORMAL">Normal</option><option value="BAJA">Baja</option>
              </select>
            </Etiqueta>
            <Etiqueta txt="Fecha límite"><input type="date" style={campo} value={nueva.fecha_limite} onChange={e => setNueva({ ...nueva, fecha_limite: e.target.value })} /></Etiqueta>
            <Etiqueta txt="Asignada a"><input style={campo} value={nueva.asignado} onChange={e => setNueva({ ...nueva, asignado: e.target.value })} /></Etiqueta>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
              <BotonNeo onClick={crear}>Guardar</BotonNeo>
              <BotonNeo bg={BLANCO} onClick={() => setNueva(null)}>Cancelar</BotonNeo>
            </div>
          </div>
        </Banda>
      )}

      <Banda bg={BLANCO}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 20 }}>
          <KpiNeo label="Pendientes" valor={String(cuenta('PENDIENTE'))} color={AMBAR} />
          <KpiNeo label="En curso" valor={String(cuenta('EN_CURSO'))} color={CELESTE} />
          <KpiNeo label="Hechas" valor={String(cuenta('HECHA'))} color={OLIVA} />
        </div>
        {tareas.length === 0 ? (
          <div style={{ fontFamily: OSW, fontWeight: 700, textTransform: 'uppercase', color: GRIS, padding: 18, background: ARENA }}>Sin tareas. Crea la primera con «Nueva tarea».</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {tareas.map(t => (
              <button key={t.id} onClick={() => avanzar(t)} title="Clic para avanzar el estado"
                style={{ display: 'flex', gap: 12, alignItems: 'center', textAlign: 'left', background: BLANCO, border: BORDER_CARD, borderLeft: `8px solid ${COLOR_EST[t.estado] ?? GRIS}`, padding: '10px 14px', cursor: 'pointer', color: INK }}>
                <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 11, background: COLOR_PRIO[t.prioridad ?? 'NORMAL'] ?? GRIS, color: ARENA, padding: '2px 8px', textTransform: 'uppercase' }}>{t.prioridad ?? 'NORMAL'}</span>
                <span style={{ flex: 1, fontWeight: 600, textDecoration: t.estado === 'HECHA' ? 'line-through' : 'none' }}>{t.titulo}</span>
                {t.asignado && <span style={{ fontSize: 12, fontWeight: 600, color: GRIS }}>{t.asignado}</span>}
                {t.fecha_limite && <span style={{ fontFamily: OSW, fontSize: 12, fontWeight: 700 }}>{fmtDate(t.fecha_limite)}</span>}
                <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>{t.estado.replace('_', ' ')}</span>
              </button>
            ))}
          </div>
        )}
      </Banda>
    </PageNeo>
  )
}
