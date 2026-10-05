import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { usePeriodo } from '@/lib/periodoGlobal'
import { HeroNeo } from '@/components/neo/NeoUI'
import { INK, ARENA, ARENA_CL, BLANCO, GRIS, OLIVA, TERRA, NARANJA, MARINO, AMBAR, CELESTE, OSW, LEX, BORDER, BORDER_CARD, SHADOW, PAD, eyebrow, d } from '@/styles/neobrutal'

/* Pestaña HOY del Panel global: el dashboard de ahora, de un vistazo. Solo lo que importa hoy:
   1. Saldo de las cuentas (real, del banco)
   2. Lo que ha entrado y salido en el periodo elegido
   3. Ingresos previstos de Cade este mes + histórico y previsión
   4. Avisos que solo existen cuando hay algo que hacer (documentación de Cade, facturas sin enviar,
      movimientos sin categorizar, tareas). Cuando se resuelven, desaparecen. */

interface Cuenta { banco: string; iban_mask: string | null; saldo_actual: number | null; saldo_fecha: string | null; personal: boolean | null; activa: boolean | null }
interface Mov { fecha: string; importe: number; categoria: string | null }
interface Doc { emisor: string; documento: string; como_obtenerlo: string; estado: string }
interface Tarea { titulo: string; fecha_limite: string | null; prioridad: string | null; estado: string | null }

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const MES_C = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
const NOMBRE: Record<string, string> = { DAVID: 'David', JUAN: 'Juan' }
const eur = (n: number) => Number(n ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const eur0 = (n: number) => Math.round(Number(n ?? 0)).toLocaleString('es-ES') + ' €'
const conIva = (n: number) => Math.round(Number(n ?? 0) * 121) / 100
const iso = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
const primero = (dt: Date) => new Date(dt.getFullYear(), dt.getMonth(), 1)

function Banda({ bg, children }: { bg: string; children: ReactNode }) {
  return <section style={{ background: bg, borderBottom: BORDER, padding: `24px ${PAD}` }}>{children}</section>
}
function Aviso({ color, texto, enlace, boton }: { color: string; texto: ReactNode; enlace: string; boton: string }) {
  return (
    <div style={{ background: color, color: ARENA, border: BORDER_CARD, boxShadow: SHADOW, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 15, letterSpacing: 0.5, textTransform: 'uppercase' }}>{texto}</span>
      <Link to={enlace} style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: INK, background: ARENA, border: `2px solid ${INK}`, padding: '5px 12px', textDecoration: 'none' }}>{boton} →</Link>
    </div>
  )
}

export default function HoyTab() {
  const hoy = new Date()
  const per = usePeriodo()
  const txt = per.etiqueta
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [movs, setMovs] = useState<Mov[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [cadeMes, setCadeMes] = useState({ previsto: 0, cobrado: 0, n: 0 })
  const [historico, setHistorico] = useState<{ mes: string; total: number }[]>([])
  const [sinEnviar, setSinEnviar] = useState(0)
  const [cargando, setCargando] = useState(true)

  /* Cade del mes en curso: lo facturado el mes pasado se cobra entre el 10 y el 15 */
  useEffect(() => {
    const mesFact = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
    const ini6 = new Date(hoy.getFullYear(), hoy.getMonth() - 6, 1)
    Promise.all([
      supabase.from('cuentas_bancarias').select('banco, iban_mask, saldo_actual, saldo_fecha, personal, activa'),
      supabase.from('v_documentacion_pendiente').select('emisor, documento, como_obtenerlo, estado'),
      supabase.from('tareas').select('titulo, fecha_limite, prioridad, estado').order('fecha_limite', { ascending: true }).limit(50),
      supabase.from('facturas_emitidas').select('periodo, base_imponible, emisor, id').eq('cliente', 'CADE').gte('periodo', iso(ini6)),
      supabase.from('facturas_historico').select('fecha_factura, base_imponible').eq('cliente', 'CADE').gte('fecha_factura', iso(ini6)),
      supabase.from('conciliacion').select('importe').eq('categoria', 'cade').gt('importe', 0).gte('fecha', iso(primero(hoy))),
      supabase.from('envios_cade').select('id, estado').in('estado', ['borrador', 'borrador_gmail', 'borrador_eml']),
    ]).then(([c, dc, t, fe, fh, cob, en]) => {
      setCuentas((c.data ?? []) as Cuenta[])
      setDocs(((dc.data ?? []) as Doc[]).filter(x => x.estado === 'pedir'))
      setTareas(((t.data ?? []) as Tarea[]).filter(x => !/hech|resuel|cerrad|complet|done/i.test(x.estado ?? '')))
      const porMes = new Map<string, number>()
      for (const f of (fe.data ?? []) as { periodo: string; base_imponible: number }[]) porMes.set(String(f.periodo).slice(0, 7), (porMes.get(String(f.periodo).slice(0, 7)) ?? 0) + conIva(Number(f.base_imponible)))
      for (const f of (fh.data ?? []) as { fecha_factura: string; base_imponible: number }[]) { const k = String(f.fecha_factura).slice(0, 7); porMes.set(k, (porMes.get(k) ?? 0) + conIva(Number(f.base_imponible))) }
      const meses: { mes: string; total: number }[] = []
      for (let i = 6; i >= 1; i--) {
        const dm = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
        const k = `${dm.getFullYear()}-${String(dm.getMonth() + 1).padStart(2, '0')}`
        meses.push({ mes: MES_C[dm.getMonth()], total: porMes.get(k) ?? 0 })
      }
      setHistorico(meses)
      const kPrev = `${mesFact.getFullYear()}-${String(mesFact.getMonth() + 1).padStart(2, '0')}`
      setCadeMes({
        previsto: porMes.get(kPrev) ?? 0,
        cobrado: ((cob.data ?? []) as { importe: number }[]).reduce((s, x) => s + Number(x.importe), 0),
        n: (fe.data ?? []).filter((f: { periodo: string }) => String(f.periodo).slice(0, 7) === kPrev).length,
      })
      setSinEnviar(en.data?.length ?? 0)
      setCargando(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Movimientos del periodo elegido (sin las cuentas personales) */
  useEffect(() => {
    supabase.from('conciliacion').select('fecha, importe, categoria').gte('fecha', per.desdeIso).lte('fecha', per.hastaIso).limit(5000)
      .then(({ data }) => setMovs(((data ?? []) as Mov[]).filter(m => !(m.categoria ?? '').startsWith('pendiente-personal'))))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [per.desdeIso, per.hastaIso])

  const propias = cuentas.filter(c => c.activa !== false && !c.personal)
  const saldo = propias.reduce((s, c) => s + Number(c.saldo_actual ?? 0), 0)
  const porBanco = ['BBVA', 'N26'].map(b => ({ b, v: propias.filter(c => c.banco === b).reduce((s, c) => s + Number(c.saldo_actual ?? 0), 0), n: propias.filter(c => c.banco === b).length })).filter(x => x.n > 0)
  const fechaSaldo = propias.map(c => c.saldo_fecha).filter(Boolean).sort().pop()
  const entradas = movs.filter(m => Number(m.importe) > 0).reduce((s, m) => s + Number(m.importe), 0)
  const salidas = movs.filter(m => Number(m.importe) < 0).reduce((s, m) => s + Number(m.importe), 0)
  const topGastos = (() => {
    const mp = new Map<string, number>()
    for (const m of movs) if (Number(m.importe) < 0) { const k = (m.categoria ?? 'sin categoría').replace(/^pendiente-revisar-gasto$/, 'sin categorizar'); mp.set(k, (mp.get(k) ?? 0) + Math.abs(Number(m.importe))) }
    return [...mp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
  })()
  const sinCategorizar = movs.filter(m => (m.categoria ?? '').startsWith('pendiente-revisar')).length
  const falta = Math.max(0, cadeMes.previsto - cadeMes.cobrado)
  const media3 = historico.slice(-3).reduce((s, x) => s + x.total, 0) / 3
  const maxH = Math.max(1, ...historico.map(x => x.total))
  const diaMes = hoy.getDate()
  const tareasHoy = tareas.filter(t => !t.fecha_limite || t.fecha_limite <= iso(hoy)).slice(0, 8)
  const hayAvisos = docs.length > 0 || sinEnviar > 0 || sinCategorizar > 0 || tareasHoy.length > 0
  const card = { background: BLANCO, border: BORDER_CARD, boxShadow: SHADOW, padding: '14px 16px' }

  return (
    <>
      {/* 1. SALDO */}
      <HeroNeo
        eyebrowTxt={`Saldo de las cuentas · hoy ${hoy.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`}
        cifra={cargando ? '…' : propias.length === 0 ? '—' : eur0(saldo)}
        color={propias.length === 0 ? AMBAR : saldo >= 0 ? OLIVA : NARANJA}
        frase={propias.length === 0 ? 'Sin datos todavía' : fechaSaldo ? `Lo que hay en el banco ahora. Saldo a ${new Date(fechaSaldo).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.` : 'Lo que hay en el banco ahora. Se actualiza cada noche.'}
        apoyo={porBanco.map(x => ({ label: `${x.b} · ${x.n} cuenta${x.n > 1 ? 's' : ''}`, valor: eur(x.v) }))}
      />

      {/* 2. MOVIMIENTOS DEL PERIODO */}
      <Banda bg={ARENA_CL}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={eyebrow(OLIVA, ARENA)}>Movimientos · {txt}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 14 }}>
          {[{ l: 'Ha entrado', v: entradas, c: OLIVA }, { l: 'Ha salido', v: salidas, c: TERRA }, { l: 'Neto', v: entradas + salidas, c: entradas + salidas >= 0 ? OLIVA : TERRA }].map(k => (
            <div key={k.l} style={card}>
              <div style={{ fontFamily: OSW, fontWeight: 600, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: GRIS }}>{k.l}</div>
              <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(24px,3vw,36px)', color: k.c, marginTop: 4 }}>{eur0(k.v)}</div>
            </div>
          ))}
        </div>
        {topGastos.length > 0 && (
          <div style={{ marginTop: 14, fontSize: 13, fontWeight: 600 }}>
            <span style={{ fontFamily: OSW, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Lo que más ha salido:</span>{' '}
            {topGastos.map(([k, v], i) => <span key={k}>{i > 0 && ' · '}{k} {eur0(v)}</span>)}
          </div>
        )}
      </Banda>

      {/* 3. INGRESOS PREVISTOS */}
      <Banda bg={CELESTE}>
        <span style={eyebrow(BLANCO)}>Ingresos previstos · Cade</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginTop: 14 }}>
          <div style={{ ...card }}>
            <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 14, textTransform: 'uppercase' }}>Este mes ({MESES[hoy.getMonth()]})</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: GRIS }}>Lo facturado en {MESES[(hoy.getMonth() + 11) % 12]} ({cadeMes.n} facturas), con IVA. Cade paga entre el 10 y el 15.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 10 }}>
              {[{ l: 'Previsto', v: cadeMes.previsto, c: INK }, { l: 'Cobrado', v: cadeMes.cobrado, c: OLIVA }, { l: 'Falta', v: falta, c: falta > 0 ? (diaMes > 15 ? TERRA : NARANJA) : OLIVA }].map(k => (
                <div key={k.l}>
                  <div style={{ fontFamily: OSW, fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', color: GRIS }}>{k.l}</div>
                  <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 22, color: k.c }}>{eur0(k.v)}</div>
                </div>
              ))}
            </div>
            <div style={{ background: ARENA, border: BORDER_CARD, height: 16, position: 'relative', marginTop: 12 }}>
              <div style={{ position: 'absolute', inset: 0, width: `${cadeMes.previsto > 0 ? Math.min(100, (cadeMes.cobrado / cadeMes.previsto) * 100) : 0}%`, background: OLIVA }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 8, color: falta > 0 ? (diaMes > 15 ? TERRA : INK) : OLIVA }}>
              {cadeMes.previsto === 0 ? 'Aún no hay facturas del mes pasado.' : falta <= 0 ? 'Cade ya ha pagado todo lo previsto.' : diaMes > 15 ? `Cade se retrasa: faltan ${eur0(falta)} y ya pasó el 15.` : `Faltan ${eur0(falta)}: llegan entre el 10 y el 15.`}
            </div>
          </div>
          <div style={{ ...card }}>
            <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 14, textTransform: 'uppercase' }}>Histórico · últimos 6 meses facturados</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${historico.length || 1}, 1fr)`, gap: 8, alignItems: 'end', height: 110, marginTop: 10 }}>
              {historico.map((m, i) => (
                <div key={i} style={{ textAlign: 'center' }} title={eur(m.total)}>
                  <div style={{ height: 80, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{ width: '60%', height: `${(m.total / maxH) * 100}%`, minHeight: m.total ? 4 : 0, background: m.total ? MARINO : GRIS, border: m.total ? `2px solid ${INK}` : 'none' }} />
                  </div>
                  <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', marginTop: 4 }}>{m.mes}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 12 }}>
              Previsión del mes que viene: <span style={{ fontFamily: OSW, fontSize: 18, color: MARINO }}>{eur0(media3)}</span>
              <span style={{ fontSize: 11, color: GRIS, fontWeight: 600 }}> · media de los últimos 3 meses, con IVA</span>
            </div>
          </div>
        </div>
      </Banda>

      {/* 4. SOLO SI HAY ALGO QUE HACER */}
      {hayAvisos && (
        <Banda bg={ARENA}>
          <span style={eyebrow(NARANJA, ARENA)}>Para hoy</span>
          <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
            {docs.length > 0 && (
              <div style={{ ...card, borderColor: INK, background: AMBAR }}>
                <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 15, textTransform: 'uppercase' }}>
                  Documentación de Cade: faltan {docs.length}{diaMes > 10 ? ' · fuera de plazo' : ''}
                </div>
                <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
                  {docs.map((x, i) => (
                    <div key={i} style={{ fontSize: 13, fontWeight: 600 }}>
                      <b>{NOMBRE[x.emisor] ?? x.emisor}</b> · {x.documento} <span style={{ color: INK, opacity: 0.7 }}>— {x.como_obtenerlo}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10 }}>
                  <Link to="/finanzas/documentacion" style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: ARENA, background: NARANJA, border: `2px solid ${INK}`, padding: '5px 12px', textDecoration: 'none' }}>Subir documentos →</Link>
                </div>
              </div>
            )}
            {sinEnviar > 0 && <Aviso color={NARANJA} texto={`${sinEnviar} factura${sinEnviar > 1 ? 's' : ''} de Cade sin enviar`} enlace="/finanzas/facturacion" boton="Enviar" />}
            {sinCategorizar > 0 && <Aviso color={MARINO} texto={`${sinCategorizar} movimiento${sinCategorizar > 1 ? 's' : ''} sin categorizar`} enlace="/conciliacion" boton="Revisar" />}
            {tareasHoy.length > 0 && (
              <div style={card}>
                <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 15, textTransform: 'uppercase' }}>Tareas pendientes</div>
                <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
                  {tareasHoy.map((t, i) => (
                    <div key={i} style={{ fontSize: 13, fontWeight: 600 }}>{t.titulo}{t.fecha_limite ? <span style={{ color: GRIS }}> · {new Date(t.fecha_limite + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span> : null}</div>
                  ))}
                </div>
                <div style={{ marginTop: 10 }}><Link to="/tareas" style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: INK, background: ARENA, border: `2px solid ${INK}`, padding: '5px 12px', textDecoration: 'none' }}>Ver tareas →</Link></div>
              </div>
            )}
          </div>
        </Banda>
      )}

      <section style={{ background: ARENA, borderBottom: BORDER, padding: `16px ${PAD}`, fontFamily: LEX, fontSize: 12, fontWeight: 600, color: GRIS }}>
        {hayAvisos ? 'Los avisos desaparecen solos cuando se resuelven.' : 'Nada pendiente hoy.'}
      </section>
    </>
  )
}
