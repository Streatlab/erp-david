import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { INK, BLANCO, ARENA, CELESTE, OSW, LEX, BORDER_CARD } from '@/styles/neobrutal'
import { BotonNeo } from '@/components/neo/NeoUI'

export interface FurgoMin { id: string; codigo: string; nombre_corto: string; matricula: string | null }

export const campo: CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: BLANCO, color: INK, border: `2px dashed ${CELESTE}`,
  padding: '8px 10px', fontFamily: LEX, fontWeight: 600, fontSize: 13, borderRadius: 0, outline: 'none',
}

export function Etiqueta({ txt, children }: { txt: string; children: ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontFamily: OSW, fontWeight: 600, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>{txt}</div>
      {children}
    </label>
  )
}

export const nombreFurgo = (f?: FurgoMin) => f ? `${f.codigo} · ${f.nombre_corto}${f.matricula ? ` (${f.matricula})` : ''}` : '—'

/* Formulario de alta común: furgoneta, fecha, tipo, descripción, coste y campos extra */
export function FormAlta({ furgos, tipos, extra, inicial, onGuardar, onCancelar }: {
  furgos: FurgoMin[]
  tipos: string[]
  extra?: { clave: string; txt: string }[]
  inicial?: Partial<Record<string, string>>
  onGuardar: (v: Record<string, string>) => Promise<string | null>
  onCancelar: () => void
}) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [v, setV] = useState<Record<string, string>>({ furgoneta_id: furgos[0]?.id ?? '', fecha: hoy, tipo: tipos[0], descripcion: '', coste: '', ...inicial })
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const set = (k: string, x: string) => setV(p => ({ ...p, [k]: x }))

  async function guardar() {
    if (!v.furgoneta_id || !v.fecha) { setError('Elige furgoneta y fecha'); return }
    setGuardando(true)
    const e = await onGuardar(v)
    setGuardando(false)
    if (e) setError(e)
  }

  return (
    <div style={{ background: ARENA, border: BORDER_CARD, padding: 18, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
      <Etiqueta txt="Furgoneta">
        <select style={campo} value={v.furgoneta_id} onChange={e => set('furgoneta_id', e.target.value)}>
          {furgos.map(f => <option key={f.id} value={f.id}>{nombreFurgo(f)}</option>)}
        </select>
      </Etiqueta>
      <Etiqueta txt="Fecha"><input type="date" style={campo} value={v.fecha} onChange={e => set('fecha', e.target.value)} /></Etiqueta>
      <Etiqueta txt="Tipo">
        <select style={campo} value={v.tipo} onChange={e => set('tipo', e.target.value)}>
          {tipos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </Etiqueta>
      <Etiqueta txt="Coste (€)"><input inputMode="decimal" style={campo} value={v.coste} onChange={e => set('coste', e.target.value)} /></Etiqueta>
      {(extra ?? []).map(x => (
        <Etiqueta key={x.clave} txt={x.txt}><input style={campo} value={v[x.clave] ?? ''} onChange={e => set(x.clave, e.target.value)} /></Etiqueta>
      ))}
      <div style={{ gridColumn: '1 / -1' }}>
        <Etiqueta txt="Descripción"><input style={campo} value={v.descripcion} onChange={e => set('descripcion', e.target.value)} /></Etiqueta>
      </div>
      {error && <div style={{ gridColumn: '1 / -1', fontFamily: OSW, fontWeight: 700, color: INK }}>⚠ {error}</div>}
      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
        <BotonNeo onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</BotonNeo>
        <BotonNeo onClick={onCancelar} bg={BLANCO}>Cancelar</BotonNeo>
      </div>
    </div>
  )
}

export const aNumero = (s: string | undefined) => {
  const t = String(s ?? '').trim()
  const n = parseFloat(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t)
  return isNaN(n) ? null : n
}
