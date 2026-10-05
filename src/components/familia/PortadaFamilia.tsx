/**
 * PortadaFamilia.tsx — Portada del Running Familia (ERP David).
 * Lee la vista v_familia_mov (movimientos de las cuentas de la familia en CaixaBank, ya
 * categorizados) y la tabla familia_fijos (plan de gastos fijos). Estilo Neobrutal Mediterráneo.
 */
import { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'
import {
  INK, MARINO, ARENA, ARENA_CL, BLANCO, GRIS, OLIVA, TERRA, NARANJA, CELESTE, AMBAR, BERENJENA, VERDEMAR,
  OSW, LEX, BORDER_CARD, card, EUR, E, E2, P0,
} from '@/styles/neobrutal'
import { Banda, KpiNeo, HeroNeo, TablaWrap, thNeo, tdNeo, tdEstado, BadgeNeo } from '@/components/neo/NeoUI'
import { usePeriodo } from '@/lib/periodoGlobal'
import { useCostesReales } from '@/hooks/useCostesReales'
import { puntoEquilibrio } from '@/lib/equilibrio'
import ComercioIcon, { IconoRubro } from './ComercioIcon'

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

const PALETA = [CELESTE, NARANJA, OLIVA, AMBAR, BERENJENA, VERDEMAR, MARINO]
/* Cada rosco juega con su propia gama de colores canónicos (sin rojos) */
const PALETA_INGRESOS = [OLIVA, VERDEMAR, AMBAR, CELESTE]
const PALETA_FIJOS = [NARANJA, AMBAR, BERENJENA, MARINO, VERDEMAR, CELESTE]
const PALETA_VARIABLES = [CELESTE, MARINO, VERDEMAR, BERENJENA, OLIVA, AMBAR, NARANJA, GRIS]

/* Previsión que aprende: media ponderada que da más peso a lo reciente. Para cada categoría prueba varios
   "pesos" y se queda con el que mejor habría acertado los meses pasados. Devuelve la previsión del mes que viene
   y lo que habría previsto en cada mes ya cerrado (para medir el acierto). */
function aprender(valores: number[]) {
  if (valores.length === 0) return { prev: 0, preds: [] as number[] }
  let mejor = { err: Infinity, prev: valores[0], preds: [valores[0]] }
  for (const a of [0.2, 0.4, 0.6, 0.8, 1]) {
    let nivel = valores[0], err = 0
    const preds = [nivel]
    for (let i = 1; i < valores.length; i++) { preds.push(nivel); err += Math.abs(valores[i] - nivel); nivel = a * valores[i] + (1 - a) * nivel }
    if (err < mejor.err) mejor = { err, prev: nivel, preds }
  }
  return { prev: mejor.prev, preds: mejor.preds }
}
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

/* Cómo reconocer en el banco cada gasto fijo del plan: nombre del plan → cómo aparece el comercio */
const REGLAS_FIJO: [RegExp, RegExp][] = [
  [/caixabank/i, /caixabank/i], [/cetelem|hyundai|kona/i, /cetelem|hyundai|kona/i], [/oney/i, /oney/i],
  [/hacienda/i, /hacienda/i], [/suma/i, /suma/i], [/axa vida david/i, /aurora/i], [/axa vida rebeca/i, /^axa$/i],
  [/occident/i, /occident/i], [/starlink/i, /starlink/i], [/xfera/i, /xfera/i], [/redhuevo/i, /redhuevo/i],
  [/google one/i, /google/i], [/sin fronteras/i, /fronteras/i], [/unicef/i, /unicef/i],
]
const MES_ABR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const mesesDe = (txt: string) => MES_ABR.map((a, i) => (txt.toLowerCase().includes(a) ? i : -1)).filter(i => i >= 0)
const fechaCorta = (d: Date) => `${d.getDate()} ${MES_ABR[d.getMonth()]}`
const fechaIso = (iso: string) => { const [, m, d] = iso.split('-'); return `${Number(d)} ${MES_ABR[Number(m) - 1]}` }

interface Cobro { f: FijoPlan; fecha: Date; importe: number; estado: 'sin-cobro' | 'hoy' | 'proximo'; cuando: string }

const mesKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const sumBy = <T,>(arr: T[], f: (x: T) => number) => arr.reduce((a, x) => a + f(x), 0)

function agrupar(movs: Mov[], clave: (m: Mov) => string, signo: 1 | -1) {
  const mapa = new Map<string, number>()
  for (const m of movs) mapa.set(clave(m), (mapa.get(clave(m)) ?? 0) + signo * Number(m.importe))
  return Array.from(mapa.entries()).map(([k, v]) => ({ k, v })).filter(x => Math.abs(x.v) >= 0.005).sort((a, b) => b.v - a.v)
}

function DonutCard({ titulo, total, sub, filas, color, paleta, detalle }: {
  titulo: string; total: number; sub?: string; filas: { nombre: string; valor: number }[]; color: string
  paleta: string[]; detalle: Record<string, { k: string; v: number }[]>
}) {
  const [sel, setSel] = useState<string | null>(null)
  const tot = sumBy(filas, f => Math.max(f.valor, 0))
  const datos = filas.filter(f => f.valor > 0)
  const iSel = datos.findIndex(f => f.nombre === sel)
  const fSel = iSel >= 0 ? datos[iSel] : null
  const alternar = (n: string) => setSel(prev => (prev === n ? null : n))
  return (
    <div style={{ ...card(BLANCO), padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontFamily: OSW, fontWeight: 600, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>{titulo}</div>
      <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(24px,3vw,38px)', lineHeight: 0.95, color }}>{EUR(total)}</div>
      {sub && <div style={{ fontSize: 12, fontWeight: 600, color: GRIS }}>{sub}</div>}
      <div style={{ height: 190, position: 'relative' }}>
        {datos.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: GRIS, fontSize: 13 }}>Sin datos en este periodo</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={datos} dataKey="valor" nameKey="nombre" innerRadius={52} outerRadius={84} stroke={INK} strokeWidth={2} isAnimationActive={false}
                onClick={(_: unknown, i: number) => alternar(datos[i].nombre)} style={{ cursor: 'pointer' }}>
                {datos.map((d, i) => <Cell key={i} fill={paleta[i % paleta.length]} fillOpacity={sel && sel !== d.nombre ? 0.35 : 1} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}
        {fSel && (
          <div role="dialog" style={{
            position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', zIndex: 5, width: 'min(260px, 92%)',
            background: ARENA, border: `3px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}`, padding: '10px 12px', fontSize: 12, fontWeight: 600,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 12, height: 12, background: paleta[iSel % paleta.length], border: `2px solid ${INK}`, flexShrink: 0 }} />
              <span style={{ flex: 1, fontFamily: OSW, fontWeight: 700, fontSize: 14, textTransform: 'uppercase' }}>{fSel.nombre}</span>
              <button onClick={() => setSel(null)} aria-label="Cerrar" style={{ border: 0, background: 'transparent', fontWeight: 700, cursor: 'pointer', color: INK }}>✕</button>
            </div>
            <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 20, margin: '2px 0' }}>
              {EUR(fSel.valor)} <span style={{ fontSize: 13, color: GRIS }}>· {P0(tot > 0 ? (fSel.valor / tot) * 100 : 0)} del total</span>
            </div>
            {(detalle[fSel.nombre] ?? []).slice(0, 5).map(x => (
              <div key={x.k} style={{ display: 'flex', gap: 6, borderTop: `1px solid ${ARENA_CL}`, padding: '2px 0' }}>
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.k}</span>
                <span style={{ fontFamily: OSW, fontWeight: 700 }}>{E(x.v)}</span>
                <span style={{ width: 36, textAlign: 'right', color: GRIS }}>{P0(fSel.valor > 0 ? (x.v / fSel.valor) * 100 : 0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ fontSize: 11, color: GRIS, fontWeight: 600 }}>Pulsa un trozo para ver el detalle.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {datos.map((f, i) => (
          <div key={f.nombre} onClick={() => alternar(f.nombre)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: sel && sel !== f.nombre ? 0.5 : 1 }}>
            <span style={{ width: 12, height: 12, background: paleta[i % paleta.length], border: `2px solid ${INK}`, flexShrink: 0 }} />
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
  const per = usePeriodo()
  const { datos: datosEmp } = useCostesReales()

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
  /* últimos 3 meses COMPLETOS (sin el mes en curso) */
  const ultimos3 = useMemo(() => [1, 2, 3].map(i => mesKey(new Date(hoy.getFullYear(), hoy.getMonth() - i, 1))), [hoy])

  const nMeses = Math.max(1, per.meses.length)
  const enPeriodo = useMemo(() => movs.filter(m => m.fecha >= per.desdeIso && m.fecha <= per.hastaIso), [movs, per.desdeIso, per.hastaIso])
  const en3 = useMemo(() => movs.filter(m => ultimos3.includes(m.mes)), [movs, ultimos3])

  const etiquetaPeriodo = per.etiqueta
  const subMedia = nMeses > 1 ? `Media: ${EUR(0).replace('0', '')}` : undefined // se rellena abajo por bloque

  const ingresos = useMemo(() => agrupar(enPeriodo.filter(m => m.bloque === 'ingreso'), m => m.categoria_nombre, 1), [enPeriodo])
  const fijos = useMemo(() => agrupar(enPeriodo.filter(m => m.bloque === 'fijo'), m => m.categoria_nombre, -1), [enPeriodo])
  const variables = useMemo(() => agrupar(enPeriodo.filter(m => m.bloque === 'variable'), m => m.categoria_nombre, -1), [enPeriodo])
  const detalleTrozos = (bloque: Mov['bloque'], signo: 1 | -1) => {
    const doBloque = enPeriodo.filter(m => m.bloque === bloque)
    const out: Record<string, { k: string; v: number }[]> = {}
    for (const n of new Set(doBloque.map(m => m.categoria_nombre))) out[n] = agrupar(doBloque.filter(m => m.categoria_nombre === n), m => m.comercio, signo)
    return out
  }
  const detIng = useMemo(() => detalleTrozos('ingreso', 1), [enPeriodo]) // eslint-disable-line react-hooks/exhaustive-deps
  const detFij = useMemo(() => detalleTrozos('fijo', -1), [enPeriodo]) // eslint-disable-line react-hooks/exhaustive-deps
  const detVar = useMemo(() => detalleTrozos('variable', -1), [enPeriodo]) // eslint-disable-line react-hooks/exhaustive-deps
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
      const subDe = new Map(delCat.map(m => [m.comercio, m.subcategoria] as const))
      return { cat, nombre: delCat[0]?.categoria_nombre ?? cat, total, subs, comercios, subDe }
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

  /* Previsión de variables por categoría: aprende de cada mes cerrado y completo (el mes en curso y los
     meses con pocos movimientos no cuentan). */
  const pronVar = useMemo(() => {
    const vars = movs.filter(m => m.bloque === 'variable')
    const nPorMes = new Map<string, number>()
    for (const m of vars) nPorMes.set(m.mes, (nPorMes.get(m.mes) ?? 0) + 1)
    const cerrados = Array.from(nPorMes.entries()).filter(([mes, n]) => mes < mesActual && n >= 30).map(([mes]) => mes).sort()
    const cats = Array.from(new Set(vars.map(m => m.categoria)))
    const filas = cats.map(cat => {
      const serie = cerrados.map(mes => -sumBy(vars.filter(m => m.mes === mes && m.categoria === cat), m => m.importe))
      const r = aprender(serie)
      return { cat, nombre: vars.find(m => m.categoria === cat)?.categoria_nombre ?? cat, serie, prev: Math.max(0, r.prev), preds: r.preds }
    })
    const totalPrev = sumBy(filas, f => f.prev)
    const realTot = cerrados.map((_, i) => sumBy(filas, f => f.serie[i] ?? 0))
    const predTot = cerrados.map((_, i) => sumBy(filas, f => f.preds[i] ?? 0))
    let err = 0, base = 0
    for (let i = 1; i < cerrados.length; i++) { err += Math.abs(realTot[i] - predTot[i]); base += realTot[i] }
    const acierto = cerrados.length > 1 && base > 0 ? Math.max(0, 1 - err / base) : null
    return { filas: filas.sort((a, b) => b.prev - a.prev), totalPrev, acierto, nMeses: cerrados.length,
      ultimoReal: realTot[realTot.length - 1] ?? 0, ultimoPrev: predTot[predTot.length - 1] ?? 0 }
  }, [movs, mesActual])
  const varPrev = pronVar.nMeses > 0 ? pronVar.totalPrev : varMedia3
  const rebecaMedia3 = sumBy(en3.filter(m => m.categoria === 'ingresos-rebeca'), m => m.importe) / mesesConDatos3
  const davidReal3 = sumBy(en3.filter(m => m.categoria === 'aportacion-david'), m => m.importe) / mesesConDatos3
  const aportarVariables = Math.max(0, varPrev - rebecaMedia3)
  const aportarTotal = totalPlanFijos + aportarVariables
  const diferencia = aportarTotal - davidReal3

  /* ── Último cobro REAL de cada fijo del plan (movimientos del banco) ── */
  const movsFijo = useMemo(() => {
    const mapa = new Map<number, Mov[]>()
    for (const f of plan) {
      const regla = REGLAS_FIJO.find(([r]) => r.test(f.concepto))
      mapa.set(f.id, regla ? movs.filter(m => m.bloque === 'fijo' && m.importe < 0 && regla[1].test(m.comercio.trim())) : [])
    }
    return mapa
  }, [plan, movs])

  /* ── Qué toca pagar: próximos 14 días + recibos que debían haber salido y no constan ── */
  const cobros = useMemo(() => {
    const y = hoy.getFullYear(), mo = hoy.getMonth(), d = hoy.getDate()
    const inicio = new Date(y, mo, d)
    const salida: Cobro[] = []
    for (const f of plan.filter(p => p.cuenta === 'pagos')) {
      const hist = movsFijo.get(f.id) ?? []
      const ult = hist[0]
      const pagado = hist.some(m => m.mes === mesActual)
      const importe = f.importe_real ?? (ult ? -ult.importe : f.importe_mensual)
      let fecha: Date | null = null
      let estado: Cobro['estado'] = 'proximo'
      let cuando = ''
      if (f.periodicidad === 'mensual') {
        const nums = (f.dia_cobro ?? '1').match(/\d+/g)?.map(Number) ?? [1]
        const ini = nums[0], fin = nums[nums.length - 1]
        if (pagado) { fecha = new Date(y, mo + 1, ini); cuando = `día ${f.dia_cobro}` }
        else if (d > fin) { fecha = inicio; estado = 'sin-cobro'; cuando = `debía salir el ${f.dia_cobro}` }
        else { fecha = new Date(y, mo, Math.max(ini, d)); estado = ini <= d ? 'hoy' : 'proximo'; cuando = `día ${f.dia_cobro}` }
      } else {
        const ms = mesesDe(f.dia_cobro ?? '')
        if (ms.includes(mo) && !pagado) { fecha = inicio; estado = 'hoy'; cuando = 'este mes (día por confirmar)' }
        else if (ms.includes((mo + 1) % 12)) { fecha = new Date(y, mo + 1, 1); cuando = 'el mes que viene' }
      }
      if (!fecha) continue
      const dias = Math.round((fecha.getTime() - inicio.getTime()) / 86400000)
      if (estado !== 'sin-cobro' && dias > 14) continue
      salida.push({ f, fecha, importe, estado, cuando })
    }
    return salida.sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
  }, [plan, movsFijo, hoy, mesActual])
  const totalCobros = sumBy(cobros, c => c.importe)
  const proxIngreso = (() => {
    const d28 = new Date(hoy.getFullYear(), hoy.getMonth(), 28)
    return hoy.getDate() > 28 ? new Date(hoy.getFullYear(), hoy.getMonth() + 1, 28) : d28
  })()

  /* ── Previsión del mes y de la semana (solo "Este mes") ── */
  const prev = useMemo(() => {
    const diasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate()
    const dia = hoy.getDate()
    const delMes = movs.filter(m => m.mes === mesActual)
    const varHastaHoy = -sumBy(delMes.filter(m => m.bloque === 'variable'), m => m.importe)
    const fijHastaHoy = -sumBy(delMes.filter(m => m.bloque === 'fijo'), m => m.importe)
    const ritmo = dia > 0 ? varHastaHoy / dia : 0
    const varProyectado = Math.max(varHastaHoy, ritmo * diasMes)
    const varHabitual = varPrev
    const ini = new Date(hoy); ini.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7)); ini.setHours(0, 0, 0, 0)
    const iniIso = `${ini.getFullYear()}-${String(ini.getMonth() + 1).padStart(2, '0')}-${String(ini.getDate()).padStart(2, '0')}`
    const varSemana = -sumBy(movs.filter(m => m.bloque === 'variable' && m.fecha >= iniIso), m => m.importe)
    const semanaHabitual = (varHabitual * 12) / 52
    const fijPendiente = Math.max(0, totalPlanFijos - fijHastaHoy)
    const ingresosPrev = sumBy(en3.filter(m => m.bloque === 'ingreso'), m => m.importe) / mesesConDatos3
    return { diasMes, dia, varHastaHoy, varProyectado, varHabitual, varSemana, semanaHabitual, fijPendiente, fijHastaHoy, ingresosPrev,
      resultadoPrev: ingresosPrev - Math.max(totalPlanFijos, fijHastaHoy) - varProyectado }
  }, [movs, hoy, mesActual, varPrev, totalPlanFijos, en3, mesesConDatos3])

  const wrap = { fontFamily: OSW, fontWeight: 700 as const, fontSize: 16, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 12, color: INK }


  /* ── Punto de equilibrio familiar: qué tiene que facturar la empresa para cubrir la empresa Y la casa ── */
  const necesidadCasa = totalPlanFijos + varPrev
  const davidSaca = Math.max(0, necesidadCasa - rebecaMedia3)
  const equil = useMemo(() => {
    if (!datosEmp) return null
    const { costes, ingresos, eurEntrega } = datosEmp
    const pe = puntoEquilibrio(costes.fijos, costes.variables, ingresos, eurEntrega)
    if (pe.euros == null || pe.margenContribucion == null || eurEntrega <= 0) return null
    const extraEuros = davidSaca / pe.margenContribucion
    const totalEuros = pe.euros + extraEuros
    const totalEntregas = totalEuros / eurEntrega
    const actuales = ingresos / eurEntrega
    return { mc: pe.margenContribucion, peEuros: pe.euros, peEntregas: pe.entregas ?? 0, extraEuros, extraEntregas: extraEuros / eurEntrega,
      totalEuros, totalEntregas, porDia: totalEntregas / 26, ingresos, actuales, eurEntrega, cobertura: totalEuros > 0 ? ingresos / totalEuros : 0 }
  }, [datosEmp, davidSaca])

  const pendientes = cobros.filter(c => c.estado !== 'sin-cobro')
  const sinCobro = cobros.filter(c => c.estado === 'sin-cobro')
  const colorEstado = { 'sin-cobro': TERRA, hoy: NARANJA, proximo: MARINO } as const
  const textoEstado = { 'sin-cobro': 'NO CONSTA', hoy: 'AHORA', proximo: 'PRÓXIMO' } as const

  return (
    <>
      {!cargando && (
        <HeroNeo
          eyebrowTxt="Finanzas · Hogar"
          cifra={`${EUR(necesidadCasa)} /mes`}
          frase={`Es lo que necesita la casa cada mes (fijos ${E(totalPlanFijos)} + variables previstos ${E(varPrev)}). Rebeca cubre ${E(rebecaMedia3)}; David tiene que aportar ${E(davidSaca)}.`}
          color={diferencia > 0 ? NARANJA : OLIVA}
          apoyo={[
            { label: 'David aporta de media', valor: E(davidReal3) },
            { label: diferencia > 0 ? 'Le falta al mes' : 'Le sobra al mes', valor: E(Math.abs(diferencia)) },
            { label: 'Acierto de la previsión', valor: pronVar.acierto != null ? P0(pronVar.acierto * 100) : '—' },
          ]}
        />
      )}

      {!cargando && (
        <Banda bg={BLANCO}>
          <div style={wrap}>Hoy · {hoy.getDate()} de {MESES[hoy.getMonth()]} · qué toca</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
            <div style={{ ...card(MARINO), padding: '18px 20px', color: ARENA }}>
              <div style={{ fontFamily: OSW, fontWeight: 600, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>Cuenta Pagos …5513</div>
              {pendientes.length > 0 ? (
                <>
                  <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(24px,3vw,36px)', color: AMBAR, margin: '6px 0 4px' }}>
                    Ten {EUR(sumBy(pendientes, c => c.importe))} antes del {fechaCorta(pendientes[0].fecha)}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.9 }}>
                    Para cubrir {pendientes.length} recibo{pendientes.length > 1 ? 's' : ''} de los próximos 14 días. No leo el saldo del banco: comprueba que ya esté.
                  </div>
                </>
              ) : (
                <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(22px,2.6vw,32px)', color: AMBAR, margin: '6px 0 4px' }}>Sin recibos en 14 días</div>
              )}
              <div style={{ fontSize: 13, fontWeight: 700, borderTop: `2px solid ${ARENA}`, marginTop: 10, paddingTop: 8 }}>
                Siguiente ingreso fijo: el {fechaCorta(proxIngreso)} → {EUR(totalPlanFijos)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, borderTop: `2px solid ${ARENA}`, marginTop: 8, paddingTop: 8 }}>
                Cuenta Caixa …5042: {diferencia > 0 ? `a David le faltan ${EUR(diferencia)} al mes por aportar` : 'aportación al día'}
              </div>
            </div>
            <div style={{ ...card(BLANCO), padding: '18px 20px' }}>
              <div style={{ fontFamily: OSW, fontWeight: 600, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Recibos de los próximos 14 días</div>
              {cobros.length === 0 && <div style={{ fontSize: 13, color: GRIS, fontWeight: 600 }}>Nada pendiente.</div>}
              {cobros.map(c => (
                <div key={c.f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, borderTop: `2px solid ${ARENA_CL}`, padding: '6px 0' }}>
                  <ComercioIcon nombre={c.f.concepto} rubro={c.f.categoria} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.f.concepto}</span>
                    <span style={{ display: 'block', fontSize: 11, color: GRIS }}>{c.cuando}</span>
                  </span>
                  <span style={{ fontFamily: OSW, fontWeight: 700 }}>{E2(c.importe)}</span>
                  <BadgeNeo color={colorEstado[c.estado]}>{textoEstado[c.estado]}</BadgeNeo>
                </div>
              ))}
              {sinCobro.length > 0 && (
                <div style={{ marginTop: 10, background: TERRA, color: ARENA, padding: '8px 10px', fontSize: 12, fontWeight: 700 }}>
                  No consta el cobro de este mes: {sinCobro.map(c => c.f.concepto).join(', ')}. Mira el banco: si no ha salido, hay que ingresar o llamar.
                </div>
              )}
            </div>
          </div>
        </Banda>
      )}

      <Banda bg={ARENA_CL}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={{ ...wrap, textTransform: 'capitalize' }}>Portada · {etiquetaPeriodo}</div>
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
              <DonutCard titulo="Quién ingresa" total={totIng} color={OLIVA} sub={media(totIng)} paleta={PALETA_INGRESOS} detalle={detIng} filas={ingresos.map(x => ({ nombre: x.k, valor: x.v }))} />
              <DonutCard titulo="Gastos fijos" total={totFij} color={NARANJA} sub={media(totFij)} paleta={PALETA_FIJOS} detalle={detFij} filas={fijos.map(x => ({ nombre: x.k, valor: x.v }))} />
              <DonutCard titulo="Gastos variables" total={totVar} color={CELESTE} sub={media(totVar)} paleta={PALETA_VARIABLES} detalle={detVar} filas={variables.map(x => ({ nombre: x.k, valor: x.v }))} />
            </div>
          </>
        )}
      </Banda>

      {!cargando && per.key === 'mes' && (
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
                [`Variables previstos (aprende de ${pronVar.nMeses} meses)`, varPrev],
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

      {!cargando && (
        <Banda bg={AMBAR}>
          <div style={wrap}>Punto de equilibrio familiar · cuánto hay que facturar para cubrir la casa</div>
          {!equil ? (
            <div style={{ fontSize: 13, fontWeight: 600 }}>Faltan datos de facturación y liquidaciones de Cade para calcularlo.</div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 18, marginBottom: 14 }}>
                <KpiNeo label="La casa necesita" valor={EUR(necesidadCasa)} color={NARANJA} sub={`Rebeca cubre ${E(rebecaMedia3)} → David saca ${E(davidSaca)}`} />
                <KpiNeo label="Facturar al mes" valor={EUR(equil.totalEuros)} color={MARINO} sub={`Empresa ${E(equil.peEuros)} + sueldo de David para la casa ${E(equil.extraEuros)}`} />
                <KpiNeo label="Entregas al mes" valor={String(Math.ceil(equil.totalEntregas))} color={CELESTE} sub={`≈ ${equil.porDia.toFixed(1).replace('.', ',')} al día (26 días) · ${E2(equil.eurEntrega)} por entrega`} />
                <KpiNeo label="Cobertura actual" valor={P0(equil.cobertura * 100)} color={equil.cobertura >= 1 ? OLIVA : NARANJA}
                  sub={equil.cobertura >= 1 ? `Cubres empresa y casa (facturas ${E(equil.ingresos)}/mes)` : `Faltan ~${Math.max(0, Math.ceil(equil.totalEntregas - equil.actuales))} entregas al mes`} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>
                Mismo método que Punto de equilibrio: cada euro facturado deja {P0(equil.mc * 100)} tras los costes variables. Primero se cubre la empresa; el sueldo que David necesita para la casa (lo que envía a la familia) se suma encima. Hoy se lleva de media {E(datosEmp?.sueldoDavid ?? 0)} al mes.
              </div>
            </>
          )}
        </Banda>
      )}

      {!cargando && pronVar.nMeses > 0 && (
        <Banda bg={ARENA_CL}>
          <div style={wrap}>Previsión de variables · se afina cada mes</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 18, marginBottom: 16 }}>
            <KpiNeo label="Previsto próximo mes" valor={EUR(pronVar.totalPrev)} color={CELESTE} sub={`Media simple de 3 meses: ${E(varMedia3)}`} />
            <KpiNeo label="Acierto en meses pasados" valor={pronVar.acierto != null ? P0(pronVar.acierto * 100) : '—'} color={OLIVA}
              sub={pronVar.acierto != null ? `Aprende de ${pronVar.nMeses} meses cerrados` : 'Hacen falta al menos 2 meses cerrados'} />
            <KpiNeo label="Último mes cerrado" valor={EUR(pronVar.ultimoReal)} color={MARINO} sub={`Se había previsto ${E(pronVar.ultimoPrev)}`} />
          </div>
          <TablaWrap>
            <thead><tr>{['Categoría', 'Previsto', 'Último mes real', 'Se había previsto'].map(h => <th key={h} style={thNeo}>{h}</th>)}</tr></thead>
            <tbody>
              {pronVar.filas.map((f, i) => {
                const alt = i % 2 === 1
                const n = f.serie.length
                return (
                  <tr key={f.cat}>
                    <td style={tdEstado(alt, CELESTE)}>{f.nombre}</td>
                    <td style={{ ...tdNeo(alt), textAlign: 'right', fontFamily: OSW, fontWeight: 700 }}>{E(f.prev)}</td>
                    <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{n > 0 ? E(f.serie[n - 1]) : '—'}</td>
                    <td style={{ ...tdNeo(alt), textAlign: 'right', color: GRIS }}>{n > 1 ? E(f.preds[n - 1]) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </TablaWrap>
          <div style={{ marginTop: 8, fontSize: 12, color: GRIS, fontWeight: 600 }}>
            Cada mes cerrado se compara con lo previsto y la previsión da más peso a lo reciente en las categorías que cambian. Abril y el mes en curso no cuentan: están incompletos.
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
                    <BadgeNeo key={s.k} color={MARINO}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <IconoRubro clave={s.k} size={12} color={ARENA} />{labelSub(s.k)} {P0(c.total > 0 ? (s.v / c.total) * 100 : 0)}
                      </span>
                    </BadgeNeo>
                  ))}
                </div>
                {c.comercios.slice(0, 8).map(x => (
                  <div key={x.k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, padding: '3px 0' }}>
                    <ComercioIcon nombre={x.k} rubro={c.subDe.get(x.k) ?? c.cat} />
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
              <tr>{['Gasto', 'Categoría', 'Cuándo', 'Importe real', 'Último cobro en el banco', 'Al mes'].map(h => <th key={h} style={thNeo}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {plan.map((f, i) => {
                const alt = i % 2 === 1
                return (
                  <tr key={f.id}>
                    <td style={tdEstado(alt, NARANJA)}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><ComercioIcon nombre={f.concepto} rubro={f.categoria} size={22} />{f.concepto}</span>
                    </td>
                    <td style={tdNeo(alt)}>{f.categoria.replace(/-familia|hogar-/g, '').replace(/-/g, ' ')}</td>
                    <td style={tdNeo(alt)}>{f.dia_cobro ? `${f.periodicidad} · ${f.dia_cobro}` : f.periodicidad}</td>
                    <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{f.importe_real != null ? E2(f.importe_real) : 'varía'}</td>
                    <td style={{ ...tdNeo(alt), textAlign: 'right' }}>
                      {(() => {
                        const u = movsFijo.get(f.id)?.[0]
                        return u ? `${E2(-u.importe)} · ${fechaIso(u.fecha)}` : <span style={{ color: GRIS }}>sin cobro registrado</span>
                      })()}
                    </td>
                    <td style={{ ...tdNeo(alt), textAlign: 'right', fontFamily: OSW, fontWeight: 700 }}>{E2(f.importe_mensual)}</td>
                  </tr>
                )
              })}
              <tr>
                <td style={{ ...tdNeo(false), fontFamily: OSW, fontWeight: 700 }} colSpan={5}>TOTAL AL MES</td>
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
