/**
 * PortadaFamilia.tsx — Portada del Running Familia (ERP David).
 * Lee la vista v_familia_mov (movimientos de las cuentas de la familia en CaixaBank, ya
 * categorizados) y la tabla familia_fijos (plan de gastos fijos). Estilo Neobrutal Mediterráneo.
 */
import { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { supabase } from '@/lib/supabase'
import {
  INK, MARINO, ARENA, ARENA_CL, BLANCO, GRIS, OLIVA, TERRA, NARANJA, CELESTE, AMBAR, BERENJENA, VERDEMAR,
  OSW, LEX, BORDER_CARD, card, EUR, E, E2, P0,
} from '@/styles/neobrutal'
import { Banda, KpiNeo, PillsNeo, TablaWrap, thNeo, tdNeo, tdEstado, BadgeNeo } from '@/components/neo/NeoUI'

interface Mov {
  fecha: string
  mes: string
  bloque: 'ingreso' | 'fijo' | 'variable'
  categoria: string
  categoria_nombre: string
  orden: number
  subcategoria: string
  comercio: string
  importe: number
}

interface FijoPlan {
  id: number
  categoria: string
  concepto: string
  importe_mensual: number
  periodicidad: string
  importe_real: number | null
  dia_cobro: string | null
  cuenta: 'pagos' | 'variables'
  activo: boolean
  notas: string | null
}

const PALETA = [CELESTE, NARANJA, OLIVA, AMBAR, TERRA, BERENJENA, VERDEMAR, MARINO]
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const etiquetaSub: Record<string, string> = {
  supermercado: 'Supermercado', 'comida-animales': 'Comida de animales', 'carniceria-panaderia': 'Carnicería y panadería',
  'bizum-comida': 'Bizum de comida', restaurantes: 'Restaurantes', heladerias: 'Heladerías', 'cafeterias-pastelerias': 'Cafeterías y pastelerías',
  ocio: 'Ocio', viajes: 'Viajes', peluqueria: 'Peluquería', 'calefaccion-pellets': 'Calefacción y pellets', reparaciones: 'Reparaciones',
  ropa: 'Ropa', regalos: 'Regalos', ninos: 'Niños', bazar: 'Bazar', drogueria: 'Droguería', otros: 'Otros',
  farmacia: 'Farmacia', optica: 'Óptica', suplementos: 'Suplementos', herbolario: 'Herbolario',
  recarga: 'Recarga eléctrica', parking: 'Parking', efectivo: 'Efectivo', documentacion: 'Documentación', fotografo: 'Fotógrafo', bizum: 'Bizum',
}
const labelSub = (s: string) => etiquetaSub[s] ?? (s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' '))

const mesKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const sumBy = <T,>(arr: T[], f: (x: T) => number) => arr.reduce((a, x) => a + f(x), 0)

function agrupar(movs: Mov[], clave: (m: Mov) => string, signo: 1 | -1) {
  const mapa = new Map<string, number>()
  for (const m of movs) mapa.set(clave(m), (mapa.get(clave(m)) ?? 0) + signo * Number(m.importe))
  return Array.from(mapa.entries()).map(([k, v]) => ({ k, v })).filter(x => Math.abs(x.v) >= 0.005).sort((a, b) => b.v - a.v)
}

function DonutCard({ titulo, total, sub, filas, color }: {
  titulo: string; total: number; sub?: string; filas: { nombre: string; valor: number }[]; color: string
}) {
  const tot = sumBy(filas, f => Math.max(f.valor, 0))
  const datos = filas.filter(f => f.valor > 0)
  return (
    <div style={{ ...card(BLANCO), padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontFamily: OSW, fontWeight: 600, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>{titulo}</div>
      <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(24px,3vw,38px)', lineHeight: 0.95, color }}>{EUR(total)}</div>
      {sub && <div style={{ fontSize: 12, fontWeight: 600, color: GRIS }}>{sub}</div>}
      <div style={{ height: 190 }}>
        {datos.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: GRIS, fontSize: 13 }}>Sin datos en este periodo</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={datos} dataKey="valor" nameKey="nombre" innerRadius={52} outerRadius={84} stroke={INK} strokeWidth={2} isAnimationActive={false}>
                {datos.map((_, i) => <Cell key={i} fill={PALETA[i % PALETA.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => [`${E(Number(v))} €`, '']} contentStyle={{ border: `2px solid ${INK}`, borderRadius: 0, fontFamily: LEX, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {datos.map((f, i) => (
          <div key={f.nombre} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
            <span style={{ width: 12, height: 12, background: PALETA[i % PALETA.length], border: `2px solid ${INK}`, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{f.nombre}</span>
            <span style={{ fontFamily: OSW, fontWeight: 700 }}>{E(f.valor)}</span>
            <span style={{ width: 44, textAlign: 'right', color: GRIS }}>{tot > 0 ? P0((f.valor / tot) * 100) : '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PortadaFamilia() {
  const [movs, setMovs] = useState<Mov[]>([])
  const [plan, setPlan] = useState<FijoPlan[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hoy = useMemo(() => new Date(), [])
  const [periodo, setPeriodo] = useState<string>(hoy.getDate() < 10 ? 'Mes anterior' : 'Este mes')

  useEffect(() => {
    let cancel = false
    ;(async () => {
      const [a, b] = await Promise.all([
        supabase.from('v_familia_mov').select('*').order('fecha', { ascending: false }).range(0, 4999),
        supabase.from('familia_fijos').select('*').eq('activo', true).order('id'),
      ])
      if (cancel) return
      if (a.error) setError(a.error.message)
      else if (b.error) setError(b.error.message)
      setMovs(((a.data ?? []) as any[]).map(m => ({ ...m, importe: Number(m.importe) })) as Mov[])
      setPlan(((b.data ?? []) as any[]).map(f => ({ ...f, importe_mensual: Number(f.importe_mensual) })) as FijoPlan[])
      setCargando(false)
    })()
    return () => { cancel = true }
  }, [])

  const mesActual = mesKey(hoy)
  const mesAnterior = mesKey(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1))
  /* últimos 3 meses COMPLETOS (sin el mes en curso) */
  const ultimos3 = useMemo(() => [1, 2, 3].map(i => mesKey(new Date(hoy.getFullYear(), hoy.getMonth() - i, 1))), [hoy])

  const mesesPeriodo = periodo === 'Este mes' ? [mesActual] : periodo === 'Mes anterior' ? [mesAnterior] : ultimos3
  const nMeses = mesesPeriodo.length
  const enPeriodo = useMemo(() => movs.filter(m => mesesPeriodo.includes(m.mes)), [movs, mesesPeriodo.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps
  const en3 = useMemo(() => movs.filter(m => ultimos3.includes(m.mes)), [movs, ultimos3])

  const etiquetaPeriodo = periodo === 'Este mes'
    ? `${MESES[hoy.getMonth()]} ${hoy.getFullYear()} (en curso)`
    : periodo === 'Mes anterior'
      ? `${MESES[(hoy.getMonth() + 11) % 12]} ${hoy.getMonth() === 0 ? hoy.getFullYear() - 1 : hoy.getFullYear()}`
      : 'Últimos 3 meses'
  const subMedia = nMeses > 1 ? `Media: ${EUR(0).replace('0', '')}` : undefined // se rellena abajo por bloque

  const ingresos = useMemo(() => agrupar(enPeriodo.filter(m => m.bloque === 'ingreso'), m => m.categoria_nombre, 1), [enPeriodo])
  const fijos = useMemo(() => agrupar(enPeriodo.filter(m => m.bloque === 'fijo'), m => m.categoria_nombre, -1), [enPeriodo])
  const variables = useMemo(() => agrupar(enPeriodo.filter(m => m.bloque === 'variable'), m => m.categoria_nombre, -1), [enPeriodo])
  const totIng = sumBy(ingresos, x => x.v)
  const totFij = sumBy(fijos, x => x.v)
  const totVar = sumBy(variables, x => x.v)
  const resultado = totIng - totFij - totVar
  const media = (n: number) => (nMeses > 1 ? `Media ${E(n / nMeses)} al mes` : undefined)
  void subMedia

  /* ── Detalle de variables por categoría → subcategoría → comercio ── */
  const detalleVar = useMemo(() => {
    const movsVar = enPeriodo.filter(m => m.bloque === 'variable')
    const cats = agrupar(movsVar, m => m.categoria, -1)
    return cats.map(({ k: cat, v: total }) => {
      const delCat = movsVar.filter(m => m.categoria === cat)
      const subs = agrupar(delCat, m => m.subcategoria, -1)
      const comercios = agrupar(delCat, m => m.comercio, -1)
      return { cat, nombre: delCat[0]?.categoria_nombre ?? cat, total, subs, comercios }
    })
  }, [enPeriodo])

  /* ── Cuánto meter cada mes en cada cuenta ── */
  const mensualPlan = useMemo(() => {
    const porCat = new Map<string, FijoPlan[]>()
    for (const f of plan) porCat.set(f.categoria, [...(porCat.get(f.categoria) ?? []), f])
    return Array.from(porCat.entries()).map(([cat, filas]) => ({ cat, filas, total: sumBy(filas, f => f.importe_mensual) }))
  }, [plan])
  const totalPlanFijos = sumBy(plan.filter(f => f.cuenta === 'pagos'), f => f.importe_mensual)

  const mesesConDatos3 = Math.max(1, new Set(en3.map(m => m.mes)).size)
  const varMedia3 = -sumBy(en3.filter(m => m.bloque === 'variable'), m => m.importe) / mesesConDatos3
  const rebecaMedia3 = sumBy(en3.filter(m => m.categoria === 'ingresos-rebeca'), m => m.importe) / mesesConDatos3
  const davidReal3 = sumBy(en3.filter(m => m.categoria === 'aportacion-david'), m => m.importe) / mesesConDatos3
  const aportarVariables = Math.max(0, varMedia3 - rebecaMedia3)
  const aportarTotal = totalPlanFijos + aportarVariables
  const diferencia = aportarTotal - davidReal3

  /* ── Previsión del mes y de la semana (solo "Este mes") ── */
  const prev = useMemo(() => {
    const diasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate()
    const dia = hoy.getDate()
    const delMes = movs.filter(m => m.mes === mesActual)
    const varHastaHoy = -sumBy(delMes.filter(m => m.bloque === 'variable'), m => m.importe)
    const fijHastaHoy = -sumBy(delMes.filter(m => m.bloque === 'fijo'), m => m.importe)
    const ritmo = dia > 0 ? varHastaHoy / dia : 0
    const varProyectado = Math.max(varHastaHoy, ritmo * diasMes)
    const varHabitual = varMedia3
    const ini = new Date(hoy); ini.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7)); ini.setHours(0, 0, 0, 0)
    const iniIso = `${ini.getFullYear()}-${String(ini.getMonth() + 1).padStart(2, '0')}-${String(ini.getDate()).padStart(2, '0')}`
    const varSemana = -sumBy(movs.filter(m => m.bloque === 'variable' && m.fecha >= iniIso), m => m.importe)
    const semanaHabitual = (varHabitual * 12) / 52
    const fijPendiente = Math.max(0, totalPlanFijos - fijHastaHoy)
    const ingresosPrev = sumBy(en3.filter(m => m.bloque === 'ingreso'), m => m.importe) / mesesConDatos3
    return { diasMes, dia, varHastaHoy, varProyectado, varHabitual, varSemana, semanaHabitual, fijPendiente, fijHastaHoy, ingresosPrev,
      resultadoPrev: ingresosPrev - Math.max(totalPlanFijos, fijHastaHoy) - varProyectado }
  }, [movs, hoy, mesActual, varMedia3, totalPlanFijos, en3, mesesConDatos3])

  const wrap = { fontFamily: OSW, fontWeight: 700 as const, fontSize: 16, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 12, color: INK }

  return (
    <>
      <Banda bg={ARENA_CL}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={wrap}>Portada · {etiquetaPeriodo}</div>
          <PillsNeo value={periodo} onChange={setPeriodo} options={['Este mes', 'Mes anterior', 'Últimos 3 meses']} />
        </div>
        {error && <div style={{ background: TERRA, color: ARENA, padding: 10, fontWeight: 700, marginBottom: 12 }}>ERROR: {error}</div>}
        {cargando ? (
          <div style={{ color: GRIS, padding: 20 }}>Cargando…</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 18, marginBottom: 22 }}>
              <KpiNeo label="Ingresado" valor={EUR(totIng)} color={OLIVA} sub={media(totIng)} />
              <KpiNeo label="Gastos fijos" valor={EUR(totFij)} color={NARANJA} sub={totIng > 0 ? `${P0((totFij / totIng) * 100)} de lo ingresado` : undefined} />
              <KpiNeo label="Gastos variables" valor={EUR(totVar)} color={CELESTE} sub={totIng > 0 ? `${P0((totVar / totIng) * 100)} de lo ingresado` : undefined} />
              <KpiNeo label="Resultado" valor={`${resultado < 0 ? '−' : '+'}${EUR(Math.abs(resultado))}`} color={resultado >= 0 ? OLIVA : TERRA} sub={media(resultado)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
              <DonutCard titulo="Quién ingresa" total={totIng} color={OLIVA} sub={media(totIng)} filas={ingresos.map(x => ({ nombre: x.k, valor: x.v }))} />
              <DonutCard titulo="Gastos fijos" total={totFij} color={NARANJA} sub={media(totFij)} filas={fijos.map(x => ({ nombre: x.k, valor: x.v }))} />
              <DonutCard titulo="Gastos variables" total={totVar} color={CELESTE} sub={media(totVar)} filas={variables.map(x => ({ nombre: x.k, valor: x.v }))} />
            </div>
          </>
        )}
      </Banda>

      {!cargando && periodo === 'Este mes' && (
        <Banda bg={BLANCO}>
          <div style={wrap}>Cómo va el mes y la semana</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 18 }}>
            <KpiNeo label="Variables hasta hoy" valor={EUR(prev.varHastaHoy)} color={CELESTE} sub={`Día ${prev.dia} de ${prev.diasMes}`} />
            <KpiNeo label="Variables a fin de mes" valor={EUR(prev.varProyectado)} color={prev.varProyectado > prev.varHabitual * 1.05 ? TERRA : OLIVA}
              sub={`Lo habitual: ${E(prev.varHabitual)} al mes`} />
            <KpiNeo label="Fijos por cobrar este mes" valor={EUR(prev.fijPendiente)} color={NARANJA} sub={`Ya cobrados: ${E(prev.fijHastaHoy)}`} />
            <KpiNeo label="Resultado previsto" valor={`${prev.resultadoPrev < 0 ? '−' : '+'}${EUR(Math.abs(prev.resultadoPrev))}`} color={prev.resultadoPrev >= 0 ? OLIVA : TERRA}
              sub={`Ingresos habituales: ${E(prev.ingresosPrev)}`} />
            <KpiNeo label="Variables de esta semana" valor={EUR(prev.varSemana)} color={prev.varSemana > prev.semanaHabitual ? TERRA : OLIVA}
              sub={`Ritmo habitual: ${E(prev.semanaHabitual)} por semana`} />
          </div>
        </Banda>
      )}

      {!cargando && (
        <Banda bg={AMBAR}>
          <div style={wrap}>Cuánto meter cada mes en cada cuenta</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
            <div style={{ ...card(BLANCO), padding: '18px 20px' }}>
              <div style={{ fontFamily: OSW, fontWeight: 600, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>Cuenta Pagos …5513 · gastos fijos</div>
              <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(26px,3vw,40px)', color: NARANJA, margin: '6px 0 4px' }}>{EUR(totalPlanFijos)}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: GRIS, marginBottom: 10 }}>
                Meter el día 28 de cada mes, antes de que pasen los recibos del 1 al 3. Seguros y suscripciones anuales van prorrateados.
              </div>
              {mensualPlan.map(g => (
                <div key={g.cat} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, borderTop: `2px solid ${ARENA_CL}`, padding: '6px 0' }}>
                  <span style={{ textTransform: 'capitalize' }}>{g.cat.replace(/-familia|hogar-/g, '').replace(/-/g, ' ')}</span>
                  <span style={{ fontFamily: OSW }}>{E2(g.total)}</span>
                </div>
              ))}
            </div>
            <div style={{ ...card(BLANCO), padding: '18px 20px' }}>
              <div style={{ fontFamily: OSW, fontWeight: 600, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>Cuenta Caixa …5042 · gastos variables</div>
              <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(26px,3vw,40px)', color: CELESTE, margin: '6px 0 4px' }}>{EUR(aportarVariables)}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: GRIS, marginBottom: 10 }}>
                Lo que tiene que poner David. Rebeca ya entra con su nómina.
              </div>
              {[
                ['Variables (media de 3 meses)', varMedia3],
                ['− Nómina de Rebeca', -rebecaMedia3],
                ['= A aportar por David', aportarVariables],
              ].map(([t, v]) => (
                <div key={String(t)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, borderTop: `2px solid ${ARENA_CL}`, padding: '6px 0' }}>
                  <span>{t}</span><span style={{ fontFamily: OSW }}>{E2(Number(v))}</span>
                </div>
              ))}
            </div>
            <div style={{ ...card(MARINO), padding: '18px 20px', color: ARENA }}>
              <div style={{ fontFamily: OSW, fontWeight: 600, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>David aporta cada mes</div>
              <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(30px,3.4vw,46px)', color: AMBAR, margin: '6px 0 4px' }}>{EUR(aportarTotal)}</div>
              <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.85, marginBottom: 10 }}>Fijos + variables menos la nómina de Rebeca.</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, borderTop: `2px solid ${ARENA}`, padding: '6px 0' }}>
                <span>Lo que ha aportado de media (3 meses)</span><span style={{ fontFamily: OSW }}>{E(davidReal3)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, borderTop: `2px solid ${ARENA}`, padding: '6px 0' }}>
                <span>{diferencia > 0 ? 'Le falta por aportar' : 'Le sobra'}</span>
                <span style={{ fontFamily: OSW, color: diferencia > 0 ? '#FFB199' : '#C8D98B' }}>{E(Math.abs(diferencia))} al mes</span>
              </div>
            </div>
          </div>
        </Banda>
      )}

      {!cargando && detalleVar.length > 0 && (
        <Banda bg={BLANCO}>
          <div style={wrap}>Gastos variables al detalle · dónde se compra</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
            {detalleVar.map((c, idx) => (
              <div key={c.cat} style={{ ...card(BLANCO), padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 16, textTransform: 'uppercase', borderBottom: `4px solid ${PALETA[idx % PALETA.length]}` }}>{c.nombre}</span>
                  <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 20 }}>{EUR(c.total)}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {c.subs.map(s => (
                    <BadgeNeo key={s.k} color={ARENA_CL}>{labelSub(s.k)} {P0(c.total > 0 ? (s.v / c.total) * 100 : 0)}</BadgeNeo>
                  ))}
                </div>
                {c.comercios.slice(0, 8).map(x => (
                  <div key={x.k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, padding: '3px 0' }}>
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.k}</span>
                    <span style={{ width: 60, height: 8, background: ARENA_CL, border: `1px solid ${INK}` }}>
                      <span style={{ display: 'block', height: '100%', width: `${Math.min(100, c.total > 0 ? (x.v / c.total) * 100 : 0)}%`, background: PALETA[idx % PALETA.length] }} />
                    </span>
                    <span style={{ fontFamily: OSW, fontWeight: 700, width: 54, textAlign: 'right' }}>{E(x.v)}</span>
                    <span style={{ width: 38, textAlign: 'right', color: GRIS }}>{P0(c.total > 0 ? (x.v / c.total) * 100 : 0)}</span>
                  </div>
                ))}
                {c.comercios.length > 8 && (
                  <div style={{ fontSize: 12, color: GRIS, fontWeight: 600, paddingTop: 4 }}>
                    y {c.comercios.length - 8} sitios más ({E(sumBy(c.comercios.slice(8), z => z.v))})
                  </div>
                )}
              </div>
            ))}
          </div>
        </Banda>
      )}

      {!cargando && (
        <Banda bg={ARENA_CL}>
          <div style={wrap}>Plan de gastos fijos · prorrateado a mes</div>
          <TablaWrap>
            <thead>
              <tr>{['Gasto', 'Categoría', 'Cuándo', 'Importe real', 'Al mes'].map(h => <th key={h} style={thNeo}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {plan.map((f, i) => {
                const alt = i % 2 === 1
                return (
                  <tr key={f.id}>
                    <td style={tdEstado(alt, NARANJA)}>{f.concepto}</td>
                    <td style={tdNeo(alt)}>{f.categoria.replace(/-familia|hogar-/g, '').replace(/-/g, ' ')}</td>
                    <td style={tdNeo(alt)}>{f.dia_cobro ? `${f.periodicidad} · ${f.dia_cobro}` : f.periodicidad}</td>
                    <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{f.importe_real != null ? E2(f.importe_real) : 'varía'}</td>
                    <td style={{ ...tdNeo(alt), textAlign: 'right', fontFamily: OSW, fontWeight: 700 }}>{E2(f.importe_mensual)}</td>
                  </tr>
                )
              })}
              <tr>
                <td style={{ ...tdNeo(false), fontFamily: OSW, fontWeight: 700 }} colSpan={4}>TOTAL AL MES</td>
                <td style={{ ...tdNeo(false), textAlign: 'right', fontFamily: OSW, fontWeight: 700 }}>{E2(totalPlanFijos)}</td>
              </tr>
            </tbody>
          </TablaWrap>
          <div style={{ marginTop: 8, fontSize: 12, color: GRIS, fontWeight: 600, borderTop: BORDER_CARD.replace('3px', '0px') }}>
            Los importes se editan en la tabla de gastos fijos de la familia.
          </div>
        </Banda>
      )}
    </>
  )
}
