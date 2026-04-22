import { useMemo, useState, type CSSProperties } from 'react'
import {
  Plus,
  Upload,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Paperclip,
  Pencil,
  Trash2,
  FileText,
  Filter,
  ChevronDown,
  UploadCloud,
} from 'lucide-react'
import {
  useTheme,
  getTokens,
  fmtEur,
} from '@/styles/tokens'

/* ═══════════════════════════════════════════════════════════
   TIPOS
   ═══════════════════════════════════════════════════════════ */

type Categoria =
  | 'Liquidaciones Cade'
  | 'Proveedores'
  | 'Combustible'
  | 'Leasing furgonetas'
  | 'Nóminas'
  | 'Seguros'
  | 'Gestoría'
  | 'Hacienda'
  | 'Otros'

type Estado = 'CONCILIADO' | 'PENDIENTE' | 'SIN FACTURA'

type CatTone = 'marino' | 'naranja' | 'oliva' | 'ambar' | 'terra' | 'sand'

interface Movimiento {
  id: number
  fecha: string
  concepto: string
  importe: number
  categoria: Categoria
  proveedor: string
  factura: boolean
  estado: Estado
}

/* ═══════════════════════════════════════════════════════════
   MOCK DATA — DavidReparte (reparto a domicilio)
   ═══════════════════════════════════════════════════════════ */

const MOCK_MOVIMIENTOS: Movimiento[] = [
  { id: 1,  fecha: '2026-04-21', concepto: 'Liquidación Cade Mercadona semana 16', importe:  4280.55, categoria: 'Liquidaciones Cade',  proveedor: 'Mercadona',     factura: true,  estado: 'CONCILIADO'  },
  { id: 2,  fecha: '2026-04-20', concepto: 'Liquidación Cade Carrefour semana 16', importe:  3145.30, categoria: 'Liquidaciones Cade',  proveedor: 'Carrefour',     factura: true,  estado: 'CONCILIADO'  },
  { id: 3,  fecha: '2026-04-19', concepto: 'Combustible flota — Repsol abr',       importe:  -842.92, categoria: 'Combustible',         proveedor: 'Repsol',        factura: true,  estado: 'CONCILIADO'  },
  { id: 4,  fecha: '2026-04-18', concepto: 'Nómina rider jefe',                    importe: -1850.00, categoria: 'Nóminas',             proveedor: 'Nóminas',       factura: true,  estado: 'CONCILIADO'  },
  { id: 5,  fecha: '2026-04-18', concepto: 'Leasing furgoneta Renault Kangoo',     importe:  -620.00, categoria: 'Leasing furgonetas',  proveedor: 'BBVA Leasing',  factura: true,  estado: 'CONCILIADO'  },
  { id: 6,  fecha: '2026-04-17', concepto: 'Seguro flota Mapfre marzo',            importe:  -412.40, categoria: 'Seguros',             proveedor: 'Mapfre',        factura: true,  estado: 'CONCILIADO'  },
  { id: 7,  fecha: '2026-04-16', concepto: 'Material packaging Lidl',              importe:  -284.15, categoria: 'Proveedores',         proveedor: 'Lidl',          factura: false, estado: 'SIN FACTURA' },
  { id: 8,  fecha: '2026-04-15', concepto: 'Liquidación Cade Lidl semana 15',      importe:  2820.75, categoria: 'Liquidaciones Cade',  proveedor: 'Lidl',          factura: true,  estado: 'CONCILIADO'  },
  { id: 9,  fecha: '2026-04-14', concepto: 'Combustible flota — Cepsa',            importe:  -686.20, categoria: 'Combustible',         proveedor: 'Cepsa',         factura: true,  estado: 'PENDIENTE'   },
  { id: 10, fecha: '2026-04-14', concepto: 'Liquidación Cade Día semana 15',       importe:  1942.80, categoria: 'Liquidaciones Cade',  proveedor: 'Día',           factura: true,  estado: 'CONCILIADO'  },
  { id: 11, fecha: '2026-04-13', concepto: 'Material reparto Mercadona',           importe:  -368.90, categoria: 'Proveedores',         proveedor: 'Mercadona',     factura: false, estado: 'SIN FACTURA' },
  { id: 12, fecha: '2026-04-12', concepto: 'Liquidación Cade Mercadona semana 15', importe:  3956.40, categoria: 'Liquidaciones Cade',  proveedor: 'Mercadona',     factura: true,  estado: 'CONCILIADO'  },
  { id: 13, fecha: '2026-04-11', concepto: 'Gestoría laboral marzo',               importe:  -380.00, categoria: 'Gestoría',            proveedor: 'Asesoría López',factura: true,  estado: 'CONCILIADO'  },
  { id: 14, fecha: '2026-04-10', concepto: 'Pago modelo 303 — IVA Q1',             importe: -2140.00, categoria: 'Hacienda',            proveedor: 'AEAT',          factura: true,  estado: 'CONCILIADO'  },
  { id: 15, fecha: '2026-04-09', concepto: 'Material packaging Carrefour',         importe:  -156.30, categoria: 'Proveedores',         proveedor: 'Carrefour',     factura: false, estado: 'SIN FACTURA' },
  { id: 16, fecha: '2026-04-08', concepto: 'Liquidación Cade Carrefour semana 14', importe:  2987.20, categoria: 'Liquidaciones Cade',  proveedor: 'Carrefour',     factura: true,  estado: 'CONCILIADO'  },
  { id: 17, fecha: '2026-04-07', concepto: 'Nómina rider auxiliar',                importe: -1320.00, categoria: 'Nóminas',             proveedor: 'Nóminas',       factura: true,  estado: 'CONCILIADO'  },
  { id: 18, fecha: '2026-04-06', concepto: 'Leasing furgoneta Citroën Berlingo',   importe:  -578.50, categoria: 'Leasing furgonetas',  proveedor: 'Santander Leasing', factura: true, estado: 'PENDIENTE' },
  { id: 19, fecha: '2026-04-05', concepto: 'Liquidación Cade Lidl semana 14',      importe:  2654.85, categoria: 'Liquidaciones Cade',  proveedor: 'Lidl',          factura: true,  estado: 'CONCILIADO'  },
  { id: 20, fecha: '2026-04-04', concepto: 'Combustible flota — Galp',             importe:  -589.40, categoria: 'Combustible',         proveedor: 'Galp',          factura: true,  estado: 'CONCILIADO'  },
  { id: 21, fecha: '2026-04-03', concepto: 'Seguro responsabilidad civil',         importe:  -248.10, categoria: 'Seguros',             proveedor: 'Mapfre',        factura: true,  estado: 'CONCILIADO'  },
  { id: 22, fecha: '2026-04-02', concepto: 'Material reparto Día',                 importe:  -224.70, categoria: 'Proveedores',         proveedor: 'Día',           factura: false, estado: 'SIN FACTURA' },
  { id: 23, fecha: '2026-04-01', concepto: 'Reparación Kangoo — taller oficial',   importe:  -485.00, categoria: 'Otros',               proveedor: 'Renault SAT',   factura: true,  estado: 'PENDIENTE'   },
  { id: 24, fecha: '2026-03-31', concepto: 'Liquidación Cade Mercadona semana 13', importe:  4102.60, categoria: 'Liquidaciones Cade',  proveedor: 'Mercadona',     factura: true,  estado: 'CONCILIADO'  },
  { id: 25, fecha: '2026-03-30', concepto: 'Pago modelo 111 — retenciones IRPF',   importe:  -890.00, categoria: 'Hacienda',            proveedor: 'AEAT',          factura: true,  estado: 'CONCILIADO'  },
]

const CATEGORIAS: Categoria[] = [
  'Liquidaciones Cade',
  'Proveedores',
  'Combustible',
  'Leasing furgonetas',
  'Nóminas',
  'Seguros',
  'Gestoría',
  'Hacienda',
  'Otros',
]

/* Mapa de categorías → tono semántico David (sólo tokens) */
const CAT_TONE: Record<Categoria, CatTone> = {
  'Liquidaciones Cade': 'oliva',     // ingresos
  'Proveedores':         'naranja',  // operadores
  'Combustible':         'ambar',
  'Leasing furgonetas':  'marino',
  'Nóminas':             'terra',
  'Seguros':             'marino',
  'Gestoría':            'sand',
  'Hacienda':            'terra',
  'Otros':               'sand',
}

const PROVEEDORES_UNICOS = Array.from(new Set(MOCK_MOVIMIENTOS.map(m => m.proveedor))).sort()

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function Conciliacion() {
  const theme = useTheme()
  const t = getTokens(theme)

  const [periodo, setPeriodo]     = useState('Este mes')
  const [categoria, setCategoria] = useState<'Todas' | Categoria>('Todas')
  const [estado, setEstado]       = useState<'Todos' | Estado>('Todos')
  const [proveedor, setProveedor] = useState<string>('Todos')
  const [busqueda, setBusqueda]   = useState('')

  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [panelAbierto,    setPanelAbierto]    = useState(false)

  const [modalNuevo,    setModalNuevo]    = useState(false)
  const [modalImportar, setModalImportar] = useState(false)

  /* — filtrado — */
  const filtrados = useMemo(() => {
    return MOCK_MOVIMIENTOS.filter(m => {
      if (categoria !== 'Todas' && m.categoria !== categoria) return false
      if (estado    !== 'Todos' && m.estado    !== estado)    return false
      if (proveedor !== 'Todos' && m.proveedor !== proveedor) return false
      if (busqueda && !m.concepto.toLowerCase().includes(busqueda.toLowerCase())) return false
      return true
    })
  }, [categoria, estado, proveedor, busqueda])

  /* — KPIs — */
  const ingresos = filtrados.filter(m => m.importe > 0).reduce((a, m) => a + m.importe, 0)
  const gastos   = filtrados.filter(m => m.importe < 0).reduce((a, m) => a + m.importe, 0)
  const balance  = ingresos + gastos
  const pendientes = filtrados.filter(m => m.estado !== 'CONCILIADO').length

  /* — Mocks de variación — */
  const varIngresos = 12.4
  const varGastos   = -3.2

  /* — Resumen por categoría — */
  const resumenCategorias = useMemo(() => {
    const totales: Record<string, number> = {}
    filtrados.forEach(m => {
      if (m.importe < 0) totales[m.categoria] = (totales[m.categoria] ?? 0) + Math.abs(m.importe)
    })
    const totalGastos = Object.values(totales).reduce((a, b) => a + b, 0) || 1
    return Object.entries(totales)
      .map(([cat, total]) => ({ cat: cat as Categoria, total, pct: (total / totalGastos) * 100 }))
      .sort((a, b) => b.total - a.total)
  }, [filtrados])

  /* — Top proveedores — */
  const topProveedores = useMemo(() => {
    const totales: Record<string, number> = {}
    filtrados.forEach(m => {
      if (m.importe < 0) totales[m.proveedor] = (totales[m.proveedor] ?? 0) + Math.abs(m.importe)
    })
    return Object.entries(totales)
      .map(([prov, total]) => ({ prov, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [filtrados])

  const facturasPendientes = filtrados.filter(m => !m.factura).length

  /* — Estilos compuestos basados en tema — */
  const inputStyle: CSSProperties = {
    width: '100%',
    background: t.bgSurface,
    color: t.textPrimary,
    border: `0.5px solid ${t.borderDefault}`,
    borderRadius: 'var(--radius-md)',
    padding: '9px 12px',
    fontSize: 13,
    fontFamily: 'var(--font-sans)',
    outline: 'none',
    minHeight: 40,
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */

  return (
    <div className="font-sans">

      {/* ═══ HEADER ═══ */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xs uppercase tracking-wider text-brand-accent font-bold m-0">
            Conciliación bancaria
          </h1>
          <p className="text-sm text-text-secondary mt-1 mb-0">
            Movimientos, categorización y control de facturas
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setModalNuevo(true)}
            className="bg-brand-accent text-text-on-accent text-sm font-medium rounded-md inline-flex items-center gap-2 transition-colors hover:bg-brand-accent-hover"
            style={{ padding: '9px 16px', minHeight: 40, border: '0.5px solid transparent' }}
          >
            <Plus size={16} strokeWidth={1.5} /> Nuevo movimiento
          </button>
          <button
            onClick={() => setModalImportar(true)}
            className="text-brand-primary text-sm font-medium rounded-md inline-flex items-center gap-2 transition-colors hover:bg-info-bg"
            style={{
              padding: '9px 16px',
              minHeight: 40,
              border: `0.5px solid ${t.brandPrimary}`,
              background: 'transparent',
            }}
          >
            <Upload size={16} strokeWidth={1.5} /> Importar extracto
          </button>
        </div>
      </div>

      {/* ═══ FILTROS (toggle móvil) ═══ */}
      <button
        onClick={() => setFiltrosAbiertos(v => !v)}
        className="text-text-secondary text-sm font-medium rounded-md inline-flex items-center gap-2 mb-3 w-full justify-between flex lg:!hidden"
        style={{
          padding: '9px 16px',
          minHeight: 40,
          border: `0.5px solid ${t.borderDefault}`,
          background: 'transparent',
        }}
      >
        <span className="inline-flex items-center gap-2">
          <Filter size={14} strokeWidth={1.5} /> Filtros
        </span>
        <ChevronDown
          size={14}
          strokeWidth={1.5}
          style={{ transform: filtrosAbiertos ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}
        />
      </button>

      <div
        className={`${filtrosAbiertos ? 'grid' : 'hidden lg:grid'} bg-bg-surface border border-border-default rounded-lg mb-5`}
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
          padding: 16,
        }}
      >
        <Field label="Período">
          <select value={periodo} onChange={e => setPeriodo(e.target.value)} style={inputStyle}>
            <option>Este mes</option>
            <option>Mes anterior</option>
            <option>Trimestre</option>
            <option>Año</option>
            <option>Rango custom</option>
          </select>
        </Field>
        <Field label="Categoría">
          <select value={categoria} onChange={e => setCategoria(e.target.value as 'Todas' | Categoria)} style={inputStyle}>
            <option>Todas</option>
            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Estado">
          <select value={estado} onChange={e => setEstado(e.target.value as 'Todos' | Estado)} style={inputStyle}>
            <option>Todos</option>
            <option>CONCILIADO</option>
            <option>PENDIENTE</option>
            <option>SIN FACTURA</option>
          </select>
        </Field>
        <Field label="Proveedor">
          <select value={proveedor} onChange={e => setProveedor(e.target.value)} style={inputStyle}>
            <option>Todos</option>
            {PROVEEDORES_UNICOS.map(p => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Buscar concepto">
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              strokeWidth={1.5}
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: t.textTertiary }}
            />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Ej: Mercadona, leasing..."
              style={{ ...inputStyle, paddingLeft: 32 }}
            />
          </div>
        </Field>
      </div>

      {/* ═══ KPIs ═══ */}
      <div
        className="grid mb-5"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}
      >
        <KPICard label="Ingresos mes"        value={fmtEur(ingresos)}        tone="success" variacion={varIngresos} />
        <KPICard label="Gastos mes"          value={fmtEur(Math.abs(gastos))} tone="danger"  variacion={varGastos} />
        <KPICard label="Balance neto"        value={fmtEur(balance)}         tone={balance >= 0 ? 'success' : 'danger'} />
        <KPICard label="Pendientes conciliar" value={String(pendientes)}      tone="warning" subtitle="movimientos" />
      </div>

      {/* ═══ GRID PRINCIPAL: TABLA + PANEL LATERAL ═══ */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '1fr', alignItems: 'flex-start' }}>
        <div
          className="lg:grid lg:gap-5"
          style={{ gridTemplateColumns: 'minmax(0, 1fr) 320px', display: 'grid', gap: 20 }}
        >

          {/* ─── TABLA ─── */}
          <div className="bg-bg-surface border border-border-default rounded-lg overflow-hidden" style={{ minWidth: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr className="bg-bg-surface-alt">
                    {['Fecha', 'Concepto', 'Importe', 'Categoría', 'Proveedor', 'Factura', 'Estado', 'Acciones'].map(h => (
                      <th
                        key={h}
                        className="text-2xs uppercase tracking-wide font-medium text-text-secondary"
                        style={{
                          padding: '12px 14px',
                          textAlign: h === 'Importe' ? 'right' : 'left',
                          whiteSpace: 'nowrap',
                          borderBottom: `0.5px solid ${t.borderSubtle}`,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(m => (
                    <tr key={m.id} className="hover:bg-bg-surface-alt transition-colors">
                      <td style={tdStyle(t)}>{formatFecha(m.fecha)}</td>
                      <td style={{ ...tdStyle(t), color: t.textPrimary }}>{m.concepto}</td>
                      <td
                        style={{
                          ...tdStyle(t),
                          textAlign: 'right',
                          color: m.importe >= 0 ? t.successText : t.dangerText,
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {m.importe >= 0 ? '+' : ''}{fmtEur(m.importe)}
                      </td>
                      <td style={tdStyle(t)}>
                        <CategoriaBadge categoria={m.categoria} />
                      </td>
                      <td style={tdStyle(t)}>{m.proveedor}</td>
                      <td style={tdStyle(t)}>
                        {m.factura ? (
                          <a
                            href="#"
                            onClick={e => e.preventDefault()}
                            className="text-success-text inline-flex items-center gap-1"
                            style={{ textDecoration: 'none' }}
                          >
                            <CheckCircle2 size={14} strokeWidth={1.5} /> <span className="text-xs">Ver</span>
                          </a>
                        ) : (
                          <span className="text-warning-text inline-flex items-center gap-1">
                            <AlertTriangle size={14} strokeWidth={1.5} /> <span className="text-xs">Falta</span>
                          </span>
                        )}
                      </td>
                      <td style={tdStyle(t)}>
                        <EstadoBadge estado={m.estado} />
                      </td>
                      <td style={tdStyle(t)}>
                        <div className="flex gap-2">
                          <IconBtn title="Editar"><Pencil size={14} strokeWidth={1.5} /></IconBtn>
                          <IconBtn title="Adjuntar factura"><Paperclip size={14} strokeWidth={1.5} /></IconBtn>
                          <IconBtn title="Eliminar" danger><Trash2 size={14} strokeWidth={1.5} /></IconBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-bg-surface-alt">
                    <td
                      colSpan={2}
                      className="text-2xs uppercase tracking-wide font-medium text-text-secondary"
                      style={{ padding: '11px 14px' }}
                    >
                      Totales filtrados ({filtrados.length} movimientos)
                    </td>
                    <td style={{ ...tdStyle(t), textAlign: 'right' }}>
                      <div className="text-success-text" style={{ fontWeight: 600 }}>+{fmtEur(ingresos)}</div>
                      <div className="text-danger-text"  style={{ fontWeight: 600 }}>{fmtEur(gastos)}</div>
                      <div
                        style={{
                          color: balance >= 0 ? t.successText : t.dangerText,
                          fontWeight: 700,
                          borderTop: `0.5px solid ${t.borderSubtle}`,
                          paddingTop: 4,
                          marginTop: 4,
                        }}
                      >
                        = {fmtEur(balance)}
                      </div>
                    </td>
                    <td colSpan={5} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ─── PANEL LATERAL ─── */}
          <div className="flex flex-col gap-4" style={{ minWidth: 0 }}>

            <button
              onClick={() => setPanelAbierto(v => !v)}
              className="text-text-secondary text-sm font-medium rounded-md inline-flex items-center justify-between w-full flex lg:!hidden"
              style={{
                padding: '9px 16px',
                minHeight: 40,
                border: `0.5px solid ${t.borderDefault}`,
                background: 'transparent',
              }}
            >
              <span>Resumen</span>
              <ChevronDown
                size={14}
                strokeWidth={1.5}
                style={{ transform: panelAbierto ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}
              />
            </button>

            <div className={panelAbierto ? 'flex flex-col gap-4' : 'hidden lg:flex lg:flex-col lg:gap-4'}>

              {/* Resumen por categoría */}
              <div className="bg-bg-surface border border-border-default rounded-lg" style={{ padding: 16 }}>
                <h3 className="text-2xs uppercase tracking-wide font-medium text-text-secondary" style={{ margin: '0 0 12px 0' }}>
                  Resumen por categoría
                </h3>
                {resumenCategorias.length === 0 && (
                  <div className="text-xs text-text-tertiary">Sin datos</div>
                )}
                {resumenCategorias.map(r => (
                  <div key={r.cat} style={{ marginBottom: 12 }}>
                    <div className="flex justify-between text-xs text-text-secondary" style={{ marginBottom: 4 }}>
                      <span>{r.cat}</span>
                      <span className="text-text-primary" style={{ fontWeight: 500 }}>{r.pct.toFixed(0)}%</span>
                    </div>
                    <div className="bg-bg-surface-alt rounded-pill overflow-hidden" style={{ height: 6 }}>
                      <div
                        className="rounded-pill"
                        style={{
                          height: '100%',
                          width: `${r.pct}%`,
                          background: toneToColor(t, CAT_TONE[r.cat]),
                          transition: 'width 0.4s',
                        }}
                      />
                    </div>
                    <div className="text-xs text-text-tertiary text-right" style={{ marginTop: 3 }}>
                      {fmtEur(r.total)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Top proveedores */}
              <div className="bg-bg-surface border border-border-default rounded-lg" style={{ padding: 16 }}>
                <h3 className="text-2xs uppercase tracking-wide font-medium text-text-secondary" style={{ margin: '0 0 12px 0' }}>
                  Top 5 proveedores
                </h3>
                {topProveedores.length === 0 && (
                  <div className="text-xs text-text-tertiary">Sin datos</div>
                )}
                {topProveedores.map((p, i) => (
                  <div
                    key={p.prov}
                    className="flex justify-between items-center"
                    style={{
                      padding: '8px 0',
                      borderBottom: i < topProveedores.length - 1 ? `0.5px solid ${t.borderSubtle}` : 'none',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="bg-bg-surface-alt text-text-secondary text-xs"
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                        }}
                      >
                        {i + 1}
                      </div>
                      <span className="text-text-primary text-sm">{p.prov}</span>
                    </div>
                    <span className="text-danger-text text-sm" style={{ fontWeight: 600 }}>{fmtEur(p.total)}</span>
                  </div>
                ))}
              </div>

              {/* Facturas pendientes */}
              <div className="bg-warning-bg rounded-lg" style={{ padding: 16, border: `0.5px solid ${t.warningBorder}` }}>
                <h3 className="text-2xs uppercase tracking-wide font-medium text-warning-text" style={{ margin: '0 0 12px 0' }}>
                  Facturas pendientes
                </h3>
                <div className="flex items-center gap-3">
                  <div
                    className="text-text-on-accent"
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      background: t.warning,
                      fontSize: 18,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {facturasPendientes}
                  </div>
                  <div className="text-xs text-text-secondary">
                    movimientos sin factura adjunta
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ═══ MODAL NUEVO MOVIMIENTO ═══ */}
      {modalNuevo && (
        <ModalShell onClose={() => setModalNuevo(false)} title="Nuevo movimiento">
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <Field label="Fecha">
              <input type="date" defaultValue="2026-04-22" style={inputStyle} />
            </Field>
            <Field label="Importe">
              <input type="number" placeholder="0,00" style={inputStyle} />
            </Field>
          </div>
          <div style={{ marginTop: 12 }}>
            <Field label="Concepto">
              <input placeholder="Ej: Liquidación Mercadona" style={inputStyle} />
            </Field>
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginTop: 12 }}>
            <Field label="Categoría">
              <select style={inputStyle}>{CATEGORIAS.map(c => <option key={c}>{c}</option>)}</select>
            </Field>
            <Field label="Proveedor">
              <select style={inputStyle}>{PROVEEDORES_UNICOS.map(p => <option key={p}>{p}</option>)}</select>
            </Field>
            <Field label="Estado">
              <select style={inputStyle}>
                <option>CONCILIADO</option>
                <option>PENDIENTE</option>
                <option>SIN FACTURA</option>
              </select>
            </Field>
          </div>
          <div style={{ marginTop: 12 }}>
            <Field label="Notas">
              <textarea rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Observaciones opcionales..." />
            </Field>
          </div>
          <div style={{ marginTop: 12 }}>
            <Field label="Adjuntar factura">
              <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <Paperclip size={14} strokeWidth={1.5} color={t.textTertiary} />
                <span className="text-text-tertiary text-sm">Seleccionar archivo…</span>
              </div>
            </Field>
          </div>
          <div className="flex justify-end gap-3" style={{ marginTop: 20 }}>
            <BtnCancel onClick={() => setModalNuevo(false)}>Cancelar</BtnCancel>
            <BtnSave   onClick={() => setModalNuevo(false)}>Guardar</BtnSave>
          </div>
        </ModalShell>
      )}

      {/* ═══ MODAL IMPORTAR EXTRACTO ═══ */}
      {modalImportar && (
        <ModalShell onClose={() => setModalImportar(false)} title="Importar extracto bancario">
          <div
            className="bg-bg-surface-alt rounded-lg text-center"
            style={{
              border: `2px dashed ${t.borderStrong}`,
              padding: '40px 20px',
              cursor: 'pointer',
            }}
          >
            <UploadCloud size={56} strokeWidth={1.5} color={t.brandPrimary} style={{ margin: '0 auto 14px' }} />
            <div className="text-text-primary text-md uppercase tracking-wide" style={{ fontWeight: 600, marginBottom: 8 }}>
              Arrastra tu extracto aquí
            </div>
            <div className="text-text-secondary text-sm">
              o haz click para seleccionar un archivo CSV / XLSX
            </div>
            <div
              className="bg-bg-surface text-text-tertiary text-xs inline-flex items-center gap-2 rounded-pill"
              style={{
                marginTop: 18,
                padding: '6px 12px',
                border: `0.5px solid ${t.borderDefault}`,
              }}
            >
              <FileText size={12} strokeWidth={1.5} /> La lógica de parseo se activa en la tanda 3/3
            </div>
          </div>
          <div className="flex justify-end gap-3" style={{ marginTop: 20 }}>
            <BtnCancel onClick={() => setModalImportar(false)}>Cancelar</BtnCancel>
            <BtnSave disabled>Continuar</BtnSave>
          </div>
        </ModalShell>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   SUBCOMPONENTES
   ═══════════════════════════════════════════════════════════ */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-2xs uppercase tracking-wide font-medium text-text-secondary" style={{ marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

type KPITone = 'success' | 'danger' | 'warning' | 'info'

function KPICard({
  label,
  value,
  tone,
  variacion,
  subtitle,
}: {
  label: string
  value: string
  tone: KPITone
  variacion?: number
  subtitle?: string
}) {
  const toneClass: Record<KPITone, string> = {
    success: 'text-success-text',
    danger:  'text-danger-text',
    warning: 'text-warning-text',
    info:    'text-brand-primary',
  }
  return (
    <div className="bg-bg-surface border border-border-default rounded-lg" style={{ padding: '16px 18px', minHeight: 96 }}>
      <div className="text-2xs uppercase tracking-wide font-medium text-text-secondary" style={{ marginBottom: 8 }}>
        {label}
      </div>
      <div className={`text-xl tracking-tight ${toneClass[tone]}`} style={{ fontWeight: 700, lineHeight: 1.15 }}>
        {value}
      </div>
      {variacion !== undefined && (
        <div
          className={`text-xs ${variacion >= 0 ? 'text-success-text' : 'text-danger-text'}`}
          style={{ marginTop: 8 }}
        >
          {variacion >= 0 ? '↑' : '↓'} {Math.abs(variacion).toFixed(1)}% vs mes ant.
        </div>
      )}
      {subtitle && (
        <div className="text-xs text-text-tertiary" style={{ marginTop: 8 }}>{subtitle}</div>
      )}
    </div>
  )
}

function CategoriaBadge({ categoria }: { categoria: Categoria }) {
  const tone = CAT_TONE[categoria]
  const cls: Record<CatTone, string> = {
    marino:  'bg-info-bg text-info-text',
    naranja: 'bg-op-mercadona-bg text-op-mercadona-fg',
    oliva:   'bg-success-bg text-success-text',
    ambar:   'bg-warning-bg text-warning-text',
    terra:   'bg-danger-bg text-danger-text',
    sand:    'bg-bg-surface-alt text-text-secondary',
  }
  return (
    <span
      className={`inline-block text-2xs uppercase tracking-wide ${cls[tone]}`}
      style={{
        padding: '3px 8px',
        borderRadius: 4,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {categoria}
    </span>
  )
}

function EstadoBadge({ estado }: { estado: Estado }) {
  const map: Record<Estado, { cls: string; icon: React.ReactNode }> = {
    CONCILIADO:    { cls: 'bg-success-bg text-success-text', icon: <CheckCircle2 size={12} strokeWidth={1.5} /> },
    PENDIENTE:     { cls: 'bg-warning-bg text-warning-text', icon: <AlertTriangle size={12} strokeWidth={1.5} /> },
    'SIN FACTURA': { cls: 'bg-danger-bg text-danger-text',   icon: <XCircle size={12} strokeWidth={1.5} /> },
  }
  const m = map[estado]
  return (
    <span
      className={`inline-flex items-center gap-1 text-2xs uppercase tracking-wide ${m.cls}`}
      style={{
        padding: '3px 9px',
        borderRadius: 4,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {m.icon} {estado}
    </span>
  )
}

function IconBtn({ children, title, danger }: { children: React.ReactNode; title: string; danger?: boolean }) {
  return (
    <button
      title={title}
      className={`bg-bg-surface-alt inline-flex items-center justify-center transition-colors hover:bg-bg-surface ${danger ? 'text-danger-text' : 'text-text-secondary'}`}
      style={{
        width: 30,
        height: 30,
        borderRadius: 5,
        border: '0.5px solid var(--border-default)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function BtnSave({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="bg-brand-accent text-text-on-accent text-sm uppercase tracking-wide rounded-md transition-colors hover:bg-brand-accent-hover"
      style={{
        padding: '9px 24px',
        minHeight: 40,
        fontWeight: 600,
        border: '0.5px solid transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  )
}

function BtnCancel({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-text-secondary text-sm uppercase tracking-wide rounded-md transition-colors hover:bg-bg-surface-alt"
      style={{
        padding: '9px 24px',
        minHeight: 40,
        fontWeight: 500,
        border: '0.5px solid var(--border-default)',
        background: 'transparent',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'var(--bg-overlay)', padding: 16 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-bg-surface border border-border-default rounded-lg"
        style={{
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 24,
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        <div className="flex justify-between items-center" style={{ marginBottom: 18 }}>
          <h2 className="text-md uppercase tracking-wide text-text-primary" style={{ fontWeight: 600, margin: 0 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-text-tertiary"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

function tdStyle(t: ReturnType<typeof getTokens>): CSSProperties {
  return {
    padding: '11px 14px',
    fontSize: 13,
    fontFamily: 'var(--font-sans)',
    color: t.textSecondary,
    borderBottom: `0.5px solid ${t.borderSubtle}`,
    whiteSpace: 'nowrap',
  }
}

function toneToColor(t: ReturnType<typeof getTokens>, tone: CatTone): string {
  switch (tone) {
    case 'marino':  return t.brandPrimary
    case 'naranja': return t.brandAccent
    case 'oliva':   return t.success
    case 'ambar':   return t.warning
    case 'terra':   return t.danger
    case 'sand':    return t.textTertiary
  }
}

function formatFecha(s: string): string {
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y.slice(2)}`
}
