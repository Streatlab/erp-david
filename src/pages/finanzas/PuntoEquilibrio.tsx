import { useMemo } from 'react'
import { useCostesReales } from '@/hooks/useCostesReales'
import { puntoEquilibrio } from '@/lib/equilibrio'
import { fmtEur } from '@/lib/format'
import { MARINO, ARENA, ARENA_CL, BLANCO, GRIS, OLIVA, TERRA, NARANJA, CELESTE, AMBAR, OSW, LEX, SHADOW, BORDER_CARD, card } from '@/styles/neobrutal'
import { PageNeo, Banda, CabeceraNeo, KpiNeo, AvisoNeo, HeroNeo } from '@/components/neo/NeoUI'

const fmtNum = (n: number | null) => n === null ? '—' : Math.round(n).toLocaleString('es-ES')

/**
 * Punto de equilibrio con DATOS REALES:
 * - Costes fijos y variables: media de los 3 últimos meses cerrados del banco (conciliación) por categoría.
 * - Ingresos: base facturada media (facturas emitidas, 4 códigos Cade + otros clientes).
 * - € por entrega: total liquidado ÷ entregas de las liquidaciones de Cade.
 * PE (€/mes) = fijos ÷ (1 − variables/ingresos); entregas/mes = PE ÷ € por entrega.
 */
export default function PuntoEquilibrio() {
  const { datos, error: errMsg, cargando: loading } = useCostesReales()

  const calc = useMemo(() => {
    if (!datos) return null
    const { costes, ingresos, eurEntrega } = datos
    const fijosConSueldo = costes.fijos + datos.sueldoDavid /* el sueldo de David = lo que envía a la familia */
    const pe = puntoEquilibrio(fijosConSueldo, costes.variables, ingresos, eurEntrega)
    const gastoMes = fijosConSueldo + costes.variables
    const margenMes = ingresos - gastoMes
    return {
      ...pe, gastoMes, ingresoMes: ingresos, margenMes, eurEntrega,
      cobertura: gastoMes > 0 ? ingresos / gastoMes : null,
      porDia: pe.entregas !== null ? pe.entregas / 26 : null,
    }
  }, [datos])

  const sinDatos = !loading && (!calc || calc.ingresoMes === 0 || calc.euros === null)
  const cubierto = calc?.cobertura != null && calc.cobertura >= 1

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Finanzas" titulo="Punto de equilibrio">
        <div style={{ fontSize: 13, fontWeight: 600, color: ARENA, opacity: 0.85, maxWidth: 380 }}>
          ¿Cuántas entregas necesitas al mes para cubrir todos los gastos? Calculado con tus datos reales de banco y liquidaciones.
        </div>
      </CabeceraNeo>

      <HeroNeo
        eyebrowTxt="Tu número mágico · entregas al mes"
        cifra={!loading && !sinDatos && calc ? fmtNum(calc.entregas) : '—'}
        frase={!loading && !sinDatos && calc ? `Entregas al mes para cubrir todos los gastos · ≈ ${fmtNum(calc.porDia)} al día` : 'Sin datos todavía'}
        color={!loading && !sinDatos && calc ? (cubierto ? OLIVA : NARANJA) : undefined}
        apoyo={!loading && !sinDatos && calc ? [{ label: 'Base facturada/mes', valor: fmtEur(calc.euros) }] : undefined}
      />

      {errMsg && <AvisoNeo>ERROR: {errMsg}</AvisoNeo>}

      {loading && (
        <Banda bg={ARENA}><div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 22, textTransform: 'uppercase', color: GRIS }}>Calculando…</div></Banda>
      )}

      {sinDatos && !loading && (
        <Banda bg={AMBAR}>
          <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(22px,3vw,34px)', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
            Faltan datos para calcular
          </div>
          <div style={{ fontFamily: LEX, fontSize: 14, fontWeight: 600, marginTop: 8 }}>
            Necesito movimientos bancarios (Conciliación) y liquidaciones de Cade con entregas. En cuanto los cargues, esto se calcula solo.
          </div>
        </Banda>
      )}

      {!loading && !sinDatos && calc && datos && (<>
        {/* Las piezas del cálculo */}
        <Banda bg={ARENA_CL}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
            <KpiNeo label="Costes fijos / mes" valor={fmtEur(datos.costes.fijos + datos.sueldoDavid)} color={TERRA} sub={`préstamos, seguros, cuotas + sueldo de David ${fmtEur(datos.sueldoDavid)} (lo que envía a la familia)`} />
            <KpiNeo label="Costes variables / mes" valor={fmtEur(datos.costes.variables)} color={NARANJA} sub={`media ${datos.costes.meses.join(', ')}`} />
            <KpiNeo label="Cobras por entrega" valor={fmtEur(calc.eurEntrega, { decimals: 2 })} color={CELESTE} sub={`Real: ${fmtNum(datos.entregasLiquidadas)} entregas liquidadas`} />
            <KpiNeo label="Ingreso medio / mes" valor={fmtEur(calc.ingresoMes)} color={OLIVA} sub={`base facturada ${datos.mesesIngreso.map(m => m.slice(0, 7)).join(', ')}`} />
            <KpiNeo label="Margen medio / mes" valor={fmtEur(calc.margenMes)} color={calc.margenMes >= 0 ? OLIVA : TERRA} sub={calc.margenMes >= 0 ? 'Vas por encima del equilibrio' : 'Por debajo del equilibrio'} />
          </div>
        </Banda>

        {/* Veredicto */}
        <Banda bg={BLANCO}>
          <div style={{ ...card(cubierto ? OLIVA : TERRA), padding: '22px 26px', boxShadow: SHADOW, border: BORDER_CARD }}>
            <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(20px,2.6vw,30px)', textTransform: 'uppercase', letterSpacing: '-0.5px', color: ARENA }}>
              {cubierto
                ? `CUBRES GASTOS: ingresas ${((calc.cobertura! - 1) * 100).toFixed(0)}% por encima del equilibrio.`
                : `NO CUBRES GASTOS: te falta ${fmtEur(Math.abs(calc.margenMes))} al mes.`}
            </div>
            <div style={{ fontFamily: LEX, fontSize: 13, fontWeight: 600, color: ARENA, opacity: 0.9, marginTop: 8 }}>
              {cubierto
                ? 'Cada entrega por encima del número mágico es margen para ti.'
                : `Eso son ${fmtNum(Math.abs(calc.margenMes) / (calc.eurEntrega || 1))} entregas más al mes, o renegociar tarifas con Cade.`}
            </div>
          </div>
          {datos.costes.sinCategorizar > 0 && (
            <div style={{ marginTop: 16, background: AMBAR, border: BORDER_CARD, padding: '10px 14px', fontFamily: OSW, fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>
              Ojo: {fmtEur(datos.costes.sinCategorizar)} al mes de gastos del banco siguen sin categorizar y no entran en el cálculo. Categorízalos en Conciliación.
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            {datos.costes.porCategoria.map(c => (
              <div key={c.categoria} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, padding: '5px 0', borderBottom: `1px solid ${ARENA_CL}` }}>
                <span>{datos.nombres[c.categoria] ?? c.categoria} <span style={{ color: c.fija ? MARINO : GRIS, fontFamily: OSW, fontSize: 11, textTransform: 'uppercase' }}>· {c.fija ? 'fijo' : 'variable'}</span></span>
                <span style={{ fontFamily: OSW, fontWeight: 700 }}>{fmtEur(c.media)}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, fontSize: 12, fontWeight: 600, color: MARINO, fontFamily: LEX }}>
            Cálculo: costes fijos ÷ (1 − variables ÷ ingresos), y ese importe ÷ lo que cobras por entrega (liquidaciones Cade). Se recalcula solo con cada descarga del banco.
          </div>
        </Banda>
      </>)}
    </PageNeo>
  )
}
