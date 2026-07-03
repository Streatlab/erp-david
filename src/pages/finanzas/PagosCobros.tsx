import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'
import {
  useThemeMode, getTokens, cardStyle, badgeStyle,
  fmtEur, fmtDate,
  FONT, FS, FW, SPACE, RADIUS, TRACKING,
} from '@/styles/tokens'

interface FacturaPendiente {
  id: string
  cliente: string
  transportista: string | null
  numero_factura: number | null
  periodo: string | null
  fecha_factura: string | null
  total: number | null
  emisor: string | null
  estado: string
}

interface GastoRow {
  fecha: string
  categoria: string | null
  importe: number | null
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function fechaEsperada(f: FacturaPendiente): Date | null {
  if (!f.cliente?.toUpperCase().includes('CADE') || !f.periodo) return null
  const p = new Date(f.periodo + 'T00:00:00')
  if (isNaN(p.getTime())) return null
  return new Date(p.getFullYear(), p.getMonth() + 1, 15)
}

export default function PagosCobros() {
  const theme = useThemeMode()
  const t = getTokens(theme)

  const [pendientes, setPendientes] = useState<FacturaPendiente[]>([])
  const [gastos, setGastos] = useState<GastoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const hace3m = new Date()
      hace3m.setMonth(hace3m.getMonth() - 2)
      hace3m.setDate(1)
      const desde = hace3m.toISOString().slice(0, 10)

      const [fac, gas] = await Promise.all([
        supabase.from('facturas_emitidas')
          .select('id, cliente, transportista, numero_factura, periodo, fecha_factura, total, emisor, estado')
          .eq('estado', 'PENDIENTE')
          .order('periodo', { ascending: true }),
        supabase.from('gastos')
          .select('fecha, categoria, importe')
          .gte('fecha', desde),
      ])
      if (fac.error) setErrMsg(fac.error.message)
      else setPendientes((fac.data ?? []) as FacturaPendiente[])
      if (gas.error) setErrMsg(prev => prev ?? gas.error!.message)
      else setGastos((gas.data ?? []) as GastoRow[])
      setLoading(false)
    })()
  }, [])

  const hoy = new Date()

  const cobros = useMemo(() => {
    const rows = pendientes.map(f => {
      const fe = fechaEsperada(f)
      return { ...f, fe, vencida: fe !== null && hoy > fe }
    })
    return {
      rows,
      total: rows.reduce((s, r) => s + (r.total ?? 0), 0),
      vencido: rows.filter(r => r.vencida).reduce((s, r) => s + (r.total ?? 0), 0),
    }
  }, [pendientes]) // eslint-disable-line react-hooks/exhaustive-deps

  const pagosPorMes = useMemo(() => {
    const map = new Map<string, { label: string; total: number; cats: Map<string, number> }>()
    for (const g of gastos) {
      if (!g.fecha) continue
      const d = new Date(g.fecha + 'T00:00:00')
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map.has(key)) map.set(key, { label: `${MESES[d.getMonth()]} ${d.getFullYear()}`, total: 0, cats: new Map() })
      const m = map.get(key)!
      m.total += g.importe ?? 0
      const cat = g.categoria ?? 'Sin categoría'
      m.cats.set(cat, (m.cats.get(cat) ?? 0) + (g.importe ?? 0))
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([, v]) => ({
      ...v,
      top: [...v.cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    }))
  }, [gastos])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[5] }}>
      <h1 style={{ margin: 0, fontFamily: FONT.title, fontSize: 22, fontWeight: FW.bold, color: t.brandAccent, letterSpacing: TRACKING.wider, textTransform: 'uppercase' }}>
        Pagos y Cobros
      </h1>

      {errMsg && (
        <div style={{ background: t.dangerBg, color: t.dangerText, border: `1px solid ${t.dangerBorder}`, padding: SPACE[4], borderRadius: RADIUS.md, fontFamily: FONT.body, fontSize: FS.sm }}>
          Error: {errMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: SPACE[4] }}>
        <Kpi label="Cobros pendientes" value={fmtEur(cobros.total)} sub={`${cobros.rows.length} facturas`} accent />
        <Kpi label="Vencido (Cade, pasado día 15)" value={fmtEur(cobros.vencido)} danger={cobros.vencido > 0} />
        <Kpi label="Pagos mes en curso" value={fmtEur(pagosPorMes[0]?.total ?? 0)} sub={pagosPorMes[0]?.label ?? '—'} />
      </div>

      {/* COBROS PENDIENTES */}
      <div style={{ ...cardStyle(theme), padding: 0, overflowX: 'auto' }}>
        <div style={sectionHeader(t)}>Cobros pendientes</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT.body, fontSize: FS.sm }}>
          <thead>
            <tr>
              {['Nº', 'Cliente', 'Transp.', 'Emisor', 'Periodo', 'Cobro esperado', 'Total', 'Estado'].map(h => (
                <th key={h} style={th(t)}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} style={{ ...td(t), textAlign: 'center', color: t.textTertiary, padding: SPACE[8] }}>Cargando…</td></tr>
            )}
            {!loading && cobros.rows.length === 0 && (
              <tr><td colSpan={8} style={{ ...td(t), textAlign: 'center', color: t.textTertiary, padding: SPACE[8] }}>Todo cobrado. Sin pendientes.</td></tr>
            )}
            {cobros.rows.map(r => (
              <tr key={r.id} style={{ background: r.vencida ? t.dangerBg : 'transparent' }}>
                <td style={{ ...td(t), fontWeight: FW.bold }}>{r.numero_factura ?? '—'}</td>
                <td style={td(t)}>{r.cliente}</td>
                <td style={td(t)}>{r.transportista ?? '—'}</td>
                <td style={td(t)}>
                  <span style={badgeStyle(theme, (r.emisor ?? '').toUpperCase() === 'JUAN' ? 'ambar' : 'marino')}>{r.emisor ?? '—'}</span>
                </td>
                <td style={td(t)}>{fmtDate(r.periodo)}</td>
                <td style={{ ...td(t), color: r.vencida ? t.dangerText : t.textSecondary, fontWeight: r.vencida ? FW.bold : FW.regular }}>
                  {r.fe ? fmtDate(r.fe) : '—'}
                </td>
                <td style={{ ...td(t), textAlign: 'right', fontWeight: FW.bold }}>{fmtEur(r.total)}</td>
                <td style={td(t)}>
                  <span style={badgeStyle(theme, r.vencida ? 'terra' : 'naranja')}>{r.vencida ? 'VENCIDA' : 'PENDIENTE'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGOS POR MES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: SPACE[4] }}>
        {pagosPorMes.map(m => (
          <div key={m.label} style={cardStyle(theme)}>
            <div style={{ fontSize: FS['2xs'], letterSpacing: TRACKING.wide, textTransform: 'uppercase', color: t.textSecondary, fontWeight: FW.medium }}>
              Pagos · {m.label}
            </div>
            <div style={{ fontSize: FS.lg, fontWeight: FW.bold, color: t.textPrimary, margin: '6px 0 10px' }}>{fmtEur(m.total)}</div>
            {m.top.map(([cat, imp]) => (
              <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT.body, fontSize: FS.xs, color: t.textSecondary, padding: '3px 0', borderBottom: `0.5px solid ${t.borderSubtle}` }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{cat}</span>
                <span style={{ fontWeight: FW.medium, color: t.textPrimary, whiteSpace: 'nowrap' }}>{fmtEur(imp)}</span>
              </div>
            ))}
          </div>
        ))}
        {!loading && pagosPorMes.length === 0 && (
          <div style={{ ...cardStyle(theme), color: t.textTertiary, fontFamily: FONT.body, fontSize: FS.sm }}>
            Sin gastos conciliados en los últimos meses.
          </div>
        )}
      </div>
    </div>
  )
}

function Kpi({ label, value, sub, accent, danger }: { label: string; value: string; sub?: string; accent?: boolean; danger?: boolean }) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  return (
    <div style={cardStyle(theme)}>
      <div style={{ fontSize: FS['2xs'], letterSpacing: TRACKING.wide, textTransform: 'uppercase', color: t.textSecondary, fontWeight: FW.medium, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: FS.xl, fontWeight: FW.bold, color: danger ? t.danger : accent ? t.brandAccent : t.textPrimary, lineHeight: 1.15, letterSpacing: TRACKING.tight }}>{value}</div>
      {sub && <div style={{ marginTop: 4, fontSize: FS.xs, color: t.textTertiary, fontFamily: FONT.body }}>{sub}</div>}
    </div>
  )
}

function sectionHeader(t: ReturnType<typeof getTokens>): CSSProperties {
  return {
    padding: '12px 16px', fontSize: FS.xs, letterSpacing: TRACKING.wider, textTransform: 'uppercase',
    color: t.brandAccent, fontWeight: FW.bold, borderBottom: `0.5px solid ${t.borderDefault}`, fontFamily: FONT.sans,
  }
}

function th(t: ReturnType<typeof getTokens>): CSSProperties {
  return {
    textAlign: 'left', padding: '10px 12px', fontSize: FS['2xs'], letterSpacing: TRACKING.wide,
    textTransform: 'uppercase', color: t.textSecondary, fontWeight: FW.medium,
    borderBottom: `0.5px solid ${t.borderDefault}`, whiteSpace: 'nowrap',
  }
}

function td(t: ReturnType<typeof getTokens>): CSSProperties {
  return { padding: '8px 12px', borderBottom: `0.5px solid ${t.borderSubtle}`, color: t.textPrimary }
}
