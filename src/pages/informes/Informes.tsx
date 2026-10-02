import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmtEur, fmtDate } from '@/lib/format'
import { INK, GRIS, OLIVA, TERRA, NARANJA, CELESTE, MARINO, AMBAR, BLANCO, ARENA, OSW } from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda, TablaWrap, thNeo, tdNeo, tdEstado, KpiNeo, PillsNeo, AvisoNeo } from '@/components/neo/NeoUI'

/* Panel de informes sobre las vistas reales: v_pyg_resumen (mes), v_pyg_global_semana (semana),
   v_facturacion_total_david y v_efectivo. Las cifras se leen tal cual de las vistas. */

interface Fila { clave: string; etiqueta: string; ingresos: number; gastos: number; resultado: number; sinClasificar: number }

const n = (x: unknown) => Number(x ?? 0)
const mesLargo = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })

export default function Informes() {
  const [vista, setVista] = useState<'Semana' | 'Mes'>('Mes')
  const [mensual, setMensual] = useState<Fila[]>([])
  const [semanal, setSemanal] = useState<Fila[]>([])
  const [factura, setFactura] = useState<Record<string, { total: number; david: number; juan: number }>>({})
  const [efectivo, setEfectivo] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('v_pyg_resumen').select('*').order('mes', { ascending: false }).limit(12),
      supabase.from('v_pyg_global_semana').select('*').order('semana', { ascending: false }).limit(12),
      supabase.from('v_facturacion_total_david').select('*'),
      supabase.from('v_efectivo').select('mes, estado, euros'),
    ]).then(([m, s, f, e]) => {
      const err = m.error ?? s.error ?? f.error ?? e.error
      if (err) setError(err.message)
      setMensual(((m.data ?? []) as any[]).map(r => ({ clave: r.mes, etiqueta: mesLargo(r.mes), ingresos: n(r.ingresos_actividad), gastos: n(r.gastos_actividad), resultado: n(r.resultado_actividad), sinClasificar: n(r.sin_clasificar) })))
      setSemanal(((s.data ?? []) as any[]).map(r => ({ clave: r.semana, etiqueta: r.etiqueta ?? fmtDate(r.semana), ingresos: n(r.ingresos_actividad), gastos: n(r.gastos_actividad), resultado: n(r.resultado_actividad), sinClasificar: n(r.sin_clasificar) })))
      setFactura(Object.fromEntries(((f.data ?? []) as any[]).map(r => [r.mes, { total: n(r.total_negocio), david: n(r.emitido_por_david), juan: n(r.emitido_por_juan) }])))
      const ef: Record<string, number> = {}
      for (const r of (e.data ?? []) as any[]) if (r.estado === 'por justificar') ef[r.mes] = (ef[r.mes] ?? 0) + n(r.euros)
      setEfectivo(ef)
    })
  }, [])

  const filas = vista === 'Mes' ? mensual : semanal
  const ultima = filas[0]
  const totales = useMemo(() => filas.reduce((a, f) => ({ ingresos: a.ingresos + f.ingresos, gastos: a.gastos + f.gastos, resultado: a.resultado + f.resultado }), { ingresos: 0, gastos: 0, resultado: 0 }), [filas])

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Informes" titulo="Panel de informes">
        <PillsNeo value={vista} onChange={v => setVista(v as 'Semana' | 'Mes')} options={['Semana', 'Mes']} />
      </CabeceraNeo>
      {error && <AvisoNeo>ERROR: {error}</AvisoNeo>}

      {filas.length === 0 ? (
        <AvisoNeo>En construcción · sin datos</AvisoNeo>
      ) : (
        <>
          <Banda bg={BLANCO}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }}>
              <KpiNeo label={`Ingresos actividad · ${ultima.etiqueta}`} valor={fmtEur(ultima.ingresos)} color={OLIVA} sub="banco" />
              <KpiNeo label="Gastos actividad" valor={fmtEur(Math.abs(ultima.gastos))} color={NARANJA} />
              <KpiNeo label="Resultado actividad" valor={fmtEur(ultima.resultado)} color={ultima.resultado >= 0 ? OLIVA : TERRA} />
              <KpiNeo label="Sin clasificar" valor={fmtEur(Math.abs(ultima.sinClasificar))} color={AMBAR} sub="pendiente en Conciliación" />
            </div>
          </Banda>

          <Banda bg={ARENA}>
            <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', color: INK, marginBottom: 14 }}>
              P&G de la actividad por {vista === 'Mes' ? 'mes' : 'semana'} (banco)
            </div>
            <TablaWrap>
              <thead>
                <tr>
                  {[vista, 'Ingresos', 'Gastos', 'Resultado', 'Sin clasificar', ...(vista === 'Mes' ? ['Facturado (4 códigos)', 'Efectivo sin justificar'] : [])].map(h => (
                    <th key={h} style={h === vista ? thNeo : { ...thNeo, textAlign: 'right' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => {
                  const alt = i % 2 === 1
                  const fac = factura[f.clave]
                  return (
                    <tr key={f.clave}>
                      <td style={{ ...tdEstado(alt, f.resultado >= 0 ? OLIVA : TERRA), fontFamily: OSW, fontWeight: 700 }}>{f.etiqueta}</td>
                      <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{fmtEur(f.ingresos)}</td>
                      <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{fmtEur(Math.abs(f.gastos))}</td>
                      <td style={{ ...tdNeo(alt), textAlign: 'right', fontFamily: OSW, fontWeight: 700, color: f.resultado >= 0 ? OLIVA : TERRA }}>{fmtEur(f.resultado)}</td>
                      <td style={{ ...tdNeo(alt), textAlign: 'right', color: GRIS }}>{fmtEur(Math.abs(f.sinClasificar))}</td>
                      {vista === 'Mes' && <td style={{ ...tdNeo(alt), textAlign: 'right', color: MARINO }}>{fac ? fmtEur(fac.total) : '—'}</td>}
                      {vista === 'Mes' && <td style={{ ...tdNeo(alt), textAlign: 'right', color: CELESTE }}>{efectivo[f.clave] ? fmtEur(efectivo[f.clave]) : '—'}</td>}
                    </tr>
                  )
                })}
                <tr>
                  <td style={{ ...tdNeo(false), background: INK, color: ARENA, fontFamily: OSW, fontWeight: 700 }}>Total</td>
                  <td style={{ ...tdNeo(false), background: INK, color: ARENA, textAlign: 'right' }}>{fmtEur(totales.ingresos)}</td>
                  <td style={{ ...tdNeo(false), background: INK, color: ARENA, textAlign: 'right' }}>{fmtEur(Math.abs(totales.gastos))}</td>
                  <td style={{ ...tdNeo(false), background: INK, color: ARENA, textAlign: 'right', fontFamily: OSW, fontWeight: 700 }}>{fmtEur(totales.resultado)}</td>
                  <td colSpan={vista === 'Mes' ? 3 : 1} style={{ ...tdNeo(false), background: INK }} />
                </tr>
              </tbody>
            </TablaWrap>
            <div style={{ fontSize: 12, fontWeight: 600, color: GRIS, marginTop: 10, background: BLANCO, padding: 8 }}>
              Los ingresos de Cade cuentan en «actividad» cuando su movimiento del banco está categorizado; lo pendiente aparece en «Sin clasificar».
            </div>
          </Banda>
        </>
      )}
    </PageNeo>
  )
}
