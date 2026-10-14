import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmtEur, fmtPct } from '@/lib/format'
import { OLIVA, TERRA, AMBAR, CELESTE, GRIS, ARENA_CL, BLANCO, ARENA, INK, OSW } from '@/styles/neobrutal'
import {
  PageNeo, Banda, CabeceraNeo, KpiNeo, AvisoNeo,
  TablaWrap, thNeo, tdNeo, tdEstado, BadgeNeo, BotonNeo,
} from '@/components/neo/NeoUI'
import PortadaFamilia, { type SeccionFamilia } from '@/components/familia/PortadaFamilia'
import PresupuestoFamilia from '@/components/familia/PresupuestoFamilia'
import { usePeriodo } from '@/lib/periodoGlobal'

type Vista = 'semana' | 'mes'

interface FilaHogar {
  periodo: string
  etiqueta: string
  partida: string
  categoria: string
  gastado: number
  presupuesto: number | null
  desviacion: number
  pct_consumido: number | null
  estado: 'holgado' | 'ajustado' | 'desviado' | 'sin presupuesto'
}

interface FilaGlobal {
  periodo: string
  etiqueta: string
  ingresos_actividad: number
  gastos_actividad: number
  resultado_actividad: number
  gasto_hogar: number
  ahorro_real: number
  presupuesto_hogar: number
  desviacion_hogar: number
  sin_clasificar: number
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
function etiquetaMes(mes: string): string {
  const d = new Date(mes + 'T00:00:00')
  if (isNaN(d.getTime())) return mes
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`
}

const colorEstado = (estado: FilaHogar['estado']) => {
  if (estado === 'desviado') return TERRA
  if (estado === 'ajustado') return AMBAR
  if (estado === 'holgado') return OLIVA
  return GRIS
}
const labelEstado: Record<FilaHogar['estado'], string> = {
  holgado: 'Holgado', ajustado: 'Ajustado', desviado: 'Desviado', 'sin presupuesto': 'Sin presupuesto',
}

export default function RunningFamilia() {
  const per = usePeriodo()
  const vista: Vista = per.esSemana ? 'semana' : 'mes'
  const [hogar, setHogar] = useState<FilaHogar[]>([])
  const [global, setGlobal] = useState<FilaGlobal[]>([])
  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [valorEdit, setValorEdit] = useState('')
  type Pestana = SeccionFamilia | 'presupuesto'
  const PESTANAS: { id: Pestana; t: string }[] = [
    { id: 'hoy', t: 'Hoy' }, { id: 'resumen', t: 'Resumen' }, { id: 'presupuesto', t: 'Presupuesto' }, { id: 'prevision', t: 'Previsión' }, { id: 'recibos', t: 'Recibos' },
  ]
  const [pestana, setPestanaState] = useState<Pestana>(() => {
    try { const v = localStorage.getItem('david.familia.pestana') as Pestana | null; return v && PESTANAS.some(p => p.id === v) ? v : 'hoy' } catch { return 'hoy' }
  })
  const setPestana = (p: Pestana) => { setPestanaState(p); try { localStorage.setItem('david.familia.pestana', p) } catch { /* sin almacenamiento */ } }
  const escala: 'mes' | 'semana' = per.esSemana ? 'semana' : 'mes'

  async function cargar(v: Vista) {
    setLoading(true)
    setErrMsg(null)
    const esSemana = v === 'semana'
    const [h, g] = await Promise.all([
      supabase.from(esSemana ? 'v_pyg_hogar_semana' : 'v_pyg_hogar').select('*'),
      supabase.from(esSemana ? 'v_pyg_global_semana' : 'v_pyg_global').select('*').limit(esSemana ? 12 : 6),
    ])
    if (h.error) setErrMsg(h.error.message)
    else if (g.error) setErrMsg(g.error.message)

    const normH = ((h.data ?? []) as any[]).map(f => ({
      ...f,
      periodo: esSemana ? f.semana : f.mes,
      etiqueta: esSemana ? f.etiqueta : etiquetaMes(f.mes),
    })) as FilaHogar[]
    const normG = ((g.data ?? []) as any[]).map(f => ({
      ...f,
      periodo: esSemana ? f.semana : f.mes,
      etiqueta: esSemana ? f.etiqueta : etiquetaMes(f.mes),
    })) as FilaGlobal[]

    setHogar(normH.sort((a, b) => (a.periodo < b.periodo ? 1 : -1)))
    setGlobal(normG.sort((a, b) => (a.periodo < b.periodo ? 1 : -1)))
    setLoading(false)
  }
  useEffect(() => { cargar(vista) }, [vista])

  const etiquetaActual = per.etiqueta
  const filasActuales = useMemo(() => {
    const delPeriodo = hogar.filter(f => (vista === 'semana' ? f.periodo === per.desdeIso : per.meses.includes(String(f.periodo).slice(0, 7))))
    if (vista === 'semana' || per.meses.length <= 1) return delPeriodo
    /* varios meses: se suma por partida y se recalcula el estado */
    const mapa = new Map<string, FilaHogar>()
    for (const f of delPeriodo) {
      const x = mapa.get(f.categoria)
      if (!x) { mapa.set(f.categoria, { ...f }); continue }
      x.gastado = Number(x.gastado) + Number(f.gastado)
      x.presupuesto = x.presupuesto != null || f.presupuesto != null ? Number(x.presupuesto ?? 0) + Number(f.presupuesto ?? 0) : null
    }
    return Array.from(mapa.values()).map(f => {
      const pres = f.presupuesto
      const desv = pres != null ? Math.round((f.gastado - pres) * 100) / 100 : 0
      const pct = pres != null && pres > 0 ? Math.round((f.gastado / pres) * 100) : null
      const estado: FilaHogar['estado'] = pres == null ? 'sin presupuesto' : f.gastado <= pres * 0.9 ? 'holgado' : f.gastado <= pres ? 'ajustado' : 'desviado'
      return { ...f, desviacion: desv, pct_consumido: pct, estado }
    }).sort((a, b) => b.gastado - a.gastado)
  }, [hogar, vista, per.desdeIso, per.meses])

  const kpis = useMemo(() => {
    const gastado = filasActuales.reduce((s, f) => s + Number(f.gastado || 0), 0)
    const presupuesto = filasActuales.reduce((s, f) => s + Number(f.presupuesto || 0), 0)
    const desviadas = filasActuales.filter(f => f.estado === 'desviado').length
    const filasG = global.filter(g => (vista === 'semana' ? g.periodo === per.desdeIso : per.meses.includes(String(g.periodo).slice(0, 7))))
    const ahorro = filasG.length ? filasG.reduce((s, g) => s + Number(g.ahorro_real || 0), 0) : null
    return { gastado, presupuesto, desviadas, ahorro }
  }, [filasActuales, global, vista, per.desdeIso, per.meses])

  /* El presupuesto se fija siempre en importe MENSUAL (es como piensa la gente los fijos:
     hipoteca, colegio, seguro). La vista semanal lo reparte sola: mensual × 12 / 52. */
  async function guardarPresupuesto(categoria: string) {
    const importe = Number(valorEdit.replace(',', '.'))
    if (isNaN(importe) || importe < 0) { setEditando(null); return }
    const { error } = await supabase
      .from('presupuestos_hogar')
      .upsert({ categoria, mes: null, importe }, { onConflict: 'categoria,mes' })
    if (error) { setErrMsg(error.message); return }
    setEditando(null)
    setValorEdit('')
    cargar(vista)
  }

  const unidad = vista === 'semana' ? 'semana' : 'mes'
  const delUnidad = vista === 'semana' ? 'de la semana' : 'del mes'
  const estaUnidad = vista === 'semana' ? 'esta semana' : 'este mes'
  const hayGlobal = global.length > 0

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Finanzas · Hogar" titulo="Running Familia">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <BotonNeo bg={escala === 'mes' ? AMBAR : ARENA} onClick={() => per.setKey('mes')}>Por meses</BotonNeo>
            <BotonNeo bg={escala === 'semana' ? AMBAR : ARENA} onClick={() => per.setKey('semana')}>Por semanas</BotonNeo>
          </div>
          <div style={{ fontFamily: OSW, fontWeight: 600, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', color: ARENA }}>{per.etiqueta}</div>
        </div>
      </CabeceraNeo>

      {/* Pestañas: una pantalla por tema, sin scroll infinito */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: INK, display: 'flex', gap: 0, overflowX: 'auto', borderBottom: `3px solid ${INK}` }}>
        {PESTANAS.map(p => (
          <button key={p.id} onClick={() => setPestana(p.id)}
            style={{
              fontFamily: OSW, fontWeight: 700, fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', whiteSpace: 'nowrap',
              padding: '12px 18px', border: 0, cursor: 'pointer',
              background: pestana === p.id ? AMBAR : INK, color: pestana === p.id ? INK : ARENA,
            }}>
            {p.t}
          </button>
        ))}
      </div>

      {errMsg && <AvisoNeo>ERROR: {errMsg}</AvisoNeo>}

      {pestana !== 'presupuesto' && <PortadaFamilia seccion={pestana} escala={escala} />}

      {pestana === 'presupuesto' && <PresupuestoFamilia escala={escala} />}

      {pestana === 'presupuesto' && (
      <Banda bg={ARENA_CL}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 16, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14, color: INK }}>
          Empresa + Hogar · {vista === 'semana' ? 'últimas 12 semanas' : 'últimos 6 meses'}
        </div>
        <TablaWrap>
          <thead>
            <tr>
              {[vista === 'semana' ? 'Semana' : 'Mes', 'Resultado actividad', 'Gasto hogar', 'Ahorro real', 'Presupuesto hogar', 'Desviación hogar', 'Sin clasificar'].map(h => (
                <th key={h} style={thNeo}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && !hayGlobal && (
              <tr><td colSpan={7} style={{ ...tdNeo(false), textAlign: 'center', color: GRIS, padding: 32 }}>Sin datos todavía.</td></tr>
            )}
            {global.map((g, i) => {
              const alt = i % 2 === 1
              const okAhorro = g.ahorro_real >= 0
              return (
                <tr key={g.periodo}>
                  <td style={{ ...tdEstado(alt, okAhorro ? OLIVA : TERRA), fontFamily: OSW, fontWeight: 700 }}>{g.etiqueta}{vista === 'mes' && g.periodo?.startsWith(new Date().toISOString().slice(0, 7)) ? ' · en curso' : ''}</td>
                  <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{fmtEur(g.resultado_actividad)}</td>
                  <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{fmtEur(g.gasto_hogar)}</td>
                  <td style={{ ...tdNeo(alt), textAlign: 'right', fontFamily: OSW, fontWeight: 700, color: okAhorro ? OLIVA : TERRA }}>{fmtEur(g.ahorro_real)}</td>
                  <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{g.presupuesto_hogar > 0 ? fmtEur(g.presupuesto_hogar) : '—'}</td>
                  <td style={{ ...tdNeo(alt), textAlign: 'right', color: g.desviacion_hogar > 0 ? TERRA : OLIVA }}>
                    {g.presupuesto_hogar > 0 ? fmtEur(g.desviacion_hogar) : '—'}
                  </td>
                  <td style={{ ...tdNeo(alt), textAlign: 'right', color: g.sin_clasificar !== 0 ? AMBAR : GRIS }}>{fmtEur(g.sin_clasificar)}</td>
                </tr>
              )
            })}
          </tbody>
        </TablaWrap>
      </Banda>
      )}
    </PageNeo>
  )
}
