import { useMemo, useState, type CSSProperties } from 'react'
import { Search, Zap } from 'lucide-react'
import { fmtEur } from '@/utils/format'
import {
  INK, MARINO, ARENA, ARENA_CL, BLANCO, GRIS,
  OLIVA, TERRA, NARANJA, CELESTE, AMBAR,
  OSW, LEX, SHADOW, BORDER_CARD, OPERADOR, card,
} from '@/styles/neobrutal'
import {
  PageNeo, Banda, CabeceraNeo, AvisoNeo,
  TablaWrap, thNeo, tdNeo, tdEstado, BadgeNeo, BotonNeo,
} from '@/components/neo/NeoUI'
import { ResumenDashboard } from '@/components/conciliacion/ResumenDashboard'
import ImportDropzone, { type ParsedRow } from '@/components/conciliacion/ImportDropzone'
import SelectorPeriodoDropdown, { type PeriodoKey } from '@/components/finanzas/running/SelectorPeriodoDropdown'
import { useAniosDisponibles } from '@/hooks/useAniosDisponibles'
import { toast } from '@/lib/toastStore'
import type { Movimiento } from '@/types/conciliacion'
import { useConciliacion } from '@/hooks/useConciliacion'

/* ═══════════════════════════════════════════════════════════
   HELPERS (lógica intacta)
   ═══════════════════════════════════════════════════════════ */

const STOP_WORDS = new Set([
  'liquidacion', 'pedido', 'nomina', 'del', 'de', 'la', 'el', 'por', 'para',
  'con', 'sin', 'abril', 'marzo', 'febrero', 'enero', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre', 'semana',
])

function extraerPatron(concepto: string): string {
  const w = concepto.toLowerCase().split(/\s+/).find(x => x.length > 3 && !STOP_WORDS.has(x))
  return w ?? concepto.slice(0, 10).toLowerCase()
}

function matchPatron(concepto: string, patron: string): boolean {
  if (!patron) return false
  const c = concepto.toLowerCase()
  const p = patron.toLowerCase()
  if (!p.includes('*') && !p.includes('?')) return c.includes(p)
  const esc = p.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  const rx = new RegExp('^' + esc.replace(/\*/g, '.*').replace(/\?/g, '.') + '$')
  return rx.test(c)
}

function fmtFecha(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y.slice(2)}`
}

type OperadorKey = keyof typeof OPERADOR

function detectarOperador(nombre: string): OperadorKey | null {
  const n = nombre.toLowerCase().trim()
  if (n.includes('mercadona')) return 'mercadona'
  if (n.includes('carrefour')) return 'carrefour'
  if (n.includes('lidl')) return 'lidl'
  if (n.includes('dia ') || n.endsWith(' dia') || n === 'dia' || n.includes('supermercados dia')) return 'dia'
  return null
}

function calcularLabelPeriodo(periodo: string, customDesde?: string, customHasta?: string): string {
  const now = new Date()
  const mes = now.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  if (periodo === 'mes') return mes.toUpperCase()
  if (periodo === 'mes_anterior') {
    const ma = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return ma.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()
  }
  if (periodo === 'trimestre') return 'ÚLTIMOS 3 MESES'
  if (periodo.startsWith('anio_')) return `AÑO ${periodo.slice(5)}`
  if (periodo === 'personalizado' && customDesde && customHasta) {
    return `${customDesde} — ${customHasta}`
  }
  return 'ÚLTIMOS 31 DÍAS'
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

type Tab = 'resumen' | 'movimientos'

export default function Conciliacion() {
  const [tab, setTab] = useState<Tab>('resumen')
  const [periodo, setPeriodo] = useState<PeriodoKey>('mes')
  const [customDesde, setCustomDesde] = useState<string>('')
  const [customHasta, setCustomHasta] = useState<string>('')
  const aniosDisponibles = useAniosDisponibles()
  const [catFiltro, setCatFiltro] = useState<string>('todas')
  const [busqueda, setBusqueda] = useState('')
  const [filtroCard, setFiltroCard] = useState<'pendientes' | 'ingreso' | 'gasto' | null>(null)
  const toggleFiltroCard = (k: 'pendientes' | 'ingreso' | 'gasto') => {
    setFiltroCard(prev => prev === k ? null : k)
  }

  const {
    movimientos: movimientosBD,
    insertMovimientos,
    updateCategoria,
    categorias: categoriasBD,
    loading: loadingBD,
  } = useConciliacion()

  /* — Agrupación dropdown: Ingresos arriba, gastos por `grupo` — */
  const dropdownGroups = useMemo(() => {
    const ingresos = categoriasBD.filter(c => c.tipo_parent === 'ingreso')
    const gastos = categoriasBD.filter(c => c.tipo_parent === 'gasto')
    const porGrupo: Record<string, typeof gastos> = {}
    for (const c of gastos) {
      const k = c.grupo ?? 'OTROS'
      ;(porGrupo[k] = porGrupo[k] || []).push(c)
    }
    const gruposOrdenados = Object.keys(porGrupo).sort()
    return { ingresos, gastosPorGrupo: gruposOrdenados.map(g => ({ grupo: g, items: porGrupo[g] })) }
  }, [categoriasBD])

  const tipoPorCodigo = useMemo(() => {
    const m: Record<string, 'ingreso' | 'gasto'> = {}
    categoriasBD.forEach(c => { m[c.codigo] = c.tipo_parent })
    return m
  }, [categoriasBD])

  const movimientos = useMemo<Movimiento[]>(
    () => movimientosBD.map(m => ({
      id: m.id,
      fecha: m.fecha,
      concepto: m.concepto,
      importe: Number(m.importe),
      categoria_id: m.categoria,
      contraparte: m.proveedor ?? '',
      gasto_id: m.gasto_id ?? null,
    })),
    [movimientosBD]
  )

  /* — Categorización inline con aprendizaje (persiste en BD) — */
  const handleCategorizar = async (movId: string, catId: string, concepto: string) => {
    const normalizedCat = catId === '' ? null : catId
    const mov = movimientos.find(m => m.id === movId)
    const tipo: 'ingreso' | 'gasto' | null =
      !normalizedCat ? null
      : (tipoPorCodigo[normalizedCat] ?? (mov && mov.importe >= 0 ? 'ingreso' : 'gasto'))

    try {
      await updateCategoria(movId, normalizedCat, tipo)
    } catch (err) {
      console.error('Error guardando categoría:', err)
      return
    }

    if (normalizedCat) {
      const patron = extraerPatron(concepto)
      const similares = movimientos.filter(m =>
        m.id !== movId && !m.categoria_id && matchPatron(m.concepto, patron)
      )
      for (const s of similares) {
        const sTipo: 'ingreso' | 'gasto' = s.importe >= 0 ? 'ingreso' : 'gasto'
        try {
          await updateCategoria(s.id, normalizedCat, sTipo)
        } catch (err) {
          console.error('Error auto-categorizando:', err)
        }
      }
    }
  }

  /* — Cálculo rangos actual / anterior — */
  const { rangoActual, rangoAnterior, rangoFechasLegible } = useMemo(() => {
    const hoy = new Date()
    hoy.setHours(23, 59, 59, 999)
    let inicio: Date
    let fin: Date = new Date(hoy)

    if (periodo === 'mes') {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    } else if (periodo === 'mes_anterior') {
      inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
      fin = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59)
    } else if (periodo === 'trimestre') {
      inicio = new Date(hoy)
      inicio.setDate(inicio.getDate() - 89)
    } else if (periodo.startsWith('anio_')) {
      const year = Number(periodo.slice(5))
      inicio = new Date(year, 0, 1)
      fin = new Date(year, 11, 31, 23, 59, 59)
    } else if (periodo === 'personalizado' && customDesde && customHasta) {
      inicio = new Date(customDesde + 'T00:00:00')
      fin = new Date(customHasta + 'T23:59:59')
    } else {
      inicio = new Date(hoy)
      inicio.setDate(inicio.getDate() - 30)
    }
    inicio.setHours(0, 0, 0, 0)

    const duracionMs = fin.getTime() - inicio.getTime()
    const finAnt = new Date(inicio.getTime() - 24 * 60 * 60 * 1000)
    finAnt.setHours(23, 59, 59, 999)
    const inicioAnt = new Date(finAnt.getTime() - duracionMs)
    inicioAnt.setHours(0, 0, 0, 0)

    const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    const legible = `${fmt(inicio)} — ${fmt(fin)} ${fin.getFullYear()}`

    return {
      rangoActual: { inicio, fin },
      rangoAnterior: { inicio: inicioAnt, fin: finAnt },
      rangoFechasLegible: legible,
    }
  }, [periodo, customDesde, customHasta])

  const movimientosFiltrados = useMemo(() => {
    return movimientos
      .filter(m => {
        const f = new Date(m.fecha + 'T12:00:00')
        return f >= rangoActual.inicio && f <= rangoActual.fin
      })
      .filter(m => catFiltro === 'todas' || m.categoria_id === catFiltro)
      .filter(m => !busqueda || matchPatron(m.concepto, busqueda))
      .filter(m => {
        if (filtroCard === 'pendientes') return !m.categoria_id
        if (filtroCard === 'ingreso')    return m.importe > 0
        if (filtroCard === 'gasto')      return m.importe < 0
        return true
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [movimientos, catFiltro, busqueda, rangoActual, filtroCard])

  const movimientosAnterior = useMemo(() => {
    return movimientos.filter(m => {
      const f = new Date(m.fecha + 'T12:00:00')
      return f >= rangoAnterior.inicio && f <= rangoAnterior.fin
    })
  }, [movimientos, rangoAnterior])

  const datos = useMemo(() => {
    const ingresos = movimientosFiltrados.filter(m => m.importe > 0)
    const gastos = movimientosFiltrados.filter(m => m.importe < 0)
    const sumIng = ingresos.reduce((s, m) => s + m.importe, 0)
    const sumGst = Math.abs(gastos.reduce((s, m) => s + m.importe, 0))
    const balance = sumIng - sumGst
    const pendientes = movimientosFiltrados.filter(m => !m.categoria_id).length
    return { ingresos, gastos, sumIng, sumGst, balance, pendientes }
  }, [movimientosFiltrados])

  const periodoLabel = calcularLabelPeriodo(periodo, customDesde, customHasta)

  /* — Mes/año/días restantes (presupuestos) — */
  const hoyDate = new Date()
  const mesNombreRaw = hoyDate.toLocaleDateString('es-ES', { month: 'long' })
  const mesNombre = mesNombreRaw.charAt(0).toUpperCase() + mesNombreRaw.slice(1)
  const anioActual = hoyDate.getFullYear()
  const ultimoDiaMes = new Date(anioActual, hoyDate.getMonth() + 1, 0).getDate()
  const diasRestantes = Math.max(0, ultimoDiaMes - hoyDate.getDate())

  /* ═══ ESTILOS NEOBRUTAL ═══ */

  const labelStyle: CSSProperties = {
    fontFamily: OSW, fontSize: 12, fontWeight: 600, letterSpacing: 2,
    textTransform: 'uppercase', color: INK, marginBottom: 6, display: 'block',
  }

  const inputStyle: CSSProperties = {
    width: '100%', backgroundColor: BLANCO, color: INK,
    border: `2px dashed ${CELESTE}`, borderRadius: 0,
    padding: '9px 12px', fontSize: 13, fontWeight: 600, fontFamily: LEX,
    outline: 'none', minHeight: 40,
  }

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Conciliación" titulo="Banco · BBVA">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: ARENA, opacity: 0.85, fontFamily: LEX }}>{rangoFechasLegible}</span>
          <SelectorPeriodoDropdown
            value={periodo}
            onChange={setPeriodo}
            anios={aniosDisponibles}
            desde={customDesde}
            hasta={customHasta}
            onRangoChange={(d, h) => { setCustomDesde(d); setCustomHasta(h); }}
          />
        </div>
      </CabeceraNeo>

      {loadingBD && (
        <Banda bg={ARENA}>
          <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 22, textTransform: 'uppercase', color: GRIS }}>Cargando movimientos…</div>
        </Banda>
      )}

      {/* TABS neobrutal */}
      <Banda bg={ARENA} style={{ padding: '18px 40px' }}>
        <div style={{ display: 'flex', border: BORDER_CARD, boxShadow: SHADOW, width: 'fit-content' }}>
          {(['resumen', 'movimientos'] as Tab[]).map(k => (
            <button key={k} onClick={() => setTab(k)}
              style={{
                padding: '9px 20px', border: 'none', borderRight: `3px solid ${INK}`,
                background: tab === k ? NARANJA : BLANCO, color: tab === k ? ARENA : INK,
                fontFamily: OSW, fontSize: 13, fontWeight: 700, letterSpacing: 1.5,
                textTransform: 'uppercase', cursor: 'pointer',
              }}>
              {k === 'resumen' ? 'Resumen' : 'Movimientos'}
            </button>
          ))}
        </div>
      </Banda>

      {/* Pestaña Resumen */}
      {tab === 'resumen' && (
        <Banda bg={ARENA}>
          <ResumenDashboard
            movimientos={movimientosFiltrados}
            movimientosAnterior={movimientosAnterior}
            categorias={[]}
            mesNombre={mesNombre}
            anio={anioActual}
            diasRestantes={diasRestantes}
          />
        </Banda>
      )}

      {/* Pestaña Movimientos */}
      {tab === 'movimientos' && (
        <>
          {/* Importar + filtros */}
          <Banda bg={ARENA_CL}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <ImportDropzone onFileLoaded={(rows: ParsedRow[], { fileName }) => {
                const toInsert = rows.map(r => ({
                  fecha: r.fecha,
                  concepto: r.concepto,
                  importe: r.importe,
                  tipo: (r.importe >= 0 ? 'ingreso' : 'gasto') as 'ingreso' | 'gasto',
                  categoria: null,
                  proveedor: r.contraparte ?? null,
                  factura: null,
                  mes: r.fecha?.slice(0, 7) ?? null,
                  link_factura: null,
                  notas: r.notas ?? null,
                }))
                const toastId = toast.loading(`📥 Procesando ${fileName}...\n   Parseadas ${rows.length} filas`)
                insertMovimientos(toInsert, (stage, current, total) => {
                  if (stage === 'saving') {
                    toast.loading(`📥 Procesando ${fileName}...\n   Guardando ${current} / ${total} en BD`, { id: toastId })
                  } else {
                    toast.loading(`⚙️ Aplicando reglas automáticas...\n   ${current} / ${total}`, { id: toastId })
                  }
                })
                  .then(({ insertados, autoCategorizados, ignorados }) => {
                    const pendientes = Math.max(0, insertados - autoCategorizados)
                    const partes = [
                      `✓ Importación completada`,
                      `   ${rows.length} movimientos leídos`,
                    ]
                    if (autoCategorizados > 0) partes.push(`   ${autoCategorizados} categorizados automáticamente`)
                    if (ignorados > 0)        partes.push(`   ${ignorados} ignorados (duplicados)`)
                    if (pendientes > 0)       partes.push(`   ${pendientes} pendientes de categorizar`)
                    toast.success(partes.join('\n'), { id: toastId })
                  })
                  .catch(err => {
                    console.error('Error importando:', err)
                    toast.error(`✗ Error al importar\n   ${err?.message ?? err}`, { id: toastId })
                  })
              }} />
              <div>
                <label style={labelStyle}>Categoría</label>
                <select
                  value={catFiltro}
                  onChange={e => setCatFiltro(e.target.value)}
                  disabled={filtroCard === 'pendientes'}
                  style={{
                    ...inputStyle,
                    opacity: filtroCard === 'pendientes' ? 0.5 : 1,
                    cursor: filtroCard === 'pendientes' ? 'not-allowed' : 'pointer',
                  }}
                >
                  <option value="todas">Todas</option>
                  {dropdownGroups.ingresos.length > 0 && (
                    <optgroup label="INGRESOS">
                      {dropdownGroups.ingresos.map(c => (
                        <option key={c.codigo} value={c.codigo}>{c.nombre}</option>
                      ))}
                    </optgroup>
                  )}
                  {dropdownGroups.gastosPorGrupo.map(g => (
                    <optgroup key={g.grupo} label={g.grupo.toUpperCase()}>
                      {g.items.map(c => (
                        <option key={c.codigo} value={c.codigo}>{c.nombre}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Buscar concepto</label>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: GRIS }} />
                  <input
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    placeholder="Ej: Iberdrola, Mercadona..."
                    style={{ ...inputStyle, paddingLeft: 32 }}
                  />
                </div>
              </div>
            </div>
          </Banda>

          {/* KPIs clicables → filtran tabla */}
          <Banda bg={BLANCO}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18 }}>
              <KpiClick activo={filtroCard === 'ingreso'} onClick={() => toggleFiltroCard('ingreso')}
                label="Ingresos" periodo={periodoLabel} valor={fmtEur(datos.sumIng)} color={OLIVA} />
              <KpiClick activo={filtroCard === 'gasto'} onClick={() => toggleFiltroCard('gasto')}
                label="Gastos" periodo={periodoLabel} valor={fmtEur(datos.sumGst)} color={NARANJA} />
              <KpiClick activo={false} onClick={() => {}}
                label="Balance neto" periodo={periodoLabel} valor={fmtEur(datos.balance)} color={datos.balance >= 0 ? OLIVA : TERRA} sinClick />
              <KpiClick activo={filtroCard === 'pendientes'} onClick={() => toggleFiltroCard('pendientes')}
                label="Pendientes categorizar" periodo={periodoLabel}
                valor={datos.pendientes > 0 ? String(datos.pendientes) : 'Al día ✓'}
                color={datos.pendientes > 0 ? AMBAR : OLIVA} />
            </div>

            {/* Banner filtro activo */}
            {filtroCard && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', marginTop: 18,
                background: AMBAR, border: BORDER_CARD, boxShadow: SHADOW,
                fontFamily: LEX, fontSize: 13, fontWeight: 600, color: INK,
              }}>
                <span>
                  Mostrando: <strong style={{ fontFamily: OSW, textTransform: 'uppercase' }}>{
                    filtroCard === 'pendientes' ? 'Pendientes categorizar' :
                    filtroCard === 'ingreso' ? 'Solo ingresos' : 'Solo gastos'
                  }</strong>
                  <span style={{ marginLeft: 6 }}>
                    ({movimientosFiltrados.length} {movimientosFiltrados.length === 1 ? 'movimiento' : 'movimientos'})
                  </span>
                </span>
                <div style={{ marginLeft: 'auto' }}>
                  <BotonNeo onClick={() => setFiltroCard(null)} bg={BLANCO}>Quitar filtro ×</BotonNeo>
                </div>
              </div>
            )}
          </Banda>

          {/* TABLA */}
          <Banda bg={ARENA}>
            <TablaWrap>
              <thead>
                <tr>
                  <th style={thNeo}>Fecha</th>
                  <th style={thNeo}>Concepto</th>
                  <th style={{ ...thNeo, textAlign: 'right' }}>Importe</th>
                  <th style={thNeo}>Categoría</th>
                  <th style={thNeo}>Contraparte</th>
                </tr>
              </thead>
              <tbody>
                {movimientosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ ...tdNeo(false), textAlign: 'center', color: GRIS, padding: '28px 12px' }}>
                      Sin movimientos en este rango
                    </td>
                  </tr>
                ) : movimientosFiltrados.map((m, i) => {
                  const alt = i % 2 === 1
                  const operador = detectarOperador(m.contraparte)
                  const estadoColor = !m.categoria_id ? AMBAR : m.importe >= 0 ? OLIVA : NARANJA
                  return (
                    <tr key={m.id}>
                      <td style={{ ...tdEstado(alt, estadoColor), fontFamily: OSW, fontWeight: 700 }}>{fmtFecha(m.fecha)}</td>
                      <td style={{ ...tdNeo(alt), whiteSpace: 'normal' }}>
                        <span>{m.concepto}</span>
                        {m.gasto_id && (
                          <span title="Movimiento sincronizado como gasto en Running" style={{ marginLeft: 8, verticalAlign: 'middle', display: 'inline-block' }}>
                            <BadgeNeo color={OLIVA}>✓ Running</BadgeNeo>
                          </span>
                        )}
                      </td>
                      <td style={{
                        ...tdNeo(alt), textAlign: 'right',
                        color: m.importe >= 0 ? OLIVA : TERRA,
                        fontFamily: OSW, fontWeight: 700, fontSize: 15,
                      }}>
                        {m.importe >= 0 ? '+' : ''}{fmtEur(m.importe)}
                      </td>
                      <td style={tdNeo(alt)}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <select
                            value={m.categoria_id ?? ''}
                            onChange={e => handleCategorizar(m.id, e.target.value, m.concepto)}
                            style={{
                              backgroundColor: m.categoria_id ? BLANCO : ARENA,
                              color: m.categoria_id ? INK : GRIS,
                              border: `2px dashed ${m.categoria_id ? CELESTE : NARANJA}`,
                              borderRadius: 0, padding: '4px 8px',
                              fontFamily: OSW, fontSize: 11, fontWeight: 600,
                              letterSpacing: 1, textTransform: 'uppercase',
                              cursor: 'pointer', outline: 'none',
                            }}
                          >
                            <option value="">— Categorizar —</option>
                            {dropdownGroups.ingresos.length > 0 && (
                              <optgroup label="INGRESOS">
                                {dropdownGroups.ingresos.map(c => (
                                  <option key={c.codigo} value={c.codigo}>{c.nombre}</option>
                                ))}
                              </optgroup>
                            )}
                            {dropdownGroups.gastosPorGrupo.map(g => (
                              <optgroup key={g.grupo} label={g.grupo.toUpperCase()}>
                                {g.items.map(c => (
                                  <option key={c.codigo} value={c.codigo}>{c.nombre}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          {m.auto_categorizado && (
                            <Zap size={12} color={AMBAR} aria-label="Auto: regla aplicada" />
                          )}
                        </div>
                      </td>
                      <td style={tdNeo(alt)}>
                        {operador ? (
                          <BadgeNeo color={OPERADOR[operador]}>{m.contraparte}</BadgeNeo>
                        ) : (
                          <span>{m.contraparte || '—'}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </TablaWrap>
            <div style={{
              padding: '12px 16px', marginTop: 0,
              background: INK, color: ARENA,
              fontFamily: OSW, fontSize: 12, fontWeight: 600, letterSpacing: 1.5,
              textTransform: 'uppercase', textAlign: 'center',
            }}>
              {periodoLabel} · {movimientosFiltrados.length} movimientos
            </div>
          </Banda>
        </>
      )}
    </PageNeo>
  )
}

/* ─────────  KPI clicable neobrutal  ───────── */

function KpiClick({ activo, onClick, label, periodo, valor, color, sinClick }: {
  activo: boolean; onClick: () => void; label: string; periodo: string; valor: string; color: string; sinClick?: boolean
}) {
  return (
    <div
      onClick={sinClick ? undefined : onClick}
      role={sinClick ? undefined : 'button'}
      tabIndex={sinClick ? undefined : 0}
      onKeyDown={(e) => { if (!sinClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick() } }}
      style={{
        ...card(activo ? ARENA_CL : BLANCO),
        padding: '16px 18px',
        position: 'relative',
        cursor: sinClick ? 'default' : 'pointer',
        outline: activo ? `3px solid ${NARANJA}` : 'none',
        outlineOffset: 2,
      }}
    >
      <div style={{ fontFamily: OSW, fontWeight: 600, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: GRIS, marginBottom: 8, fontFamily: LEX }}>{periodo}</div>
      <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(22px,3vw,36px)', lineHeight: 0.95, color }}>{valor}</div>
      {activo && (
        <span style={{
          position: 'absolute', top: 8, right: 8,
          background: NARANJA, color: ARENA, border: `2px solid ${INK}`,
          fontFamily: OSW, fontSize: 9, letterSpacing: 0.6,
          textTransform: 'uppercase', fontWeight: 700, padding: '2px 7px',
        }}>
          ✓ Filtrando
        </span>
      )}
      {!sinClick && !activo && (
        <span style={{ position: 'absolute', bottom: 6, right: 10, fontSize: 10, color: GRIS, fontFamily: LEX, opacity: 0.7 }}>
          Click para filtrar
        </span>
      )}
    </div>
  )
}
