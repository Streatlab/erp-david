import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Search, Upload, X, ChevronRight, ChevronLeft, Trash2, Power, AlertTriangle } from 'lucide-react'
import { fmtEur } from '@/utils/format'
import { useTheme, FONT, tabActiveStyle, tabInactiveStyle } from '@/styles/tokens'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toastStore'
import { parseArchivo, type MovimientoImportado } from '@/lib/conciliacion/import'
import {
  cargarReglasActivas,
  categorizarPendientes,
  emparejarReglaLocal,
  sugerirPatron,
  type ReglaAprendida,
  type OrigenCategoria,
} from '@/lib/conciliacion/categorizar'
import {
  actualizarMovimientoManual,
  aplicarReglaAMovimientos,
  borrarRegla as borrarReglaDB,
  buscarMovimientosParaPropagar,
  crearRegla as crearReglaDB,
  toggleReglaActiva,
} from '@/lib/conciliacion/reglas'

/* ═══════════════════════════════════════════════════════════
   TIPOS LOCALES
   ═══════════════════════════════════════════════════════════ */

interface Categoria {
  id: number
  codigo: string
  nombre: string
  tipo: 'INGRESO' | 'GASTO'
  orden: number
}

interface Subcategoria {
  id: number
  categoria_id: number
  codigo: string
  grupo: string | null
  nombre: string
  orden: number
  activa: boolean
}

interface MovimientoRow {
  id: number
  fecha: string
  fecha_valor: string | null
  concepto: string
  concepto_normalizado: string | null
  importe: number
  saldo: number | null
  banco: string | null
  subcategoria_id: number | null
  origen_categoria: string | null
  regla_id: number | null
  notas: string | null
  hash_unico: string
}

type TabKey = 'todos' | 'sin' | 'regla' | 'manual'

interface ModalState {
  mov: MovimientoRow
  subcategoriaNueva: number
}

/* ═══════════════════════════════════════════════════════════
   HELPERS UI
   ═══════════════════════════════════════════════════════════ */

function fmtFecha(iso: string): string {
  if (!iso || iso.length < 10) return iso
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y.slice(2)}`
}

function origenBadge(origen: string | null) {
  const o = (origen ?? 'SIN_CATEGORIZAR') as OrigenCategoria
  const map: Record<OrigenCategoria, { label: string; bg: string; fg: string }> = {
    SIN_CATEGORIZAR: { label: 'Pendiente', bg: 'rgba(245, 184, 74, 0.18)', fg: 'var(--ambar-700, #A87A1E)' },
    REGLA:           { label: 'Regla',     bg: 'rgba(22, 53, 92, 0.10)',    fg: 'var(--marino-500)' },
    MANUAL:          { label: 'Manual',    bg: 'rgba(122, 140, 62, 0.14)',  fg: 'var(--oliva-500)' },
    IA:              { label: 'IA',        bg: 'rgba(242, 107, 31, 0.14)',  fg: 'var(--brand-accent)' },
  }
  return map[o] ?? map.SIN_CATEGORIZAR
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function Conciliacion() {
  const { T } = useTheme()

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoRow[]>([])
  const [reglas, setReglas] = useState<ReglaAprendida[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabKey>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [panelAbierto, setPanelAbierto] = useState(false)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [importando, setImportando] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [cats, subs, movs, regs] = await Promise.all([
      supabase.from('categorias').select('*').order('orden'),
      supabase.from('subcategorias').select('*').order('orden'),
      supabase.from('movimientos_banco').select('*').order('fecha', { ascending: false }),
      supabase.from('reglas_aprendidas').select('id, patron, tipo_match, subcategoria_id, prioridad, creada_por, veces_aplicada, activa').order('prioridad', { ascending: false }),
    ])
    if (cats.error) { toast.error(cats.error.message); setLoading(false); return }
    if (subs.error) { toast.error(subs.error.message); setLoading(false); return }
    if (movs.error) { toast.error(movs.error.message); setLoading(false); return }
    if (regs.error) { toast.error(regs.error.message); setLoading(false); return }
    setCategorias((cats.data ?? []) as Categoria[])
    setSubcategorias((subs.data ?? []) as Subcategoria[])
    setMovimientos(((movs.data ?? []) as any[]).map(m => ({ ...m, importe: Number(m.importe) })) as MovimientoRow[])
    setReglas((regs.data ?? []) as ReglaAprendida[])
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const subPorId = useMemo(() => {
    const m = new Map<number, Subcategoria>()
    subcategorias.forEach(s => m.set(s.id, s))
    return m
  }, [subcategorias])

  const catPorId = useMemo(() => {
    const m = new Map<number, Categoria>()
    categorias.forEach(c => m.set(c.id, c))
    return m
  }, [categorias])

  /* — Grupos para el dropdown (por grupo dentro de cada categoría) — */
  const dropdownTree = useMemo(() => {
    return categorias.map(cat => {
      const subs = subcategorias.filter(s => s.categoria_id === cat.id && s.activa)
      const porGrupo = new Map<string, Subcategoria[]>()
      for (const s of subs) {
        const key = s.grupo ?? cat.nombre
        if (!porGrupo.has(key)) porGrupo.set(key, [])
        porGrupo.get(key)!.push(s)
      }
      return {
        categoria: cat,
        grupos: Array.from(porGrupo.entries()).map(([grupo, items]) => ({
          grupo,
          items: items.sort((a, b) => a.orden - b.orden),
        })),
      }
    })
  }, [categorias, subcategorias])

  /* — Filtrado por tab y búsqueda — */
  const filtrados = useMemo(() => {
    return movimientos.filter(m => {
      if (tab === 'sin' && (m.origen_categoria ?? 'SIN_CATEGORIZAR') !== 'SIN_CATEGORIZAR') return false
      if (tab === 'regla' && m.origen_categoria !== 'REGLA') return false
      if (tab === 'manual' && m.origen_categoria !== 'MANUAL') return false
      if (busqueda) {
        const q = busqueda.toLowerCase()
        const hay = (m.concepto ?? '').toLowerCase().includes(q) || (m.concepto_normalizado ?? '').toLowerCase().includes(q)
        if (!hay) return false
      }
      return true
    })
  }, [movimientos, tab, busqueda])

  /* — KPIs — */
  const kpis = useMemo(() => {
    const total = movimientos.length
    const sin = movimientos.filter(m => (m.origen_categoria ?? 'SIN_CATEGORIZAR') === 'SIN_CATEGORIZAR').length
    const porRegla = movimientos.filter(m => m.origen_categoria === 'REGLA').length
    const reglasActivas = reglas.filter(r => r.activa).length
    return { total, sin, porRegla, reglasActivas }
  }, [movimientos, reglas])

  /* ═══════════════════════════════════════════════════════════
     IMPORTAR
     ═══════════════════════════════════════════════════════════ */

  async function handleImport(file: File) {
    setImportando(true)
    const toastId = toast.loading(`Leyendo ${file.name}…`)
    try {
      const parsed: MovimientoImportado[] = await parseArchivo(file)
      if (parsed.length === 0) {
        toast.error('No se encontraron movimientos válidos en el archivo', { id: toastId })
        return
      }
      toast.loading(`Guardando ${parsed.length} movimientos…`, { id: toastId })
      const { data: insertados, error } = await supabase
        .from('movimientos_banco')
        .upsert(parsed, { onConflict: 'hash_unico', ignoreDuplicates: true })
        .select('id, concepto_normalizado')
      if (error) throw error
      const nuevos = (insertados ?? []) as { id: number; concepto_normalizado: string | null }[]
      const duplicados = parsed.length - nuevos.length

      let autoCategorizados = 0
      if (nuevos.length > 0) {
        toast.loading(`Aplicando reglas a ${nuevos.length}…`, { id: toastId })
        const reglasActivas = await cargarReglasActivas()
        autoCategorizados = await categorizarPendientes(nuevos, reglasActivas)
      }

      toast.success(
        [
          `✓ ${parsed.length} filas leídas`,
          `   ${nuevos.length} nuevas`,
          duplicados > 0 ? `   ${duplicados} duplicados (ignorados)` : null,
          autoCategorizados > 0 ? `   ${autoCategorizados} categorizadas por regla` : null,
        ].filter(Boolean).join('\n'),
        { id: toastId },
      )
      await loadAll()
    } catch (e: any) {
      toast.error(`Error al importar: ${e?.message ?? e}`, { id: toastId })
    } finally {
      setImportando(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  /* ═══════════════════════════════════════════════════════════
     CAMBIO DE SUBCATEGORÍA (abre modal de aprendizaje)
     ═══════════════════════════════════════════════════════════ */

  function onChangeSubcategoria(mov: MovimientoRow, nuevaSubId: number | '') {
    if (nuevaSubId === '') {
      // Limpieza
      actualizarMovimientoManual(mov.id, null)
        .then(loadAll)
        .catch(e => toast.error(e.message ?? 'Error'))
      return
    }
    const n = Number(nuevaSubId)
    if (!Number.isFinite(n)) return
    setModal({ mov, subcategoriaNueva: n })
  }

  async function aplicarOpcionSoloEste() {
    if (!modal) return
    try {
      await actualizarMovimientoManual(modal.mov.id, modal.subcategoriaNueva)
      toast.success('Movimiento actualizado')
      setModal(null)
      await loadAll()
    } catch (e: any) {
      toast.error(e.message ?? 'Error')
    }
  }

  async function aplicarOpcionRegla(tipo: 'EXACTO' | 'CONTIENE', patron: string) {
    if (!modal) return
    try {
      const regla = await crearReglaDB(patron, tipo, modal.subcategoriaNueva)
      // Actualiza también este movimiento
      const propagar = await buscarMovimientosParaPropagar(regla)
      const todosIds = [modal.mov.id, ...propagar.sin_categorizar.map(m => m.id)]
      await aplicarReglaAMovimientos(Array.from(new Set(todosIds)), modal.subcategoriaNueva, regla.id)

      if (propagar.con_categoria_distinta.length > 0) {
        const n = propagar.con_categoria_distinta.length
        const ok = confirm(
          `${n} movimiento(s) ya tienen otra categoría y también casan con esta regla.\n¿Sobrescribir su categoría?`,
        )
        if (ok) {
          await aplicarReglaAMovimientos(
            propagar.con_categoria_distinta.map(m => m.id),
            modal.subcategoriaNueva,
            regla.id,
          )
        }
      }

      toast.success(
        `Regla creada · aplicada a ${todosIds.length} movimiento(s) sin categoría` +
        (propagar.con_categoria_distinta.length > 0 ? ` · ${propagar.con_categoria_distinta.length} con conflicto` : ''),
      )
      setModal(null)
      await loadAll()
    } catch (e: any) {
      toast.error(e.message ?? 'Error')
    }
  }

  async function onToggleRegla(regla: ReglaAprendida) {
    try {
      await toggleReglaActiva(regla.id, !regla.activa)
      await loadAll()
    } catch (e: any) { toast.error(e.message ?? 'Error') }
  }

  async function onBorrarRegla(regla: ReglaAprendida) {
    if (!confirm(`¿Borrar la regla "${regla.patron}"? Los movimientos categorizados seguirán con su categoría actual.`)) return
    try {
      await borrarReglaDB(regla.id)
      await loadAll()
      toast.success('Regla eliminada')
    } catch (e: any) { toast.error(e.message ?? 'Error') }
  }

  /* ═══════════════════════════════════════════════════════════
     STYLES INLINE
     ═══════════════════════════════════════════════════════════ */

  const wrapPage: CSSProperties = {
    background: T.group,
    border: `0.5px solid ${T.brd}`,
    borderRadius: 16,
    padding: '24px 28px',
  }

  const titleStyle: CSSProperties = {
    fontFamily: FONT.heading, fontSize: 22, fontWeight: 500,
    letterSpacing: 1, margin: 0, textTransform: 'uppercase',
    color: 'var(--brand-accent)',
  }

  const btnPrimary: CSSProperties = {
    padding: '9px 18px',
    background: 'var(--brand-accent)',
    color: '#ffffff',
    border: 'none',
    borderRadius: 8,
    fontFamily: FONT.heading,
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: 1,
    textTransform: 'uppercase',
    cursor: importando ? 'wait' : 'pointer',
    opacity: importando ? 0.6 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  }

  const cardBase: CSSProperties = {
    backgroundColor: T.card,
    border: `1px solid ${T.brd}`,
    borderRadius: 12,
    padding: '16px 18px',
  }

  const kpiLabel: CSSProperties = {
    fontFamily: FONT.heading, fontSize: 10, color: T.mut,
    letterSpacing: 1.3, textTransform: 'uppercase', fontWeight: 500, marginBottom: 6,
  }

  const kpiValue: CSSProperties = {
    fontFamily: FONT.heading, fontSize: 28, fontWeight: 600, color: T.pri, lineHeight: 1,
  }

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    border: `1px solid ${T.brd}`,
    borderRadius: 8,
    backgroundColor: T.card,
    color: T.pri,
    fontFamily: FONT.body,
    fontSize: 13,
    outline: 'none',
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */

  return (
    <div style={wrapPage}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={titleStyle}>Conciliación bancaria</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setPanelAbierto(v => !v)}
            style={{
              padding: '9px 14px',
              background: 'transparent',
              border: `1px solid ${T.brd}`,
              borderRadius: 8,
              color: T.pri,
              fontFamily: FONT.heading,
              fontSize: 12,
              letterSpacing: 1,
              textTransform: 'uppercase',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {panelAbierto ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            Reglas ({reglas.length})
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls,.tsv"
            style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) handleImport(f)
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importando}
            style={btnPrimary}
          >
            <Upload size={14} />
            {importando ? 'Importando…' : 'Importar CSV'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
        <div style={cardBase}>
          <div style={kpiLabel}>Total movimientos</div>
          <div style={kpiValue}>{kpis.total}</div>
        </div>
        <div style={{ ...cardBase, borderColor: kpis.sin > 0 ? 'var(--ambar-500)' : T.brd }}>
          <div style={kpiLabel}>Sin categorizar</div>
          <div style={{ ...kpiValue, color: kpis.sin > 0 ? 'var(--ambar-700, #A87A1E)' : T.pri }}>{kpis.sin}</div>
        </div>
        <div style={cardBase}>
          <div style={kpiLabel}>Por regla</div>
          <div style={{ ...kpiValue, color: 'var(--marino-500)' }}>{kpis.porRegla}</div>
        </div>
        <div style={cardBase}>
          <div style={kpiLabel}>Reglas activas</div>
          <div style={kpiValue}>{kpis.reglasActivas}</div>
        </div>
      </div>

      {/* LAYOUT: tabla + panel */}
      <div style={{ display: 'grid', gridTemplateColumns: panelAbierto ? '1fr 320px' : '1fr', gap: 16, alignItems: 'start' }} className="conc-layout">
        {/* TABLA */}
        <div>
          {/* Tabs + búsqueda */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            {(['todos','sin','regla','manual'] as TabKey[]).map(k => (
              <button
                key={k}
                onClick={() => setTab(k)}
                style={tab === k ? tabActiveStyle(false) : tabInactiveStyle(T)}
              >
                {k === 'todos' ? 'Todos' : k === 'sin' ? `Sin categorizar (${kpis.sin})` : k === 'regla' ? 'Por regla' : 'Manual'}
              </button>
            ))}
            <div style={{ position: 'relative', marginLeft: 'auto', minWidth: 220 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.mut }} />
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar concepto…"
                style={{ ...inputStyle, paddingLeft: 32 }}
              />
            </div>
          </div>

          <div style={{ ...cardBase, padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', fontFamily: FONT.body, fontSize: 13, color: T.mut }}>Cargando…</div>
            ) : filtrados.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', fontFamily: FONT.body, fontSize: 13, color: T.mut }}>
                {movimientos.length === 0 ? 'Sin movimientos. Importa un CSV para empezar.' : 'No hay movimientos con esos filtros.'}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
                  <thead>
                    <tr style={{ background: T.group }}>
                      <th style={thStyle(T)}>Fecha</th>
                      <th style={{ ...thStyle(T), textAlign: 'left' }}>Concepto</th>
                      <th style={{ ...thStyle(T), textAlign: 'right' }}>Importe</th>
                      <th style={{ ...thStyle(T), textAlign: 'left', minWidth: 220 }}>Subcategoría</th>
                      <th style={thStyle(T)}>Origen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map(m => {
                      const sub = m.subcategoria_id ? subPorId.get(m.subcategoria_id) : null
                      const cat = sub ? catPorId.get(sub.categoria_id) : null
                      const badge = origenBadge(m.origen_categoria)
                      return (
                        <tr key={m.id} style={{ borderBottom: `1px solid ${T.brd}` }}>
                          <td style={{ ...tdStyle(T), whiteSpace: 'nowrap' }}>{fmtFecha(m.fecha)}</td>
                          <td style={tdStyle(T)}>
                            <div style={{ fontFamily: FONT.body, fontSize: 13, color: T.pri }}>{m.concepto}</div>
                            {cat && (
                              <div style={{ fontFamily: FONT.body, fontSize: 10, color: T.mut, marginTop: 2 }}>
                                {cat.codigo} · {cat.nombre}
                              </div>
                            )}
                          </td>
                          <td style={{
                            ...tdStyle(T),
                            textAlign: 'right',
                            fontFamily: FONT.heading,
                            fontWeight: 500,
                            color: m.importe >= 0 ? 'var(--oliva-500)' : 'var(--terra-500)',
                            whiteSpace: 'nowrap',
                          }}>
                            {m.importe >= 0 ? '+' : ''}{fmtEur(m.importe)}
                          </td>
                          <td style={tdStyle(T)}>
                            <select
                              value={m.subcategoria_id ?? ''}
                              onChange={e => onChangeSubcategoria(m, e.target.value === '' ? '' : Number(e.target.value))}
                              style={{
                                ...inputStyle,
                                padding: '6px 8px',
                                fontSize: 12,
                                backgroundColor: T.card,
                                cursor: 'pointer',
                              }}
                            >
                              <option value="">— Sin categorizar —</option>
                              {dropdownTree.map(ct => (
                                <optgroup key={ct.categoria.id} label={`${ct.categoria.codigo} · ${ct.categoria.nombre}`}>
                                  {ct.grupos.map(g => (
                                    g.items.map(s => (
                                      <option key={s.id} value={s.id}>
                                        {g.grupo !== ct.categoria.nombre ? `${g.grupo} · ` : ''}{s.nombre}
                                      </option>
                                    ))
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </td>
                          <td style={{ ...tdStyle(T), textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: 999,
                              fontFamily: FONT.heading,
                              fontSize: 10,
                              letterSpacing: 0.8,
                              textTransform: 'uppercase',
                              fontWeight: 500,
                              background: badge.bg,
                              color: badge.fg,
                            }}>
                              {badge.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* PANEL REGLAS */}
        {panelAbierto && (
          <aside style={{ ...cardBase, padding: 16, position: 'sticky', top: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ ...kpiLabel, marginBottom: 0 }}>Reglas aprendidas</div>
              <button onClick={() => setPanelAbierto(false)} style={{ background: 'transparent', border: 'none', color: T.mut, cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            {reglas.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', fontFamily: FONT.body, fontSize: 12, color: T.mut }}>
                Todavía no hay reglas. Categoriza un movimiento manualmente para crear la primera.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 480, overflowY: 'auto' }}>
                {reglas.map(r => {
                  const sub = subPorId.get(r.subcategoria_id)
                  return (
                    <div key={r.id} style={{
                      padding: 10,
                      background: r.activa ? T.group : 'transparent',
                      border: `1px solid ${T.brd}`,
                      borderRadius: 8,
                      opacity: r.activa ? 1 : 0.55,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontFamily: FONT.body, fontSize: 12, color: T.pri, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.patron}
                          </div>
                          <div style={{ fontFamily: FONT.body, fontSize: 10, color: T.mut, marginTop: 2 }}>
                            {r.tipo_match} · {sub ? sub.nombre : `sub#${r.subcategoria_id}`} · {r.veces_aplicada} usos
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => onToggleRegla(r)}
                            title={r.activa ? 'Desactivar' : 'Activar'}
                            style={iconBtn(T, r.activa ? 'var(--oliva-500)' : T.mut)}
                          >
                            <Power size={13} />
                          </button>
                          <button
                            onClick={() => onBorrarRegla(r)}
                            title="Borrar"
                            style={iconBtn(T, 'var(--terra-500)')}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* MODAL APRENDIZAJE */}
      {modal && (
        <ModalAprendizaje
          modal={modal}
          onClose={() => setModal(null)}
          onSoloEste={aplicarOpcionSoloEste}
          onExacto={() => aplicarOpcionRegla('EXACTO', modal.mov.concepto_normalizado ?? modal.mov.concepto)}
          onContiene={(patron) => aplicarOpcionRegla('CONTIENE', patron)}
          reglaExistente={emparejarReglaLocal(modal.mov.concepto_normalizado ?? '', reglas.filter(r => r.activa))}
        />
      )}

      <style>{`
        @media (max-width: 920px) {
          .conc-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MODAL APRENDIZAJE
   ═══════════════════════════════════════════════════════════ */

interface ModalProps {
  modal: ModalState
  onClose: () => void
  onSoloEste: () => void
  onExacto: () => void
  onContiene: (patron: string) => void
  reglaExistente: ReglaAprendida | null
}

function ModalAprendizaje({ modal, onClose, onSoloEste, onExacto, onContiene, reglaExistente }: ModalProps) {
  const { T } = useTheme()
  const sugerido = sugerirPatron(modal.mov.concepto_normalizado ?? modal.mov.concepto)
  const [patron, setPatron] = useState(sugerido)

  const btn = (primary?: boolean): CSSProperties => ({
    padding: '10px 14px',
    border: `1px solid ${primary ? 'transparent' : T.brd}`,
    borderRadius: 8,
    background: primary ? 'var(--brand-accent)' : 'transparent',
    color: primary ? '#fff' : T.pri,
    fontFamily: FONT.heading,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
  })

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: T.card,
          border: `1px solid ${T.brd}`,
          borderRadius: 14,
          padding: '24px 26px',
          maxWidth: 520, width: '100%',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{
            fontFamily: FONT.heading, fontSize: 14, color: 'var(--brand-accent)',
            letterSpacing: 1.3, textTransform: 'uppercase', fontWeight: 600,
          }}>
            ¿Cómo aplicar este cambio?
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: T.mut, cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ marginBottom: 14, padding: '10px 12px', background: T.group, borderRadius: 8, border: `1px solid ${T.brd}` }}>
          <div style={{ fontFamily: FONT.body, fontSize: 11, color: T.mut, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            Concepto
          </div>
          <div style={{ fontFamily: FONT.body, fontSize: 13, color: T.pri, fontWeight: 500 }}>{modal.mov.concepto}</div>
          <div style={{ fontFamily: FONT.body, fontSize: 11, color: T.mut, marginTop: 4 }}>
            Normalizado: {modal.mov.concepto_normalizado ?? '—'}
          </div>
        </div>

        {reglaExistente && reglaExistente.subcategoria_id !== modal.subcategoriaNueva && (
          <div style={{
            display: 'flex', gap: 8, alignItems: 'flex-start',
            padding: '10px 12px', marginBottom: 14,
            background: 'rgba(245, 184, 74, 0.12)',
            border: '1px solid rgba(245, 184, 74, 0.4)',
            borderRadius: 8,
            fontFamily: FONT.body, fontSize: 12, color: 'var(--ambar-700, #A87A1E)',
          }}>
            <AlertTriangle size={14} />
            <div>Ya existe la regla <strong>{reglaExistente.patron}</strong> ({reglaExistente.tipo_match}) con otra subcategoría. Si creas una nueva, se añadirá pero la existente seguirá activa.</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={onSoloEste} style={btn()}>
            Solo este movimiento
            <div style={{ fontSize: 10, color: T.mut, textTransform: 'none', letterSpacing: 0, marginTop: 2, fontFamily: FONT.body }}>
              Marca como MANUAL sin crear regla
            </div>
          </button>
          <button onClick={onExacto} style={btn()}>
            Match exacto
            <div style={{ fontSize: 10, color: T.mut, textTransform: 'none', letterSpacing: 0, marginTop: 2, fontFamily: FONT.body }}>
              Solo si el concepto normalizado coincide exactamente
            </div>
          </button>
          <div style={{ padding: '12px 14px', border: `1px solid ${T.brd}`, borderRadius: 8, background: T.group }}>
            <div style={{ fontFamily: FONT.heading, fontSize: 11, color: T.pri, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
              Contiene palabra clave
            </div>
            <input
              value={patron}
              onChange={e => setPatron(e.target.value.toUpperCase())}
              placeholder="Ej: IBERDROLA"
              style={{
                width: '100%',
                padding: '8px 10px',
                border: `1px solid ${T.brd}`,
                borderRadius: 6,
                background: T.inp,
                color: T.pri,
                fontFamily: FONT.body,
                fontSize: 13,
                outline: 'none',
              }}
            />
            <div style={{ fontSize: 10, color: T.mut, marginTop: 4, fontFamily: FONT.body }}>
              Sugerido: {sugerido}
            </div>
            <button
              onClick={() => patron.trim() && onContiene(patron.trim())}
              disabled={!patron.trim()}
              style={{ ...btn(true), marginTop: 10, opacity: patron.trim() ? 1 : 0.5 }}
            >
              Crear regla CONTIENE "{patron || '—'}"
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   STYLES HELPERS
   ═══════════════════════════════════════════════════════════ */

function thStyle(T: ReturnType<typeof useTheme>['T']): CSSProperties {
  return {
    padding: '10px 12px',
    fontFamily: FONT.heading,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: T.mut,
    fontWeight: 500,
    textAlign: 'center',
    borderBottom: `1px solid ${T.brd}`,
  }
}

function tdStyle(T: ReturnType<typeof useTheme>['T']): CSSProperties {
  return {
    padding: '10px 12px',
    fontFamily: FONT.body,
    fontSize: 13,
    color: T.pri,
    verticalAlign: 'middle',
  }
}

function iconBtn(T: ReturnType<typeof useTheme>['T'], color: string): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 26, height: 26,
    border: `1px solid ${T.brd}`,
    borderRadius: 6,
    background: 'transparent',
    color,
    cursor: 'pointer',
  }
}
