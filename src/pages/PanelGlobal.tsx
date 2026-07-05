import { useEffect, useState, useCallback, type CSSProperties, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import {
  cargarPanel, getBarrasSemanas, NOMBRE_MES, setObjetivoDia, setObjetivoMensual,
  type PanelBundle, type PeriodoKey, type BarraSemana,
} from '@/lib/panel/queries'
import {
  INK, MARINO, ARENA, ARENA_CL, BLANCO, GRIS,
  OLIVA, TERRA, NARANJA, CELESTE, AMBAR,
  OSW, LEX, SHADOW, BORDER, BORDER_CARD, PAD,
  d, eyebrow, card, EUR, E, ES, P0, DELTA,
} from '@/styles/neobrutal'

const PERIODOS: { key: PeriodoKey; label: string }[] = [
  { key: 'mes-actual',   label: 'Este mes' },
  { key: 'mes-anterior', label: 'Mes anterior' },
  { key: 'ultimos-30',   label: 'Últimos 30 días' },
  { key: 'trimestre',    label: 'Trimestre' },
  { key: 'anio',         label: 'Año' },
]

/* ── Pestañas principales (patrón estructural Binagre, paleta David) ── */

type MainTab = 'resumen' | 'operaciones' | 'finanzas' | 'cashflow' | 'evolucion'

const MAIN_TABS: { id: MainTab; label: string }[] = [
  { id: 'resumen',     label: 'Resumen' },
  { id: 'operaciones', label: 'Operaciones' },
  { id: 'finanzas',    label: 'Finanzas' },
  { id: 'cashflow',    label: 'Cashflow' },
  { id: 'evolucion',   label: 'Evolución' },
]

const TAB_LS_KEY = 'david_panel_main_tab'

/* Colores de operador según manual Neobrutal Mediterráneo */
const COLOR_OP_NEO: Record<string, string> = {
  mercadona: '#F26B1F', carrefour: '#7A8C3E', lidl: '#F5B84A', dia: '#C94A2C', prior: '#0B1524', cadeOtro: '#A89472',
}
const COLOR_GASTO_NEO: Record<string, string> = {
  rrhh: MARINO, renting: NARANJA, combustible: AMBAR, controlables: TERRA, otros: GRIS,
}

/* ── Liquidaciones Cade (datos reales para Operaciones/Finanzas) ── */

interface LiqRow {
  mes: string | null
  transportista: string | null
  entregas: number | null
  importe_entregas: number | null
  complemento_minimo: number | null
  recortes: number | null
  total: number | null
}

const MESES_CORTOS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function fmtMesCorto(mes: string | null): string {
  if (!mes) return '—'
  const dt = new Date(mes + 'T00:00:00')
  if (isNaN(dt.getTime())) return mes
  return `${MESES_CORTOS[dt.getMonth()]} ${String(dt.getFullYear()).slice(2)}`
}

/* ── Piezas ──────────────────────────────────────── */

function Banda({ bg, children, style }: { bg: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <section style={{ background: bg, borderBottom: BORDER, padding: `28px ${PAD}`, ...style }}>
      {children}
    </section>
  )
}

function BarraH({ pct, color, alto = 22 }: { pct: number; color: string; alto?: number }) {
  return (
    <div style={{ background: ARENA, border: BORDER_CARD, height: alto, position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, width: `${Math.min(100, Math.max(0, pct * 100))}%`, background: color }} />
    </div>
  )
}

function Spark({ data, color }: { data: { valor: number }[]; color: string }) {
  if (!data.length) return null
  const vals = data.map(p => p.valor)
  const min = Math.min(...vals), max = Math.max(...vals)
  const range = max - min || 1
  const W = 100, H = 30
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * W},${H - ((v - min) / range) * (H - 4) - 2}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 56, display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

const EST = (
  <span style={{ fontFamily: OSW, fontSize: 10, fontWeight: 600, letterSpacing: 1, border: `2px solid ${INK}`, padding: '1px 5px', marginLeft: 8, verticalAlign: 'middle', background: BLANCO, color: INK }}>
    EST
  </span>
)

/** Banda "próximamente": hueco honesto sin datos, con la pregunta de negocio. */
function BandaProximamente({ acento, pregunta, detalle }: { acento: string; pregunta: string; detalle: string }) {
  return (
    <Banda bg={ARENA}>
      <span style={eyebrow(acento, ARENA)}>Próximamente</span>
      <h2 style={{ ...d('clamp(20px,2.4vw,30px)'), margin: '12px 0 8px' }}>{pregunta}</h2>
      <div style={{ fontSize: 13, fontWeight: 600, color: GRIS, maxWidth: 640 }}>{detalle}</div>
    </Banda>
  )
}

/* ── Página ──────────────────────────────────────── */

export default function PanelGlobal() {
  const [periodo, setPeriodo] = useState<PeriodoKey>('mes-actual')
  const [bundle, setBundle] = useState<PanelBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [liqs, setLiqs] = useState<LiqRow[]>([])
  const [barras12, setBarras12] = useState<BarraSemana[]>([])
  const [mainTab, setMainTab] = useState<MainTab>(() => {
    if (typeof window !== 'undefined') {
      const s = localStorage.getItem(TAB_LS_KEY) as MainTab | null
      if (s && MAIN_TABS.some(t => t.id === s)) return s
    }
    return 'resumen'
  })
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(TAB_LS_KEY, mainTab)
  }, [mainTab])

  const cargar = useCallback(async () => {
    setLoading(true)
    setErrMsg(null)
    try { setBundle(await cargarPanel(periodo)) }
    catch (e) { setErrMsg(e instanceof Error ? e.message : String(e)) }
    finally { setLoading(false) }
  }, [periodo])

  useEffect(() => { cargar() }, [cargar])

  // Datos reales adicionales (una vez): liquidaciones Cade + 12 semanas
  useEffect(() => {
    supabase
      .from('liquidaciones_cade')
      .select('mes, transportista, entregas, importe_entregas, complemento_minimo, recortes, total')
      .order('mes', { ascending: false })
      .then(({ data }) => { if (data) setLiqs(data as LiqRow[]) })
    getBarrasSemanas(12).then(setBarras12).catch(() => setBarras12([]))
  }, [])

  const hoy = new Date()
  const tituloMes = NOMBRE_MES[hoy.getMonth()].toUpperCase()

  const subtitulo = (() => {
    if (!bundle) return ''
    const f = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    return `${f(bundle.rango.start)} – ${f(bundle.rango.end)}`
  })()

  const ing = bundle?.ingresos.total ?? 0
  const gas = bundle?.gastos.total ?? 0
  const balance = ing - gas
  const ratio = gas > 0 ? ing / gas : null
  const ratioAnt = bundle && bundle.gastos.totalAnterior > 0 ? bundle.ingresos.totalAnterior / bundle.gastos.totalAnterior : null
  const deltaIng = bundle && bundle.ingresos.totalAnterior > 0 ? ((ing - bundle.ingresos.totalAnterior) / bundle.ingresos.totalAnterior) * 100 : null
  const ratioColor = ratio == null ? GRIS : ratio >= 1.25 ? OLIVA : ratio >= 1 ? NARANJA : TERRA
  const ratioTxt = ratio == null ? 'SIN DATO' : ratio >= 1.25 ? 'SANO' : ratio >= 1 ? 'JUSTO' : 'CRÍTICO'

  /* Agregados liquidaciones (todo dato real de liquidaciones_cade) */
  const liqPorMes = (() => {
    const map = new Map<string, { entregas: number; total: number; recortes: number }>()
    for (const l of liqs) {
      if (!l.mes) continue
      const cur = map.get(l.mes) ?? { entregas: 0, total: 0, recortes: 0 }
      cur.entregas += l.entregas ?? 0
      cur.total    += l.total ?? 0
      cur.recortes += l.recortes ?? 0
      map.set(l.mes, cur)
    }
    return [...map.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1).map(([mes, v]) => ({ mes, ...v }))
  })()
  const liqUlt = liqPorMes.length > 0 ? liqPorMes[liqPorMes.length - 1] : null
  const liqTotales = {
    entregas: liqs.reduce((s, l) => s + (l.entregas ?? 0), 0),
    total:    liqs.reduce((s, l) => s + (l.total ?? 0), 0),
    complementos: liqs.reduce((s, l) => s + (l.complemento_minimo ?? 0), 0),
    recortes: liqs.reduce((s, l) => s + (l.recortes ?? 0), 0),
  }
  const eurPorEntregaUlt = liqUlt && liqUlt.entregas > 0 ? liqUlt.total / liqUlt.entregas : null

  const editarObjetivo = async (f: PanelBundle['objetivos'][number]) => {
    const v = window.prompt(`Objetivo ${f.label} (€):`, String(f.objetivo))
    if (v == null) return
    const n = Number(v.replace(/\./g, '').replace(',', '.'))
    if (isNaN(n) || n <= 0) return
    await setObjetivoMensual(f.periodo, f.fechaInicio, f.fechaFin, n)
    cargar()
  }
  const editarDia = async (f: PanelBundle['objetivosDia'][number]) => {
    const v = window.prompt(`Objetivo ${f.diaSemana} ${f.fecha.slice(8)}/${f.fecha.slice(5, 7)} (€):`, String(f.objetivo))
    if (v == null) return
    const n = Number(v.replace(/\./g, '').replace(',', '.'))
    if (isNaN(n) || n <= 0) return
    await setObjetivoDia(f.fecha, n)
    cargar()
  }

  return (
    <div className="-m-4 md:-m-6" style={{ fontFamily: LEX, color: INK, background: ARENA }}>

      {/* CABECERA + PESTAÑAS (arena, patrón Binagre: título en bloque + tabs) */}
      <Banda bg={ARENA} style={{ paddingTop: 24, paddingBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ ...card(MARINO), padding: '12px 20px' }}>
            <div style={d('clamp(20px,2.2vw,28px)', ARENA)}>Panel global</div>
            <div style={{ fontFamily: LEX, fontSize: 12, fontWeight: 600, color: AMBAR, marginTop: 5 }}>
              {tituloMes} {hoy.getFullYear()} · {subtitulo || '—'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap', border: BORDER_CARD, boxShadow: SHADOW, background: BLANCO }}>
            {PERIODOS.map((p, i) => {
              const active = periodo === p.key
              return (
                <button key={p.key} onClick={() => setPeriodo(p.key)}
                  style={{
                    padding: '9px 14px', border: 'none',
                    borderRight: i < PERIODOS.length - 1 ? `3px solid ${INK}` : 'none',
                    background: active ? NARANJA : BLANCO, color: active ? ARENA : INK,
                    fontFamily: OSW, fontSize: 12, fontWeight: 600, letterSpacing: 1,
                    textTransform: 'uppercase', cursor: 'pointer',
                  }}>
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
          {MAIN_TABS.map(tab => {
            const active = mainTab === tab.id
            return (
              <button key={tab.id} onClick={() => setMainTab(tab.id)}
                style={{
                  fontFamily: OSW, fontWeight: 600, fontSize: 14, letterSpacing: 1, textTransform: 'uppercase',
                  padding: '9px 18px', cursor: 'pointer', border: BORDER_CARD, borderRadius: 0,
                  background: active ? NARANJA : BLANCO, color: active ? ARENA : INK,
                  boxShadow: active ? SHADOW : 'none',
                }}>
                {tab.label}
              </button>
            )
          })}
        </div>
      </Banda>

      {errMsg && (
        <Banda bg={TERRA}>
          <div style={{ ...d('18px', ARENA) }}>ERROR CARGANDO DATOS</div>
          <div style={{ color: ARENA, fontSize: 13, marginTop: 6 }}>{errMsg}</div>
        </Banda>
      )}

      {loading && !bundle && (
        <Banda bg={ARENA}><div style={d('22px', GRIS)}>CARGANDO PANEL…</div></Banda>
      )}

      {bundle && (<>

        {/* ════════════════ TAB RESUMEN ════════════════ */}
        {mainTab === 'resumen' && (<>

          {/* HERO ÁMBAR — has ingresado */}
          <Banda bg={AMBAR}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 28, alignItems: 'end' }}>
              <div style={{ gridColumn: 'span 2', minWidth: 280 }}>
                <span style={eyebrow(MARINO, ARENA)}>Lo que ha entrado</span>
                <div style={{ ...d('clamp(44px,6.8vw,92px)'), marginTop: 14 }}>
                  HAS INGRESADO{' '}
                  <span style={{ background: INK, color: AMBAR, padding: '0 12px' }}>{EUR(ing)}</span>
                </div>
                <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 20, background: deltaIng == null ? GRIS : deltaIng >= 0 ? OLIVA : TERRA, color: ARENA, border: BORDER_CARD, padding: '2px 10px' }}>
                    {DELTA(deltaIng)}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>vs período anterior de igual duración</span>
                </div>
              </div>
              <div style={{ ...card(BLANCO), padding: 22 }}>
                <div style={{ fontFamily: OSW, fontWeight: 600, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', borderBottom: `2px dashed ${INK}`, paddingBottom: 8 }}>
                  Resumen del período
                </div>
                {[
                  { l: 'Gastos', v: EUR(gas), c: NARANJA },
                  { l: 'Balance neto', v: ES(balance), c: balance >= 0 ? OLIVA : TERRA },
                  { l: 'Ratio ing/gas', v: ratio == null ? '—' : ratio.toFixed(2).replace('.', ','), c: ratioColor },
                ].map(r => (
                  <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: `1px solid ${ARENA_CL}` }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{r.l}</span>
                    <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 24, color: r.c }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </Banda>

          {/* ¿Quién te paga? (CELESTE) */}
          <Banda bg={CELESTE}>
            <span style={eyebrow(BLANCO)}>¿Quién te paga?</span>
            <h2 style={{ ...d('clamp(22px,2.6vw,32px)', ARENA), margin: '12px 0 20px' }}>Ingresos por supermercado</h2>
            <div style={{ display: 'grid', gap: 14 }}>
              {bundle.ingresos.filas.map(f => {
                const color = COLOR_OP_NEO[f.key] ?? GRIS
                return (
                  <div key={f.key} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px,220px) 1fr minmax(150px,200px)', gap: 14, alignItems: 'center' }}>
                    <span style={{ fontFamily: OSW, fontWeight: 600, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5, color: ARENA }}>{f.label}</span>
                    <BarraH pct={f.pct} color={color} />
                    <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 20, textAlign: 'right', color: BLANCO }}>
                      {E(f.importe)} <span style={{ fontSize: 13, color: ARENA_CL }}>· {P0(f.pct * 100)}</span>
                      <span style={{ fontFamily: OSW, fontSize: 13, marginLeft: 8, background: f.delta == null ? 'transparent' : f.delta >= 0 ? OLIVA : TERRA, color: ARENA, padding: f.delta == null ? 0 : '1px 6px' }}>{DELTA(f.delta == null ? null : f.delta * 100)}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </Banda>

          {/* ¿En qué se va? (ARENA_CL) */}
          <Banda bg={ARENA_CL}>
            <span style={eyebrow(TERRA, ARENA)}>¿En qué se va?</span>
            <h2 style={{ ...d('clamp(22px,2.6vw,32px)'), margin: '12px 0 20px' }}>
              Gastos del período: <span style={{ background: TERRA, color: ARENA, padding: '0 10px' }}>{EUR(gas)}</span>
            </h2>
            <div style={{ display: 'grid', gap: 14 }}>
              {bundle.gastos.filas.map(f => (
                <div key={f.key} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px,220px) 1fr minmax(150px,200px)', gap: 14, alignItems: 'center' }}>
                  <span style={{ fontFamily: OSW, fontWeight: 600, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>{f.label}</span>
                  <BarraH pct={f.pct} color={COLOR_GASTO_NEO[f.key] ?? GRIS} />
                  <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 20, textAlign: 'right' }}>
                    {E(f.importe)} <span style={{ fontSize: 13, color: GRIS }}>· {P0(f.pct * 100)}</span>
                  </span>
                </div>
              ))}
            </div>
          </Banda>

          {/* Ratio + salud (BLANCO 50/50) */}
          <Banda bg={BLANCO}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 28 }}>
              <div>
                <span style={eyebrow(ratioColor, ARENA)}>Ratio ingresos / gastos</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginTop: 12 }}>
                  <span style={{ ...d('clamp(44px,5vw,72px)', ratioColor) }}>{ratio == null ? '—' : ratio.toFixed(2).replace('.', ',')}</span>
                  <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 16, background: ratioColor, color: ARENA, border: BORDER_CARD, padding: '2px 12px' }}>{ratioTxt}</span>
                </div>
                <div style={{ marginTop: 14 }}>
                  <BarraH pct={ratio == null ? 0 : Math.min(1, ratio / 2)} color={ratioColor} alto={26} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: OSW, fontSize: 12, marginTop: 4 }}>
                    <span>0</span><span>1,0</span><span>Objetivo ≥ 1,25</span><span>2,0+</span>
                  </div>
                </div>
                {ratioAnt != null && (
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 10 }}>
                    Período anterior: <span style={{ fontFamily: OSW, fontWeight: 700 }}>{ratioAnt.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
              </div>
              <div>
                <span style={eyebrow(balance >= 0 ? OLIVA : TERRA, ARENA)}>Balance neto</span>
                <div style={{ ...d('clamp(44px,5vw,72px)', balance >= 0 ? OLIVA : TERRA), marginTop: 12 }}>{ES(balance)}</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 10 }}>
                  Ingresos {EUR(ing)} − Gastos {EUR(gas)}
                </div>
              </div>
            </div>
          </Banda>
        </>)}

        {/* ════════════════ TAB OPERACIONES ════════════════ */}
        {mainTab === 'operaciones' && (<>

          {/* HERO ÁMBAR — has entregado (dato real de liquidaciones Cade) */}
          <Banda bg={AMBAR}>
            {liqUlt ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 28, alignItems: 'end' }}>
                <div style={{ gridColumn: 'span 2', minWidth: 280 }}>
                  <span style={eyebrow(MARINO, ARENA)}>Última liquidación Cade · {fmtMesCorto(liqUlt.mes)}</span>
                  <div style={{ ...d('clamp(40px,6vw,84px)'), marginTop: 14 }}>
                    HAS ENTREGADO{' '}
                    <span style={{ background: INK, color: AMBAR, padding: '0 12px' }}>{E(liqUlt.entregas)}</span>
                    {' '}PEDIDOS
                  </div>
                  <div style={{ marginTop: 14, fontSize: 13, fontWeight: 600 }}>
                    Liquidación del mes: <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 18 }}>{EUR(liqUlt.total)}</span>
                    {eurPorEntregaUlt != null && (
                      <> · <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 18, color: MARINO }}>{eurPorEntregaUlt.toFixed(2).replace('.', ',')} €</span> por entrega</>
                    )}
                  </div>
                </div>
                <div style={{ ...card(BLANCO), padding: 22 }}>
                  <div style={{ fontFamily: OSW, fontWeight: 600, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', borderBottom: `2px dashed ${INK}`, paddingBottom: 8 }}>
                    Histórico liquidaciones
                  </div>
                  {[
                    { l: 'Entregas totales', v: E(liqTotales.entregas), c: INK },
                    { l: 'Total liquidado', v: EUR(liqTotales.total), c: OLIVA },
                    { l: 'Recortes acumulados', v: EUR(liqTotales.recortes), c: liqTotales.recortes !== 0 ? TERRA : OLIVA },
                  ].map(r => (
                    <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: `1px solid ${ARENA_CL}` }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{r.l}</span>
                      <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 22, color: r.c }}>{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={d('clamp(22px,3vw,36px)')}>SIN LIQUIDACIONES CADE CARGADAS TODAVÍA</div>
            )}
          </Banda>

          {/* Entregas por mes (BLANCO, barras reales) */}
          {liqPorMes.length > 0 && (
            <Banda bg={BLANCO}>
              <span style={eyebrow(MARINO, ARENA)}>Ritmo de reparto</span>
              <h2 style={{ ...d('clamp(20px,2.4vw,28px)'), margin: '12px 0 20px' }}>Entregas por mes · liquidaciones Cade</h2>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(liqPorMes.length, 12)}, 1fr)`, gap: 14, alignItems: 'end', minHeight: 180 }}>
                {(() => {
                  const ult12 = liqPorMes.slice(-12)
                  const maxE = Math.max(1, ...ult12.map(m => m.entregas))
                  return ult12.map(m => (
                    <div key={m.mes} style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: 130 }}>
                        <div title={`${E(m.entregas)} entregas · ${EUR(m.total)}`}
                          style={{ width: '60%', height: `${(m.entregas / maxE) * 100}%`, minHeight: 4, background: m.recortes !== 0 ? TERRA : MARINO, border: BORDER_CARD }} />
                      </div>
                      <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, marginTop: 8, textTransform: 'uppercase' }}>{fmtMesCorto(m.mes)}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: GRIS }}>{E(m.entregas)}</div>
                    </div>
                  ))
                })()}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: GRIS, marginTop: 12 }}>
                Barra terracota = mes con recortes de Cade. Detalle en Finanzas → Liquidaciones.
              </div>
            </Banda>
          )}

          <BandaProximamente
            acento={NARANJA}
            pregunta="¿QUÉ FURGONETA TE CUESTA MÁS?"
            detalle="Coste real por furgoneta y entregas diarias. Se activará cuando existan datos de entregas por día y coste asignado por vehículo. Hoy el detalle por furgoneta vive en Flota."
          />
        </>)}

        {/* ════════════════ TAB FINANZAS ════════════════ */}
        {mainTab === 'finanzas' && (<>

          {/* Lo que te paga Cade (CELESTE = por cobrar/bruto) */}
          <Banda bg={CELESTE}>
            <span style={eyebrow(BLANCO)}>¿Cuándo cobras de Cade?</span>
            <h2 style={{ ...d('clamp(22px,2.6vw,32px)', ARENA), margin: '12px 0 20px' }}>Liquidaciones Cade · histórico</h2>
            {liqs.length === 0 ? (
              <div style={{ fontSize: 13, fontWeight: 600, color: ARENA }}>Sin liquidaciones cargadas todavía. Cade paga el 10–15 del mes siguiente.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
                {[
                  { l: 'Total liquidado', v: EUR(liqTotales.total), c: OLIVA },
                  { l: 'Entregas', v: E(liqTotales.entregas), c: INK },
                  { l: 'Complementos mínimo', v: EUR(liqTotales.complementos), c: CELESTE },
                  { l: 'Recortes de Cade', v: EUR(liqTotales.recortes), c: liqTotales.recortes !== 0 ? TERRA : OLIVA },
                ].map(k => (
                  <div key={k.l} style={{ ...card(BLANCO), padding: '16px 18px' }}>
                    <div style={{ fontFamily: OSW, fontWeight: 600, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: GRIS }}>{k.l}</div>
                    <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(24px,3vw,38px)', color: k.c, marginTop: 6 }}>{k.v}</div>
                  </div>
                ))}
              </div>
            )}
            {liqTotales.recortes !== 0 && (
              <div style={{ marginTop: 18, background: TERRA, color: ARENA, border: BORDER_CARD, boxShadow: SHADOW, padding: '12px 16px', fontFamily: OSW, fontWeight: 600, fontSize: 14, letterSpacing: 1, textTransform: 'uppercase' }}>
                Cade te ha recortado {EUR(Math.abs(liqTotales.recortes))} · revisa y reclama en Liquidaciones
              </div>
            )}
          </Banda>

          {/* Gastos (ARENA_CL) */}
          <Banda bg={ARENA_CL}>
            <span style={eyebrow(TERRA, ARENA)}>¿En qué se va?</span>
            <h2 style={{ ...d('clamp(22px,2.6vw,32px)'), margin: '12px 0 20px' }}>
              Gastos del período: <span style={{ background: TERRA, color: ARENA, padding: '0 10px' }}>{EUR(gas)}</span>
            </h2>
            <div style={{ display: 'grid', gap: 14 }}>
              {bundle.gastos.filas.map(f => (
                <div key={f.key} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px,220px) 1fr minmax(150px,200px)', gap: 14, alignItems: 'center' }}>
                  <span style={{ fontFamily: OSW, fontWeight: 600, fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>{f.label}</span>
                  <BarraH pct={f.pct} color={COLOR_GASTO_NEO[f.key] ?? GRIS} />
                  <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 20, textAlign: 'right' }}>
                    {E(f.importe)} <span style={{ fontSize: 13, color: GRIS }}>· {P0(f.pct * 100)}</span>
                  </span>
                </div>
              ))}
            </div>
          </Banda>

          {/* Presupuestos (BLANCO) */}
          {bundle.presupuestos.length > 0 && (
            <Banda bg={BLANCO}>
              <span style={eyebrow(NARANJA, ARENA)}>Presupuestos · {tituloMes.toLowerCase()}</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginTop: 16 }}>
                {bundle.presupuestos.map(p => {
                  const c = p.estado === 'SUPERADO' ? TERRA : p.estado === 'AL_LIMITE' ? NARANJA : OLIVA
                  const txt = p.estado === 'SUPERADO' ? 'SUPERADO' : p.estado === 'AL_LIMITE' ? 'AL LÍMITE' : 'EN RITMO'
                  return (
                    <div key={p.key} style={{ ...card(ARENA), padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontFamily: OSW, fontWeight: 600, fontSize: 13, textTransform: 'uppercase' }}>{p.label}</span>
                        <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 11, background: c, color: ARENA, border: `2px solid ${INK}`, padding: '1px 8px' }}>{txt}</span>
                      </div>
                      <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 24, marginBottom: 8 }}>
                        {E(p.consumido)} <span style={{ fontSize: 14, color: GRIS }}>/ {E(p.tope)}</span>
                      </div>
                      <BarraH pct={p.pct} color={c} alto={14} />
                      <div style={{ fontSize: 11, fontWeight: 600, color: GRIS, marginTop: 6 }}>
                        {E2ish(p.ritmoPorDia)} €/día · quedan {p.diasRestantes} días
                      </div>
                    </div>
                  )
                })}
              </div>
            </Banda>
          )}

          {/* Objetivos (ÁMBAR) */}
          <Banda bg={AMBAR}>
            <span style={eyebrow(INK, AMBAR)}>Objetivos</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 28, marginTop: 16 }}>
              <div style={{ display: 'grid', gap: 14 }}>
                {bundle.objetivos.map(f => {
                  const c = f.pct >= 1 ? OLIVA : f.pct >= 0.7 ? NARANJA : TERRA
                  return (
                    <div key={f.label} onClick={() => editarObjetivo(f)} title="Clic para editar objetivo"
                      style={{ ...card(BLANCO), padding: '14px 16px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                        <span style={{ fontFamily: OSW, fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>{f.label}</span>
                        <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 20 }}>
                          {E(f.conseguido)} <span style={{ color: GRIS, fontSize: 14 }}>/ {E(f.objetivo)}</span>
                          <span style={{ marginLeft: 8, color: c }}>{P0(f.pct * 100)}</span>
                        </span>
                      </div>
                      <BarraH pct={f.pct} color={c} alto={16} />
                    </div>
                  )
                })}
              </div>
              <div style={{ ...card(BLANCO), padding: '16px' }}>
                <div style={{ fontFamily: OSW, fontWeight: 600, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
                  Semana en curso · clic en un día para editar
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                  {bundle.objetivosDia.map(f => {
                    const c = f.esFuturo ? GRIS : f.pct >= 1 ? OLIVA : f.pct >= 0.7 ? NARANJA : TERRA
                    return (
                      <div key={f.fecha} onClick={() => editarDia(f)} title="Editar objetivo del día"
                        style={{
                          border: f.esHoy ? BORDER_CARD : `2px solid ${INK}`,
                          boxShadow: f.esHoy ? SHADOW : 'none',
                          background: f.esHoy ? AMBAR : ARENA,
                          padding: '8px 4px', textAlign: 'center', cursor: 'pointer',
                        }}>
                        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 12 }}>{f.diaSemana}</div>
                        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 15, color: c, marginTop: 4 }}>
                          {f.esFuturo ? '—' : P0(f.pct * 100)}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: GRIS, marginTop: 2 }}>{E(f.objetivo)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </Banda>
        </>)}

        {/* ════════════════ TAB CASHFLOW ════════════════ */}
        {mainTab === 'cashflow' && (<>

          {/* Tesorería (MARINO) */}
          <Banda bg={MARINO}>
            <span style={eyebrow(AMBAR)}>Tesorería · BBVA</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 28, marginTop: 16, alignItems: 'start' }}>
              <div style={{ gridColumn: 'span 2', minWidth: 280 }}>
                <div style={{ ...d('clamp(44px,6vw,84px)', AMBAR) }}>{EUR(bundle.tesoreria.cajaActual)}</div>
                <div style={{ color: ARENA, fontSize: 13, fontWeight: 600, marginTop: 8 }}>
                  Caja líquida hoy{bundle.tesoreria.fechaUltima ? ` · último saldo ${new Date(bundle.tesoreria.fechaUltima + 'T00:00:00').toLocaleDateString('es-ES')}` : ''}
                </div>
                <div style={{ marginTop: 18, background: 'rgba(245,236,217,0.08)', border: `3px solid ${ARENA}`, padding: '12px 14px' }}>
                  <div style={{ fontFamily: OSW, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: ARENA, marginBottom: 6 }}>Saldo últimos 30 días</div>
                  <Spark data={bundle.serieSaldo} color={AMBAR} />
                </div>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {[
                  { l: 'Proyección 7 días', v: EUR(bundle.tesoreria.proyeccion7d), est: true },
                  { l: 'Proyección 30 días', v: EUR(bundle.tesoreria.proyeccion30d), est: true },
                  { l: 'Caja hace 30 días', v: EUR(bundle.tesoreria.cajaHace30d), est: false },
                ].map(r => (
                  <div key={r.l} style={{ background: BLANCO, border: BORDER_CARD, boxShadow: SHADOW, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{r.l}{r.est && EST}</span>
                    <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 22 }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </Banda>

          {/* Flujo del período (BLANCO) */}
          <Banda bg={BLANCO}>
            <span style={eyebrow(balance >= 0 ? OLIVA : TERRA, ARENA)}>Flujo del período</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18, marginTop: 16 }}>
              {[
                { l: 'Entradas', v: EUR(ing), c: OLIVA },
                { l: 'Salidas', v: EUR(gas), c: TERRA },
                { l: 'Flujo neto', v: ES(balance), c: balance >= 0 ? OLIVA : TERRA },
              ].map(k => (
                <div key={k.l} style={{ ...card(ARENA), padding: '16px 18px' }}>
                  <div style={{ fontFamily: OSW, fontWeight: 600, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: GRIS }}>{k.l}</div>
                  <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(26px,3.4vw,44px)', color: k.c, marginTop: 6 }}>{k.v}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: GRIS, marginTop: 14 }}>
              Movimientos bancarios categorizados (BBVA). Escenarios de tesorería: en Punto de equilibrio.
            </div>
          </Banda>
        </>)}

        {/* ════════════════ TAB EVOLUCIÓN ════════════════ */}
        {mainTab === 'evolucion' && (<>

          {/* Ingresos vs gastos 12 semanas (ARENA_CL) */}
          <Banda bg={ARENA_CL}>
            <span style={eyebrow(OLIVA, ARENA)}>Ritmo semanal</span>
            <h2 style={{ ...d('clamp(20px,2.4vw,28px)'), margin: '12px 0 20px' }}>Ingresos vs gastos · últimas 12 semanas</h2>
            {barras12.length === 0 ? (
              <div style={{ fontSize: 13, fontWeight: 600, color: GRIS }}>Sin movimientos suficientes todavía.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${barras12.length}, 1fr)`, gap: 10, alignItems: 'end', minHeight: 180 }}>
                {(() => {
                  const maxV = Math.max(1, ...barras12.flatMap(b => [b.ingresos, b.gastos]))
                  return barras12.map(b => (
                    <div key={b.semana} style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', justifyContent: 'center', height: 140 }}>
                        <div title={`Ingresos ${EUR(b.ingresos)}`} style={{ width: '40%', height: `${(b.ingresos / maxV) * 100}%`, minHeight: 4, background: OLIVA, border: `2px solid ${INK}` }} />
                        <div title={`Gastos ${EUR(b.gastos)}`} style={{ width: '40%', height: `${(b.gastos / maxV) * 100}%`, minHeight: 4, background: NARANJA, border: `2px solid ${INK}` }} />
                      </div>
                      <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 12, marginTop: 8 }}>{b.semana}</div>
                    </div>
                  ))
                })()}
              </div>
            )}
            <div style={{ display: 'flex', gap: 18, marginTop: 14, fontSize: 12, fontWeight: 600 }}>
              <span><span style={{ display: 'inline-block', width: 12, height: 12, background: OLIVA, border: `2px solid ${INK}`, marginRight: 6, verticalAlign: 'middle' }} />Ingresos</span>
              <span><span style={{ display: 'inline-block', width: 12, height: 12, background: NARANJA, border: `2px solid ${INK}`, marginRight: 6, verticalAlign: 'middle' }} />Gastos</span>
            </div>
          </Banda>

          {/* Ingresos vs gastos 4 semanas detalle (BLANCO) */}
          <Banda bg={BLANCO}>
            <span style={eyebrow(MARINO, ARENA)}>Últimas 4 semanas · detalle</span>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${bundle.barrasSemanas.length}, 1fr)`, gap: 18, alignItems: 'end', minHeight: 180, marginTop: 16 }}>
              {(() => {
                const maxV = Math.max(1, ...bundle.barrasSemanas.flatMap(b => [b.ingresos, b.gastos]))
                return bundle.barrasSemanas.map(b => (
                  <div key={b.semana} style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', justifyContent: 'center', height: 140 }}>
                      <div title={`Ingresos ${EUR(b.ingresos)}`} style={{ width: '38%', height: `${(b.ingresos / maxV) * 100}%`, minHeight: 4, background: OLIVA, border: BORDER_CARD }} />
                      <div title={`Gastos ${EUR(b.gastos)}`} style={{ width: '38%', height: `${(b.gastos / maxV) * 100}%`, minHeight: 4, background: NARANJA, border: BORDER_CARD }} />
                    </div>
                    <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 14, marginTop: 8 }}>{b.semana}</div>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>
                      <span style={{ color: OLIVA }}>{E(b.ingresos)}</span> · <span style={{ color: NARANJA }}>{E(b.gastos)}</span>
                    </div>
                  </div>
                ))
              })()}
            </div>
          </Banda>

          <BandaProximamente
            acento={CELESTE}
            pregunta="¿CÓMO EVOLUCIONAN TUS ENTREGAS DÍA A DÍA?"
            detalle="Evolución diaria de entregas y ventas. Se activará cuando existan datos de entregas por día (hoy solo hay totales mensuales de las liquidaciones Cade)."
          />
        </>)}

        {/* CIERRE MARINO */}
        <section style={{ background: MARINO, padding: `22px ${PAD}` }}>
          <div style={{ ...d('16px', ARENA), letterSpacing: '1px' }}>DAVID REPARTE. ALCOI · ONTINYENT.</div>
        </section>
      </>)}
    </div>
  )
}

/** €/día con 0 decimales para textos pequeños */
function E2ish(n: number): string {
  return Math.round(n).toLocaleString('es-ES')
}
