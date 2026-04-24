import { useEffect, useState, useCallback, type CSSProperties } from 'react'
import {
  useThemeMode, getTokens,
  FONT, FS, FW, SPACE, RADIUS, TRACKING,
} from '@/styles/tokens'
import {
  cargarPanel, NOMBRE_MES,
  type PanelBundle, type PeriodoKey,
} from '@/lib/panel/queries'

import KpiIngresos from '@/components/panel/KpiIngresos'
import KpiGastos from '@/components/panel/KpiGastos'
import KpiTesoreria from '@/components/panel/KpiTesoreria'
import CardRatio from '@/components/panel/CardRatio'
import CardBalanceNeto from '@/components/panel/CardBalanceNeto'
import ObjetivosMensuales from '@/components/panel/ObjetivosMensuales'
import ObjetivosDiarios from '@/components/panel/ObjetivosDiarios'
import CardPresupuestoComp from '@/components/panel/CardPresupuesto'
import GraficoIngresosVsGastos from '@/components/panel/GraficoIngresosVsGastos'
import GraficoSaldoBBVA from '@/components/panel/GraficoSaldoBBVA'

const PERIODOS: { key: PeriodoKey; label: string }[] = [
  { key: 'mes-actual',    label: 'Este mes' },
  { key: 'mes-anterior',  label: 'Mes anterior' },
  { key: 'ultimos-30',    label: 'Últimos 30 días' },
  { key: 'trimestre',     label: 'Trimestre' },
  { key: 'anio',          label: 'Año' },
]

export default function PanelGlobal() {
  const theme = useThemeMode()
  const t = getTokens(theme)

  const [periodo, setPeriodo] = useState<PeriodoKey>('mes-actual')
  const [bundle, setBundle] = useState<PanelBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setErrMsg(null)
    try {
      const b = await cargarPanel(periodo)
      setBundle(b)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setErrMsg(msg)
    } finally {
      setLoading(false)
    }
  }, [periodo])

  useEffect(() => { cargar() }, [cargar])

  const hoy = new Date()
  const tituloMes = NOMBRE_MES[hoy.getMonth()].toUpperCase()
  const tituloAnio = hoy.getFullYear()

  const subtitulo = (() => {
    if (!bundle) return ''
    const f = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    return `${f(bundle.rango.start)} – ${f(bundle.rango.end)}`
  })()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[6] }}>
      {/* HEADER ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: SPACE[4] }}>
        <div>
          <h1 style={{
            margin: 0,
            fontFamily: FONT.title,
            fontSize: 22,
            fontWeight: FW.bold,
            color: t.brandAccent,
            letterSpacing: TRACKING.wider,
            textTransform: 'uppercase',
          }}>
            PANEL GLOBAL · {tituloMes} {tituloAnio}
          </h1>
          <div style={{ marginTop: 4, fontFamily: FONT.body, fontSize: FS.sm, color: t.textTertiary }}>
            {subtitulo || '—'}
          </div>
        </div>

        <SelectorPeriodo value={periodo} onChange={setPeriodo} />
      </div>

      {errMsg && (
        <div style={{
          background: t.dangerBg,
          color: t.dangerText,
          border: `1px solid ${t.dangerBorder}`,
          padding: SPACE[4],
          borderRadius: RADIUS.md,
          fontFamily: FONT.body,
          fontSize: FS.sm,
        }}>
          Error cargando datos: {errMsg}. Verifica que se haya ejecutado la migración 015 en Supabase.
        </div>
      )}

      {loading && !bundle && (
        <div style={{ padding: SPACE[8], textAlign: 'center', color: t.textTertiary, fontFamily: FONT.body }}>
          Cargando panel…
        </div>
      )}

      {bundle && (
        <>
          {/* FILA 1 — 3 KPI Cards ────────────────────── */}
          <div style={gridCols(3)}>
            <KpiIngresos
              total={bundle.ingresos.total}
              totalAnterior={bundle.ingresos.totalAnterior}
              filas={bundle.ingresos.filas}
            />
            <KpiGastos
              total={bundle.gastos.total}
              totalAnterior={bundle.gastos.totalAnterior}
              filas={bundle.gastos.filas}
            />
            <KpiTesoreria snap={bundle.tesoreria} />
          </div>

          {/* FILA 2 — Ratio + Balance ────────────────── */}
          <div style={gridCols(2)}>
            <CardRatio
              ingresos={bundle.ingresos.total}
              gastos={bundle.gastos.total}
              ratioAnterior={
                bundle.gastos.totalAnterior > 0
                  ? bundle.ingresos.totalAnterior / bundle.gastos.totalAnterior
                  : null
              }
            />
            <CardBalanceNeto
              ingresos={bundle.ingresos.total}
              gastos={bundle.gastos.total}
              ingresosAnt={bundle.ingresos.totalAnterior}
              gastosAnt={bundle.gastos.totalAnterior}
            />
          </div>

          {/* FILA 3 — Objetivos integrados ───────────── */}
          <div style={gridCols(2)}>
            <ObjetivosMensuales filas={bundle.objetivos} />
            <ObjetivosDiarios filas={bundle.objetivosDia} onSaved={cargar} />
          </div>

          {/* FILA 4 — Presupuestos soft wash ─────────── */}
          {bundle.presupuestos.length > 0 && (
            <div style={gridCols(4)}>
              {bundle.presupuestos.map(p => <CardPresupuestoComp key={p.key} card={p} />)}
            </div>
          )}

          {/* FILA 5 — Gráficos ───────────────────────── */}
          <div style={gridCols(2)}>
            <GraficoIngresosVsGastos data={bundle.barrasSemanas} />
            <GraficoSaldoBBVA data={bundle.serieSaldo} />
          </div>
        </>
      )}
    </div>
  )
}

function gridCols(cols: 2 | 3 | 4): CSSProperties {
  const min = cols === 4 ? 200 : cols === 3 ? 280 : 320
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
    gap: SPACE[5],
  }
}

function SelectorPeriodo({ value, onChange }: { value: PeriodoKey; onChange: (v: PeriodoKey) => void }) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  return (
    <div style={{
      display: 'flex',
      gap: 4,
      background: t.bgSurfaceAlt,
      borderRadius: RADIUS.pill,
      padding: 4,
      border: `1px solid ${t.borderDefault}`,
      flexWrap: 'wrap',
    }}>
      {PERIODOS.map(p => {
        const active = value === p.key
        return (
          <button
            key={p.key}
            onClick={() => onChange(p.key)}
            style={{
              padding: '6px 14px',
              borderRadius: RADIUS.pill,
              border: 0,
              background: active ? t.brandAccent : 'transparent',
              color: active ? '#fff' : t.textSecondary,
              fontFamily: FONT.body,
              fontSize: FS.xs,
              fontWeight: active ? FW.bold : FW.medium,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              transition: 'background 120ms',
            }}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}
