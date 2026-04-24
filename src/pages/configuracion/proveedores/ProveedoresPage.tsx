import { useEffect, useMemo, useState, Fragment } from 'react'
import type { CSSProperties } from 'react'
import { Package } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTheme, FONT } from '@/styles/tokens'
import ConfigGroupCard from '@/components/configuracion/ConfigGroupCard'
import { EditModal, Field } from '@/components/configuracion/EditModal'
import { ModTitle } from '@/components/configuracion/ModTitle'
import { ConfigShell } from '@/components/configuracion/ConfigShell'

interface Proveedor {
  id: string
  nombre: string
  nif: string | null
  patron_detectar: string | null
  categoria_default: string | null
  activo: boolean
}

interface CatIngreso { codigo: string; nombre: string }
interface CatGasto   { codigo: string; nombre: string; grupo: string | null }

export default function ProveedoresPage() {
  const { T, isDark } = useTheme()
  const [provs, setProvs] = useState<Proveedor[]>([])
  const [catsIng, setCatsIng] = useState<CatIngreso[]>([])
  const [catsGas, setCatsGas] = useState<CatGasto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Proveedor | null>(null)
  const [creating, setCreating] = useState(false)
  const [fNombre, setFNombre] = useState('')
  const [fNif, setFNif] = useState('')
  const [fPatron, setFPatron] = useState('')
  const [fCatDef, setFCatDef] = useState('')
  const [fActivo, setFActivo] = useState(true)
  const [saving, setSaving] = useState(false)

  async function refetch() {
    const [p, ci, cg] = await Promise.all([
      supabase.from('proveedores').select('id, nombre, nif, patron_detectar, categoria_default, activo').order('nombre'),
      supabase.from('categorias_contables_ingresos').select('codigo, nombre').order('orden'),
      supabase.from('categorias_contables_gastos').select('codigo, nombre, grupo').order('grupo').order('codigo'),
    ])
    if (p.error) throw p.error
    if (ci.error) throw ci.error
    if (cg.error) throw cg.error
    setProvs((p.data ?? []) as Proveedor[])
    setCatsIng((ci.data ?? []) as CatIngreso[])
    setCatsGas((cg.data ?? []) as CatGasto[])
  }

  useEffect(() => {
    (async () => {
      try { await refetch() }
      catch (e: any) { setError(e?.message ?? 'Error') }
      finally { setLoading(false) }
    })()
  }, [])

  const gastosPorGrupo = useMemo(() => {
    const m: Record<string, CatGasto[]> = {}
    catsGas.forEach(c => {
      const k = c.grupo ?? 'OTROS'
      ;(m[k] = m[k] || []).push(c)
    })
    return Object.keys(m).sort().map(g => ({ grupo: g, items: m[g] }))
  }, [catsGas])

  function open(p?: Proveedor) {
    if (p) {
      setEditing(p)
      setFNombre(p.nombre)
      setFNif(p.nif ?? '')
      setFPatron(p.patron_detectar ?? '')
      setFCatDef(p.categoria_default ?? '')
      setFActivo(p.activo)
    } else {
      setCreating(true)
      setFNombre(''); setFNif(''); setFPatron(''); setFCatDef(''); setFActivo(true)
    }
  }
  function close() {
    setEditing(null); setCreating(false)
    setFNombre(''); setFNif(''); setFPatron(''); setFCatDef(''); setFActivo(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload: any = {
        nombre: fNombre.trim(),
        nif: fNif.trim() || null,
        patron_detectar: fPatron.trim().toLowerCase() || null,
        categoria_default: fCatDef || null,
        activo: fActivo,
      }
      const q = editing
        ? supabase.from('proveedores').update(payload).eq('id', editing.id)
        : supabase.from('proveedores').insert(payload)
      const { error } = await q; if (error) throw error

      // Re-aplicar categoria_default a movimientos del proveedor que no tengan categoría
      if (editing && fCatDef && fCatDef !== (editing.categoria_default ?? '')) {
        await supabase.from('conciliacion')
          .update({ categoria: fCatDef })
          .eq('proveedor_id', editing.id)
          .is('categoria', null)
      }

      await refetch(); close()
    } catch (e: any) { setError(e?.message ?? 'Error') } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!editing) return
    if (!confirm(`Eliminar proveedor "${editing.nombre}"?`)) return
    const { error } = await supabase.from('proveedores').delete().eq('id', editing.id)
    if (error) { setError(error.message); return }
    await refetch(); close()
  }

  async function toggleActivo(p: Proveedor) {
    const { error } = await supabase.from('proveedores').update({ activo: !p.activo }).eq('id', p.id)
    if (error) { setError(error.message); return }
    await refetch()
  }

  if (loading) return <div style={{ padding: 24, color: T.mut, fontFamily: FONT.body }}>Cargando…</div>

  const th: CSSProperties = {
    padding: '10px 14px',
    fontFamily: FONT.heading,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '2px',
    color: T.mut,
    fontWeight: 400,
    background: T.group,
    textAlign: 'left',
  }
  const td: CSSProperties = { padding: '10px 14px', fontFamily: FONT.body, fontSize: 13, color: T.pri }

  const washBg  = isDark ? 'rgba(186,117,23,0.18)'  : '#FAEEDA'
  const washBrd = isDark ? 'rgba(250,199,117,0.28)' : '#FAC775'
  const washTxt = isDark ? '#FAC775'                : '#412402'
  const washSub = isDark ? '#F5C36B'                : '#854F0B'

  return (
    <ConfigShell>
      <ModTitle>Proveedores</ModTitle>

      {error && (
        <div style={{ margin: '12px 22px', padding: 14, background: 'var(--terra-500)20', color: 'var(--terra-500)', borderRadius: 10, fontFamily: FONT.body }}>
          {error}
        </div>
      )}

      <ConfigGroupCard title="Proveedores detectados" subtitle={`${provs.length} proveedores`}>
        <div
          style={{
            margin: '0 22px 14px',
            padding: 14,
            background: washBg,
            border: `1px solid ${washBrd}`,
            borderRadius: 8,
            fontSize: 12.5,
            color: washSub,
            fontFamily: FONT.body,
          }}
        >
          <strong style={{ color: washTxt }}>Cómo funcionan:</strong>{' '}
          Los proveedores se detectan automáticamente del concepto de cada movimiento. Si hay <em>patrón detectar</em>,
          al importar nuevos extractos se asigna <em>proveedor_id</em> a los movimientos que coincidan. La{' '}
          <em>categoría default</em> se propaga a esos movimientos si no están categorizados.
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, whiteSpace: 'nowrap', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderTop: `0.5px solid ${T.brd}`, borderBottom: `0.5px solid ${T.brd}`, background: T.group }}>
                <th style={th}>Nombre</th>
                <th style={th}>NIF</th>
                <th style={th}>Patrón detectar</th>
                <th style={th}>Categoría default</th>
                <th style={{ ...th, textAlign: 'center', width: 80 }}>Activo</th>
              </tr>
            </thead>
            <tbody>
              {provs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px 22px', textAlign: 'center' }}>
                    <Package size={32} color={T.mut} style={{ marginBottom: 12 }} />
                    <div style={{ fontFamily: FONT.heading, fontSize: 13, color: T.pri, letterSpacing: '1.3px', textTransform: 'uppercase', marginBottom: 6 }}>
                      Sin proveedores aún
                    </div>
                    <div style={{ fontFamily: FONT.body, fontSize: 12, color: T.mut, maxWidth: 400, margin: '0 auto' }}>
                      Importa movimientos en Conciliación y se detectarán automáticamente los proveedores.
                    </div>
                  </td>
                </tr>
              ) : provs.map(p => (
                <tr key={p.id} style={{ borderBottom: `0.5px solid ${T.brd}` }}>
                  <td onClick={() => open(p)} style={{ ...td, cursor: 'pointer', fontWeight: 500 }}>{p.nombre}</td>
                  <td onClick={() => open(p)} style={{ ...td, cursor: 'pointer', color: T.sec, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 }}>{p.nif ?? '—'}</td>
                  <td onClick={() => open(p)} style={{ ...td, cursor: 'pointer', color: T.sec, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 }}>{p.patron_detectar ?? '—'}</td>
                  <td onClick={() => open(p)} style={{ ...td, cursor: 'pointer', color: T.sec }}>{p.categoria_default ?? '—'}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={p.activo}
                      onChange={() => toggleActivo(p)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '14px 22px 18px',
            borderTop: `0.5px solid ${T.brd}`,
            background: T.bg,
          }}
        >
          <button
            onClick={() => open()}
            style={{
              padding: '7px 14px',
              borderRadius: 6,
              border: 'none',
              background: 'var(--brand-accent)',
              color: '#ffffff',
              fontFamily: FONT.heading,
              fontSize: 11,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >+ Añadir proveedor</button>
        </div>
      </ConfigGroupCard>

      {(editing || creating) && (
        <EditModal
          title={editing ? 'Editar proveedor' : 'Nuevo proveedor'}
          onSave={handleSave} onCancel={close}
          onDelete={editing ? handleDelete : undefined}
          saving={saving} canSave={!!fNombre.trim()}
        >
          <Field label="Nombre">
            <input
              value={fNombre}
              onChange={(e) => setFNombre(e.target.value)}
              placeholder="Iberdrola Smart Mobility"
              autoFocus
              className="w-full px-3 py-2 border border-[var(--sl-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--sl-border-focus)]"
            />
          </Field>
          <Field label="NIF">
            <input
              value={fNif}
              onChange={(e) => setFNif(e.target.value)}
              placeholder="A12345678"
              className="w-full px-3 py-2 border border-[var(--sl-border)] rounded-lg text-sm font-mono focus:outline-none focus:border-[var(--sl-border-focus)]"
            />
          </Field>
          <Field label="Patrón detectar (lowercase, ILIKE)">
            <input
              value={fPatron}
              onChange={(e) => setFPatron(e.target.value)}
              placeholder="iberdrola"
              className="w-full px-3 py-2 border border-[var(--sl-border)] rounded-lg text-sm font-mono focus:outline-none focus:border-[var(--sl-border-focus)]"
            />
          </Field>
          <Field label="Categoría default">
            <select
              value={fCatDef}
              onChange={(e) => setFCatDef(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--sl-border)] rounded-lg text-sm bg-[var(--sl-card)] focus:outline-none focus:border-[var(--sl-border-focus)]"
            >
              <option value="">—</option>
              <optgroup label="INGRESOS">
                {catsIng.map(c => <option key={c.codigo} value={c.nombre}>{c.nombre}</option>)}
              </optgroup>
              {gastosPorGrupo.map(g => (
                <Fragment key={g.grupo}>
                  <optgroup label={g.grupo}>
                    {g.items.map(c => <option key={c.codigo} value={c.nombre}>{c.nombre}</option>)}
                  </optgroup>
                </Fragment>
              ))}
            </select>
          </Field>
          <Field label="Activo">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={fActivo} onChange={(e) => setFActivo(e.target.checked)} /> Proveedor activo
            </label>
          </Field>
        </EditModal>
      )}
    </ConfigShell>
  )
}
