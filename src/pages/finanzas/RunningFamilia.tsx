import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmtEur, fmtPct } from '@/lib/format'
import { OLIVA, TERRA, AMBAR, CELESTE, GRIS, ARENA_CL, BLANCO, ARENA, INK, OSW } from '@/styles/neobrutal'
import {
  PageNeo, Banda, CabeceraNeo, KpiNeo, AvisoNeo,
  TablaWrap, thNeo, tdNeo, tdEstado, BadgeNeo, BotonNeo,
} from '@/components/neo/NeoUI'

interface FilaHogar {
  mes: string
  partida: string
  categoria: string
  gastado: number
  presupuesto: number | null
  desviacion: number
  pct_consumido: number | null
  estado: 'holgado' | 'ajustado' | 'desviado' | 'sin presupuesto'
}

interface FilaGlobal {
  mes: string
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
function fmtMes(mes: string): string {
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
  const [hogar, setHogar] = useState<FilaHogar[]>([])
  const [global, setGlobal] = useState<FilaGlobal[]>([])
  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [valorEdit, setValorEdit] = useState('')

  async function cargar() {
    setLoading(true)
    const [h, g] = await Promise.all([
      supabase.from('v_pyg_hogar').select('*').order('mes', { ascending: false }),
      supabase.from('v_pyg_global').select('*').order('mes', { ascending: false }).limit(6),
    ])
    if (h.error) setErrMsg(h.error.message)
    else if (g.error) setErrMsg(g.error.message)
    setHogar((h.data ?? []) as FilaHogar[])
    setGlobal((g.data ?? []) as FilaGlobal[])
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  const mesActual = useMemo(() => (hogar[0]?.mes ?? global[0]?.mes ?? null), [hogar, global])
  const filasMesActual = useMemo(() => hogar.filter(f => f.mes === mesActual), [hogar, mesActual])

  const kpis = useMemo(() => {
    const gastado = filasMesActual.reduce((s, f) => s + Number(f.gastado || 0), 0)
    const presupuesto = filasMesActual.reduce((s, f) => s + Number(f.presupuesto || 0), 0)
    const desviadas = filasMesActual.filter(f => f.estado === 'desviado').length
    const ahorro = global[0]?.ahorro_real ?? null
    return { gastado, presupuesto, desviadas, ahorro }
  }, [filasMesActual, global])

  async function guardarPresupuesto(categoria: string) {
    const importe = Number(valorEdit.replace(',', '.'))
    if (isNaN(importe) || importe < 0) { setEditando(null); return }
    const { error } = await supabase
      .from('presupuestos_hogar')
      .upsert({ categoria, mes: null, importe }, { onConflict: 'categoria,mes' })
    if (error) { setErrMsg(error.message); return }
    setEditando(null)
    setValorEdit('')
    cargar()
  }

  const hayDatos = hogar.length > 0
  const hayGlobal = global.length > 0

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Finanzas · Hogar" titulo="Running Familia">
        <div style={{ fontSize: 13, fontWeight: 600, color: ARENA, opacity: 0.85, maxWidth: 420 }}>
          Economía doméstica de David: en qué se va el dinero de casa, presupuesto por partida
          y cuánto queda de ahorro real una vez sumada la actividad.
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
          {kpis.desviadas} PARTIDA{kpis.desviadas > 1 ? 'S' : ''} POR ENCIMA DE PRESUPUESTO en {mesActual ? fmtMes(mesActual) : 'el mes actual'}.
        </AvisoNeo>
      )}

      {/* KPIs del mes actual */}
      <Banda bg={ARENA_CL}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
          <KpiNeo label="Gasto familiar del mes" valor={fmtEur(kpis.gastado)} color={CELESTE}
            sub={mesActual ? fmtMes(mesActual) : undefined} />
          <KpiNeo label="Presupuesto asignado" valor={kpis.presupuesto > 0 ? fmtEur(kpis.presupuesto) : '— sin definir'} />
          <KpiNeo label="Partidas desviadas" valor={String(kpis.desviadas)} color={kpis.desviadas > 0 ? TERRA : OLIVA} />
          <KpiNeo label="Ahorro real (empresa − casa)" valor={kpis.ahorro != null ? fmtEur(kpis.ahorro) : '—'}
            color={kpis.ahorro != null && kpis.ahorro >= 0 ? OLIVA : TERRA}
            sub="Resultado de la actividad menos el gasto del hogar" />
        </div>
      </Banda>

      {/* Detalle por partida: gastado vs presupuesto vs desviación */}
      <Banda bg={BLANCO}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 16, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14, color: INK }}>
          Partidas del hogar {mesActual ? `· ${fmtMes(mesActual)}` : ''}
        </div>
        <TablaWrap>
          <thead>
            <tr>
              {['Partida', 'Gastado', 'Presupuesto', 'Desviación', '% consumido', 'Estado', ''].map(h => (
                <th key={h} style={thNeo}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={{ ...tdNeo(false), textAlign: 'center', color: GRIS, padding: 32 }}>Cargando…</td></tr>
            )}
            {!loading && filasMesActual.length === 0 && (
              <tr><td colSpan={7} style={{ ...tdNeo(false), textAlign: 'center', color: GRIS, padding: 32 }}>Sin gasto doméstico registrado todavía.</td></tr>
            )}
            {filasMesActual.map((f, i) => {
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
                        autoFocus type="text" value={valorEdit}
                        onChange={e => setValorEdit(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') guardarPresupuesto(f.categoria); if (e.key === 'Escape') setEditando(null) }}
                        onBlur={() => guardarPresupuesto(f.categoria)}
                        style={{ width: 90, textAlign: 'right', border: `2px solid ${INK}`, padding: '3px 6px', fontFamily: OSW, fontSize: 13 }}
                      />
                    ) : (
                      <span
                        onClick={() => { setEditando(f.categoria); setValorEdit(f.presupuesto ? String(f.presupuesto) : '') }}
                        style={{ cursor: 'pointer', borderBottom: `1px dashed ${GRIS}` }}
                        title="Clic para fijar el presupuesto de esta partida"
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
                      <BotonNeo bg={ARENA} onClick={() => { setEditando(f.categoria); setValorEdit(f.presupuesto ? String(f.presupuesto) : '') }}>
                        Editar
                      </BotonNeo>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </TablaWrap>
      </Banda>

      {/* Foto única: empresa + hogar + ahorro real, últimos 6 meses */}
      <Banda bg={ARENA_CL}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 16, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14, color: INK }}>
          Empresa + Hogar · últimos 6 meses
        </div>
        <TablaWrap>
          <thead>
            <tr>
              {['Mes', 'Resultado actividad', 'Gasto hogar', 'Ahorro real', 'Presupuesto hogar', 'Desviación hogar', 'Sin clasificar'].map(h => (
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
                <tr key={g.mes}>
                  <td style={{ ...tdEstado(alt, okAhorro ? OLIVA : TERRA), fontFamily: OSW, fontWeight: 700, textTransform: 'capitalize' }}>{fmtMes(g.mes)}</td>
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
