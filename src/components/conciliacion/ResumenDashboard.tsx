import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts'
import { fmtEur } from '@/utils/format'
import { useTheme, FONT, kpiValueStyle } from '@/styles/tokens'
import { supabase } from '@/lib/supabase'
import type { Movimiento, Categoria } from '@/types/conciliacion'

/* ═══════════════════════════════════════════════════════════
   PROPS
   ═══════════════════════════════════════════════════════════ */

interface Props {
  movimientos: Movimiento[]
  movimientosAnterior: Movimiento[]
  categorias: Categoria[]
  mesNombre: string
  anio: number
  diasRestantes: number
}

/* ═══════════════════════════════════════════════════════════
   CONSTANTES COLORES
   ═══════════════════════════════════════════════════════════ */

const VERDE_OK   = '#1D9E75'
const ROJO       = '#A32D2D'

const COLOR_CANAL: Record<string, string> = {
  'Mercadona': 'var(--brand-accent)',
  'Carrefour': '#1D9E75',
  'Lidl':      '#F59E0B',
  'Día':       '#D4537E',
}

const COLOR_CATEGORIA: Record<string, string> = {
  'nominas':                  'var(--terra-500)',
  'recargas-electricas':      'var(--brand-accent)',
  'combustible':              '#E05A27',
  'leasing-furgonetas':       '#D85A30',
  'seguros':                  '#F59E0B',
  'suministros':              '#7F77DD',
  'mantenimiento-vehiculos':  '#BA7517',
  'proveedores':              '#D4537E',
  'impuestos':                '#9E9588',
  'alquiler':                 '#0C447C',
  'telefonia':                '#1D9E75',
  'seguridad-social':         '#5D4E96',
  'movimientos-internos':     '#888780',
  'Otros':                    '#888780',
}

const CANALES_DAVID = ['Mercadona', 'Carrefour', 'Lidl', 'Día'] as const

const normTxt = (s: string) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/* ═══════════════════════════════════════════════════════════
   MOCKS TESORERÍA / PRESUPUESTOS (pendiente conectar a BD)
   ═══════════════════════════════════════════════════════════ */

const MOCK_PRESUPUESTOS = [
  { categoria: 'compras',     nombre: 'COMPRAS',     consumido: 4448, tope: 6000 },
  { categoria: 'rrhh',        nombre: 'RRHH',        consumido: 4850, tope: 5000 },
  { categoria: 'marketing',   nombre: 'MARKETING',   consumido:  530, tope: 1000 },
  { categoria: 'suministros', nombre: 'SUMINISTROS', consumido: 1028, tope: 1000 },
] as const

interface TesoreriaData {
  balanceActual: number
  balanceHace30d: number
  cajaLiquida: number
  cobrosPendientes: number
  pagosPendientes: number
  cobros7d: number
  pagos7d: number
  cobros30d: number
  pagos30d: number
  hayProvisiones: boolean
}

const TESORERIA_VACIA: TesoreriaData = {
  balanceActual: 0,
  balanceHace30d: 0,
  cajaLiquida: 0,
  cobrosPendientes: 0,
  pagosPendientes: 0,
  cobros7d: 0,
  pagos7d: 0,
  cobros30d: 0,
  pagos30d: 0,
  hayProvisiones: false,
}

const PALETA_PRESUPUESTO = {
  compras:     { bg: '#EAF3DE', border: '#C0DD97', text: '#173404', subtext: '#3B6D11', valor: '#1D9E75', barra: '#1D9E75' },
  rrhh:        { bg: '#FAEEDA', border: '#FAC775', text: '#412402', subtext: '#854F0B', valor: '#BA7517', barra: '#BA7517' },
  marketing:   { bg: '#FBEAF0', border: '#F4C0D1', text: '#4B1528', subtext: '#993556', valor: '#D4537E', barra: '#D4537E' },
  suministros: { bg: '#FAECE7', border: '#F5C4B3', text: '#4A1B0C', subtext: '#993C1D', valor: '#D85A30', barra: '#D85A30' },
} as const

type CategoriaPresupuesto = keyof typeof PALETA_PRESUPUESTO

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

function calcularEstadoRatio(ratio: number) {
  if (ratio >= 1.5)  return { label: 'Saludable', bg: '#EAF3DE', fg: '#3B6D11' }
  if (ratio >= 1.25) return { label: 'OK',        bg: '#EAF3DE', fg: '#3B6D11' }
  if (ratio >= 1.0)  return { label: 'Alerta',    bg: '#FAEEDA', fg: '#854F0B' }
  return               { label: 'Crítico',   bg: '#FCEBEB', fg: '#A32D2D' }
}

function calcularPosicionIndicador(ratio: number): number {
  const pos = ((ratio - 0.5) / 1.5) * 100
  return Math.max(0, Math.min(100, pos))
}

function calcularEstadoPresupuesto(pct: number) {
  if (pct > 100) return { label: 'Superado',  bg: '#FCEBEB', fg: '#A32D2D' }
  if (pct >= 90) return { label: 'Al límite', bg: '#FAEEDA', fg: '#854F0B' }
  if (pct >= 50) return { label: 'En ritmo',  bg: '#EAF3DE', fg: '#3B6D11' }
  return              { label: 'Holgado',   bg: '#E6F1FB', fg: '#0C447C' }
}

function calcularDiasTranscurridosMes(): number {
  return new Date().getDate()
}

function diasEnMesActual(): number {
  const hoy = new Date()
  return new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate()
}

function getWeekNumber(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00')
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isMobile
}

/* ═══════════════════════════════════════════════════════════
   STYLE NÚMERO GIGANTE (FIX 1) — copia de Dashboard card VENTAS
   Dashboard usa: { ...kpiValueStyle(T), marginBottom:4 }
   kpiValueStyle: { fontFamily:'Oswald,sans-serif', fontSize:'2.4rem', fontWeight:600, color:T.pri, lineHeight:1 }
   ═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENTE FILA DISTRIBUCIÓN (FIX 6)
   ═══════════════════════════════════════════════════════════ */

interface FilaDistribucionProps {
  color: string
  nombre: string
  importe: number
  deltaPct: number | null
  porcentaje: number
  esIngreso: boolean
  cuadrado?: boolean
}

function FilaDistribucion({ color, nombre, importe, deltaPct, porcentaje, esIngreso, cuadrado }: FilaDistribucionProps) {
  const { T } = useTheme()

  let deltaSymbol = '='
  let deltaColor = T.mut
  if (deltaPct !== null) {
    if (deltaPct > 0) deltaSymbol = '▲'
    else if (deltaPct < 0) deltaSymbol = '▼'
    const favorable = esIngreso ? deltaPct > 0 : deltaPct < 0
    if (deltaPct !== 0) deltaColor = favorable ? VERDE_OK : ROJO
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flex: 1,
          minWidth: 0,
        }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: cuadrado ? 2 : '50%',
            backgroundColor: color,
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: FONT.body,
            fontSize: 13,
            color: T.pri,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {nombre}
          </span>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '90px 52px 36px',
          gap: 10,
          alignItems: 'center',
        }}>
          <span style={{
            fontFamily: FONT.body,
            fontSize: 13,
            color: T.pri,
            fontWeight: 500,
            textAlign: 'right',
          }}>
            {fmtEur(importe)}
          </span>
          <span style={{
            fontFamily: FONT.heading,
            fontSize: 11,
            letterSpacing: 0.5,
            color: deltaColor,
            textAlign: 'right',
          }}>
            {deltaPct === null ? '—' : `${deltaSymbol} ${Math.abs(Math.round(deltaPct))}%`}
          </span>
          <span style={{
            fontFamily: FONT.heading,
            fontSize: 11,
            letterSpacing: 0.5,
            color: T.mut,
            textAlign: 'right',
          }}>
            {porcentaje}%
          </span>
        </div>
      </div>
      <div style={{
        height: 3,
        backgroundColor: T.bg,
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 4,
      }}>
        <div style={{
          width: `${porcentaje}%`,
          height: '100%',
          backgroundColor: color,
        }} />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT PRINCIPAL
   ═══════════════════════════════════════════════════════════ */

export function ResumenDashboard({
  movimientos,
  movimientosAnterior,
  mesNombre,
  anio,
  diasRestantes,
}: Props) {
  const { T } = useTheme()
  const isMobile = useIsMobile()

  /* — Tesorería real desde conciliacion + provisiones — */
  const [tesoreria, setTesoreria] = useState<TesoreriaData>(TESORERIA_VACIA)
  const [categoriasLookup, setCategoriasLookup] = useState<Record<string, { nombre: string; grupo?: string | null }>>({})

  useEffect(() => {
    let cancel = false
    ;(async () => {
      const hoy = new Date()
      const hoyISO = hoy.toISOString().slice(0, 10)
      const en7d = new Date(hoy.getTime() + 7 * 86400000).toISOString().slice(0, 10)
      const en30d = new Date(hoy.getTime() + 30 * 86400000).toISOString().slice(0, 10)
      const hace30d = new Date(hoy.getTime() - 30 * 86400000).toISOString().slice(0, 10)

      const [mov, movAnt, provAll, cIng, cGas] = await Promise.all([
        supabase.from('conciliacion').select('importe'),
        supabase.from('conciliacion').select('importe').lte('fecha', hace30d),
        supabase.from('provisiones').select('tipo, importe, estado, fecha_fin'),
        supabase.from('categorias_contables_ingresos').select('codigo, nombre'),
        supabase.from('categorias_contables_gastos').select('codigo, nombre, grupo'),
      ])
      if (cancel) return

      const cajaLiquida = (mov.data ?? []).reduce((s: number, r: any) => s + Number(r.importe || 0), 0)
      const balanceHace30d = (movAnt.data ?? []).reduce((s: number, r: any) => s + Number(r.importe || 0), 0)

      const provisiones = (provAll.data ?? []) as { tipo: string; importe: number; estado: string; fecha_fin: string | null }[]
      const cobrosPend = provisiones.filter(p => p.tipo === 'cobro' && p.estado === 'pendiente')
      const pagosPend  = provisiones.filter(p => p.tipo === 'pago'  && p.estado === 'pendiente')
      const cobrosPendientes = cobrosPend.reduce((s, p) => s + Number(p.importe || 0), 0)
      const pagosPendientes  = pagosPend.reduce((s, p) => s + Number(p.importe || 0), 0)

      const cobros7d = cobrosPend.filter(p => p.fecha_fin && p.fecha_fin <= en7d && p.fecha_fin >= hoyISO).reduce((s, p) => s + Number(p.importe || 0), 0)
      const pagos7d  = pagosPend .filter(p => p.fecha_fin && p.fecha_fin <= en7d && p.fecha_fin >= hoyISO).reduce((s, p) => s + Number(p.importe || 0), 0)
      const cobros30d = cobrosPend.filter(p => p.fecha_fin && p.fecha_fin <= en30d && p.fecha_fin >= hoyISO).reduce((s, p) => s + Number(p.importe || 0), 0)
      const pagos30d  = pagosPend .filter(p => p.fecha_fin && p.fecha_fin <= en30d && p.fecha_fin >= hoyISO).reduce((s, p) => s + Number(p.importe || 0), 0)

      setTesoreria({
        balanceActual: cajaLiquida,
        balanceHace30d,
        cajaLiquida,
        cobrosPendientes,
        pagosPendientes,
        cobros7d,
        pagos7d,
        cobros30d,
        pagos30d,
        hayProvisiones: provisiones.length > 0,
      })

      const lookup: Record<string, { nombre: string; grupo?: string | null }> = {}
      for (const c of (cIng.data ?? []) as any[]) lookup[c.codigo] = { nombre: c.nombre }
      for (const c of (cGas.data ?? []) as any[]) lookup[c.codigo] = { nombre: c.nombre, grupo: c.grupo }
      setCategoriasLookup(lookup)
    })()
    return () => { cancel = true }
  }, [movimientos.length])

  /* — STYLE_NUM_GIGANTE_DASHBOARD (FIX 1): copia literal de Dashboard card VENTAS — */
  const STYLE_NUM_GIGANTE_DASHBOARD: CSSProperties = {
    ...kpiValueStyle(T),
    marginBottom: 4,
  }

  /* — Ingresos por canal (David: Mercadona/Carrefour/Lidl/Día) — match sobre proveedor + concepto — */
  const sumarPorCanal = (lista: Movimiento[]) => {
    const base = CANALES_DAVID.map(c => ({ canal: c as string, importe: 0 }))
    for (const m of lista) {
      if (m.importe <= 0) continue
      const cp = normTxt(m.contraparte ?? '')
      const concepto = normTxt(m.concepto ?? '')
      const haystack = `${cp} ${concepto}`.trim()
      if (!haystack) continue
      const slot = base.find(s => haystack.includes(normTxt(s.canal)))
      if (slot) slot.importe += m.importe
    }
    return base
  }
  const canalesActual = useMemo(() => sumarPorCanal(movimientos), [movimientos])
  const canalesAnterior = useMemo(() => sumarPorCanal(movimientosAnterior), [movimientosAnterior])

  /* — Gastos por categoría (top 6 + Otros) — */
  const categoriasActual = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const m of movimientos) {
      if (m.importe >= 0) continue
      const cat = m.categoria_id ?? '— Sin categoría —'
      acc[cat] = (acc[cat] ?? 0) + Math.abs(m.importe)
    }
    const ordenadas = Object.entries(acc).map(([categoria, importe]) => ({ categoria, importe })).sort((a, b) => b.importe - a.importe)
    const top = ordenadas.slice(0, 6)
    const resto = ordenadas.slice(6).reduce((s, c) => s + c.importe, 0)
    if (resto > 0) top.push({ categoria: 'Otros', importe: resto })
    return top
  }, [movimientos])

  const categoriasAnterior = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const m of movimientosAnterior) {
      if (m.importe >= 0) continue
      const cat = m.categoria_id ?? '— Sin categoría —'
      acc[cat] = (acc[cat] ?? 0) + Math.abs(m.importe)
    }
    return Object.entries(acc).map(([categoria, importe]) => ({ categoria, importe }))
  }, [movimientosAnterior])

  /* — Sumas globales: TODOS los movimientos (paridad con pestaña Movimientos) — */
  const sumIng    = useMemo(() => movimientos.filter(m => m.importe > 0).reduce((s, m) => s + m.importe, 0), [movimientos])
  const sumIngAnt = useMemo(() => movimientosAnterior.filter(m => m.importe > 0).reduce((s, m) => s + m.importe, 0), [movimientosAnterior])
  const sumGst    = useMemo(() => movimientos.filter(m => m.importe < 0).reduce((s, m) => s + Math.abs(m.importe), 0), [movimientos])
  const sumGstAnt = useMemo(() => movimientosAnterior.filter(m => m.importe < 0).reduce((s, m) => s + Math.abs(m.importe), 0), [movimientosAnterior])

  const balance    = sumIng - sumGst
  const balanceAnt = sumIngAnt - sumGstAnt
  const ratio      = sumGst > 0 ? sumIng / sumGst : 0
  const ratioAnt   = sumGstAnt > 0 ? sumIngAnt / sumGstAnt : 0

  /* — Deltas globales (FIX 4) — */
  const ingDeltaPct = sumIngAnt !== 0 ? ((sumIng - sumIngAnt) / sumIngAnt) * 100 : 0
  const ingDeltaSym = ingDeltaPct > 0 ? '▲' : ingDeltaPct < 0 ? '▼' : '='
  const ingDeltaColor = ingDeltaPct > 0 ? VERDE_OK : ingDeltaPct < 0 ? ROJO : T.mut
  const ingDeltaTxt = `${ingDeltaSym} ${Math.abs(Math.round(ingDeltaPct))}% vs período anterior`

  const gstDeltaPct = sumGstAnt !== 0 ? ((sumGst - sumGstAnt) / sumGstAnt) * 100 : 0
  const gstDeltaSym = gstDeltaPct > 0 ? '▲' : gstDeltaPct < 0 ? '▼' : '='
  const gstDeltaColor = gstDeltaPct > 0 ? ROJO : gstDeltaPct < 0 ? VERDE_OK : T.mut
  const gstDeltaTxt = `${gstDeltaSym} ${Math.abs(Math.round(gstDeltaPct))}% vs período anterior`

  const tesDeltaPct = tesoreria.balanceHace30d !== 0
    ? ((tesoreria.balanceActual - tesoreria.balanceHace30d) / tesoreria.balanceHace30d) * 100
    : 0
  const tesDeltaSym = tesDeltaPct > 0 ? '▲' : tesDeltaPct < 0 ? '▼' : '='
  const tesDeltaColor = tesDeltaPct > 0 ? VERDE_OK : tesDeltaPct < 0 ? ROJO : T.mut
  const tesDeltaTxt = `${tesDeltaSym} ${Math.abs(Math.round(tesDeltaPct))}%`

  const proyeccion7d = tesoreria.cajaLiquida + tesoreria.cobros7d - tesoreria.pagos7d
  const proyeccion30d = tesoreria.cajaLiquida + tesoreria.cobros30d - tesoreria.pagos30d

  const balanceDeltaPct = balanceAnt !== 0
    ? ((balance - balanceAnt) / Math.abs(balanceAnt)) * 100
    : 0
  const balanceDeltaColor = balanceDeltaPct > 0 ? VERDE_OK : balanceDeltaPct < 0 ? ROJO : T.mut
  const balanceDeltaSym = balanceDeltaPct > 0 ? '▲' : balanceDeltaPct < 0 ? '▼' : '='
  const balanceDeltaTxt = `${balanceDeltaSym} ${Math.abs(Math.round(balanceDeltaPct))}%`

  const ratioDeltaPct = ratioAnt !== 0 ? ((ratio - ratioAnt) / ratioAnt) * 100 : 0
  const ratioDeltaColor = ratioDeltaPct > 0 ? VERDE_OK : ratioDeltaPct < 0 ? ROJO : T.mut
  const ratioDeltaSym = ratioDeltaPct > 0 ? '▲' : ratioDeltaPct < 0 ? '▼' : '='
  const ratioDeltaTxt = `${ratioDeltaSym} ${Math.abs(Math.round(ratioDeltaPct))}%`

  /* — Filas con % sobre total + delta por fila — */
  // Canales: mostrar SIEMPRE los 4 slots David aunque importe=0 (no ocultar)
  const filasIngresos = canalesActual
    .map(c => {
      const ant = canalesAnterior.find(x => x.canal === c.canal)?.importe ?? 0
      const deltaPct = ant !== 0 ? ((c.importe - ant) / ant) * 100 : null
      const porcentaje = sumIng > 0 ? Math.round((c.importe / sumIng) * 100) : 0
      return { ...c, color: COLOR_CANAL[c.canal] ?? '#888', deltaPct, porcentaje }
    })

  const filasGastos = categoriasActual
    .filter(c => c.importe > 0)
    .map(c => {
      const ant = categoriasAnterior.find(x => x.categoria === c.categoria)?.importe ?? 0
      const deltaPct = ant !== 0 ? ((c.importe - ant) / ant) * 100 : null
      const porcentaje = sumGst > 0 ? Math.round((c.importe / sumGst) * 100) : 0
      const nombre = categoriasLookup[c.categoria]?.nombre ?? c.categoria
      return { ...c, nombre, color: COLOR_CATEGORIA[c.categoria] ?? '#888', deltaPct, porcentaje }
    })
    .sort((a, b) => b.importe - a.importe)

  /* — Ratio visual — */
  const estadoRatio = calcularEstadoRatio(ratio)
  const posicionIndicador = calcularPosicionIndicador(ratio)

  /* — Proyección Tesorería — */
  const minVal = Math.min(tesoreria.cajaLiquida, proyeccion30d, 0)
  const maxVal = Math.max(tesoreria.cajaLiquida, proyeccion30d)
  const rango = maxVal - minVal || 1
  const porcentajeProyeccion = ((proyeccion30d - minVal) / rango) * 100

  /* — Dataset semanas desde movimientos (prop real) — */
  const datosSemanales = useMemo(() => {
    const semanas = new Map<number, { ingresos: number; gastos: number }>()
    movimientos.forEach(m => {
      const w = getWeekNumber(m.fecha)
      const acc = semanas.get(w) ?? { ingresos: 0, gastos: 0 }
      if (m.importe > 0) acc.ingresos += m.importe
      else acc.gastos += Math.abs(m.importe)
      semanas.set(w, acc)
    })
    return Array.from(semanas.entries())
      .map(([w, v]) => ({ semana: `S${w}`, ingresos: Math.round(v.ingresos), gastos: Math.round(v.gastos) }))
      .sort((a, b) => parseInt(a.semana.slice(1)) - parseInt(b.semana.slice(1)))
  }, [movimientos])

  /* — Dataset evolución 31 días — */
  const datosEvolucion = useMemo(() => {
    const hoy = new Date()
    hoy.setHours(12, 0, 0, 0)
    const dias: { fecha: string; ingresos: number; gastos: number; saldo: number }[] = []
    let saldoAcum = 0
    for (let i = 30; i >= 0; i--) {
      const d = new Date(hoy)
      d.setDate(d.getDate() - i)
      const y = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      const iso = `${y}-${mm}-${dd}`
      const movsDia = movimientos.filter(m => m.fecha === iso)
      const ing = movsDia.filter(m => m.importe > 0).reduce((s, m) => s + m.importe, 0)
      const gst = Math.abs(movsDia.filter(m => m.importe < 0).reduce((s, m) => s + m.importe, 0))
      saldoAcum += ing - gst
      dias.push({
        fecha: d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
        ingresos: Math.round(ing),
        gastos: Math.round(gst),
        saldo: Math.round(saldoAcum),
      })
    }
    return dias
  }, [movimientos])

  /* — Styles compartidos — */
  const cardBase: CSSProperties = {
    backgroundColor: T.card,
    borderRadius: 14,
    padding: '22px 24px',
    border: `1px solid ${T.brd}`,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  }

  const labelCard: CSSProperties = {
    fontFamily: FONT.heading,
    fontSize: 11,
    color: T.mut,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontWeight: 500,
  }

  const divider: CSSProperties = { height: 1, backgroundColor: T.brd, margin: '16px 0' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ═══ FILA 1 — INGRESOS · GASTOS · TESORERÍA (FIX 2) ═══ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
        gap: 16,
        marginBottom: 16,
        alignItems: 'stretch',
      }}>
        {/* CARD INGRESOS */}
        <div style={cardBase}>
          <div style={labelCard}>INGRESOS NETOS</div>
          <div style={STYLE_NUM_GIGANTE_DASHBOARD}>{fmtEur(sumIng)}</div>
          <div style={{ fontFamily: FONT.body, fontSize: 12, color: ingDeltaColor, marginTop: 4, fontWeight: 500 }}>
            {ingDeltaTxt}
          </div>
          <div style={divider} />
          <div>
            {filasIngresos.map(f => (
              <FilaDistribucion
                key={f.canal}
                color={f.color}
                nombre={f.canal}
                importe={f.importe}
                deltaPct={f.deltaPct}
                porcentaje={f.porcentaje}
                esIngreso={true}
                cuadrado={false}
              />
            ))}
          </div>
        </div>

        {/* CARD GASTOS */}
        <div style={cardBase}>
          <div style={labelCard}>GASTOS</div>
          <div style={STYLE_NUM_GIGANTE_DASHBOARD}>{fmtEur(sumGst)}</div>
          <div style={{ fontFamily: FONT.body, fontSize: 12, color: gstDeltaColor, marginTop: 4, fontWeight: 500 }}>
            {gstDeltaTxt}
          </div>
          <div style={divider} />
          <div>
            {filasGastos.map(f => (
              <FilaDistribucion
                key={f.categoria}
                color={f.color}
                nombre={f.nombre}
                importe={f.importe}
                deltaPct={f.deltaPct}
                porcentaje={f.porcentaje}
                esIngreso={false}
                cuadrado={true}
              />
            ))}
          </div>
        </div>

        {/* CARD TESORERÍA — datos reales (conciliacion + provisiones) */}
        <div style={cardBase}>
          <div style={labelCard}>TESORERÍA · HOY</div>
          <div style={STYLE_NUM_GIGANTE_DASHBOARD}>{fmtEur(tesoreria.balanceActual)}</div>
          {tesoreria.balanceHace30d !== 0 && (
            <div style={{ fontFamily: FONT.body, fontSize: 12, color: tesDeltaColor, marginTop: 4, fontWeight: 500 }}>
              {tesDeltaTxt} vs hace 30 días
            </div>
          )}
          <div style={divider} />

          {/* Caja líquida destacada */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 0',
            borderBottom: `1px solid ${T.brd}`,
          }}>
            <span style={{ fontFamily: FONT.heading, fontSize: 12, color: T.pri, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 500 }}>
              Caja líquida
            </span>
            <span style={{ fontFamily: FONT.heading, fontSize: 18, color: T.pri, fontWeight: 500 }}>
              {fmtEur(tesoreria.cajaLiquida)}
            </span>
          </div>

          {/* Filas — solo si hay provisiones cargadas */}
          {tesoreria.hayProvisiones ? (
            <>
              {[
                { label: 'Cobros pendientes', valor: tesoreria.cobrosPendientes, color: VERDE_OK, prefijo: '+' },
                { label: 'Pagos pendientes',  valor: tesoreria.pagosPendientes,  color: ROJO,     prefijo: '−' },
                { label: 'Proyección 7d',     valor: proyeccion7d,               color: T.pri,    prefijo: '' },
                { label: 'Proyección 30d',    valor: proyeccion30d,              color: T.pri,    prefijo: '' },
              ].map(item => (
                <div key={item.label} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                }}>
                  <span style={{ fontFamily: FONT.body, fontSize: 13, color: T.pri }}>{item.label}</span>
                  <span style={{ fontFamily: FONT.body, fontSize: 13, color: item.color, fontWeight: 500 }}>
                    {item.prefijo}{fmtEur(Math.abs(item.valor))}
                  </span>
                </div>
              ))}

              {/* Mini-barra proyección */}
              <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: `1px solid ${T.brd}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT.body, fontSize: 11, color: T.mut, marginBottom: 6 }}>
                  <span>Hoy</span>
                  <span>30d</span>
                </div>
                <div style={{ height: 6, backgroundColor: T.bg, borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${porcentajeProyeccion}%`,
                    backgroundColor: proyeccion30d >= tesoreria.cajaLiquida ? VERDE_OK : ROJO,
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT.body, fontSize: 12, marginTop: 6 }}>
                  <span style={{ color: T.pri, fontWeight: 500 }}>{fmtEur(tesoreria.cajaLiquida)}</span>
                  <span style={{ color: proyeccion30d >= tesoreria.cajaLiquida ? VERDE_OK : ROJO, fontWeight: 500 }}>
                    {fmtEur(proyeccion30d)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div style={{ marginTop: 'auto', paddingTop: 16, fontFamily: FONT.body, fontSize: 12, color: T.mut, textAlign: 'center', fontStyle: 'italic' }}>
              Sin provisiones registradas — proyecciones disponibles al cargar cobros/pagos futuros.
            </div>
          )}
        </div>
      </div>

      {/* ═══ FILA 2 — RATIO + BALANCE NETO (FIX 8, FIX 9, FIX 10) ═══ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
        gap: 16,
        marginBottom: 16,
      }}>
        {/* CARD RATIO */}
        <div style={{
          backgroundColor: T.card,
          borderRadius: 14,
          padding: '24px 30px',
          border: `1px solid ${T.brd}`,
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: isMobile ? 16 : 30,
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          {/* Columna izquierda */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontFamily: FONT.heading, fontSize: 11, color: T.mut, letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 8, fontWeight: 500 }}>
              RATIO INGRESOS / GASTOS
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
              <span style={{ ...STYLE_NUM_GIGANTE_DASHBOARD, fontSize: 72, lineHeight: 1, marginBottom: 0 }}>
                {ratio.toFixed(2)}
              </span>
              <span style={{
                backgroundColor: estadoRatio.bg,
                color: estadoRatio.fg,
                fontSize: 11,
                padding: '4px 12px',
                borderRadius: 12,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                fontFamily: FONT.heading,
              }}>
                {estadoRatio.label}
              </span>
            </div>
            <div style={{ fontFamily: FONT.body, fontSize: 12, color: T.mut, marginTop: 8 }}>
              Objetivo ≥ 1.25
            </div>
            <div style={{ fontFamily: FONT.body, fontSize: 12, color: ratioDeltaColor, marginTop: 6, fontWeight: 500 }}>
              {ratioDeltaTxt} vs período anterior
            </div>
          </div>

          {/* Columna derecha - barra semáforo */}
          <div style={{ flex: 1, maxWidth: isMobile ? '100%' : 320, width: isMobile ? '100%' : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT.heading, fontSize: 10, color: T.mut, marginBottom: 6, letterSpacing: 0.8 }}>
              <span>Crítico</span>
              <span>Alerta</span>
              <span>OK</span>
              <span>Saludable</span>
            </div>
            <div style={{
              position: 'relative',
              height: 10,
              background: 'linear-gradient(to right, #F09595 0%, #F09595 25%, #FAC775 25%, #FAC775 50%, #C0DD97 50%, #C0DD97 75%, #5DCAA5 75%, #5DCAA5 100%)',
              borderRadius: 5,
            }}>
              <div style={{
                position: 'absolute',
                left: `${posicionIndicador}%`,
                top: -5,
                width: 4,
                height: 20,
                backgroundColor: T.pri,
                borderRadius: 2,
                transform: 'translateX(-2px)',
                boxShadow: `0 0 0 2px ${T.card}`,
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT.body, fontSize: 10, color: T.mut, marginTop: 4 }}>
              <span>0.5</span>
              <span>1.0</span>
              <span>1.25</span>
              <span>2.0</span>
            </div>
          </div>
        </div>

        {/* CARD BALANCE NETO */}
        <div style={{
          backgroundColor: T.card,
          borderRadius: 14,
          padding: '22px 24px',
          border: `1px solid ${T.brd}`,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={labelCard}>BALANCE NETO</div>
          <div style={{
            ...STYLE_NUM_GIGANTE_DASHBOARD,
            color: balance >= 0 ? VERDE_OK : ROJO,
          }}>
            {balance >= 0 ? '+' : ''}{fmtEur(balance)}
          </div>
          <div style={{ fontFamily: FONT.body, fontSize: 12, color: T.mut, marginTop: 8 }}>
            Ingresos − Gastos
          </div>
          <div style={{ height: 1, backgroundColor: T.brd, margin: '14px 0' }} />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: FONT.body,
            fontSize: 12,
          }}>
            <span style={{ color: T.mut }}>vs período anterior</span>
            <span style={{
              color: balanceDeltaColor,
              fontWeight: 500,
              fontFamily: FONT.heading,
              letterSpacing: 0.5,
            }}>
              {balanceDeltaTxt}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ FILA 3 — PRESUPUESTOS (FIX 11) ═══ */}
      <div>
        <div style={{
          fontFamily: FONT.heading,
          fontSize: 12,
          color: T.pri,
          letterSpacing: 1.3,
          textTransform: 'uppercase',
          marginBottom: 12,
          fontWeight: 500,
        }}>
          PRESUPUESTOS · {mesNombre.toUpperCase()} {anio} · {diasRestantes} DÍAS RESTANTES
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, minmax(0, 1fr))',
          gap: 14,
          marginBottom: 16,
        }}>
          {MOCK_PRESUPUESTOS.map(p => {
            const cat = p.categoria as CategoriaPresupuesto
            const pal = PALETA_PRESUPUESTO[cat]
            const pct = Math.round((p.consumido / p.tope) * 100)
            const superado = p.consumido > p.tope
            const pctDisplay = superado ? 100 : pct
            const colorBarra = superado ? ROJO : pal.barra

            const diasTranscurridos = calcularDiasTranscurridosMes()
            const diasRestMes = diasEnMesActual() - diasTranscurridos
            const ritmoDiario = diasTranscurridos > 0 ? p.consumido / diasTranscurridos : 0
            const estado = calcularEstadoPresupuesto(pct)

            return (
              <div key={p.categoria} style={{
                backgroundColor: pal.bg,
                borderRadius: 12,
                padding: '16px 18px',
                border: `1px solid ${pal.border}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{
                    fontFamily: FONT.heading,
                    fontSize: 12,
                    color: pal.text,
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    fontWeight: 500,
                  }}>
                    {p.nombre}
                  </div>
                  <span style={{
                    fontSize: 9,
                    padding: '2px 7px',
                    borderRadius: 8,
                    fontFamily: FONT.heading,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    fontWeight: 500,
                    backgroundColor: estado.bg,
                    color: estado.fg,
                  }}>
                    {estado.label}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontFamily: FONT.heading, fontSize: 22, fontWeight: 500, color: pal.text }}>
                    {fmtEur(p.consumido)}
                  </span>
                  <span style={{ fontFamily: FONT.body, fontSize: 11, color: pal.subtext }}>bruto</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                  <span style={{ fontFamily: FONT.heading, fontSize: 18, fontWeight: 500, color: pal.valor }}>
                    {fmtEur(p.tope)}
                  </span>
                  <span style={{ fontFamily: FONT.body, fontSize: 11, color: pal.subtext }}>tope</span>
                </div>

                <div style={{ height: 1, backgroundColor: pal.border, margin: '10px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: FONT.body, fontSize: 11, color: pal.subtext }}>
                    {superado ? 'Superado' : 'Consumido'}
                  </span>
                  <span style={{
                    fontFamily: FONT.heading,
                    fontSize: 13,
                    fontWeight: 500,
                    color: superado ? ROJO : pal.text,
                  }}>
                    {pct}%
                  </span>
                </div>

                <div style={{
                  height: 4,
                  backgroundColor: 'rgba(255, 255, 255, 0.6)',
                  borderRadius: 2,
                  marginTop: 6,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${pctDisplay}%`,
                    height: '100%',
                    backgroundColor: colorBarra,
                  }} />
                </div>

                <div style={{
                  fontFamily: FONT.body,
                  fontSize: 10,
                  color: pal.subtext,
                  marginTop: 6,
                  textAlign: 'right',
                }}>
                  Ritmo: {fmtEur(ritmoDiario)}/día · quedan {diasRestMes}d
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══ FILA 4 — GRÁFICOS (FIX 13, FIX 14) ═══ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: 16,
      }}>
        {/* BARRAS SEMANALES */}
        <div style={cardBase}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={labelCard}>INGRESOS VS GASTOS · SEMANAL</div>
            <div style={{ display: 'flex', gap: 10, fontSize: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.mut, fontFamily: FONT.body }}>
                <span style={{ width: 10, height: 2, backgroundColor: '#06C167' }} />Ing
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.mut, fontFamily: FONT.body }}>
                <span style={{ width: 10, height: 2, backgroundColor: 'var(--terra-500)' }} />Gst
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={datosSemanales} barGap={4} barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" stroke={T.brd} vertical={false} />
              <XAxis dataKey="semana" stroke={T.mut} tick={{ fontSize: 11, fill: T.mut, fontFamily: FONT.body }} />
              <YAxis stroke={T.mut} tick={{ fontSize: 11, fill: T.mut, fontFamily: FONT.body }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: T.card, border: `1px solid ${T.brd}`, color: T.pri, fontFamily: FONT.body, borderRadius: 8 }}
                formatter={(v) => fmtEur(Number(v))}
              />
              <Bar dataKey="ingresos" name="Ingresos" fill="#06C167" radius={[3, 3, 0, 0]} />
              <Bar dataKey="gastos"   name="Gastos"   fill="var(--terra-500)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* EVOLUCIÓN 3 LÍNEAS */}
        <div style={cardBase}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={labelCard}>EVOLUCIÓN: INGRESOS · GASTOS · SALDO</div>
            <div style={{ display: 'flex', gap: 10, fontSize: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.mut, fontFamily: FONT.body }}>
                <span style={{ width: 10, height: 2, backgroundColor: '#06C167' }} />Ing
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.mut, fontFamily: FONT.body }}>
                <span style={{ width: 10, height: 2, backgroundColor: 'var(--terra-500)' }} />Gst
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.mut, fontFamily: FONT.body }}>
                <span style={{ width: 10, height: 2, backgroundColor: '#F59E0B' }} />Saldo
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={datosEvolucion}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.brd} />
              <XAxis dataKey="fecha" stroke={T.mut} tick={{ fontSize: 11, fill: T.mut, fontFamily: FONT.body }} interval="preserveStartEnd" />
              <YAxis
                stroke={T.mut}
                tick={{ fontSize: 11, fill: T.mut, fontFamily: FONT.body }}
                domain={[(dataMin: number) => Math.floor((dataMin - 500) / 500) * 500, (dataMax: number) => Math.ceil((dataMax + 500) / 500) * 500]}
                tickCount={6}
                tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: T.card, border: `1px solid ${T.brd}`, color: T.pri, fontFamily: FONT.body, borderRadius: 8 }}
                formatter={(v) => fmtEur(Number(v))}
              />
              <Line type="linear" dataKey="ingresos" name="Ingresos" stroke="#06C167" strokeWidth={2}   dot={false} activeDot={{ r: 5 }} />
              <Line type="linear" dataKey="gastos"   name="Gastos"   stroke="var(--terra-500)" strokeWidth={2}   dot={false} activeDot={{ r: 5 }} />
              <Line type="linear" dataKey="saldo"    name="Saldo"    stroke="#F59E0B" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
