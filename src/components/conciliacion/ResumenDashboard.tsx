import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts'
import { fmtEur } from '@/utils/format'
import {
  useTheme, getTokens, FONT, kpiStyle,
  getOperadorStyle, type Operador,
} from '@/styles/tokens'
import type { Movimiento, Categoria } from '@/types/conciliacion'

interface Props {
  movimientos: Movimiento[]
  movimientosAnterior: Movimiento[]
  categorias: Categoria[]
  mesNombre: string
  anio: number
  diasRestantes: number
}

const OPERADORES_NOMBRES: { key: Operador; label: string }[] = [
  { key: 'mercadona', label: 'Mercadona' },
  { key: 'carrefour', label: 'Carrefour' },
  { key: 'lidl',      label: 'Lidl' },
  { key: 'dia',       label: 'Dia' },
]

const MOCK_OPERADORES_ACTUAL = [
  { operador: 'Mercadona', importe: 21190 },
  { operador: 'Carrefour', importe: 5340 },
  { operador: 'Lidl',      importe: 3200 },
  { operador: 'Dia',       importe: 738 },
]

const MOCK_OPERADORES_ANTERIOR = [
  { operador: 'Mercadona', importe: 18585 },
  { operador: 'Carrefour', importe: 5565 },
  { operador: 'Lidl',      importe: 2623 },
  { operador: 'Dia',       importe: 683 },
]

const MOCK_CATEGORIAS_ACTUAL = [
  { categoria: 'RRHH',         importe: 4850 },
  { categoria: 'Proveedores',  importe: 4448 },
  { categoria: 'Alquiler',     importe: 2400 },
  { categoria: 'Suministros',  importe: 1028 },
  { categoria: 'Marketing',    importe: 530 },
]

const MOCK_CATEGORIAS_ANTERIOR = [
  { categoria: 'RRHH',         importe: 4709 },
  { categoria: 'Proveedores',  importe: 4888 },
  { categoria: 'Alquiler',     importe: 2400 },
  { categoria: 'Suministros',  importe: 918 },
  { categoria: 'Marketing',    importe: 646 },
]

const MOCK_PRESUPUESTOS = [
  { categoria: 'compras',     nombre: 'COMPRAS',     consumido: 4448, tope: 6000, variant: 'oliva' as const },
  { categoria: 'rrhh',        nombre: 'RRHH',        consumido: 4850, tope: 5000, variant: 'ambar' as const },
  { categoria: 'marketing',   nombre: 'MARKETING',   consumido:  530, tope: 1000, variant: 'marino' as const },
  { categoria: 'suministros', nombre: 'SUMINISTROS', consumido: 1028, tope: 1000, variant: 'naranja' as const },
] as const

const MOCK_TESORERIA = {
  balanceActual: 16254.18,
  balanceHace30d: 14890.00,
  cajaLiquida: 12450,
  cobrosPendientes: 5340,
  pagosPendientes: 2100,
  proyeccion7d: 15690,
  proyeccion30d: 18200,
}

function nombreOperadorAKey(nombre: string): Operador {
  const m = OPERADORES_NOMBRES.find(o => o.label === nombre)
  return m ? m.key : 'mercadona'
}

function colorCategoria(idx: number, theme: 'light' | 'dark'): string {
  const t = getTokens(theme)
  const ramp = [t.danger, t.brandAccent, t.warning, t.info, t.success]
  return ramp[idx % ramp.length]
}

function calcularEstadoRatio(theme: 'light' | 'dark', ratio: number) {
  const t = getTokens(theme)
  if (ratio >= 1.5)  return { label: 'Saludable', bg: t.successBg, fg: t.successText }
  if (ratio >= 1.25) return { label: 'OK',        bg: t.successBg, fg: t.successText }
  if (ratio >= 1.0)  return { label: 'Alerta',    bg: t.warningBg, fg: t.warningText }
  return                    { label: 'Crítico',   bg: t.dangerBg,  fg: t.dangerText }
}

function calcularPosicionIndicador(ratio: number): number {
  const pos = ((ratio - 0.5) / 1.5) * 100
  return Math.max(0, Math.min(100, pos))
}

function calcularEstadoPresupuesto(theme: 'light' | 'dark', pct: number) {
  const t = getTokens(theme)
  if (pct > 100) return { label: 'Superado',  bg: t.dangerBg,  fg: t.dangerText }
  if (pct >= 90) return { label: 'Al límite', bg: t.warningBg, fg: t.warningText }
  if (pct >= 50) return { label: 'En ritmo',  bg: t.successBg, fg: t.successText }
  return                { label: 'Holgado',   bg: t.infoBg,    fg: t.infoText }
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
  const theme = useTheme()
  const T = getTokens(theme)

  let deltaSymbol = '='
  let deltaColor = T.textTertiary
  if (deltaPct !== null) {
    if (deltaPct > 0) deltaSymbol = '▲'
    else if (deltaPct < 0) deltaSymbol = '▼'
    const favorable = esIngreso ? deltaPct > 0 : deltaPct < 0
    if (deltaPct !== 0) deltaColor = favorable ? T.success : T.danger
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
            fontFamily: FONT.sans,
            fontSize: 13,
            color: T.textPrimary,
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
            fontFamily: FONT.sans,
            fontSize: 13,
            color: T.textPrimary,
            fontWeight: 500,
            textAlign: 'right',
          }}>
            {fmtEur(importe)}
          </span>
          <span style={{
            fontFamily: FONT.sans,
            fontSize: 11,
            letterSpacing: 0.5,
            color: deltaColor,
            textAlign: 'right',
          }}>
            {deltaPct === null ? '—' : `${deltaSymbol} ${Math.abs(Math.round(deltaPct))}%`}
          </span>
          <span style={{
            fontFamily: FONT.sans,
            fontSize: 11,
            letterSpacing: 0.5,
            color: T.textTertiary,
            textAlign: 'right',
          }}>
            {porcentaje}%
          </span>
        </div>
      </div>
      <div style={{
        height: 3,
        backgroundColor: T.bgApp,
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

export function ResumenDashboard({
  movimientos,
  mesNombre,
  anio,
  diasRestantes,
}: Props) {
  const theme = useTheme()
  const T = getTokens(theme)
  const isMobile = useIsMobile()

  const STYLE_NUM_GIGANTE_DASHBOARD: CSSProperties = {
    ...kpiStyle(theme),
    marginBottom: 4,
  }

  const sumIng    = MOCK_OPERADORES_ACTUAL.reduce((s, c) => s + c.importe, 0)
  const sumIngAnt = MOCK_OPERADORES_ANTERIOR.reduce((s, c) => s + c.importe, 0)
  const sumGst    = MOCK_CATEGORIAS_ACTUAL.reduce((s, c) => s + c.importe, 0)
  const sumGstAnt = MOCK_CATEGORIAS_ANTERIOR.reduce((s, c) => s + c.importe, 0)

  const balance    = sumIng - sumGst
  const balanceAnt = sumIngAnt - sumGstAnt
  const ratio      = sumGst > 0 ? sumIng / sumGst : 0
  const ratioAnt   = sumGstAnt > 0 ? sumIngAnt / sumGstAnt : 0

  const ingDeltaPct = sumIngAnt !== 0 ? ((sumIng - sumIngAnt) / sumIngAnt) * 100 : 0
  const ingDeltaSym = ingDeltaPct > 0 ? '▲' : ingDeltaPct < 0 ? '▼' : '='
  const ingDeltaColor = ingDeltaPct > 0 ? T.success : ingDeltaPct < 0 ? T.danger : T.textTertiary
  const ingDeltaTxt = `${ingDeltaSym} ${Math.abs(Math.round(ingDeltaPct))}% vs período anterior`

  const gstDeltaPct = sumGstAnt !== 0 ? ((sumGst - sumGstAnt) / sumGstAnt) * 100 : 0
  const gstDeltaSym = gstDeltaPct > 0 ? '▲' : gstDeltaPct < 0 ? '▼' : '='
  const gstDeltaColor = gstDeltaPct > 0 ? T.danger : gstDeltaPct < 0 ? T.success : T.textTertiary
  const gstDeltaTxt = `${gstDeltaSym} ${Math.abs(Math.round(gstDeltaPct))}% vs período anterior`

  const tesDeltaPct = MOCK_TESORERIA.balanceHace30d !== 0
    ? ((MOCK_TESORERIA.balanceActual - MOCK_TESORERIA.balanceHace30d) / MOCK_TESORERIA.balanceHace30d) * 100
    : 0
  const tesDeltaSym = tesDeltaPct > 0 ? '▲' : tesDeltaPct < 0 ? '▼' : '='
  const tesDeltaColor = tesDeltaPct > 0 ? T.success : tesDeltaPct < 0 ? T.danger : T.textTertiary
  const tesDeltaTxt = `${tesDeltaSym} ${Math.abs(Math.round(tesDeltaPct))}%`

  const balanceDeltaPct = balanceAnt !== 0
    ? ((balance - balanceAnt) / Math.abs(balanceAnt)) * 100
    : 0
  const balanceDeltaColor = balanceDeltaPct > 0 ? T.success : balanceDeltaPct < 0 ? T.danger : T.textTertiary
  const balanceDeltaSym = balanceDeltaPct > 0 ? '▲' : balanceDeltaPct < 0 ? '▼' : '='
  const balanceDeltaTxt = `${balanceDeltaSym} ${Math.abs(Math.round(balanceDeltaPct))}%`

  const ratioDeltaPct = ratioAnt !== 0 ? ((ratio - ratioAnt) / ratioAnt) * 100 : 0
  const ratioDeltaColor = ratioDeltaPct > 0 ? T.success : ratioDeltaPct < 0 ? T.danger : T.textTertiary
  const ratioDeltaSym = ratioDeltaPct > 0 ? '▲' : ratioDeltaPct < 0 ? '▼' : '='
  const ratioDeltaTxt = `${ratioDeltaSym} ${Math.abs(Math.round(ratioDeltaPct))}%`

  const filasIngresos = MOCK_OPERADORES_ACTUAL
    .filter(c => c.importe > 0)
    .map(c => {
      const ant = MOCK_OPERADORES_ANTERIOR.find(x => x.operador === c.operador)?.importe ?? 0
      const deltaPct = ant !== 0 ? ((c.importe - ant) / ant) * 100 : null
      const porcentaje = sumIng > 0 ? Math.round((c.importe / sumIng) * 100) : 0
      const opStyle = getOperadorStyle(nombreOperadorAKey(c.operador), theme)
      return { ...c, color: opStyle.fg, deltaPct, porcentaje }
    })
    .sort((a, b) => b.importe - a.importe)

  const filasGastos = MOCK_CATEGORIAS_ACTUAL
    .filter(c => c.importe > 0)
    .map((c, idx) => {
      const ant = MOCK_CATEGORIAS_ANTERIOR.find(x => x.categoria === c.categoria)?.importe ?? 0
      const deltaPct = ant !== 0 ? ((c.importe - ant) / ant) * 100 : null
      const porcentaje = sumGst > 0 ? Math.round((c.importe / sumGst) * 100) : 0
      return { ...c, color: colorCategoria(idx, theme), deltaPct, porcentaje }
    })
    .sort((a, b) => b.importe - a.importe)

  const estadoRatio = calcularEstadoRatio(theme, ratio)
  const posicionIndicador = calcularPosicionIndicador(ratio)

  const minVal = Math.min(MOCK_TESORERIA.cajaLiquida, MOCK_TESORERIA.proyeccion30d, 0)
  const maxVal = Math.max(MOCK_TESORERIA.cajaLiquida, MOCK_TESORERIA.proyeccion30d)
  const rango = maxVal - minVal || 1
  const porcentajeProyeccion = ((MOCK_TESORERIA.proyeccion30d - minVal) / rango) * 100

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

  const cardBase: CSSProperties = {
    backgroundColor: T.bgSurface,
    borderRadius: 14,
    padding: '22px 24px',
    border: `1px solid ${T.borderDefault}`,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  }

  const labelCard: CSSProperties = {
    fontFamily: FONT.sans,
    fontSize: 11,
    color: T.textTertiary,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontWeight: 500,
  }

  const divider: CSSProperties = { height: 1, backgroundColor: T.borderDefault, margin: '16px 0' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
        gap: 16,
        marginBottom: 16,
        alignItems: 'stretch',
      }}>
        <div style={cardBase}>
          <div style={labelCard}>INGRESOS NETOS</div>
          <div style={STYLE_NUM_GIGANTE_DASHBOARD}>{fmtEur(sumIng)}</div>
          <div style={{ fontFamily: FONT.sans, fontSize: 12, color: ingDeltaColor, marginTop: 4, fontWeight: 500 }}>
            {ingDeltaTxt}
          </div>
          <div style={divider} />
          <div>
            {filasIngresos.map(f => (
              <FilaDistribucion
                key={f.operador}
                color={f.color}
                nombre={f.operador}
                importe={f.importe}
                deltaPct={f.deltaPct}
                porcentaje={f.porcentaje}
                esIngreso={true}
                cuadrado={false}
              />
            ))}
          </div>
        </div>

        <div style={cardBase}>
          <div style={labelCard}>GASTOS</div>
          <div style={STYLE_NUM_GIGANTE_DASHBOARD}>{fmtEur(sumGst)}</div>
          <div style={{ fontFamily: FONT.sans, fontSize: 12, color: gstDeltaColor, marginTop: 4, fontWeight: 500 }}>
            {gstDeltaTxt}
          </div>
          <div style={divider} />
          <div>
            {filasGastos.map(f => (
              <FilaDistribucion
                key={f.categoria}
                color={f.color}
                nombre={f.categoria}
                importe={f.importe}
                deltaPct={f.deltaPct}
                porcentaje={f.porcentaje}
                esIngreso={false}
                cuadrado={true}
              />
            ))}
          </div>
        </div>

        <div style={cardBase}>
          <div style={labelCard}>TESORERÍA · HOY</div>
          <div style={STYLE_NUM_GIGANTE_DASHBOARD}>{fmtEur(MOCK_TESORERIA.balanceActual)}</div>
          <div style={{ fontFamily: FONT.sans, fontSize: 12, color: tesDeltaColor, marginTop: 4, fontWeight: 500 }}>
            {tesDeltaTxt} vs hace 30 días
          </div>
          <div style={divider} />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 0',
            borderBottom: `1px solid ${T.borderDefault}`,
          }}>
            <span style={{ fontFamily: FONT.sans, fontSize: 12, color: T.textPrimary, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 500 }}>
              Caja líquida
            </span>
            <span style={{ fontFamily: FONT.sans, fontSize: 18, color: T.textPrimary, fontWeight: 500 }}>
              {fmtEur(MOCK_TESORERIA.cajaLiquida)}
            </span>
          </div>

          {[
            { label: 'Cobros pendientes', valor: MOCK_TESORERIA.cobrosPendientes, color: T.success,      prefijo: '+' },
            { label: 'Pagos pendientes',  valor: MOCK_TESORERIA.pagosPendientes,  color: T.danger,       prefijo: '−' },
            { label: 'Proyección 7d',     valor: MOCK_TESORERIA.proyeccion7d,     color: T.textPrimary,  prefijo: '' },
            { label: 'Proyección 30d',    valor: MOCK_TESORERIA.proyeccion30d,    color: T.textPrimary,  prefijo: '' },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 0',
            }}>
              <span style={{ fontFamily: FONT.sans, fontSize: 13, color: T.textPrimary }}>{item.label}</span>
              <span style={{ fontFamily: FONT.sans, fontSize: 13, color: item.color, fontWeight: 500 }}>
                {item.prefijo}{fmtEur(Math.abs(item.valor))}
              </span>
            </div>
          ))}

          <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: `1px solid ${T.borderDefault}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT.sans, fontSize: 11, color: T.textTertiary, marginBottom: 6 }}>
              <span>Hoy</span>
              <span>30d</span>
            </div>
            <div style={{ height: 6, backgroundColor: T.bgApp, borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${porcentajeProyeccion}%`,
                backgroundColor: MOCK_TESORERIA.proyeccion30d >= MOCK_TESORERIA.cajaLiquida ? T.success : T.danger,
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT.sans, fontSize: 12, marginTop: 6 }}>
              <span style={{ color: T.textPrimary, fontWeight: 500 }}>{fmtEur(MOCK_TESORERIA.cajaLiquida)}</span>
              <span style={{
                color: MOCK_TESORERIA.proyeccion30d >= MOCK_TESORERIA.cajaLiquida ? T.success : T.danger,
                fontWeight: 500,
              }}>
                {fmtEur(MOCK_TESORERIA.proyeccion30d)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
        gap: 16,
        marginBottom: 16,
      }}>
        <div style={{
          backgroundColor: T.bgSurface,
          borderRadius: 14,
          padding: '24px 30px',
          border: `1px solid ${T.borderDefault}`,
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: isMobile ? 16 : 30,
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontFamily: FONT.sans, fontSize: 11, color: T.textTertiary, letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: 8, fontWeight: 500 }}>
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
                fontFamily: FONT.sans,
              }}>
                {estadoRatio.label}
              </span>
            </div>
            <div style={{ fontFamily: FONT.sans, fontSize: 12, color: T.textTertiary, marginTop: 8 }}>
              Objetivo ≥ 1.25
            </div>
            <div style={{ fontFamily: FONT.sans, fontSize: 12, color: ratioDeltaColor, marginTop: 6, fontWeight: 500 }}>
              {ratioDeltaTxt} vs período anterior
            </div>
          </div>

          <div style={{ flex: 1, maxWidth: isMobile ? '100%' : 320, width: isMobile ? '100%' : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT.sans, fontSize: 10, color: T.textTertiary, marginBottom: 6, letterSpacing: 0.8 }}>
              <span>Crítico</span>
              <span>Alerta</span>
              <span>OK</span>
              <span>Saludable</span>
            </div>
            <div style={{
              position: 'relative',
              height: 10,
              background: `linear-gradient(to right, ${T.danger} 0%, ${T.danger} 25%, ${T.warning} 25%, ${T.warning} 50%, ${T.success} 50%, ${T.success} 100%)`,
              borderRadius: 5,
            }}>
              <div style={{
                position: 'absolute',
                left: `${posicionIndicador}%`,
                top: -5,
                width: 4,
                height: 20,
                backgroundColor: T.textPrimary,
                borderRadius: 2,
                transform: 'translateX(-2px)',
                boxShadow: `0 0 0 2px ${T.bgSurface}`,
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT.sans, fontSize: 10, color: T.textTertiary, marginTop: 4 }}>
              <span>0.5</span>
              <span>1.0</span>
              <span>1.25</span>
              <span>2.0</span>
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: T.bgSurface,
          borderRadius: 14,
          padding: '22px 24px',
          border: `1px solid ${T.borderDefault}`,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={labelCard}>BALANCE NETO</div>
          <div style={{
            ...STYLE_NUM_GIGANTE_DASHBOARD,
            color: balance >= 0 ? T.success : T.danger,
          }}>
            {balance >= 0 ? '+' : ''}{fmtEur(balance)}
          </div>
          <div style={{ fontFamily: FONT.sans, fontSize: 12, color: T.textTertiary, marginTop: 8 }}>
            Ingresos − Gastos
          </div>
          <div style={{ height: 1, backgroundColor: T.borderDefault, margin: '14px 0' }} />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: FONT.sans,
            fontSize: 12,
          }}>
            <span style={{ color: T.textTertiary }}>vs período anterior</span>
            <span style={{
              color: balanceDeltaColor,
              fontWeight: 500,
              fontFamily: FONT.sans,
              letterSpacing: 0.5,
            }}>
              {balanceDeltaTxt}
            </span>
          </div>
        </div>
      </div>

      <div>
        <div style={{
          fontFamily: FONT.sans,
          fontSize: 12,
          color: T.textPrimary,
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
            const pct = Math.round((p.consumido / p.tope) * 100)
            const superado = p.consumido > p.tope
            const pctDisplay = superado ? 100 : pct

            const variantColor =
              p.variant === 'oliva'   ? T.success :
              p.variant === 'ambar'   ? T.warning :
              p.variant === 'naranja' ? T.brandAccent :
              T.info

            const colorBarra = superado ? T.danger : variantColor

            const diasTranscurridos = calcularDiasTranscurridosMes()
            const diasRestMes = diasEnMesActual() - diasTranscurridos
            const ritmoDiario = diasTranscurridos > 0 ? p.consumido / diasTranscurridos : 0
            const estado = calcularEstadoPresupuesto(theme, pct)

            return (
              <div key={p.categoria} style={{
                backgroundColor: T.bgSurface,
                borderRadius: 12,
                padding: '16px 18px',
                border: `1px solid ${T.borderDefault}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{
                    fontFamily: FONT.sans,
                    fontSize: 12,
                    color: T.textPrimary,
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
                    fontFamily: FONT.sans,
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
                  <span style={{ fontFamily: FONT.sans, fontSize: 22, fontWeight: 500, color: T.textPrimary }}>
                    {fmtEur(p.consumido)}
                  </span>
                  <span style={{ fontFamily: FONT.sans, fontSize: 11, color: T.textTertiary }}>bruto</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                  <span style={{ fontFamily: FONT.sans, fontSize: 18, fontWeight: 500, color: variantColor }}>
                    {fmtEur(p.tope)}
                  </span>
                  <span style={{ fontFamily: FONT.sans, fontSize: 11, color: T.textTertiary }}>tope</span>
                </div>

                <div style={{ height: 1, backgroundColor: T.borderDefault, margin: '10px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: FONT.sans, fontSize: 11, color: T.textTertiary }}>
                    {superado ? 'Superado' : 'Consumido'}
                  </span>
                  <span style={{
                    fontFamily: FONT.sans,
                    fontSize: 13,
                    fontWeight: 500,
                    color: superado ? T.danger : T.textPrimary,
                  }}>
                    {pct}%
                  </span>
                </div>

                <div style={{
                  height: 4,
                  backgroundColor: T.bgApp,
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
                  fontFamily: FONT.sans,
                  fontSize: 10,
                  color: T.textTertiary,
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

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: 16,
      }}>
        <div style={cardBase}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={labelCard}>INGRESOS VS GASTOS · SEMANAL</div>
            <div style={{ display: 'flex', gap: 10, fontSize: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.textTertiary, fontFamily: FONT.sans }}>
                <span style={{ width: 10, height: 2, backgroundColor: T.success }} />Ing
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.textTertiary, fontFamily: FONT.sans }}>
                <span style={{ width: 10, height: 2, backgroundColor: T.danger }} />Gst
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={datosSemanales} barGap={4} barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" stroke={T.borderDefault} vertical={false} />
              <XAxis dataKey="semana" stroke={T.textTertiary} tick={{ fontSize: 11, fill: T.textTertiary, fontFamily: FONT.sans }} />
              <YAxis stroke={T.textTertiary} tick={{ fontSize: 11, fill: T.textTertiary, fontFamily: FONT.sans }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: T.bgSurface, border: `1px solid ${T.borderDefault}`, color: T.textPrimary, fontFamily: FONT.sans, borderRadius: 8 }}
                formatter={(v) => fmtEur(Number(v))}
              />
              <Bar dataKey="ingresos" name="Ingresos" fill={T.success} radius={[3, 3, 0, 0]} />
              <Bar dataKey="gastos"   name="Gastos"   fill={T.danger}  radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={cardBase}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={labelCard}>EVOLUCIÓN: INGRESOS · GASTOS · SALDO</div>
            <div style={{ display: 'flex', gap: 10, fontSize: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.textTertiary, fontFamily: FONT.sans }}>
                <span style={{ width: 10, height: 2, backgroundColor: T.success }} />Ing
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.textTertiary, fontFamily: FONT.sans }}>
                <span style={{ width: 10, height: 2, backgroundColor: T.danger }} />Gst
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.textTertiary, fontFamily: FONT.sans }}>
                <span style={{ width: 10, height: 2, backgroundColor: T.brandAccent }} />Saldo
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={datosEvolucion}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.borderDefault} />
              <XAxis dataKey="fecha" stroke={T.textTertiary} tick={{ fontSize: 11, fill: T.textTertiary, fontFamily: FONT.sans }} interval="preserveStartEnd" />
              <YAxis
                stroke={T.textTertiary}
                tick={{ fontSize: 11, fill: T.textTertiary, fontFamily: FONT.sans }}
                domain={[(dataMin: number) => Math.floor((dataMin - 500) / 500) * 500, (dataMax: number) => Math.ceil((dataMax + 500) / 500) * 500]}
                tickCount={6}
                tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: T.bgSurface, border: `1px solid ${T.borderDefault}`, color: T.textPrimary, fontFamily: FONT.sans, borderRadius: 8 }}
                formatter={(v) => fmtEur(Number(v))}
              />
              <Line type="linear" dataKey="ingresos" name="Ingresos" stroke={T.success}     strokeWidth={2}   dot={false} activeDot={{ r: 5 }} />
              <Line type="linear" dataKey="gastos"   name="Gastos"   stroke={T.danger}      strokeWidth={2}   dot={false} activeDot={{ r: 5 }} />
              <Line type="linear" dataKey="saldo"    name="Saldo"    stroke={T.brandAccent} strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
