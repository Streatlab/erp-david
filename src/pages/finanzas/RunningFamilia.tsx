import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmtEur, fmtPct } from '@/lib/format'
import { OLIVA, TERRA, AMBAR, CELESTE, GRIS, ARENA_CL, BLANCO, ARENA, INK, OSW } from '@/styles/neobrutal'
import {
  PageNeo, Banda, CabeceraNeo, KpiNeo, AvisoNeo,
  TablaWrap, thNeo, tdNeo, tdEstado, BadgeNeo, BotonNeo,
} from '@/components/neo/NeoUI'

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
  const [vista, setVista] = useState<Vista>('semana')
  const [hogar, setHogar] = useState<FilaHogar[]>([])
  const [global, setGlobal] = useState<FilaGlobal[]>([])
  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [valorEdit, setValorEdit] = useState('')

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

  const periodoActual = useMemo(() => (hogar[0]?.periodo ?? global[0]?.periodo ?? null), [hogar, global])
  const etiquetaActual = useMemo(() => (hogar[0]?.etiqueta ?? global[0]?.etiqueta ?? ''), [hogar, global])
  const filasActuales = useMemo(() => hogar.filter(f => f.periodo === periodoActual), [hogar, periodoActual])

  const kpis = useMemo(() => {
    const gastado = filasActuales.reduce((s, f) => s + Number(f.gastado || 0), 0)
    const presupuesto = filasActuales.reduce((s, f) => s + Number(f.presupuesto || 0), 0)
    const desviadas = filasActuales.filter(f => f.estado === 'desviado').length
    const ahorro = global[0]?.ahorro_real ?? null
    return { gastado, presupuesto, desviadas, ahorro }
  }, [filasActuales, global])

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
  const hayDatos = hogar.length > 0
  const hayGlobal = global.length > 0

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Finanzas · Hogar" titulo="Running Familia">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <BotonNeo bg={vista === 'semana' ? AMBAR : ARENA} onClick={() => setVista('semana')}>Por semanas</BotonNeo>
            <BotonNeo bg={vista === 'mes' ? AMBAR : ARENA} onClick={() => setVista('mes')}>Por meses</BotonNeo>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: ARENA, opacity: 0.85, maxWidth: 420, textAlign: 'right' }}>
            Economía doméstica de David: en qué se va el dinero de casa, presupuesto por partida
            y cuánto queda de ahorro real una vez sumada la actividad.
          </div>
        </div>
      </CabeceraNeo>

      {errMsg && <AvisoNeo>ERROR: {errMsg}</AvisoNeo>}

      {!loading && !hayDatos && (
        <AvisoNeo>
          TODAVÍA NO HAY MOVIMIENTOS DOMÉSTICOS. En cuanto se conecten las cuentas de BBVA, CaixaBank
          y N26, esta pantalla se rellena sola — la estructura y las partidas ya están listas.
        </AvisoNeo>
      )}

      {kpis.desviadas > 0 && (
        <AvisoNeo>
          {kpis.desviadas} PARTIDA{kpis.desviadas > 1 ? 'S' : ''} POR ENCIMA DE PRESUPUESTO en {etiquetaActual || `esta ${unidad}`}.
        </AvisoNeo>
      )}

      <Banda bg={ARENA_CL}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
          <KpiNeo label={`Gasto familiar de la ${unidad}`} valor={fmtEur(kpis.gastado)} color={CELESTE} sub={etiquetaActual || undefined} />
          <KpiNeo label={`Presupuesto de la ${unidad}`} valor={kpis.presupuesto > 0 ? fmtEur(kpis.presupuesto) : '— sin definir'} />
          <KpiNeo label="Partidas desviadas" valor={String(kpis.desviadas)} color={kpis.desviadas > 0 ? TERRA : OLIVA} />
          <KpiNeo label="Ahorro real (empresa − casa)" valor={kpis.ahorro != null ? fmtEur(kpis.ahorro) : '—'}
            color={kpis.ahorro != null && kpis.ahorro >= 0 ? OLIVA : TERRA}
            sub={`Resultado de la actividad menos el gasto del hogar en la ${unidad}`} />
        </div>
      </Banda>

      <Banda bg={BLANCO}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 16, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, color: INK }}>
          Partidas del hogar {etiquetaActual ? `· ${etiquetaActual}` : ''}
        </div>
        <div style={{ fontSize: 12, color: GRIS, marginBottom: 12 }}>
          El presupuesto se fija en importe mensual. En la vista por semanas se reparte automáticamente (mensual × 12 ÷ 52).
        </div>
        <TablaWrap>
          <thead>
            <tr>
              {['Partida', 'Gastado', `Presupuesto ${unidad}`, 'Desviación', '% consumido', 'Estado', ''].map(h => (
                <th key={h} style={thNeo}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={{ ...tdNeo(false), textAlign: 'center', color: GRIS, padding: 32 }}>Cargando…</td></tr>
            )}
            {!loading && filasActuales.length === 0 && (
              <tr><td colSpan={7} style={{ ...tdNeo(false), textAlign: 'center', color: GRIS, padding: 32 }}>Sin gasto doméstico registrado todavía.</td></tr>
            )}
            {filasActuales.map((f, i) => {
              const alt = i % 2 === 1
              const color = colorEstado(f.estado)
              const enEdicion = editando === f.categoria
              return (
                <tr key={f.categoria}>
                  <td style={tdEstado(alt, color)}>{f.partida}</td>
                  <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{fmtEur(f.gastado)}</td>
                  <td style={{ ...tdNeo(alt), textAlign: 'right' }}>
                    {enEdicion ? (
                      <input
                        autoFocus type="text" value={valorEdit} placeholder="€/mes"
                        onChange={e => setValorEdit(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') guardarPresupuesto(f.categoria); if (e.key === 'Escape') setEditando(null) }}
                        onBlur={() => guardarPresupuesto(f.categoria)}
                        style={{ width: 90, textAlign: 'right', border: `2px solid ${INK}`, padding: '3px 6px', fontFamily: OSW, fontSize: 13 }}
                      />
                    ) : (
                      <span
                        onClick={() => { setEditando(f.categoria); setValorEdit('') }}
                        style={{ cursor: 'pointer', borderBottom: `1px dashed ${GRIS}` }}
                        title="Clic para fijar el presupuesto mensual de esta partida"
                      >
                        {f.presupuesto != null ? fmtEur(f.presupuesto) : 'Fijar →'}
                      </span>
                    )}
                  </td>
                  <td style={{ ...tdNeo(alt), textAlign: 'right', color: f.desviacion > 0 ? TERRA : OLIVA, fontFamily: OSW, fontWeight: 700 }}>
                    {f.presupuesto != null ? (f.desviacion > 0 ? `+${fmtEur(f.desviacion)}` : fmtEur(f.desviacion)) : '—'}
                  </td>
                  <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{f.pct_consumido != null ? fmtPct(f.pct_consumido) : '—'}</td>
                  <td style={tdNeo(alt)}><BadgeNeo color={color}>{labelEstado[f.estado]}</BadgeNeo></td>
                  <td style={tdNeo(alt)}>
                    {!enEdicion && (
                      <BotonNeo bg={ARENA} onClick={() => { setEditando(f.categoria); setValorEdit('') }}>Editar</BotonNeo>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </TablaWrap>
      </Banda>

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
                  <td style={{ ...tdEstado(alt, okAhorro ? OLIVA : TERRA), fontFamily: OSW, fontWeight: 700 }}>{g.etiqueta}</td>
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
    </PageNeo>
  )
}
