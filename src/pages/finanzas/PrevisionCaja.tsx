import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts'
import { supabase } from '@/lib/supabase'
import { fmtEur } from '@/lib/format'
import { useCicloPagoCade, fechaLimiteCobro, TEXTO_SIN_CONFIRMAR } from '@/lib/configCade'
import { gastosRecurrentes, proyectarGastos, proyectarCaja, semaforoCaja, type MovHist, type MovPrevisto } from '@/lib/previsionCaja'
import { INK, ARENA, ARENA_CL, BLANCO, GRIS, OLIVA, TERRA, NARANJA, AMBAR, CELESTE, OSW, LEX, BORDER_CARD } from '@/styles/neobrutal'
import { PageNeo, Banda, CabeceraNeo, HeroNeo, TablaWrap, thNeo, tdNeo, tdEstado, BadgeNeo, PillsNeo } from '@/components/neo/NeoUI'

/* Previsión de caja: "el día X te quedan Y €". Saldo real del banco + lo que Cade debe (con fecha solo si el ciclo
   de pago está confirmado) − los gastos que se repiten cada mes (media de los últimos 3 meses, en su día típico). */

interface Cuenta { saldo_actual: number | null; saldo_fecha: string | null; personal: boolean | null; activa: boolean | null }
interface Factura { id: string; periodo: string | null; total: number | null; transportista: string | null; emisor: string | null }
interface Cat { codigo: string; nombre: string; ambito: string }

const hoyIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const addMeses = (isoDia: string, n: number) => { const d = new Date(isoDia + 'T00:00:00'); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10) }
const eur2 = (n: number | null | undefined) => fmtEur(n, { decimals: 2 })
const fCorta = (f: string) => new Date(f + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

export default function PrevisionCaja() {
  const ciclo = useCicloPagoCade()
  const [horizonte, setHorizonte] = useState<'30 días' | '60 días'>('60 días')
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [hist, setHist] = useState<MovHist[]>([])
  const [cats, setCats] = useState<Cat[]>([])
  const [cargando, setCargando] = useState(true)
  const hoy = hoyIso()
  const dias = horizonte === '30 días' ? 30 : 60

  useEffect(() => {
    const desdeHist = addMeses(`${hoy.slice(0, 7)}-01`, -3)
    Promise.all([
      supabase.from('cuentas_bancarias').select('saldo_actual, saldo_fecha, personal, activa'),
      supabase.from('facturas_emitidas').select('id, periodo, total, transportista, emisor').eq('cliente', 'CADE').eq('estado', 'PENDIENTE'),
      supabase.from('conciliacion').select('fecha, importe, categoria').gte('fecha', desdeHist).lte('fecha', hoy).limit(5000),
      supabase.from('categorias_contables_gastos').select('codigo, nombre, ambito'),
    ]).then(([c, f, h, k]) => {
      setCuentas((c.data ?? []) as Cuenta[]); setFacturas((f.data ?? []) as Factura[])
      setHist((h.data ?? []) as MovHist[]); setCats((k.data ?? []) as Cat[])
      setCargando(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saldo = cuentas.filter(c => c.activa !== false && !c.personal).reduce((s, c) => s + Number(c.saldo_actual ?? 0), 0)
  const fechaSaldo = cuentas.map(c => c.saldo_fecha).filter(Boolean).sort().pop() ?? null

  const modelo = useMemo(() => {
    const actividad = new Set(cats.filter(c => c.ambito === 'actividad').map(c => c.codigo))
    const nombres = new Map(cats.map(c => [c.codigo, c.nombre]))
    const histCerrado = hist.filter(m => m.fecha < `${hoy.slice(0, 7)}-01`)  // 3 meses cerrados, sin el mes en curso
    const rec = gastosRecurrentes(histCerrado, actividad)
    const yaPagados = new Set(hist.filter(m => m.fecha >= `${hoy.slice(0, 7)}-01` && Number(m.importe) < 0 && m.categoria).map(m => m.categoria as string))
    const gastos = proyectarGastos(rec, hoy, dias, yaPagados, nombres)
    const cobros: MovPrevisto[] = []
    const sinFecha: Factura[] = []
    for (const f of facturas) {
      const fl = fechaLimiteCobro(f.periodo, ciclo.diaLimite)
      if (!fl) { sinFecha.push(f); continue }
      const fIso = fl.toISOString().slice(0, 10)
      const fecha = fIso < hoy ? hoy : fIso
      cobros.push({ fecha, importe: Number(f.total ?? 0), concepto: `Cade · ${f.transportista ?? ''} ${f.periodo ? f.periodo.slice(0, 7) : ''}`.trim(), tipo: 'cobro' })
    }
    const movs = [...gastos, ...cobros].sort((a, b) => a.fecha.localeCompare(b.fecha))
    const caja = proyectarCaja(saldo, movs, hoy, dias)
    const gastoMensual = rec.reduce((s, g) => s + g.mediaMes, 0)
    return { rec, movs, caja, gastoMensual, sinFecha, semaforo: semaforoCaja(caja.minimo.saldo, gastoMensual) }
  }, [cats, hist, facturas, saldo, dias, hoy, ciclo.diaLimite])

  const color = modelo.semaforo === 'mal' ? TERRA : modelo.semaforo === 'justo' ? NARANJA : OLIVA
  const sinHist = !cargando && modelo.rec.length === 0

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Dinero" titulo="Previsión de caja">
        <PillsNeo value={horizonte} onChange={v => setHorizonte(v as '30 días' | '60 días')} options={['30 días', '60 días']} />
      </CabeceraNeo>

      <HeroNeo
        eyebrowTxt={`Punto más bajo de la caja · próximos ${dias} días`}
        cifra={cargando ? '…' : sinHist ? '—' : eur2(modelo.caja.minimo.saldo)}
        color={color}
        frase={cargando ? 'Cargando…' : sinHist ? 'Aún no hay 2 meses de banco categorizado para proyectar gastos.'
          : `El ${fCorta(modelo.caja.minimo.fecha)} te quedarían ${eur2(modelo.caja.minimo.saldo)}. ${modelo.semaforo === 'mal' ? 'La caja se va por debajo de cero: adelanta un cobro o retrasa un pago.' : modelo.semaforo === 'justo' ? 'Cubre menos de medio mes de gastos: vigila.' : 'Cubre más de medio mes de gastos.'}`}
        apoyo={sinHist ? undefined : [
          { label: 'Saldo hoy', valor: eur2(saldo) },
          { label: 'Gastos que se repiten / mes', valor: eur2(modelo.gastoMensual) },
          { label: `Saldo a ${dias} días`, valor: eur2(modelo.caja.final) },
        ]}
      />

      {!ciclo.cargando && !ciclo.diaLimite && facturas.length > 0 && (
        <Banda bg={AMBAR} style={{ padding: '14px 40px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {TEXTO_SIN_CONFIRMAR} {facturas.length} factura{facturas.length > 1 ? 's' : ''} de Cade pendientes ({eur2(facturas.reduce((s, f) => s + Number(f.total ?? 0), 0))}) no tienen fecha de cobro y no entran en la curva.
            <Link to="/finanzas/liquidaciones" style={{ fontFamily: OSW, fontWeight: 700, textTransform: 'uppercase', fontSize: 12, color: ARENA, background: INK, padding: '4px 10px', textDecoration: 'none' }}>Confirmar ciclo →</Link>
          </div>
        </Banda>
      )}

      {!sinHist && (
        <Banda bg={BLANCO}>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={modelo.caja.serie} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs><linearGradient id="caja" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.35} /><stop offset="100%" stopColor={color} stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid stroke={ARENA_CL} strokeDasharray="3 3" />
                <XAxis dataKey="fecha" tickFormatter={fCorta} tick={{ fontFamily: LEX, fontSize: 11, fill: INK }} interval={dias > 30 ? 9 : 4} />
                <YAxis tickFormatter={v => fmtEur(Number(v))} tick={{ fontFamily: LEX, fontSize: 11, fill: INK }} width={70} />
                <Tooltip formatter={(v) => [eur2(Number(v)), 'Saldo previsto']} labelFormatter={l => fCorta(String(l))} contentStyle={{ fontFamily: LEX, fontSize: 12, border: `2px solid ${INK}`, borderRadius: 0 }} />
                <ReferenceLine y={0} stroke={INK} strokeWidth={2} />
                <Area type="stepAfter" dataKey="saldo" stroke={color} strokeWidth={3} fill="url(#caja)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 12, fontWeight: 600, color: GRIS, maxWidth: 760 }}>
            Saldo real del banco ({fechaSaldo ? `actualizado ${new Date(fechaSaldo).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'sin fecha'}) más los cobros de Cade con fecha, menos los gastos que se repiten cada mes (media de los últimos 3 meses, cada uno en el día en que suele pagarse; lo ya pagado este mes no se cuenta dos veces).
          </p>
        </Banda>
      )}

      <Banda bg={ARENA}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 16, textTransform: 'uppercase', marginBottom: 10 }}>Lo que viene</div>
        <TablaWrap>
          <thead><tr>{['Fecha', 'Concepto', 'Importe', 'Tipo'].map(h => <th key={h} style={thNeo}>{h}</th>)}</tr></thead>
          <tbody>
            {modelo.movs.length === 0 && <tr><td colSpan={4} style={{ ...tdNeo(false), textAlign: 'center', color: GRIS, padding: 24 }}>Nada previsto en el horizonte.</td></tr>}
            {modelo.movs.map((m, i) => (
              <tr key={i}>
                <td style={{ ...tdEstado(i % 2 === 1, m.tipo === 'cobro' ? OLIVA : NARANJA), fontFamily: OSW, fontWeight: 700 }}>{fCorta(m.fecha)}</td>
                <td style={tdNeo(i % 2 === 1)}>{m.concepto}</td>
                <td style={{ ...tdNeo(i % 2 === 1), textAlign: 'right', fontFamily: OSW, fontWeight: 700, color: m.importe >= 0 ? OLIVA : NARANJA }}>{fmtEur(m.importe, { decimals: 2, signed: true })}</td>
                <td style={tdNeo(i % 2 === 1)}><BadgeNeo color={m.tipo === 'cobro' ? CELESTE : ARENA_CL}>{m.tipo === 'cobro' ? 'Cobro con fecha' : 'Gasto estimado'}</BadgeNeo></td>
              </tr>
            ))}
          </tbody>
        </TablaWrap>
        {modelo.rec.length > 0 && (
          <div style={{ marginTop: 14, background: BLANCO, border: BORDER_CARD, padding: '10px 14px', fontSize: 12, fontWeight: 600, color: GRIS }}>
            Gastos que se repiten: {modelo.rec.map(g => `${cats.find(c => c.codigo === g.categoria)?.nombre ?? g.categoria} ${fmtEur(g.mediaMes)} (día ${g.diaTipico})`).join(' · ')}
          </div>
        )}
      </Banda>
    </PageNeo>
  )
}
