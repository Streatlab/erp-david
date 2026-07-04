import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmtEur } from '@/lib/format'
import { INK, MARINO, ARENA, ARENA_CL, BLANCO, GRIS, OLIVA, TERRA, NARANJA, CELESTE, AMBAR, OSW, LEX, SHADOW, BORDER_CARD, card } from '@/styles/neobrutal'
import { PageNeo, Banda, CabeceraNeo, KpiNeo, AvisoNeo } from '@/components/neo/NeoUI'

interface MovRow { fecha: string; importe: number; tipo: string | null }
interface LiqRow { entregas: number | null; total: number | null }

const fmtNum = (n: number) => Math.round(n).toLocaleString('es-ES')

/**
 * Punto de equilibrio con DATOS REALES:
 * - Gasto medio mensual: media de los últimos 3 meses cerrados de movimientos tipo gasto.
 * - € por entrega: total liquidado / entregas de liquidaciones Cade.
 * - Entregas necesarias/mes = gasto medio mensual / € por entrega.
 */
export default function PuntoEquilibrio() {
  const [movs, setMovs] = useState<MovRow[]>([])
  const [liqs, setLiqs] = useState<LiqRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const desde = new Date()
      desde.setMonth(desde.getMonth() - 3)
      desde.setDate(1)
      const [m, l] = await Promise.all([
        supabase.from('movimientos_bancarios').select('fecha, importe, tipo').gte('fecha', desde.toISOString().slice(0, 10)),
        supabase.from('liquidaciones_cade').select('entregas, total'),
      ])
      if (m.error) setErrMsg(m.error.message)
      else setMovs((m.data ?? []).map(r => ({ fecha: r.fecha as string, importe: Number(r.importe), tipo: (r.tipo as string) ?? null })))
      if (l.error) setErrMsg(prev => prev ?? l.error!.message)
      else setLiqs((l.data ?? []) as LiqRow[])
      setLoading(false)
    })()
  }, [])

  const calc = useMemo(() => {
    /* Gasto por mes (solo meses con datos) */
    const porMes = new Map<string, number>()
    for (const m of movs) {
      if (m.importe >= 0) continue
      const key = m.fecha.slice(0, 7)
      porMes.set(key, (porMes.get(key) ?? 0) + Math.abs(m.importe))
    }
    const meses = [...porMes.values()]
    const gastoMes = meses.length ? meses.reduce((s, v) => s + v, 0) / meses.length : 0

    /* € por entrega real desde liquidaciones */
    const entregasTot = liqs.reduce((s, l) => s + (l.entregas ?? 0), 0)
    const importeTot = liqs.reduce((s, l) => s + (l.total ?? 0), 0)
    const eurEntrega = entregasTot > 0 ? importeTot / entregasTot : 0

    const entregasNecesarias = eurEntrega > 0 ? gastoMes / eurEntrega : 0
    const porDia = entregasNecesarias / 26 // ~26 días laborables/mes con sábados

    /* Ingreso medio mensual real para comparar */
    const ingPorMes = new Map<string, number>()
    for (const m of movs) {
      if (m.importe <= 0) continue
      const key = m.fecha.slice(0, 7)
      ingPorMes.set(key, (ingPorMes.get(key) ?? 0) + m.importe)
    }
    const ingMeses = [...ingPorMes.values()]
    const ingresoMes = ingMeses.length ? ingMeses.reduce((s, v) => s + v, 0) / ingMeses.length : 0
    const margenMes = ingresoMes - gastoMes
    const cobertura = gastoMes > 0 ? ingresoMes / gastoMes : null

    return { gastoMes, eurEntrega, entregasNecesarias, porDia, ingresoMes, margenMes, cobertura, mesesConDatos: meses.length, entregasTot }
  }, [movs, liqs])

  const sinDatos = !loading && (calc.mesesConDatos === 0 || calc.entregasTot === 0)
  const cubierto = calc.cobertura != null && calc.cobertura >= 1

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Finanzas" titulo="Punto de equilibrio">
        <div style={{ fontSize: 13, fontWeight: 600, color: ARENA, opacity: 0.85, maxWidth: 380 }}>
          ¿Cuántas entregas necesitas al mes para cubrir todos los gastos? Calculado con tus datos reales de banco y liquidaciones.
        </div>
      </CabeceraNeo>

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

      {!loading && !sinDatos && (<>
        {/* HERO: el número que importa */}
        <Banda bg={cubierto ? OLIVA : NARANJA}>
          <span style={{ display: 'inline-block', background: INK, color: ARENA, fontFamily: OSW, fontWeight: 600, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', padding: '4px 12px', border: `2px solid ${INK}` }}>
            Tu número mágico
          </span>
          <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(38px,6vw,80px)', lineHeight: 0.95, letterSpacing: '-0.5px', textTransform: 'uppercase', color: ARENA, marginTop: 14 }}>
            NECESITAS <span style={{ background: INK, color: cubierto ? OLIVA : NARANJA, padding: '0 12px' }}>{fmtNum(calc.entregasNecesarias)}</span> ENTREGAS/MES
          </div>
          <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(18px,2.4vw,28px)', color: ARENA, marginTop: 12, textTransform: 'uppercase' }}>
            ≈ {fmtNum(calc.porDia)} entregas al día para no perder dinero
          </div>
        </Banda>

        {/* Las piezas del cálculo */}
        <Banda bg={ARENA_CL}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
            <KpiNeo label="Gasto medio / mes" valor={fmtEur(calc.gastoMes)} color={TERRA} sub={`Media últimos ${calc.mesesConDatos} meses con datos`} />
            <KpiNeo label="Cobras por entrega" valor={fmtEur(calc.eurEntrega)} color={CELESTE} sub={`Real: ${fmtNum(calc.entregasTot)} entregas liquidadas`} />
            <KpiNeo label="Ingreso medio / mes" valor={fmtEur(calc.ingresoMes)} color={OLIVA} />
            <KpiNeo label="Margen medio / mes" valor={fmtEur(calc.margenMes)} color={calc.margenMes >= 0 ? OLIVA : TERRA} sub={calc.margenMes >= 0 ? 'Vas por encima del equilibrio' : 'Por debajo del equilibrio'} />
          </div>
        </Banda>

        {/* Veredicto */}
        <Banda bg={BLANCO}>
          <div style={{ ...card(cubierto ? OLIVA : TERRA), padding: '22px 26px', boxShadow: SHADOW, border: BORDER_CARD }}>
            <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(20px,2.6vw,30px)', textTransform: 'uppercase', letterSpacing: '-0.5px', color: ARENA }}>
              {cubierto
                ? `CUBRES GASTOS: ingresas ${((calc.cobertura! - 1) * 100).toFixed(0).replace('-', '−')}% por encima del equilibrio.`
                : `NO CUBRES GASTOS: te falta ${fmtEur(Math.abs(calc.margenMes))} al mes.`}
            </div>
            <div style={{ fontFamily: LEX, fontSize: 13, fontWeight: 600, color: ARENA, opacity: 0.9, marginTop: 8 }}>
              {cubierto
                ? 'Cada entrega por encima del número mágico es margen para ti.'
                : `Eso son ${fmtNum(Math.abs(calc.margenMes) / (calc.eurEntrega || 1))} entregas más al mes, o renegociar tarifas con Cade.`}
            </div>
          </div>
          <div style={{ marginTop: 16, fontSize: 12, fontWeight: 600, color: MARINO, fontFamily: LEX }}>
            Cálculo: gasto medio mensual (banco) ÷ lo que cobras por entrega (liquidaciones Cade). Se recalcula solo con cada importación.
          </div>
        </Banda>
      </>)}
    </PageNeo>
  )
}
