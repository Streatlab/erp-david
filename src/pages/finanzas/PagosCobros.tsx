import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmtEur, fmtDate } from '@/lib/format'
import { CELESTE, OLIVA, TERRA, NARANJA, MARINO, AMBAR, GRIS, ARENA_CL, BLANCO, INK, OSW, ARENA } from '@/styles/neobrutal'
import { card } from '@/styles/neobrutal'
import {
  PageNeo, Banda, CabeceraNeo, HeroNeo, KpiNeo, AvisoNeo,
  TablaWrap, thNeo, tdNeo, tdEstado, BadgeNeo,
} from '@/components/neo/NeoUI'
import { diasDesde } from '@/lib/cobros'

interface Factura {
  id: string
  cliente: string
  transportista: string | null
  numero_factura: number | null
  fecha_factura: string | null
  total: number | null
  emisor: string | null
  estado: string
  fecha_cobro: string | null
  cobro_auto: boolean
}

interface Pago { fecha: string; categoria: string | null; importe: number }
interface TotalMes { mes: string; total_negocio: number; emitido_por_david: number | null; emitido_por_juan: number | null }

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const h2 = { fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(20px,2.4vw,28px)', textTransform: 'uppercase' as const, letterSpacing: '-0.5px', margin: '0 0 16px' }

export default function PagosCobros() {
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [pagos, setPagos] = useState<Pago[]>([])
  const [totales, setTotales] = useState<TotalMes[]>([])
  const [nombres, setNombres] = useState<Record<string, string>>({})
  const [casadasHoy, setCasadasHoy] = useState(0)
  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      // Primero se casan cobros nuevos con el banco (±1 €, 15 días)
      const cas = await supabase.rpc('casar_cobros')
      if (!cas.error) setCasadasHoy(Number(cas.data ?? 0))

      const hace3m = new Date()
      hace3m.setMonth(hace3m.getMonth() - 2)
      hace3m.setDate(1)
      const desde = hace3m.toISOString().slice(0, 10)

      const [fac, pag, tot, cats] = await Promise.all([
        supabase.from('facturas_emitidas')
          .select('id, cliente, transportista, numero_factura, fecha_factura, total, emisor, estado, fecha_cobro, cobro_auto')
          .order('fecha_factura', { ascending: true }),
        supabase.from('conciliacion').select('fecha, categoria, importe').lt('importe', 0).gte('fecha', desde),
        supabase.from('v_facturacion_total_david').select('mes, total_negocio, emitido_por_david, emitido_por_juan'),
        supabase.from('categorias_contables_gastos').select('codigo, nombre, ambito'),
      ])
      const err = fac.error ?? pag.error ?? tot.error ?? cats.error
      if (err) setErrMsg(err.message)
      setFacturas((fac.data ?? []) as Factura[])
      const internas = new Set((cats.data ?? []).filter((c: any) => c.ambito === 'interno').map((c: any) => c.codigo))
      setPagos(((pag.data ?? []) as Pago[]).filter(p => !internas.has(p.categoria ?? '')))
      setTotales(((tot.data ?? []) as any[]).map(t => ({ ...t, total_negocio: Number(t.total_negocio) })))
      setNombres(Object.fromEntries((cats.data ?? []).map((c: any) => [c.codigo, c.nombre])))
      setLoading(false)
    })()
  }, [])

  const cobros = useMemo(() => {
    const pend = facturas.filter(f => f.estado === 'PENDIENTE').map(f => ({ ...f, dias: diasDesde(f.fecha_factura) }))
    const suma = (rs: typeof pend) => rs.reduce((s, r) => s + Number(r.total ?? 0), 0)
    const autos = facturas.filter(f => f.cobro_auto)
    return {
      pend,
      total: suma(pend),
      david: suma(pend.filter(r => (r.emisor ?? '').toUpperCase() === 'DAVID')),
      juan: suma(pend.filter(r => (r.emisor ?? '').toUpperCase() === 'JUAN')),
      mas60: suma(pend.filter(r => (r.dias ?? 0) > 60)),
      autos,
    }
  }, [facturas])

  /* Cuadre mensual: facturas emitidas vs vista v_facturacion_total_david */
  const cuadre = useMemo(() => totales.map(t => {
    const mes = t.mes.slice(0, 7)
    const delMes = facturas.filter(f => (f.fecha_factura ?? '').slice(0, 7) === mes)
    const suma = delMes.reduce((s, f) => s + Number(f.total ?? 0), 0)
    const pendiente = delMes.filter(f => f.estado === 'PENDIENTE').reduce((s, f) => s + Number(f.total ?? 0), 0)
    return { ...t, suma, pendiente, cuadra: Math.abs(suma - t.total_negocio) < 0.01 }
  }), [totales, facturas])

  const pagosPorMes = useMemo(() => {
    const map = new Map<string, { label: string; total: number; cats: Map<string, number> }>()
    for (const g of pagos) {
      const d = new Date(g.fecha + 'T00:00:00')
      const key = g.fecha.slice(0, 7)
      if (!map.has(key)) map.set(key, { label: `${MESES[d.getMonth()]} ${d.getFullYear()}`, total: 0, cats: new Map() })
      const m = map.get(key)!
      const imp = Math.abs(Number(g.importe))
      m.total += imp
      const cat = g.categoria ? (nombres[g.categoria] ?? g.categoria) : 'Sin categoría'
      m.cats.set(cat, (m.cats.get(cat) ?? 0) + imp)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([, v]) => ({
      ...v,
      top: [...v.cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    }))
  }, [pagos, nombres])

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Finanzas" titulo="Pagos y Cobros" />

      <HeroNeo
        eyebrowTxt="Pendiente de cobro"
        cifra={loading || facturas.length === 0 ? '—' : fmtEur(cobros.total)}
        frase={loading || facturas.length === 0 ? 'Sin datos todavía'
          : cobros.mas60 > 0 ? `${fmtEur(cobros.mas60)} con más de 60 días sin cobrar. Revisa con Cade.`
          : cobros.total > 0 ? 'Nada atrasado más de 60 días. Sigue el calendario de pago.' : 'Todo cobrado. Sin pendientes.'}
        color={loading || facturas.length === 0 ? undefined : cobros.mas60 > 0 ? NARANJA : cobros.total > 0 ? undefined : OLIVA}
        apoyo={facturas.length === 0 ? undefined : [
          { label: 'Facturas', valor: String(cobros.pend.length) },
          { label: '+60 días', valor: fmtEur(cobros.mas60) },
        ]}
      />

      {errMsg && <AvisoNeo>ERROR: {errMsg}</AvisoNeo>}
      {cobros.mas60 > 0 && <AvisoNeo>{fmtEur(cobros.mas60)} EN FACTURAS CON MÁS DE 60 DÍAS SIN COBRAR. Revisar con Cade.</AvisoNeo>}

      <Banda bg={ARENA_CL}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18 }}>
          <KpiNeo label="Pendiente de cobro" valor={fmtEur(cobros.total)} color={CELESTE} sub={`${cobros.pend.length} facturas`} />
          <KpiNeo label="Emitido por David" valor={fmtEur(cobros.david)} color={MARINO} sub="pendiente" />
          <KpiNeo label="Emitido por Juan" valor={fmtEur(cobros.juan)} color={AMBAR} sub="pendiente · entra por su cuenta" />
          <KpiNeo label="Cobros casados con banco" valor={String(cobros.autos.length)} color={OLIVA}
            sub={casadasHoy ? `${casadasHoy} nuevos hoy` : 'mismo total ±1 € en 15 días'} />
        </div>
      </Banda>

      <Banda bg={BLANCO}>
        <h2 style={h2}>¿Qué falta por cobrar?</h2>
        <TablaWrap>
          <thead>
            <tr>
              {['Nº', 'Cliente', 'Código', 'Emisor', 'Fecha factura', 'Días sin cobrar', 'Total'].map(h => (
                <th key={h} style={h === 'Total' || h === 'Días sin cobrar' ? { ...thNeo, textAlign: 'right' } : thNeo}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} style={{ ...tdNeo(false), textAlign: 'center', color: GRIS, padding: 32 }}>Cargando…</td></tr>}
            {!loading && cobros.pend.length === 0 && (
              <tr><td colSpan={7} style={{ ...tdNeo(false), textAlign: 'center', color: OLIVA, padding: 32, fontFamily: OSW, fontWeight: 700, textTransform: 'uppercase' }}>Todo cobrado. Sin pendientes.</td></tr>
            )}
            {[...cobros.pend].sort((a, b) => (b.dias ?? 0) - (a.dias ?? 0)).map((r, i) => {
              const alt = i % 2 === 1
              const c = (r.dias ?? 0) > 60 ? TERRA : (r.dias ?? 0) > 30 ? AMBAR : NARANJA
              return (
                <tr key={r.id}>
                  <td style={{ ...tdEstado(alt, c), fontFamily: OSW, fontWeight: 700 }}>{r.numero_factura ?? '—'}</td>
                  <td style={tdNeo(alt)}>{r.cliente}</td>
                  <td style={tdNeo(alt)}>{r.transportista ?? '—'}</td>
                  <td style={tdNeo(alt)}><BadgeNeo color={(r.emisor ?? '').toUpperCase() === 'JUAN' ? AMBAR : MARINO}>{r.emisor ?? '—'}</BadgeNeo></td>
                  <td style={tdNeo(alt)}>{r.fecha_factura ? fmtDate(r.fecha_factura) : '—'}</td>
                  <td style={{ ...tdNeo(alt), textAlign: 'right', fontFamily: OSW, fontWeight: 700, color: c }}>{r.dias ?? '—'}</td>
                  <td style={{ ...tdNeo(alt), textAlign: 'right', fontFamily: OSW, fontWeight: 700, fontSize: 15 }}>{fmtEur(r.total, { decimals: 2 })}</td>
                </tr>
              )
            })}
          </tbody>
        </TablaWrap>
      </Banda>

      {cobros.autos.length > 0 && (
        <Banda bg={ARENA}>
          <h2 style={h2}>Cobros casados con el banco</h2>
          <TablaWrap>
            <thead><tr>{['Nº', 'Cliente', 'Emisor', 'Factura', 'Cobrada', 'Total'].map(h => <th key={h} style={thNeo}>{h}</th>)}</tr></thead>
            <tbody>
              {cobros.autos.map((r, i) => (
                <tr key={r.id}>
                  <td style={{ ...tdEstado(i % 2 === 1, OLIVA), fontFamily: OSW, fontWeight: 700 }}>{r.numero_factura ?? '—'}</td>
                  <td style={tdNeo(i % 2 === 1)}>{r.cliente}</td>
                  <td style={tdNeo(i % 2 === 1)}>{r.emisor ?? '—'}</td>
                  <td style={tdNeo(i % 2 === 1)}>{r.fecha_factura ? fmtDate(r.fecha_factura) : '—'}</td>
                  <td style={tdNeo(i % 2 === 1)}>{r.fecha_cobro ? fmtDate(r.fecha_cobro) : '—'}</td>
                  <td style={{ ...tdNeo(i % 2 === 1), fontFamily: OSW, fontWeight: 700 }}>{fmtEur(r.total, { decimals: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </TablaWrap>
        </Banda>
      )}

      <Banda bg={BLANCO}>
        <h2 style={h2}>Facturación total del negocio (4 códigos)</h2>
        <TablaWrap>
          <thead>
            <tr>{['Mes', 'Total negocio', 'Emitido David', 'Emitido Juan', 'Pendiente', 'Cuadre'].map(h => <th key={h} style={thNeo}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {cuadre.map((t, i) => (
              <tr key={t.mes}>
                <td style={{ ...tdEstado(i % 2 === 1, t.cuadra ? OLIVA : TERRA), fontFamily: OSW, fontWeight: 700 }}>{fmtDate(t.mes).slice(3)}</td>
                <td style={{ ...tdNeo(i % 2 === 1), fontFamily: OSW, fontWeight: 700 }}>{fmtEur(t.total_negocio)}</td>
                <td style={tdNeo(i % 2 === 1)}>{fmtEur(t.emitido_por_david ?? 0)}</td>
                <td style={tdNeo(i % 2 === 1)}>{fmtEur(t.emitido_por_juan ?? 0)}</td>
                <td style={{ ...tdNeo(i % 2 === 1), color: t.pendiente > 0 ? NARANJA : OLIVA }}>{fmtEur(t.pendiente)}</td>
                <td style={tdNeo(i % 2 === 1)}><BadgeNeo color={t.cuadra ? OLIVA : TERRA}>{t.cuadra ? 'cuadra' : `dif. ${fmtEur(t.suma - t.total_negocio)}`}</BadgeNeo></td>
              </tr>
            ))}
          </tbody>
        </TablaWrap>
      </Banda>

      <Banda bg={ARENA}>
        <h2 style={h2}>¿Qué has pagado? (banco)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
          {pagosPorMes.map(m => (
            <div key={m.label} style={{ ...card(BLANCO), padding: '16px 18px' }}>
              <div style={{ fontFamily: OSW, fontWeight: 600, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>Pagos · {m.label}</div>
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
            <div style={{ ...card(BLANCO), padding: '16px 18px', color: GRIS, fontSize: 13, fontWeight: 600, background: ARENA }}>
              Sin pagos en el banco en los últimos meses.
            </div>
          )}
        </div>
      </Banda>
    </PageNeo>
  )
}
