import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'
import { useTheme, getTokens, FONT } from '@/styles/tokens'
import { fmtEur } from '@/utils/format'
import { CATEGORIAS_ORDEN, CATEGORIA_NOMBRE, MESES_CORTO, type Categoria } from '@/lib/running'
import ConfigGroupCard from '@/components/configuracion/ConfigGroupCard'

interface Fila { anio: number; mes: number; categoria: string; tope: number }

type Matrix = Record<Categoria, number[]> // [12 meses]

function emptyMatrix(): Matrix {
  const m = {} as Matrix
  for (const c of CATEGORIAS_ORDEN) m[c] = Array(12).fill(0)
  return m
}

export default function PresupuestosPanel() {
  const theme = useTheme()
  const T = getTokens(theme)
  const hoy = new Date()
  const [anio, setAnio] = useState<number>(hoy.getFullYear())
  const [matrix, setMatrix] = useState<Matrix>(emptyMatrix())
  const [editing, setEditing] = useState<{ cat: Categoria; mes: number } | null>(null)
  const [flash, setFlash] = useState<{ cat: Categoria; mes: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const aniosOptions = [hoy.getFullYear() - 2, hoy.getFullYear() - 1, hoy.getFullYear(), hoy.getFullYear() + 1]

  async function refetch(year: number) {
    setLoading(true); setError(null)
    const { data, error } = await supabase
      .from('presupuestos_mensuales')
      .select('anio, mes, categoria, tope')
      .eq('anio', year)
    if (error) { setError(error.message); setLoading(false); return }
    const m = emptyMatrix()
    for (const f of (data ?? []) as Fila[]) {
      const cat = f.categoria as Categoria
      if (!m[cat]) continue
      if (f.mes >= 1 && f.mes <= 12) m[cat][f.mes - 1] = Number(f.tope) || 0
    }
    setMatrix(m)
    setLoading(false)
  }

  useEffect(() => { refetch(anio) }, [anio])

  async function saveCelda(cat: Categoria, mesIdx: number, valor: number) {
    const { error } = await supabase.from('presupuestos_mensuales').upsert(
      { anio, mes: mesIdx + 1, categoria: cat, tope: valor },
      { onConflict: 'anio,mes,categoria' },
    )
    if (error) { setError(error.message); return }
    setMatrix(prev => {
      const next = { ...prev, [cat]: [...prev[cat]] }
      next[cat][mesIdx] = valor
      return next
    })
    setFlash({ cat, mes: mesIdx })
    setTimeout(() => setFlash(null), 300)
  }

  async function copiarColumnaAFuturo(mesIdx: number) {
    if (mesIdx >= 11) return
    const updates: { anio: number; mes: number; categoria: string; tope: number }[] = []
    for (const cat of CATEGORIAS_ORDEN) {
      const valor = matrix[cat][mesIdx]
      for (let m = mesIdx + 1; m < 12; m++) {
        updates.push({ anio, mes: m + 1, categoria: cat, tope: valor })
      }
    }
    const { error } = await supabase.from('presupuestos_mensuales').upsert(updates, { onConflict: 'anio,mes,categoria' })
    if (error) { setError(error.message); return }
    await refetch(anio)
  }

  async function copiarAnioAnterior() {
    const { data, error } = await supabase
      .from('presupuestos_mensuales')
      .select('mes, categoria, tope')
      .eq('anio', anio - 1)
    if (error) { setError(error.message); return }
    if (!data || data.length === 0) {
      setError(`No hay datos en ${anio - 1}`)
      setTimeout(() => setError(null), 3000)
      return
    }
    const updates = (data as { mes: number; categoria: string; tope: number }[]).map(r => ({
      anio, mes: r.mes, categoria: r.categoria, tope: Number(r.tope) || 0,
    }))
    const { error: e2 } = await supabase.from('presupuestos_mensuales').upsert(updates, { onConflict: 'anio,mes,categoria' })
    if (e2) { setError(e2.message); return }
    await refetch(anio)
  }

  const totales = useMemo(() => {
    const porFila: Record<Categoria, number> = {} as any
    const porCol: number[] = Array(12).fill(0)
    let grand = 0
    for (const cat of CATEGORIAS_ORDEN) {
      const suma = matrix[cat].reduce((a, v) => a + v, 0)
      porFila[cat] = suma
      matrix[cat].forEach((v, i) => { porCol[i] += v })
      grand += suma
    }
    return { porFila, porCol, grand }
  }, [matrix])

  const th: CSSProperties = {
    padding: '8px 10px',
    fontFamily: FONT.sans, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase',
    color: T.textTertiary, fontWeight: 500, background: T.bgSurfaceAlt, borderBottom: `1px solid ${T.borderDefault}`,
  }
  const thCat: CSSProperties = { ...th, textAlign: 'left', minWidth: 160 }
  const thMes: CSSProperties = { ...th, textAlign: 'right', minWidth: 68 }
  const td: CSSProperties = {
    padding: '6px 8px', fontFamily: FONT.sans, fontSize: 12, color: T.textPrimary,
    borderBottom: `0.5px solid ${T.borderDefault}`, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
  }
  const tdCat: CSSProperties = { ...td, textAlign: 'left', fontWeight: 500, color: T.textPrimary, background: T.bgSurfaceAlt }

  const btn: CSSProperties = {
    padding: '7px 12px', borderRadius: 6, border: `0.5px solid ${T.borderDefault}`,
    background: T.bgSurface, color: T.textPrimary, fontFamily: FONT.sans, fontSize: 11,
    letterSpacing: 1, textTransform: 'uppercase', fontWeight: 500, cursor: 'pointer',
  }

  return (
    <ConfigGroupCard title="Presupuestos mensuales" subtitle={`${anio}`}>
      <div style={{ padding: '12px 20px 0', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: FONT.sans, fontSize: 11, color: T.textTertiary, letterSpacing: 1.2, textTransform: 'uppercase' }}>
          Año
        </span>
        <select
          value={anio}
          onChange={e => setAnio(Number(e.target.value))}
          style={{
            padding: '6px 10px', border: `0.5px solid ${T.borderDefault}`, borderRadius: 6,
            background: T.bgSurface, color: T.textPrimary, fontFamily: FONT.sans, fontSize: 12, outline: 'none',
          }}
        >
          {aniosOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={copiarAnioAnterior} style={btn}>Copiar año anterior</button>
        {loading && <span style={{ fontFamily: FONT.sans, fontSize: 11, color: T.textTertiary }}>Cargando…</span>}
        {error && <span style={{ fontFamily: FONT.sans, fontSize: 11, color: T.brandAccent }}>{error}</span>}
      </div>

      <div style={{ padding: '14px 20px 18px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 960 }}>
          <thead>
            <tr>
              <th style={thCat}>Categoría</th>
              {MESES_CORTO.map((m, i) => (
                <th key={m} style={thMes}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span>{m}</span>
                    {i < 11 && (
                      <button
                        onClick={() => copiarColumnaAFuturo(i)}
                        title={`Copiar ${MESES_CORTO[i]} a meses siguientes`}
                        style={{
                          padding: '1px 4px', fontSize: 9, background: 'transparent',
                          color: T.textTertiary, border: `0.5px solid ${T.borderDefault}`, borderRadius: 3,
                          cursor: 'pointer', fontFamily: FONT.sans, letterSpacing: 0.5,
                        }}
                      >→</button>
                    )}
                  </div>
                </th>
              ))}
              <th style={{ ...thMes, background: T.bgSurface, color: T.textPrimary, minWidth: 80 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIAS_ORDEN.map(cat => (
              <tr key={cat}>
                <td style={tdCat}>{CATEGORIA_NOMBRE[cat]}</td>
                {matrix[cat].map((valor, i) => (
                  <CellEditable
                    key={i}
                    valor={valor}
                    editing={editing?.cat === cat && editing?.mes === i}
                    flash={flash?.cat === cat && flash?.mes === i}
                    onOpen={() => setEditing({ cat, mes: i })}
                    onCancel={() => setEditing(null)}
                    onCommit={async (v) => { await saveCelda(cat, i, v); setEditing(null) }}
                  />
                ))}
                <td style={{ ...td, fontFamily: FONT.sans, fontWeight: 500, color: T.textPrimary, background: T.bgSurfaceAlt }}>
                  {fmtEur(totales.porFila[cat])}
                </td>
              </tr>
            ))}
            <tr>
              <td style={{ ...tdCat, fontFamily: FONT.sans, fontWeight: 600, background: T.bgSurface }}>TOTAL</td>
              {totales.porCol.map((v, i) => (
                <td key={i} style={{ ...td, fontFamily: FONT.sans, fontWeight: 500, color: T.textPrimary, background: T.bgSurface }}>
                  {v > 0 ? fmtEur(v) : '—'}
                </td>
              ))}
              <td style={{ ...td, fontFamily: FONT.sans, fontWeight: 600, color: T.brandAccent, background: T.bgSurface }}>
                {fmtEur(totales.grand)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </ConfigGroupCard>
  )
}

function CellEditable({
  valor, editing, flash, onOpen, onCancel, onCommit,
}: {
  valor: number
  editing: boolean
  flash: boolean
  onOpen: () => void
  onCancel: () => void
  onCommit: (v: number) => void | Promise<void>
}) {
  const theme = useTheme()
  const T = getTokens(theme)
  const [draft, setDraft] = useState(String(valor))
  useEffect(() => { setDraft(String(valor)) }, [valor, editing])

  const td: CSSProperties = {
    padding: '6px 8px', fontFamily: FONT.sans, fontSize: 12, color: T.textPrimary,
    borderBottom: `0.5px solid ${T.borderDefault}`, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
    transition: 'background 250ms',
    background: flash ? '#06C16722' : 'transparent',
    cursor: editing ? 'text' : 'pointer',
  }

  if (editing) {
    return (
      <td style={td}>
        <input
          type="number"
          min="0"
          step="1"
          value={draft}
          autoFocus
          onChange={e => setDraft(e.target.value)}
          onBlur={() => {
            const n = parseFloat(draft.replace(',', '.'))
            if (!Number.isFinite(n) || n < 0) { onCancel(); return }
            if (n === valor) { onCancel(); return }
            onCommit(n)
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            if (e.key === 'Escape') onCancel()
          }}
          style={{
            width: '100%', padding: '3px 6px',
            background: T.bgSurfaceAlt, color: T.textPrimary,
            border: `1px solid #B01D23`, borderRadius: 4,
            fontFamily: FONT.sans, fontSize: 12,
            textAlign: 'right', outline: 'none',
          }}
        />
      </td>
    )
  }

  return (
    <td style={td} onClick={onOpen} title="Click para editar">
      {valor > 0 ? fmtEur(valor) : <span style={{ color: T.textTertiary }}>—</span>}
    </td>
  )
}
