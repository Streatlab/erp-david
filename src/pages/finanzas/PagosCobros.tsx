import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmtEur, fmtDate } from '@/lib/format'
import { CELESTE, OLIVA, TERRA, NARANJA, MARINO, AMBAR, GRIS, ARENA_CL, BLANCO, INK, OSW, ARENA } from '@/styles/neobrutal'
import { card } from '@/styles/neobrutal'
import {
  PageNeo, Banda, CabeceraNeo, KpiNeo, AvisoNeo,
  TablaWrap, thNeo, tdNeo, tdEstado, BadgeNeo,
} from '@/components/neo/NeoUI'

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
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Finanzas" titulo="Pagos y Cobros" />

      {errMsg && <AvisoNeo>ERROR: {errMsg}</AvisoNeo>}

      {cobros.vencido > 0 && (
        <AvisoNeo>
          CADE VA TARDE: {fmtEur(cobros.vencido)} VENCIDO pasado el día 15. Reclamar.
        </AvisoNeo>
      )}

      {/* ¿Cuánto entra y cuánto sale? */}
      <Banda bg={ARENA_CL}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
          <KpiNeo label="Cobros pendientes" valor={fmtEur(cobros.total)} color={CELESTE} sub={`${cobros.rows.length} facturas por cobrar`} />
          <KpiNeo label="Vencido · Cade pasado día 15" valor={fmtEur(cobros.vencido)} color={cobros.vencido > 0 ? TERRA : OLIVA} />
          <KpiNeo label="Pagos mes en curso" valor={fmtEur(pagosPorMes[0]?.total ?? 0)} color={NARANJA} sub={pagosPorMes[0]?.label ?? '—'} />
        </div>
      </Banda>

      {/* COBROS PENDIENTES */}
      <Banda bg={BLANCO}>
        <h2 style={{ fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(20px,2.4vw,28px)', textTransform: 'uppercase', letterSpacing: '-0.5px', margin: '0 0 16px' }}>
          ¿Cuándo cobras?
        </h2>
        <TablaWrap>
          <thead>
            <tr>
              {['Nº', 'Cliente', 'Transp.', 'Emisor', 'Periodo', 'Cobro esperado', 'Total', 'Estado'].map(h => (
                <th key={h} style={thNeo}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} style={{ ...tdNeo(false), textAlign: 'center', color: GRIS, padding: 32 }}>Cargando…</td></tr>
            )}
            {!loading && cobros.rows.length === 0 && (
              <tr><td colSpan={8} style={{ ...tdNeo(false), textAlign: 'center', color: OLIVA, padding: 32, fontFamily: OSW, fontWeight: 700, textTransform: 'uppercase' }}>Todo cobrado. Sin pendientes.</td></tr>
            )}
            {cobros.rows.map((r, i) => {
              const alt = i % 2 === 1
              const c = r.vencida ? TERRA : NARANJA
              return (
                <tr key={r.id}>
                  <td style={{ ...tdEstado(alt, c), fontFamily: OSW, fontWeight: 700 }}>{r.numero_factura ?? '—'}</td>
                  <td style={tdNeo(alt)}>{r.cliente}</td>
                  <td style={tdNeo(alt)}>{r.transportista ?? '—'}</td>
                  <td style={tdNeo(alt)}>
                    <BadgeNeo color={(r.emisor ?? '').toUpperCase() === 'JUAN' ? AMBAR : MARINO}>{r.emisor ?? '—'}</BadgeNeo>
                  </td>
                  <td style={tdNeo(alt)}>{fmtDate(r.periodo ?? '')}</td>
                  <td style={{ ...tdNeo(alt), color: r.vencida ? TERRA : undefined, fontWeight: r.vencida ? 700 : 600 }}>
                    {r.fe ? fmtDate(r.fe) : '—'}
                  </td>
                  <td style={{ ...tdNeo(alt), textAlign: 'right', fontFamily: OSW, fontWeight: 700, fontSize: 15 }}>{fmtEur(r.total)}</td>
                  <td style={tdNeo(alt)}>
                    <BadgeNeo color={c}>{r.vencida ? 'VENCIDA' : 'PENDIENTE'}</BadgeNeo>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </TablaWrap>
      </Banda>

      {/* PAGOS POR MES */}
      <Banda bg={ARENA}>
        <h2 style={{ fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(20px,2.4vw,28px)', textTransform: 'uppercase', letterSpacing: '-0.5px', margin: '0 0 16px' }}>
          ¿Qué has pagado?
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
          {pagosPorMes.map(m => (
            <div key={m.label} style={{ ...card(BLANCO), padding: '16px 18px' }}>
              <div style={{ fontFamily: OSW, fontWeight: 600, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>
                Pagos · {m.label}
              </div>
              <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(22px,3vw,36px)', color: NARANJA, margin: '8px 0 12px' }}>{fmtEur(m.total)}</div>
              {m.top.map(([cat, imp]) => (
                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, padding: '4px 0', borderBottom: `1px solid ${ARENA_CL}` }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{cat}</span>
                  <span style={{ fontFamily: OSW, fontWeight: 700, whiteSpace: 'nowrap', color: INK }}>{fmtEur(imp)}</span>
                </div>
              ))}
            </div>
          ))}
          {!loading && pagosPorMes.length === 0 && (
            <div style={{ ...card(BLANCO), padding: '16px 18px', color: GRIS, fontSize: 13, fontWeight: 600 }}>
              Sin gastos conciliados en los últimos meses.
            </div>
          )}
        </div>
      </Banda>
    </PageNeo>
  )
}
