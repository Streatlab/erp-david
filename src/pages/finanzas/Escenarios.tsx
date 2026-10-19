import { useMemo, useState } from 'react'
import { fmtEur } from '@/lib/format'
import { INK, ARENA, BLANCO, GRIS, OLIVA, TERRA, NARANJA, CELESTE, MARINO, OSW, LEX, BORDER_CARD } from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda, AvisoNeo, KpiNeo, HeroNeo } from '@/components/neo/NeoUI'
import { useCostesReales } from '@/hooks/useCostesReales'
import { escenario } from '@/lib/equilibrio'
import type { Supuestos } from '@/lib/equilibrio'

/* Escenarios con costes reales (banco) e ingresos reales (facturas Cade).
   Palancas: ± un repartidor, ± entregas al día, subida de garantía/tarifa. */

function Palanca({ label, valor, set, min, max, paso, fmt }: {
  label: string; valor: number; set: (n: number) => void; min: number; max: number; paso: number; fmt: (n: number) => string
}) {
  return (
    <div style={{ background: BLANCO, border: BORDER_CARD, padding: 16 }}>
      <div style={{ fontFamily: OSW, fontWeight: 600, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 30, color: valor === 0 ? GRIS : valor > 0 ? OLIVA : TERRA }}>{fmt(valor)}</div>
      <input type="range" min={min} max={max} step={paso} value={valor} onChange={e => set(Number(e.target.value))} style={{ width: '100%', accentColor: MARINO }} />
    </div>
  )
}

export default function Escenarios() {
  const { datos, error, cargando } = useCostesReales()
  const [s, setS] = useState<Supuestos>({ repartidores: 0, entregasDia: 0, subidaPct: 0 })

  const res = useMemo(() => {
    if (!datos) return null
    const base = {
      ingresos: datos.ingresos, fijos: datos.costes.fijos + datos.sueldoDavid, variables: datos.costes.variables,
      personal: datos.costes.personal, codigos: datos.codigos, eurEntrega: datos.eurEntrega,
    }
    return { hoy: escenario(base, { repartidores: 0, entregasDia: 0, subidaPct: 0 }), nuevo: escenario(base, s) }
  }, [datos, s])

  const sinDatos = !cargando && (!datos || datos.ingresos === 0)
  const signo = (n: number, f: (x: number) => string) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${f(Math.abs(n))}`

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Finanzas" titulo="Escenarios" />
      <HeroNeo
        eyebrowTxt="Resultado mensual del escenario"
        cifra={res && !sinDatos ? fmtEur(res.nuevo.resultado) : '—'}
        frase={res && !sinDatos ? `${signo(res.nuevo.resultado - res.hoy.resultado, x => fmtEur(x))} al mes frente a la situación de hoy` : 'Sin datos todavía'}
        color={res && !sinDatos ? (res.nuevo.resultado >= 0 ? OLIVA : NARANJA) : undefined}
        apoyo={res && !sinDatos ? [{ label: 'Hoy', valor: fmtEur(res.hoy.resultado) }] : undefined}
      />
      {error && <AvisoNeo>ERROR: {error}</AvisoNeo>}
      {cargando && <Banda bg={ARENA}><div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 22, textTransform: 'uppercase', color: GRIS }}>Calculando…</div></Banda>}
      {sinDatos && <AvisoNeo>En construcción · sin datos de facturación para calcular escenarios.</AvisoNeo>}

      {res && datos && !sinDatos && (
        <>
          <Banda bg={ARENA}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <Palanca label="Repartidores" valor={s.repartidores} set={n => setS({ ...s, repartidores: n })} min={-1} max={1} paso={1} fmt={n => signo(n, String)} />
              <Palanca label="Entregas al día (todo el equipo)" valor={s.entregasDia} set={n => setS({ ...s, entregasDia: n })} min={-40} max={40} paso={5} fmt={n => signo(n, String)} />
              <Palanca label="Subida garantía / tarifa" valor={s.subidaPct} set={n => setS({ ...s, subidaPct: n })} min={0} max={15} paso={1} fmt={n => `${n} %`} />
            </div>
          </Banda>

          <Banda bg={BLANCO}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <KpiNeo label="Ingresos / mes" valor={fmtEur(res.nuevo.ingresos)} color={OLIVA} sub={`hoy ${fmtEur(res.hoy.ingresos)}`} />
              <KpiNeo label="Gastos / mes" valor={fmtEur(res.nuevo.gastos)} color={TERRA} sub={`hoy ${fmtEur(res.hoy.gastos)}`} />
              <KpiNeo label="Resultado / mes" valor={fmtEur(res.nuevo.resultado)} color={res.nuevo.resultado >= 0 ? OLIVA : TERRA}
                sub={`${signo(res.nuevo.resultado - res.hoy.resultado, x => fmtEur(x))} vs hoy`} />
            </div>
          </Banda>

          <Banda bg={ARENA}>
            <div style={{ fontFamily: LEX, fontSize: 13, fontWeight: 600, color: INK, lineHeight: 1.6 }}>
              Base real: ingresos = base facturada media ({datos.mesesIngreso.map(m => m.slice(0, 7)).join(', ')}, {datos.codigos} códigos);
              gastos = media del banco ({datos.costes.meses.join(', ')}): fijos {fmtEur(datos.costes.fijos)} + sueldo de David {fmtEur(datos.sueldoDavid)} + variables {fmtEur(datos.costes.variables)}.
              Un repartidor más suma lo que factura de media un código y cuesta lo que cuesta de media el personal ({fmtEur(datos.costes.personal)}/mes entre {Math.max(datos.codigos - 1, 0)} repartidores).
              Cada entrega vale {fmtEur(datos.eurEntrega, { decimals: 2 })} (liquidaciones Cade) y se cuentan 26 días al mes.
            </div>
            {datos.costes.sinCategorizar > 0 && (
              <div style={{ marginTop: 12, color: CELESTE, fontFamily: OSW, fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>
                {fmtEur(datos.costes.sinCategorizar)} al mes de gastos sin categorizar no entran aún.
              </div>
            )}
          </Banda>
        </>
      )}
    </PageNeo>
  )
}
