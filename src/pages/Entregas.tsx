import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'
import { usePeriodo } from '@/lib/periodoGlobal'
import { isoLocal } from '@/lib/periodo'
import { fmtEur, fmtPct } from '@/lib/format'
import {
  resumenRepartidores, resumenRutas, costeActividad, precioMinimoEntrega, ingresoDia, deltaPct,
  type DiaRep, type EntregaRow, type PygFila, type RepResumen, type RutaResumen,
} from '@/lib/margenRutas'
import { INK, ARENA, ARENA_CL, BLANCO, GRIS, OLIVA, TERRA, NARANJA, CELESTE, AMBAR, OSW, LEX, BORDER_CARD } from '@/styles/neobrutal'
import { PageNeo, Banda, CabeceraNeo, HeroNeo, TabsNeo, usePestana, TablaWrap, thNeo, tdNeo, tdEstado, BadgeNeo, KpiNeo } from '@/components/neo/NeoUI'

/* Rutas y margen: qué deja cada repartidor, cada ruta y cada furgoneta con los datos reales de las
   liquidaciones de Cade, y a qué precio por entrega deja de compensar. Todo sale de la base; lo que es
   estimación (el reparto del coste por días) se dice en pantalla. */

interface Furgo { id: string; codigo: string | null; matricula: string | null; conductor: string | null; activa: boolean | null }
interface GastoFurgo { furgoneta_id: string; codigo: string | null; conductor: string | null; mes: string; gasto_total: number; tipo: string | null }
interface Emisor { transportista: string; repartidor: string | null; garantia_dia: number | null; vigente_desde: string | null; vigente_hasta: string | null }

const PESTANAS = ['repartidores', 'rutas', 'furgonetas', 'precio'] as const
const eur2 = (n: number | null | undefined) => fmtEur(n, { decimals: 2 })
const n1 = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 })
const mesIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`

/* Supabase devuelve 1.000 filas por consulta: se pide por páginas */
async function todas<T>(pagina: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null }>): Promise<T[]> {
  const out: T[] = []
  for (let i = 0; ; i += 1000) {
    const { data } = await pagina(i, i + 999)
    const d = data ?? []
    out.push(...d)
    if (d.length < 1000) break
  }
  return out
}

const campo: CSSProperties = { fontFamily: LEX, fontSize: 14, fontWeight: 600, color: INK, background: BLANCO, border: `2px solid ${INK}`, padding: '6px 8px', width: 110 }

export default function Entregas() {
  const per = usePeriodo()
  const [pestana, setPestana] = usePestana('rutas-margen', PESTANAS, 'repartidores')
  const [dias, setDias] = useState<DiaRep[]>([])
  const [diasAnt, setDiasAnt] = useState<DiaRep[]>([])
  const [entregas, setEntregas] = useState<EntregaRow[]>([])
  const [entregasAnt, setEntregasAnt] = useState<EntregaRow[]>([])
  const [pyg, setPyg] = useState<PygFila[]>([])
  const [furgos, setFurgos] = useState<Furgo[]>([])
  const [gastosFurgo, setGastosFurgo] = useState<GastoFurgo[]>([])
  const [emisores, setEmisores] = useState<Emisor[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const antDesde = isoLocal(per.anterior.inicio), antHasta = isoLocal(per.anterior.fin)

  useEffect(() => {
    let vivo = true
    setCargando(true)
    const mesIni = mesIso(per.anterior.inicio)
    Promise.all([
      supabase.from('v_dia_repartidor').select('fecha, transportista, repartidor, entregas, por_pedidos, compensacion_minimo, recorte_tope, cargo_cade, pagado').gte('fecha', per.desdeIso).lte('fecha', per.hastaIso),
      supabase.from('v_dia_repartidor').select('fecha, transportista, repartidor, entregas, por_pedidos, compensacion_minimo, recorte_tope, cargo_cade, pagado').gte('fecha', antDesde).lte('fecha', antHasta),
      todas<EntregaRow>((a, b) => supabase.from('liquidaciones_cade_entregas').select('fecha, transportista, cliente, destino, kilos, importe_base, importe').gte('fecha', per.desdeIso).lte('fecha', per.hastaIso).order('fecha').range(a, b)),
      todas<EntregaRow>((a, b) => supabase.from('liquidaciones_cade_entregas').select('fecha, transportista, cliente, destino, kilos, importe_base, importe').gte('fecha', antDesde).lte('fecha', antHasta).order('fecha').range(a, b)),
      supabase.from('v_pyg_mensual').select('mes, ambito, signo, importe, grupo, categoria').gte('mes', mesIni),
      supabase.from('furgonetas').select('id, codigo, matricula, conductor, activa'),
      supabase.from('v_gastos_por_furgoneta').select('furgoneta_id, codigo, conductor, mes, gasto_total, tipo').gte('mes', mesIni),
      supabase.from('emisores_transportistas').select('transportista, repartidor, garantia_dia, vigente_desde, vigente_hasta'),
    ]).then(([d, da, e, ea, p, f, gf, em]) => {
      if (!vivo) return
      const err = [d, da, p, f, gf, em].find(x => x.error)?.error
      if (err) setError(err.message)
      setDias((d.data ?? []) as DiaRep[]); setDiasAnt((da.data ?? []) as DiaRep[])
      setEntregas(e); setEntregasAnt(ea)
      setPyg((p.data ?? []) as PygFila[]); setFurgos((f.data ?? []) as Furgo[])
      setGastosFurgo((gf.data ?? []) as GastoFurgo[]); setEmisores((em.data ?? []) as Emisor[])
      setCargando(false)
    })
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [per.desdeIso, per.hastaIso])

  const reps = useMemo(() => resumenRepartidores(dias), [dias])
  const repsAnt = useMemo(() => resumenRepartidores(diasAnt), [diasAnt])
  const rutas = useMemo(() => resumenRutas(entregas), [entregas])
  const rutasAnt = useMemo(() => resumenRutas(entregasAnt), [entregasAnt])
  const coste = useMemo(() => costeActividad(pyg, per.desdeIso, per.hastaIso), [pyg, per.desdeIso, per.hastaIso])

  const ingreso = reps.reduce((s, r) => s + r.pagado, 0)
  const diasRep = reps.reduce((s, r) => s + r.dias, 0)
  const entregasTot = reps.reduce((s, r) => s + r.entregas, 0)
  const recorteTope = reps.reduce((s, r) => s + r.recorteTope, 0)
  const cargosTot = reps.reduce((s, r) => s + r.cargos, 0)
  const margen = ingreso - coste.total
  const costeDiaRep = diasRep ? coste.total / diasRep : 0
  const garantiaDe = (t: string, fecha: string) => emisores.filter(e => e.transportista === t && (!e.vigente_desde || e.vigente_desde <= fecha) && (!e.vigente_hasta || e.vigente_hasta >= fecha))[0]?.garantia_dia ?? null
  const precioMedio = entregas.length ? entregas.reduce((s, e) => s + Number(e.importe_base ?? 0), 0) / entregas.length : 5.5

  const sinDatos = !cargando && reps.length === 0

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Dinero" titulo="Rutas y margen">
        <div style={{ fontSize: 13, fontWeight: 600, color: ARENA, opacity: 0.85, maxWidth: 440 }}>
          Lo que paga Cade por repartidor y por ruta, lo que cuesta moverlo y a qué precio por entrega deja de compensar. Datos reales de las liquidaciones.
        </div>
      </CabeceraNeo>

      <HeroNeo
        eyebrowTxt={`Margen de la actividad · ${per.etiqueta}`}
        cifra={cargando || sinDatos ? '—' : eur2(margen)}
        color={margen >= 0 ? OLIVA : TERRA}
        frase={cargando ? 'Cargando…' : sinDatos ? 'Aún no hay liquidaciones de Cade en este periodo.'
          : `Cade ha pagado ${eur2(ingreso)} por ${entregasTot.toLocaleString('es-ES')} entregas en ${diasRep} días de repartidor. Los gastos de la actividad del periodo suman ${eur2(coste.total)} (banco, prorrateado por días).`}
        apoyo={sinDatos ? undefined : [
          { label: '€ por entrega', valor: entregasTot ? eur2(ingreso / entregasTot) : '—' },
          { label: 'Coste por día de repartidor', valor: eur2(costeDiaRep) },
          { label: 'Perdido por el tope diario', valor: eur2(recorteTope) },
          { label: 'Cargos de Cade', valor: eur2(cargosTot) },
        ]}
      />

      <TabsNeo value={pestana} onChange={setPestana} tabs={[
        { id: 'repartidores', label: 'Repartidores' }, { id: 'rutas', label: 'Rutas' },
        { id: 'furgonetas', label: 'Furgonetas' }, { id: 'precio', label: 'Precio mínimo' },
      ]} />

      {error && <Banda bg={TERRA}><div style={{ color: ARENA, fontWeight: 700 }}>No se pudo cargar: {error}</div></Banda>}

      {pestana === 'repartidores' && (
        <Banda bg={BLANCO}>
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: GRIS, maxWidth: 760 }}>
            Margen estimado por repartidor: lo que le paga Cade menos su parte del coste de la actividad, repartido por días trabajados ({eur2(costeDiaRep)} por día). Cuando se registren nóminas y furgoneta por persona, el reparto será exacto.
          </p>
          <TablaWrap>
            <thead><tr>{['Repartidor', 'Código', 'Días', 'Entregas', 'Entregas/día', 'vs anterior', 'Pagado por Cade', '€/entrega', 'Garantía', 'Perdido por tope', 'Cargos', 'Coste estimado', 'Margen'].map(h => <th key={h} style={thNeo}>{h}</th>)}</tr></thead>
            <tbody>
              {cargando && <tr><td colSpan={13} style={{ ...tdNeo(false), textAlign: 'center', color: GRIS, padding: 28 }}>Cargando…</td></tr>}
              {sinDatos && <tr><td colSpan={13} style={{ ...tdNeo(false), textAlign: 'center', color: GRIS, padding: 28 }}>Sin liquidaciones en este periodo.</td></tr>}
              {reps.map((r, i) => <FilaRep key={r.transportista} r={r} ant={repsAnt.find(x => x.transportista === r.transportista)} alt={i % 2 === 1} costeDia={costeDiaRep} />)}
            </tbody>
          </TablaWrap>
          {recorteTope > 0 && (
            <div style={{ marginTop: 14, background: ARENA_CL, border: BORDER_CARD, padding: '10px 14px', fontSize: 13, fontWeight: 600 }}>
              El tope diario de Cade se ha quedado {eur2(recorteTope)} en este periodo: días en los que se entregó más de lo que cubre la garantía y Cade pagó solo la garantía. Es el primer argumento para negociar.
            </div>
          )}
        </Banda>
      )}

      {pestana === 'rutas' && (
        <Banda bg={BLANCO}>
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: GRIS, maxWidth: 760 }}>
            Cada ruta es un destino de Cade (supermercado o punto). El precio por entrega lo fija Cade por destino; aquí se ve dónde está el volumen y qué ruta cae o sube frente al periodo anterior.
          </p>
          <TablaWrap>
            <thead><tr>{['Ruta', 'Entregas', '% del total', 'vs anterior', 'Días con entregas', 'Entregas/día', 'Kilos', 'Precio Cade', 'Importe base', 'Códigos'].map(h => <th key={h} style={thNeo}>{h}</th>)}</tr></thead>
            <tbody>
              {cargando && <tr><td colSpan={10} style={{ ...tdNeo(false), textAlign: 'center', color: GRIS, padding: 28 }}>Cargando…</td></tr>}
              {!cargando && rutas.length === 0 && <tr><td colSpan={10} style={{ ...tdNeo(false), textAlign: 'center', color: GRIS, padding: 28 }}>Sin entregas en este periodo.</td></tr>}
              {rutas.map((r, i) => <FilaRuta key={r.ruta} r={r} ant={rutasAnt.find(x => x.ruta === r.ruta)} total={entregas.length} alt={i % 2 === 1} />)}
            </tbody>
          </TablaWrap>
        </Banda>
      )}

      {pestana === 'furgonetas' && (
        <Banda bg={BLANCO}>
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: GRIS, maxWidth: 760 }}>
            Gasto registrado en el banco por furgoneta (recargas, mantenimiento, leasing y prorrateos) en los meses del periodo, y las entregas de su conductor.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
            {furgos.filter(f => f.activa !== false).map(f => {
              const meses = [...new Set(pyg.map(p => String(p.mes).slice(0, 7)))].filter(m => m >= per.desdeIso.slice(0, 7) && m <= per.hastaIso.slice(0, 7))
              const gasto = gastosFurgo.filter(g => g.furgoneta_id === f.id && meses.includes(String(g.mes).slice(0, 7))).reduce((s, g) => s + Number(g.gasto_total ?? 0), 0)
              const rep = reps.filter(r => r.repartidor === f.conductor)
              const entregasF = rep.reduce((s, r) => s + r.entregas, 0)
              const pagadoF = rep.reduce((s, r) => s + r.pagado, 0)
              return (
                <div key={f.id} style={{ background: ARENA_CL, border: BORDER_CARD, padding: '12px 14px' }}>
                  <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 18 }}>{f.matricula ?? f.codigo} <span style={{ color: GRIS, fontSize: 13 }}>· {f.conductor ?? 'sin conductor'}</span></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8, fontSize: 13, fontWeight: 600 }}>
                    <span style={{ color: GRIS }}>Gasto furgoneta</span><span style={{ textAlign: 'right', color: NARANJA, fontFamily: OSW, fontWeight: 700 }}>{gasto ? eur2(gasto) : 'sin dato'}</span>
                    <span style={{ color: GRIS }}>Entregas del conductor</span><span style={{ textAlign: 'right', fontFamily: OSW, fontWeight: 700 }}>{entregasF ? entregasF.toLocaleString('es-ES') : '—'}</span>
                    <span style={{ color: GRIS }}>Pagado por Cade</span><span style={{ textAlign: 'right', fontFamily: OSW, fontWeight: 700, color: OLIVA }}>{pagadoF ? eur2(pagadoF) : '—'}</span>
                    <span style={{ color: GRIS }}>Gasto por entrega</span><span style={{ textAlign: 'right', fontFamily: OSW, fontWeight: 700 }}>{gasto && entregasF ? eur2(gasto / entregasF) : '—'}</span>
                  </div>
                </div>
              )
            })}
            {furgos.length === 0 && !cargando && <div style={{ color: GRIS, fontWeight: 600 }}>Sin furgonetas dadas de alta.</div>}
          </div>
        </Banda>
      )}

      {pestana === 'precio' && (
        <Simulador key={`${precioMedio.toFixed(2)}-${costeDiaRep.toFixed(2)}`} reps={reps} costeDia={costeDiaRep} precioMedio={precioMedio} garantiaDe={t => garantiaDe(t, per.hastaIso)} coste={coste} />
      )}
    </PageNeo>
  )
}

function Delta({ v }: { v: number | null }) {
  if (v == null) return <span style={{ color: GRIS }}>—</span>
  const c = v > 0 ? OLIVA : v < 0 ? TERRA : GRIS
  return <span style={{ color: c, fontFamily: OSW, fontWeight: 700 }}>{v > 0 ? '+' : ''}{fmtPct(v)}</span>
}

function FilaRep({ r, ant, alt, costeDia }: { r: RepResumen; ant?: RepResumen; alt: boolean; costeDia: number }) {
  const costeEst = r.dias * costeDia
  const margen = r.pagado - costeEst
  return (
    <tr>
      <td style={{ ...tdEstado(alt, margen >= 0 ? OLIVA : TERRA), fontFamily: OSW, fontWeight: 700 }}>{r.repartidor}</td>
      <td style={tdNeo(alt)}>{r.transportista}</td>
      <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{r.dias}</td>
      <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{r.entregas.toLocaleString('es-ES')}</td>
      <td style={{ ...tdNeo(alt), textAlign: 'right', fontFamily: OSW, fontWeight: 700 }}>{n1(r.entregasDia)}</td>
      <td style={{ ...tdNeo(alt), textAlign: 'right' }}><Delta v={ant ? deltaPct(r.entregasDia, ant.entregasDia) : null} /></td>
      <td style={{ ...tdNeo(alt), textAlign: 'right', fontFamily: OSW, fontWeight: 700, color: OLIVA }}>{eur2(r.pagado)}</td>
      <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{r.eurPorEntrega != null ? eur2(r.eurPorEntrega) : '—'}</td>
      <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{fmtPct(r.pctGarantia * 100)}</td>
      <td style={{ ...tdNeo(alt), textAlign: 'right', color: r.recorteTope ? NARANJA : GRIS }}>{r.recorteTope ? eur2(r.recorteTope) : '—'}</td>
      <td style={{ ...tdNeo(alt), textAlign: 'right', color: r.cargos ? TERRA : GRIS }}>{r.cargos ? eur2(r.cargos) : '—'}</td>
      <td style={{ ...tdNeo(alt), textAlign: 'right', color: NARANJA }}>{costeDia ? eur2(costeEst) : 'sin dato'}</td>
      <td style={{ ...tdNeo(alt), textAlign: 'right', fontFamily: OSW, fontWeight: 700, fontSize: 15, color: margen >= 0 ? OLIVA : TERRA }}>{costeDia ? eur2(margen) : '—'}</td>
    </tr>
  )
}

function FilaRuta({ r, ant, total, alt }: { r: RutaResumen; ant?: RutaResumen; total: number; alt: boolean }) {
  return (
    <tr>
      <td style={{ ...tdEstado(alt, CELESTE), fontFamily: OSW, fontWeight: 700 }}>{r.ruta}</td>
      <td style={{ ...tdNeo(alt), textAlign: 'right', fontFamily: OSW, fontWeight: 700 }}>{r.n.toLocaleString('es-ES')}</td>
      <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{total ? fmtPct((r.n / total) * 100) : '—'}</td>
      <td style={{ ...tdNeo(alt), textAlign: 'right' }}><Delta v={ant ? deltaPct(r.n, ant.n) : null} /></td>
      <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{r.dias}</td>
      <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{n1(r.entregasDia)}</td>
      <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{r.kilos.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</td>
      <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{r.precioMedio != null ? eur2(r.precioMedio) : '—'}</td>
      <td style={{ ...tdNeo(alt), textAlign: 'right', color: OLIVA, fontFamily: OSW, fontWeight: 700 }}>{eur2(r.base)}</td>
      <td style={tdNeo(alt)}>{r.codigos.map(c => <BadgeNeo key={c} color={ARENA}>{c}</BadgeNeo>)}</td>
    </tr>
  )
}

/* Simulador de negociación: con las entregas por día reales de cada repartidor, qué pasa con el margen diario
   si Cade cambia el precio por entrega, quita la garantía o quita el tope. */
function Simulador({ reps, costeDia, precioMedio, garantiaDe, coste }: {
  reps: RepResumen[]; costeDia: number; precioMedio: number; garantiaDe: (t: string) => number | null; coste: { total: number; porGrupo: { grupo: string; importe: number }[] }
}) {
  const [precio, setPrecio] = useState<string>(precioMedio.toFixed(2))
  const [costeTxt, setCosteTxt] = useState<string>(costeDia.toFixed(2))
  const [conGarantia, setConGarantia] = useState(true)
  const [conTope, setConTope] = useState(true)
  const p = Number(precio.replace(',', '.')) || 0
  const c = Number(costeTxt.replace(',', '.')) || 0
  const entregasDiaGlobal = reps.reduce((s, r) => s + r.entregas, 0) / Math.max(1, reps.reduce((s, r) => s + r.dias, 0))
  const minimo = precioMinimoEntrega(c, entregasDiaGlobal)

  return (
    <>
      <Banda bg={ARENA_CL}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <KpiNeo label="Precio mínimo por entrega" valor={minimo != null ? eur2(minimo) : '—'} color={minimo != null && minimo > p ? TERRA : OLIVA}
            sub={`Para cubrir ${eur2(c)} de coste por día al ritmo de ${n1(entregasDiaGlobal)} entregas/día`} />
          <KpiNeo label="Precio actual de Cade" valor={eur2(precioMedio)} color={CELESTE} sub="Media real por entrega en el periodo" />
          <KpiNeo label="Coste del periodo" valor={eur2(coste.total)} color={NARANJA} sub={coste.porGrupo.slice(0, 3).map(g => `${g.grupo} ${fmtEur(g.importe)}`).join(' · ') || 'Sin gastos categorizados'} />
        </div>
      </Banda>
      <Banda bg={BLANCO}>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 700, fontFamily: OSW, letterSpacing: 1, textTransform: 'uppercase' }}>Precio por entrega (€)
            <input id="sim-precio" value={precio} onChange={e => setPrecio(e.target.value)} inputMode="decimal" style={campo} /></label>
          <label style={{ display: 'grid', gap: 4, fontSize: 12, fontWeight: 700, fontFamily: OSW, letterSpacing: 1, textTransform: 'uppercase' }}>Coste por día de repartidor (€)
            <input id="sim-coste" value={costeTxt} onChange={e => setCosteTxt(e.target.value)} inputMode="decimal" style={campo} /></label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, fontWeight: 600 }}><input id="sim-garantia" type="checkbox" checked={conGarantia} onChange={e => setConGarantia(e.target.checked)} /> Con garantía diaria</label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, fontWeight: 600 }}><input id="sim-tope" type="checkbox" checked={conTope} onChange={e => setConTope(e.target.checked)} /> Con tope diario (Cade no paga por encima de la garantía)</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[-1, -0.5, 0.5, 1].map(d => (
              <button key={d} type="button" onClick={() => setPrecio((p + d).toFixed(2))} style={{ fontFamily: OSW, fontWeight: 700, fontSize: 12, background: d < 0 ? TERRA : OLIVA, color: ARENA, border: `2px solid ${INK}`, padding: '4px 8px', cursor: 'pointer' }}>{d > 0 ? '+' : ''}{d.toFixed(2)} €</button>
            ))}
          </div>
        </div>
        <TablaWrap>
          <thead><tr>{['Repartidor', 'Entregas/día', 'Garantía', 'Ingreso/día hoy', 'Ingreso/día simulado', 'Coste/día', 'Margen/día', 'Margen del periodo', 'Precio mínimo'].map(h => <th key={h} style={thNeo}>{h}</th>)}</tr></thead>
          <tbody>
            {reps.length === 0 && <tr><td colSpan={9} style={{ ...tdNeo(false), textAlign: 'center', color: GRIS, padding: 28 }}>Sin datos en este periodo.</td></tr>}
            {reps.map((r, i) => {
              const alt = i % 2 === 1
              const g = garantiaDe(r.transportista)
              const cargosDia = r.dias ? r.cargos / r.dias : 0
              const hoy = r.dias ? r.pagado / r.dias : 0
              const sim = ingresoDia(r.entregasDia, p, conGarantia ? g : null, conTope, cargosDia)
              const m = sim - c
              const min = precioMinimoEntrega(c, r.entregasDia)
              return (
                <tr key={r.transportista}>
                  <td style={{ ...tdEstado(alt, m >= 0 ? OLIVA : TERRA), fontFamily: OSW, fontWeight: 700 }}>{r.repartidor} <span style={{ color: GRIS, fontWeight: 600 }}>· {r.transportista}</span></td>
                  <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{n1(r.entregasDia)}</td>
                  <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{g != null ? eur2(g) : 'sin dato'}</td>
                  <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{eur2(hoy)}</td>
                  <td style={{ ...tdNeo(alt), textAlign: 'right', fontFamily: OSW, fontWeight: 700 }}>{eur2(sim)}</td>
                  <td style={{ ...tdNeo(alt), textAlign: 'right', color: NARANJA }}>{eur2(c)}</td>
                  <td style={{ ...tdNeo(alt), textAlign: 'right', fontFamily: OSW, fontWeight: 700, fontSize: 15, color: m >= 0 ? OLIVA : TERRA }}>{eur2(m)}</td>
                  <td style={{ ...tdNeo(alt), textAlign: 'right', fontFamily: OSW, fontWeight: 700, color: m >= 0 ? OLIVA : TERRA }}>{eur2(m * r.dias)}</td>
                  <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{min != null ? <BadgeNeo color={min > p ? TERRA : AMBAR}>{eur2(min)}</BadgeNeo> : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </TablaWrap>
        <p style={{ margin: '12px 0 0', fontSize: 12, fontWeight: 600, color: GRIS, maxWidth: 760 }}>
          Cómo se calcula: ingreso del día = entregas por día × precio; con garantía, nunca por debajo de ella; con tope, nunca por encima. Se restan los cargos medios por día. El coste por día sale de los gastos de actividad del periodo divididos entre los días trabajados por todos los repartidores; puedes cambiarlo a mano.
        </p>
      </Banda>
    </>
  )
}
