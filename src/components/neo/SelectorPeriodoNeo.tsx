/**
 * SelectorPeriodoNeo.tsx — Selector de periodo de la barra superior (estilo Neobrutal Mediterráneo).
 * Solo se muestra cuando la pantalla abierta usa usePeriodo().
 */
import { ARENA, AMBAR, INK, OSW, LEX } from '@/styles/neobrutal'
import { usePeriodoCtx, rangoDe, etiquetaPeriodo, type PeriodoKey } from '@/lib/periodoGlobal'

const OPCIONES: { value: PeriodoKey; label: string }[] = [
  { value: 'semana', label: 'Esta semana' },
  { value: 'semana_anterior', label: 'Semana anterior' },
  { value: 'mes', label: 'Este mes' },
  { value: 'mes_anterior', label: 'Mes anterior' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: 'trimestre', label: 'Últimos 3 meses' },
]

const campo = {
  fontFamily: OSW, fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' as const,
  background: ARENA, color: INK, border: `3px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`,
  padding: '5px 8px', minHeight: 36, cursor: 'pointer', borderRadius: 0,
}

export default function SelectorPeriodoNeo() {
  const { key, setKey, customDesde, customHasta, setRango, consumidores } = usePeriodoCtx()
  if (consumidores === 0) return null
  const anio = new Date().getFullYear()
  const etiqueta = etiquetaPeriodo(key, rangoDe(key, customDesde, customHasta))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      <span className="hidden md:inline" style={{ fontFamily: LEX, fontSize: 12, fontWeight: 600, color: AMBAR, textTransform: 'capitalize' }}>{etiqueta}</span>
      <select aria-label="Periodo" value={key} onChange={e => setKey(e.target.value as PeriodoKey)} style={campo}>
        {OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        {[anio, anio - 1, anio - 2].map(a => <option key={a} value={`anio_${a}`}>Año {a}</option>)}
        <option value="personalizado">Personalizado</option>
      </select>
      {key === 'personalizado' && (
        <>
          <input type="date" aria-label="Desde" value={customDesde} onChange={e => setRango(e.target.value, customHasta)} style={campo} />
          <input type="date" aria-label="Hasta" value={customHasta} onChange={e => setRango(customDesde, e.target.value)} style={campo} />
        </>
      )}
    </div>
  )
}
