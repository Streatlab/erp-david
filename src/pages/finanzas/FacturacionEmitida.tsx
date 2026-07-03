import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'
import {
  useThemeMode, getTokens, cardStyle, badgeStyle,
  fmtEur, fmtDate,
  FONT, FS, FW, SPACE, RADIUS, TRACKING,
} from '@/styles/tokens'

interface FacturaEmitida {
  id: string
  cliente: string
  concepto: string | null
  transportista: string | null
  periodo: string | null
  fecha_factura: string | null
  numero_factura: number | null
  base_imponible: number | null
  cuota_iva: number | null
  total: number | null
  estado: string
  fecha_cobro: string | null
  emisor: string | null
  notas: string | null
}

type EmisorFilter = 'TODOS' | 'DAVID' | 'JUAN'
type EstadoFilter = 'TODAS' | 'PENDIENTE' | 'COBRADA'

/** Cade paga el 10 o el 15 del mes siguiente al mes trabajado → tope: día 15 mes+1 */
function fechaEsperadaCobro(f: FacturaEmitida): Date | null {
  if (!f.cliente?.toUpperCase().includes('CADE') || !f.periodo) return null
  const p = new Date(f.periodo + 'T00:00:00')
  if (isNaN(p.getTime())) return null
  return new Date(p.getFullYear(), p.getMonth() + 1, 15)
}

export default function FacturacionEmitida() {
  const theme = useThemeMode()
  const t = getTokens(theme)

  const [facturas, setFacturas] = useState<FacturaEmitida[]>([])
  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [emisor, setEmisor] = useState<EmisorFilter>('TODOS')
  const [estado, setEstado] = useState<EstadoFilter>('TODAS')
  const [saving, setSaving] = useState<string | null>(null)

  async function cargar() {
    setLoading(true)
    setErrMsg(null)
    const { data, error } = await supabase
      .from('facturas_emitidas')
      .select('*')
      .order('fecha_factura', { ascending: false })
      .order('numero_factura', { ascending: false })
    if (error) setErrMsg(error.message)
    setFacturas((data ?? []) as FacturaEmitida[])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const hoy = new Date()

  const visibles = useMemo(() => facturas.filter(f => {
    if (emisor !== 'TODOS' && (f.emisor ?? '').toUpperCase() !== emisor) return false
    if (estado !== 'TODAS' && f.estado !== estado) return false
    return true
  }), [facturas, emisor, estado])

  const kpis = useMemo(() => {
    const base = facturas.filter(f => emisor === 'TODOS' || (f.emisor ?? '').toUpperCase() === emisor)
    const total = base.reduce((s, f) => s + (f.total ?? 0), 0)
    const pendientes = base.filter(f => f.estado === 'PENDIENTE')
    const pendiente = pendientes.reduce((s, f) => s + (f.total ?? 0), 0)
    const vencidas = pendientes.filter(f => {
      const fe = fechaEsperadaCobro(f)
      return fe !== null && hoy > fe
    })
    const vencido = vencidas.reduce((s, f) => s + (f.total ?? 0), 0)
    return { total, pendiente, vencido, nVencidas: vencidas.length, n: base.length }
  }, [facturas, emisor]) // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleCobro(f: FacturaEmitida) {
    setSaving(f.id)
    const cobrada = f.estado === 'COBRADA'
    const { error } = await supabase
      .from('facturas_emitidas')
      .update(cobrada
        ? { estado: 'PENDIENTE', fecha_cobro: null }
        : { estado: 'COBRADA', fecha_cobro: new Date().toISOString().slice(0, 10) })
      .eq('id', f.id)
    if (error) setErrMsg(error.message)
    else await cargar()
    setSaving(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[5] }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: SPACE[3] }}>
        <h1 style={pageTitle(t.brandAccent)}>Facturación emitida</h1>
        <div style={{ display: 'flex', gap: SPACE[2], flexWrap: 'wrap' }}>
          <Pills value={emisor} onChange={v => setEmisor(v as EmisorFilter)} options={['TODOS', 'DAVID', 'JUAN']} />
          <Pills value={estado} onChange={v => setEstado(v as EstadoFilter)} options={['TODAS', 'PENDIENTE', 'COBRADA']} />
        </div>
      </div>

      {errMsg && <ErrorBox msg={errMsg} />}

      {/* KPIs */}
      <div style={grid(4)}>
        <Kpi label="Facturado" value={fmtEur(kpis.total)} sub={`${kpis.n} facturas`} />
        <Kpi label="Pendiente de cobro" value={fmtEur(kpis.pendiente)} accent />
        <Kpi label="Vencido (pasado día 15)" value={fmtEur(kpis.vencido)} sub={`${kpis.nVencidas} facturas`} danger={kpis.vencido > 0} />
        <Kpi label="Cobrado" value={fmtEur(kpis.total - kpis.pendiente)} />
      </div>

      {kpis.nVencidas > 0 && (
        <div style={{
          background: t.dangerBg, border: `1px solid ${t.dangerBorder}`, color: t.dangerText,
          borderRadius: RADIUS.md, padding: SPACE[4], fontFamily: FONT.body, fontSize: FS.sm,
        }}>
          ⚠ {kpis.nVencidas} factura{kpis.nVencidas > 1 ? 's' : ''} de Cade sin cobrar pasado el día 15 del mes siguiente ({fmtEur(kpis.vencido)}). Revisar con Cade.
        </div>
      )}

      {/* Tabla */}
      <div style={{ ...cardStyle(theme), padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT.body, fontSize: FS.sm }}>
          <thead>
            <tr>
              {['Nº', 'Fecha', 'Cliente', 'Concepto', 'Transp.', 'Emisor', 'Base', 'IVA', 'Total', 'Cobro esperado', 'Estado', ''].map(h => (
                <th key={h} style={th(t)}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={12} style={{ ...td(t), textAlign: 'center', color: t.textTertiary, padding: SPACE[8] }}>Cargando…</td></tr>
            )}
            {!loading && visibles.length === 0 && (
              <tr><td colSpan={12} style={{ ...td(t), textAlign: 'center', color: t.textTertiary, padding: SPACE[8] }}>Sin facturas para este filtro.</td></tr>
            )}
            {visibles.map(f => {
              const fe = fechaEsperadaCobro(f)
              const vencida = f.estado === 'PENDIENTE' && fe !== null && hoy > fe
              return (
                <tr key={f.id} style={{ background: vencida ? t.dangerBg : 'transparent' }}>
                  <td style={{ ...td(t), fontWeight: FW.bold }}>{f.numero_factura ?? '—'}</td>
                  <td style={td(t)}>{fmtDate(f.fecha_factura)}</td>
                  <td style={td(t)}>{f.cliente}</td>
                  <td style={{ ...td(t), maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.concepto ?? ''}>{f.concepto ?? '—'}</td>
                  <td style={td(t)}>{f.transportista ?? '—'}</td>
                  <td style={td(t)}>
                    <span style={badgeStyle(theme, (f.emisor ?? '').toUpperCase() === 'JUAN' ? 'ambar' : 'marino')}>{f.emisor ?? '—'}</span>
                  </td>
                  <td style={{ ...td(t), textAlign: 'right' }}>{fmtEur(f.base_imponible)}</td>
                  <td style={{ ...td(t), textAlign: 'right' }}>{fmtEur(f.cuota_iva)}</td>
                  <td style={{ ...td(t), textAlign: 'right', fontWeight: FW.bold }}>{fmtEur(f.total)}</td>
                  <td style={{ ...td(t), color: vencida ? t.dangerText : t.textSecondary }}>
                    {f.estado === 'COBRADA' ? fmtDate(f.fecha_cobro) : fe ? fmtDate(fe) : '—'}
                  </td>
                  <td style={td(t)}>
                    <span style={badgeStyle(theme, f.estado === 'COBRADA' ? 'oliva' : vencida ? 'terra' : 'naranja')}>
                      {vencida ? 'VENCIDA' : f.estado}
                    </span>
                  </td>
                  <td style={td(t)}>
                    <button
                      onClick={() => toggleCobro(f)}
                      disabled={saving === f.id}
                      style={{
                        background: 'transparent', border: `0.5px solid ${t.borderDefault}`,
                        borderRadius: RADIUS.sm, padding: '4px 10px', cursor: 'pointer',
                        fontFamily: FONT.body, fontSize: FS.xs, color: t.textSecondary,
                        opacity: saving === f.id ? 0.5 : 1, whiteSpace: 'nowrap',
                      }}
                    >
                      {f.estado === 'COBRADA' ? '↩ Pendiente' : '✓ Cobrada'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── helpers de estilo compartidos en la página ───────────── */

function pageTitle(color: string): CSSProperties {
  return {
    margin: 0, fontFamily: FONT.title, fontSize: 22, fontWeight: FW.bold,
    color, letterSpacing: TRACKING.wider, textTransform: 'uppercase',
  }
}

function grid(cols: number): CSSProperties {
  const min = cols >= 4 ? 200 : 280
  return { display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: SPACE[4] }
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

function Pills({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  return (
    <div style={{ display: 'flex', gap: 4, background: t.bgSurfaceAlt, borderRadius: RADIUS.pill, padding: 4, border: `1px solid ${t.borderDefault}` }}>
      {options.map(o => {
        const active = value === o
        return (
          <button key={o} onClick={() => onChange(o)} style={{
            padding: '5px 12px', borderRadius: RADIUS.pill, border: 0,
            background: active ? t.brandPrimary : 'transparent',
            color: active ? t.textOnPrimary : t.textSecondary,
            fontFamily: FONT.body, fontSize: FS.xs, fontWeight: active ? FW.bold : FW.medium,
            cursor: 'pointer',
          }}>{o}</button>
        )
      })}
    </div>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  return (
    <div style={{ background: t.dangerBg, color: t.dangerText, border: `1px solid ${t.dangerBorder}`, padding: SPACE[4], borderRadius: RADIUS.md, fontFamily: FONT.body, fontSize: FS.sm }}>
      Error: {msg}
    </div>
  )
}
