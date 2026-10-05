import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmtEur, fmtDate } from '@/lib/format'
import { INK, ARENA, ARENA_CL, BLANCO, GRIS, OLIVA, NARANJA, MARINO, AMBAR, OSW } from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda, TablaWrap, thNeo, tdNeo, tdEstado, KpiNeo, PillsNeo, AvisoNeo, BadgeNeo } from '@/components/neo/NeoUI'
import { agruparVentas } from '@/lib/ventas'
import type { FilaConsolidada } from '@/lib/ventas'

/* Ventas — facturación del negocio de David por código Cade y repartidor.
   Total del negocio = los 4 códigos, emita quien emita (David o Juan). */

interface FilaLiq { mes: string; transportista: string; repartidor: string; entregas: number | null; total: number | null }

const nombreMes = (iso: string) => {
  const s = new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function Ventas() {
  const [vista, setVista] = useState<'Semana' | 'Mes'>('Mes')
  const [filas, setFilas] = useState<FilaConsolidada[]>([])
  const [liq, setLiq] = useState<FilaLiq[]>([])
  const [mes, setMes] = useState<string>('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('v_facturacion_consolidada').select('mes, transportista, repartidor, emisor, facturas, base, iva, total'),
      supabase.from('v_liquidacion_repartidor').select('mes, transportista, repartidor, entregas, total'),
    ]).then(([f, l]) => {
      if (f.error) setError(f.error.message)
      const fs = ((f.data ?? []) as any[]).map(r => ({ ...r, base: Number(r.base), iva: Number(r.iva), total: Number(r.total), facturas: Number(r.facturas) })) as FilaConsolidada[]
      setFilas(fs)
      setLiq((l.data ?? []) as FilaLiq[])
      const meses = [...new Set(fs.map(r => r.mes))].sort().reverse()
      setMes(meses[0] ?? '')
      setCargando(false)
    })
  }, [])

  const meses = useMemo(() => [...new Set(filas.map(r => r.mes))].sort().reverse(), [filas])
  const resumen = useMemo(() => agruparVentas(filas.filter(r => r.mes === mes)), [filas, mes])
  const evolucion = useMemo(() => meses.map(m => ({ mes: m, ...agruparVentas(filas.filter(r => r.mes === m)) })), [filas, meses])
  const entregasMes = useMemo(() => {
    const ls = liq.filter(l => l.mes === mes)
    return ls.length ? ls.reduce((s, l) => s + Number(l.entregas ?? 0), 0) : null
  }, [liq, mes])
  const maxRep = Math.max(1, ...resumen.porRepartidor.map(r => r.total))

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Finanzas" titulo="Ventas">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <PillsNeo value={vista} onChange={v => setVista(v as 'Semana' | 'Mes')} options={['Semana', 'Mes']} />
          {vista === 'Mes' && meses.length > 0 && (
            <select value={mes} onChange={e => setMes(e.target.value)}
              style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', padding: '8px 10px', border: `3px solid ${INK}`, background: ARENA, color: INK }}>
              {meses.map(m => <option key={m} value={m}>{nombreMes(m)}</option>)}
            </select>
          )}
        </div>
      </CabeceraNeo>

      {error && <AvisoNeo>ERROR: {error}</AvisoNeo>}

      {vista === 'Semana' ? (
        <AvisoNeo>En construcción · sin datos semanales. Cade factura por mes; el detalle por semana llegará con el lector de liquidaciones.</AvisoNeo>
      ) : !cargando && filas.length === 0 ? (
        <AvisoNeo>En construcción · sin datos de facturación.</AvisoNeo>
      ) : (
        <>
          <Banda bg={BLANCO}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <KpiNeo label={`Total negocio · ${mes ? nombreMes(mes) : '—'}`} valor={fmtEur(resumen.total)} color={OLIVA} sub="los 4 códigos con IVA" />
              <KpiNeo label="Emitido por David" valor={fmtEur(resumen.david)} color={MARINO} />
              <KpiNeo label="Emitido por Juan" valor={fmtEur(resumen.juan)} color={AMBAR} sub="ingreso del negocio de David" />
              <KpiNeo label="Entregas" valor={entregasMes === null ? '—' : String(entregasMes)} color={NARANJA}
                sub={entregasMes ? `${fmtEur(resumen.base / entregasMes, { decimals: 2 })} por entrega (base)` : 'llegan con las liquidaciones'} />
            </div>
          </Banda>

          <Banda bg={ARENA_CL}>
            <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', color: INK, marginBottom: 18 }}>Por repartidor</div>
            <div style={{ display: 'grid', gap: 14 }}>
              {resumen.porRepartidor.map(r => (
                <div key={r.repartidor} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px,160px) 1fr minmax(120px,170px)', gap: 14, alignItems: 'center' }}>
                  <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 15, textTransform: 'uppercase' }}>{r.repartidor}</span>
                  <div style={{ background: ARENA, border: `3px solid ${INK}`, height: 24, position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, width: `${(r.total / maxRep) * 100}%`, background: r.repartidor === 'Otros clientes' ? GRIS : MARINO }} />
                  </div>
                  <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 18, textAlign: 'right' }}>{fmtEur(r.total)}</span>
                </div>
              ))}
            </div>
          </Banda>

          <Banda bg={BLANCO}>
            <TablaWrap>
              <thead>
                <tr>
                  {['Código', 'Repartidor', 'Emisor', 'Facturas', 'Base', 'IVA', 'Total'].map(h => (
                    <th key={h} style={['Facturas', 'Base', 'IVA', 'Total'].includes(h) ? { ...thNeo, textAlign: 'right' } : thNeo}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.filter(r => r.mes === mes).sort((a, b) => b.total - a.total).map((r, i) => {
                  const alt = i % 2 === 1
                  const juan = (r.emisor ?? '').toUpperCase() === 'JUAN'
                  return (
                    <tr key={`${r.transportista}-${r.emisor}-${i}`}>
                      <td style={{ ...tdEstado(alt, juan ? AMBAR : MARINO), fontFamily: OSW, fontWeight: 700 }}>{r.transportista ?? 'Otros'}</td>
                      <td style={tdNeo(alt)}>{r.repartidor ?? 'Otros clientes'}</td>
                      <td style={tdNeo(alt)}><BadgeNeo color={juan ? AMBAR : MARINO}>{r.emisor ?? '—'}</BadgeNeo></td>
                      <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{r.facturas}</td>
                      <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{fmtEur(r.base, { decimals: 2 })}</td>
                      <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{fmtEur(r.iva, { decimals: 2 })}</td>
                      <td style={{ ...tdNeo(alt), textAlign: 'right', fontFamily: OSW, fontWeight: 700 }}>{fmtEur(r.total, { decimals: 2 })}</td>
                    </tr>
                  )
                })}
              </tbody>
            </TablaWrap>
          </Banda>

          <Banda bg={ARENA}>
            <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', color: INK, marginBottom: 18 }}>Evolución mensual</div>
            <TablaWrap>
              <thead><tr>{['Mes', 'Total negocio', 'David', 'Juan', 'Cade (4 códigos)'].map(h => <th key={h} style={thNeo}>{h}</th>)}</tr></thead>
              <tbody>
                {evolucion.map((e, i) => (
                  <tr key={e.mes}>
                    <td style={{ ...tdNeo(i % 2 === 1), fontFamily: OSW, fontWeight: 700 }}>{fmtDate(e.mes).slice(3)}</td>
                    <td style={{ ...tdNeo(i % 2 === 1), fontFamily: OSW, fontWeight: 700 }}>{fmtEur(e.total)}</td>
                    <td style={tdNeo(i % 2 === 1)}>{fmtEur(e.david)}</td>
                    <td style={tdNeo(i % 2 === 1)}>{fmtEur(e.juan)}</td>
                    <td style={tdNeo(i % 2 === 1)}>{fmtEur(e.cade)}</td>
                  </tr>
                ))}
              </tbody>
            </TablaWrap>
          </Banda>
        </>
      )}
    </PageNeo>
  )
}
