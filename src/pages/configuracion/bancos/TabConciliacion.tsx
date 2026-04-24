import { useEffect, useState } from 'react'
import { useTheme, getTokens, FONT, PALETTE } from '@/styles/tokens'
import { supabase } from '@/lib/supabase'
import { BigCard } from '@/components/configuracion/BigCard'
import { StatusTag } from '@/components/configuracion/StatusTag'
import { AbvBadge } from '@/components/configuracion/AbvBadge'
import { Table, THead, TBody, TH, TR, TD } from '@/components/configuracion/ConfigTable'
import { ConfigModal, ConfigField, useInputStyle, ModalActions } from '@/components/configuracion/ConfigModal'
import type {
  CategoriaContableIngreso,
  CategoriaContableGasto,
  ReglaConciliacion,
} from '@/types/configuracion'

type SubPill = 'categorias' | 'reglas'

function canalBg(theme: 'light' | 'dark'): Record<string, string> {
  const t = getTokens(theme)
  const p = PALETTE[theme]
  return {
    UE:  t.success,
    GL:  t.warning,
    JE:  p.naranja[500],
    WEB: t.danger,
    DIR: t.info,
  }
}

const TIPO_LABEL: Record<'fijo' | 'var' | 'pers' | 'mkt', string> = {
  fijo: 'Fijo', var: 'Var', pers: 'Pers', mkt: 'Mkt',
}

export default function TabConciliacion() {
  const theme = useTheme()
  const t = getTokens(theme)
  const p = PALETTE[theme]
  const [pill, setPill] = useState<SubPill>('categorias')

  const subPillStyle = (active: boolean): React.CSSProperties => ({
    padding: '7px 14px',
    borderRadius: 6,
    background: active ? p.ambar[50] : t.bgSurface,
    border: `1px solid ${active ? p.ambar[300] : t.borderDefault}`,
    color: active ? p.ambar[700] : t.textSecondary,
    fontSize: 12,
    fontWeight: active ? 600 : 500,
    fontFamily: FONT.sans,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  })

  return (
    <>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <button type="button" style={subPillStyle(pill === 'categorias')} onClick={() => setPill('categorias')}>
          Categorías
        </button>
        <button type="button" style={subPillStyle(pill === 'reglas')} onClick={() => setPill('reglas')}>
          Reglas automáticas
        </button>
      </div>

      {pill === 'categorias' ? <PanelCategorias /> : <PanelReglas />}
    </>
  )
}

function PanelCategorias() {
  const theme = useTheme()
  const t = getTokens(theme)
  const CANAL_BG = canalBg(theme)
  const [catsIng, setCatsIng] = useState<CategoriaContableIngreso[]>([])
  const [catsGas, setCatsGas] = useState<CategoriaContableGasto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<{ tipo: 'ingreso' | 'gasto'; editing: any } | null>(null)

  const refetch = async () => {
    const [i, g] = await Promise.all([
      supabase.from('categorias_contables_ingresos').select('*').order('orden'),
      supabase.from('categorias_contables_gastos').select('*').order('orden'),
    ])
    if (i.error) throw i.error
    if (g.error) throw g.error
    setCatsIng((i.data ?? []) as unknown as CategoriaContableIngreso[])
    setCatsGas((g.data ?? []) as unknown as CategoriaContableGasto[])
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try { await refetch() }
      catch (e: any) { if (!cancelled) setError(e?.message ?? 'Error') }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  const handleDeleteIngreso = async (c: CategoriaContableIngreso) => {
    if (!confirm(`¿Eliminar categoría "${c.nombre}"?`)) return
    const { error } = await supabase.from('categorias_contables_ingresos').delete().eq('id', c.id)
    if (error) { setError(error.message); return }
    await refetch()
  }
  const handleDeleteGasto = async (c: CategoriaContableGasto) => {
    if (!confirm(`¿Eliminar categoría "${c.nombre}"?`)) return
    const { error } = await supabase.from('categorias_contables_gastos').delete().eq('id', c.id)
    if (error) { setError(error.message); return }
    await refetch()
  }

  if (loading) return <div style={{ padding: 24, color: t.textTertiary }}>Cargando categorías…</div>
  if (error) {
    return (
      <div style={{ padding: 16, background: t.dangerBg, color: t.dangerText, borderRadius: 12 }}>
        {error}
      </div>
    )
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
        <BigCard title="Ingresos" count={`${catsIng.length} categorías`}>
          <Table>
            <THead>
              <tr>
                <TH>Código</TH>
                <TH>Categoría</TH>
                <TH>Canal</TH>
                <TH num>Acciones</TH>
              </tr>
            </THead>
            <TBody>
              {catsIng.map(c => (
                <TR key={c.id}>
                  <TD>
                    <AbvBadge abv={c.codigo} bg={c.canal_abv ? (CANAL_BG[c.canal_abv] ?? t.brandPrimary) : t.brandPrimary} />
                  </TD>
                  <TD bold>{c.nombre}</TD>
                  <TD muted>{c.canal_abv ?? '—'}</TD>
                  <TD num>
                    <button onClick={() => setModal({ tipo: 'ingreso', editing: c })} style={actionBtn(t.brandAccent)}>Editar</button>
                    <button onClick={() => handleDeleteIngreso(c)} style={actionBtn(t.textTertiary, true)}>Eliminar</button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <button
            onClick={() => setModal({ tipo: 'ingreso', editing: null })}
            style={addBtn(theme)}
          >
            + Nueva categoría ingreso
          </button>
        </BigCard>

        <BigCard title="Gastos" count={`${catsGas.length} categorías`}>
          <Table>
            <THead>
              <tr>
                <TH>Código</TH>
                <TH>Categoría</TH>
                <TH>Tipo</TH>
                <TH num>Acciones</TH>
              </tr>
            </THead>
            <TBody>
              {catsGas.map(c => (
                <TR key={c.id}>
                  <TD><AbvBadge abv={c.codigo} /></TD>
                  <TD bold>{c.nombre}</TD>
                  <TD><StatusTag variant={c.tipo}>{TIPO_LABEL[c.tipo]}</StatusTag></TD>
                  <TD num>
                    <button onClick={() => setModal({ tipo: 'gasto', editing: c })} style={actionBtn(t.brandAccent)}>Editar</button>
                    <button onClick={() => handleDeleteGasto(c)} style={actionBtn(t.textTertiary, true)}>Eliminar</button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <button
            onClick={() => setModal({ tipo: 'gasto', editing: null })}
            style={addBtn(theme)}
          >
            + Nueva categoría gasto
          </button>
        </BigCard>
      </div>
      {modal && (
        <CategoriaModal
          tipo={modal.tipo}
          editing={modal.editing}
          onClose={() => setModal(null)}
          onSaved={refetch}
        />
      )}
    </>
  )
}

function actionBtn(color: string, danger = false): React.CSSProperties {
  return {
    background: 'none',
    border: 'none',
    color,
    fontSize: 11,
    cursor: 'pointer',
    marginLeft: 12,
    padding: 0,
    fontFamily: FONT.sans,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    fontWeight: 600,
    ...(danger ? { textDecoration: 'none' } : {}),
  }
}

function addBtn(theme: 'light' | 'dark'): React.CSSProperties {
  const p = PALETTE[theme]
  return {
    marginTop: 12,
    padding: '8px 14px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    background: p.ambar[50],
    color: p.ambar[700],
    border: `1px solid ${p.ambar[300]}`,
    cursor: 'pointer',
    fontFamily: FONT.sans,
  }
}

function CategoriaModal({
  tipo, editing, onClose, onSaved,
}: {
  tipo: 'ingreso' | 'gasto'
  editing: any | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const theme = useTheme()
  const t = getTokens(theme)
  const inputStyle = useInputStyle()
  const [codigo, setCodigo] = useState(editing?.codigo ?? '')
  const [nombre, setNombre] = useState(editing?.nombre ?? '')
  const [canalAbv, setCanalAbv] = useState(editing?.canal_abv ?? '')
  const [tipoGasto, setTipoGasto] = useState(editing?.tipo ?? 'var')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!codigo.trim() || !nombre.trim()) return
    setSaving(true); setError(null)
    const tabla = tipo === 'ingreso' ? 'categorias_contables_ingresos' : 'categorias_contables_gastos'
    const payload: any = tipo === 'ingreso'
      ? { codigo: codigo.trim(), nombre: nombre.trim(), canal_abv: canalAbv || null }
      : { codigo: codigo.trim(), nombre: nombre.trim(), tipo: tipoGasto }
    const q = editing
      ? supabase.from(tabla).update(payload).eq('id', editing.id)
      : supabase.from(tabla).insert(payload)
    const { error } = await q
    setSaving(false)
    if (error) { setError(error.message); return }
    await onSaved()
    onClose()
  }

  return (
    <ConfigModal
      title={`${editing ? 'Editar' : 'Nueva'} categoría ${tipo}`}
      onClose={onClose}
    >
      <ConfigField label="Código">
        <input
          value={codigo}
          onChange={e => setCodigo(e.target.value)}
          style={{ ...inputStyle, fontFamily: FONT.mono }}
          placeholder={tipo === 'ingreso' ? 'ING-XXX' : 'GAS-XXX'}
        />
      </ConfigField>
      <ConfigField label="Nombre">
        <input value={nombre} onChange={e => setNombre(e.target.value)} style={inputStyle} />
      </ConfigField>
      {tipo === 'ingreso' ? (
        <ConfigField label="Canal (opcional)">
          <select value={canalAbv} onChange={e => setCanalAbv(e.target.value)} style={inputStyle}>
            <option value="">—</option>
            <option value="UE">UE</option><option value="GL">GL</option><option value="JE">JE</option>
            <option value="WEB">WEB</option><option value="DIR">DIR</option>
          </select>
        </ConfigField>
      ) : (
        <ConfigField label="Tipo">
          <select value={tipoGasto} onChange={e => setTipoGasto(e.target.value as any)} style={inputStyle}>
            <option value="fijo">Fijo</option>
            <option value="var">Variable</option>
            <option value="pers">Personal</option>
            <option value="mkt">Marketing</option>
          </select>
        </ConfigField>
      )}
      {error && (
        <div style={{ marginTop: 12, padding: 8, background: t.dangerBg, color: t.dangerText, fontSize: 12, borderRadius: 6 }}>
          {error}
        </div>
      )}
      <ModalActions
        onCancel={onClose}
        onSave={handleSave}
        saving={saving}
        disabled={!codigo.trim() || !nombre.trim()}
      />
    </ConfigModal>
  )
}

function PanelReglas() {
  const theme = useTheme()
  const t = getTokens(theme)
  const [reglas, setReglas] = useState<ReglaConciliacion[]>([])
  const [catsIng, setCatsIng] = useState<CategoriaContableIngreso[]>([])
  const [catsGas, setCatsGas] = useState<CategoriaContableGasto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ReglaConciliacion | null>(null)

  const refetch = async () => {
    const [r, i, g] = await Promise.all([
      supabase.from('reglas_conciliacion').select('*').order('prioridad', { ascending: false }),
      supabase.from('categorias_contables_ingresos').select('*').order('orden'),
      supabase.from('categorias_contables_gastos').select('*').order('orden'),
    ])
    if (r.error) throw r.error
    if (i.error) throw i.error
    if (g.error) throw g.error
    setReglas((r.data ?? []) as unknown as ReglaConciliacion[])
    setCatsIng((i.data ?? []) as unknown as CategoriaContableIngreso[])
    setCatsGas((g.data ?? []) as unknown as CategoriaContableGasto[])
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try { await refetch() }
      catch (e: any) { if (!cancelled) setError(e?.message ?? 'Error') }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  const handleDelete = async (r: ReglaConciliacion) => {
    if (!confirm(`¿Eliminar regla "${r.patron}"?`)) return
    const { error } = await supabase.from('reglas_conciliacion').delete().eq('id', r.id)
    if (error) { setError(error.message); return }
    await refetch()
  }

  const handleToggle = async (r: ReglaConciliacion) => {
    const { error } = await supabase.from('reglas_conciliacion').update({ activa: !r.activa }).eq('id', r.id)
    if (error) { setError(error.message); return }
    await refetch()
  }

  if (loading) return <div style={{ padding: 24, color: t.textTertiary }}>Cargando reglas…</div>
  if (error) {
    return (
      <div style={{ padding: 16, background: t.dangerBg, color: t.dangerText, borderRadius: 12 }}>
        {error}
      </div>
    )
  }

  const categoriaNombre = (r: ReglaConciliacion): string => {
    if (r.tipo_categoria === 'ingreso') {
      const c = catsIng.find(x => x.id === r.categoria_id)
      return c ? `${c.codigo} · ${c.nombre}` : r.categoria_id
    }
    const c = catsGas.find(x => x.id === r.categoria_id)
    return c ? `${c.codigo} · ${c.nombre}` : r.categoria_id
  }

  return (
    <>
      <BigCard title="Reglas de asignación automática" count={`${reglas.length} reglas`}>
        <p style={{ fontSize: 12.5, color: t.textSecondary, marginBottom: 16, fontFamily: FONT.sans }}>
          Cuando llega un movimiento del banco, el sistema busca si su concepto contiene el patrón de alguna regla activa y asigna la categoría correspondiente. Mayor prioridad = se evalúa primero.
        </p>
        {reglas.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: t.textTertiary }}>Sin reglas definidas</div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Si concepto contiene</TH>
                <TH>Tipo</TH>
                <TH>Asignar categoría</TH>
                <TH num>Prioridad</TH>
                <TH num>Activa</TH>
                <TH num>Acciones</TH>
              </tr>
            </THead>
            <TBody>
              {reglas.map(r => (
                <TR key={r.id}>
                  <TD style={{ fontFamily: FONT.mono, fontSize: 12.5 }}>
                    {r.patron}
                  </TD>
                  <TD muted>{r.tipo_categoria === 'ingreso' ? 'Ingreso' : 'Gasto'}</TD>
                  <TD>{categoriaNombre(r)}</TD>
                  <TD num bold>{r.prioridad}</TD>
                  <TD num>
                    <input type="checkbox" checked={r.activa} onChange={() => handleToggle(r)} style={{ accentColor: t.brandAccent, cursor: 'pointer' }} />
                  </TD>
                  <TD num>
                    <button onClick={() => { setEditing(r); setModalOpen(true) }} style={actionBtn(t.brandAccent)}>Editar</button>
                    <button onClick={() => handleDelete(r)} style={actionBtn(t.textTertiary)}>Eliminar</button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
        <button onClick={() => { setEditing(null); setModalOpen(true) }} style={addBtn(theme)}>
          + Nueva regla
        </button>
      </BigCard>
      {modalOpen && (
        <ReglaModal
          editing={editing}
          catsIng={catsIng}
          catsGas={catsGas}
          onClose={() => setModalOpen(false)}
          onSaved={refetch}
        />
      )}
    </>
  )
}

function ReglaModal({
  editing, catsIng, catsGas, onClose, onSaved,
}: {
  editing: ReglaConciliacion | null
  catsIng: CategoriaContableIngreso[]
  catsGas: CategoriaContableGasto[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const theme = useTheme()
  const t = getTokens(theme)
  const inputStyle = useInputStyle()
  const [patron, setPatron] = useState(editing?.patron ?? '')
  const [tipo, setTipo] = useState<'ingreso' | 'gasto'>(editing?.tipo_categoria ?? 'ingreso')
  const [categoriaId, setCategoriaId] = useState(editing?.categoria_id ?? '')
  const [prioridad, setPrioridad] = useState(editing?.prioridad ?? 0)
  const [activa, setActiva] = useState(editing?.activa ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categorias = tipo === 'ingreso' ? catsIng : catsGas

  const handleSave = async () => {
    if (!patron.trim() || !categoriaId) return
    setSaving(true); setError(null)
    const payload = {
      patron: patron.trim(),
      tipo_categoria: tipo,
      categoria_id: categoriaId,
      prioridad: Number(prioridad) || 0,
      activa,
    }
    const q = editing
      ? supabase.from('reglas_conciliacion').update(payload).eq('id', editing.id)
      : supabase.from('reglas_conciliacion').insert(payload)
    const { error } = await q
    setSaving(false)
    if (error) { setError(error.message); return }
    await onSaved()
    onClose()
  }

  return (
    <ConfigModal title={`${editing ? 'Editar' : 'Nueva'} regla de conciliación`} onClose={onClose}>
      <ConfigField label="Si concepto bancario contiene">
        <input value={patron} onChange={e => setPatron(e.target.value)} style={inputStyle} placeholder='p.ej. "Mercadona", "Carrefour", "Nómina"' />
      </ConfigField>
      <ConfigField label="Tipo">
        <select value={tipo} onChange={e => { setTipo(e.target.value as 'ingreso' | 'gasto'); setCategoriaId('') }} style={inputStyle}>
          <option value="ingreso">Ingreso</option>
          <option value="gasto">Gasto</option>
        </select>
      </ConfigField>
      <ConfigField label="Asignar categoría">
        <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} style={inputStyle}>
          <option value="">— selecciona —</option>
          {categorias.map(c => (
            <option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>
          ))}
        </select>
      </ConfigField>
      <ConfigField label="Prioridad (mayor = se evalúa primero)">
        <input type="number" value={prioridad} onChange={e => setPrioridad(Number(e.target.value))} style={inputStyle} />
      </ConfigField>
      <ConfigField label="Activa">
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={activa} onChange={e => setActiva(e.target.checked)} style={{ accentColor: t.brandAccent }} />
          <span>Evaluar esta regla en nuevos movimientos</span>
        </label>
      </ConfigField>
      {error && (
        <div style={{ marginTop: 12, padding: 8, background: t.dangerBg, color: t.dangerText, fontSize: 12, borderRadius: 6 }}>
          {error}
        </div>
      )}
      <ModalActions
        onCancel={onClose}
        onSave={handleSave}
        saving={saving}
        disabled={!patron.trim() || !categoriaId}
      />
    </ConfigModal>
  )
}
