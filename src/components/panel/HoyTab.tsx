import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { usePeriodo } from '@/lib/periodoGlobal'
import { marcarDocumentacionEnviada } from '@/lib/documentacionEnviada'
import { useCicloPagoCade, TEXTO_SIN_CONFIRMAR } from '@/lib/configCade'
import { desviacionesRepartidores, type DiaDesv, type Desviacion } from '@/lib/desviaciones'
import { HeroNeo } from '@/components/neo/NeoUI'
import { INK, ARENA, ARENA_CL, BLANCO, GRIS, OLIVA, TERRA, NARANJA, MARINO, AMBAR, CELESTE, OSW, LEX, BORDER, BORDER_CARD, SHADOW, PAD, eyebrow } from '@/styles/neobrutal'

/* Pestaña HOY del Panel global: el dashboard de ahora, de un vistazo. Solo lo que importa hoy:
   1. Saldo de las cuentas (real, del banco)
   2. Lo que ha entrado y salido en el periodo elegido
   3. Ingresos previstos de Cade este mes + histórico y previsión
   4. Avisos que solo existen cuando hay algo que hacer (documentación de Cade, facturas sin enviar,
      movimientos sin categorizar, tareas). Cuando se resuelven, desaparecen. */

interface Cuenta { id: string; banco: string; alias: string | null; iban: string | null; iban_mask: string | null; saldo_actual: number | null; saldo_fecha: string | null; personal: boolean | null; activa: boolean | null }
interface Mov { fecha: string; importe: number; categoria: string | null }
interface Doc { emisor: string; documento: string; como_obtenerlo: string; estado: string; mes_cade: string | null }
interface Tarea { titulo: string; fecha_limite: string | null; prioridad: string | null; estado: string | null }
interface Robot { fuente: string; estado: string; ultima_ejecucion: string | null; detalle: string | null }
interface Sesion { banco: string; valida_hasta: string | null }
interface Venc { que: string; quien: string; fecha: string; dias: number }
const DIAS_VENCIMIENTO = 30

/* Robots nocturnos: nombre que entiende David y días que pueden pasar sin ejecutarse antes de avisar */
const ROBOT_NOMBRE: Record<string, string> = {
  banco_sync: 'Descarga bancaria', cartero: 'Correo de David', cartero_juan: 'Correo de Juan',
  banco_bbva: 'Conexión BBVA', banco_n26: 'Conexión N26', banco_caixabank: 'Conexión CaixaBank',
}
const DIAS_SIN_ROBOT = 2
const DIAS_AVISO_CADUCIDAD = 15

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
  const ciclo = useCicloPagoCade()
  const txt = per.etiqueta
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [movs, setMovs] = useState<Mov[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [cadeMes, setCadeMes] = useState({ previsto: 0, cobrado: 0, n: 0 })
  const [historico, setHistorico] = useState<{ mes: string; total: number }[]>([])
  const [sinEnviar, setSinEnviar] = useState(0)
  const [robots, setRobots] = useState<Robot[]>([])
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [vencimientos, setVencimientos] = useState<Venc[]>([])
  const [desviaciones, setDesviaciones] = useState<Desviacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [errEnviada, setErrEnviada] = useState<string | null>(null)

  /* Cade del mes en curso: lo facturado el mes pasado es lo que toca cobrar este mes */
  useEffect(() => {
    const mesFact = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)
    const ini6 = new Date(hoy.getFullYear(), hoy.getMonth() - 6, 1)
    Promise.all([
      supabase.from('cuentas_bancarias').select('id, banco, alias, iban, iban_mask, saldo_actual, saldo_fecha, personal, activa'),
      supabase.from('v_documentacion_pendiente').select('emisor, documento, como_obtenerlo, estado, mes_cade'),
      supabase.from('tareas').select('titulo, fecha_limite, prioridad, estado').order('fecha_limite', { ascending: true }).limit(50),
      supabase.from('facturas_emitidas').select('periodo, base_imponible, emisor, id').eq('cliente', 'CADE').gte('periodo', iso(ini6)),
      supabase.from('facturas_historico').select('fecha_factura, base_imponible').eq('cliente', 'CADE').gte('fecha_factura', iso(ini6)),
      supabase.from('conciliacion').select('importe').eq('categoria', 'cade').gt('importe', 0).gte('fecha', iso(primero(hoy))),
      supabase.from('envios_cade').select('id, estado').in('estado', ['borrador', 'borrador_gmail', 'borrador_eml']),
      supabase.from('robot_salud').select('fuente, estado, ultima_ejecucion, detalle'),
      supabase.from('banco_sesiones').select('banco, valida_hasta').eq('estado', 'autorizada'),
      supabase.from('furgonetas').select('id, codigo, matricula'),
      supabase.from('furgonetas_itv').select('furgoneta_id, proxima_fecha'),
      supabase.from('furgonetas_seguros').select('furgoneta_id, compania, fecha_renovacion, fecha_proximo_cobro'),
      supabase.from('furgonetas_prestamos').select('furgoneta_id, entidad, fecha_fin'),
      supabase.from('conductores').select('nombre, carnet_caducidad, activo'),
      supabase.from('v_dia_repartidor').select('fecha, transportista, repartidor, entregas, pagado, compensacion_minimo, cargo_cade').gte('fecha', iso(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 70))),
    ]).then(([c, dc, t, fe, fh, cob, en, rs, bs, fg, itv, seg, pre, cond, dr]) => {
      setDesviaciones(desviacionesRepartidores((dr.data ?? []) as DiaDesv[]))
      setRobots((rs.data ?? []) as Robot[])
      setSesiones((bs.data ?? []) as Sesion[])
      /* Vencimientos de flota y carnets: solo los que caen en los próximos 30 días o ya han pasado */
      const furgo = new Map(((fg.data ?? []) as { id: string; codigo: string | null; matricula: string | null }[]).map(f => [f.id, f.matricula ?? f.codigo ?? '']))
      const dias = (f: string) => Math.floor((new Date(f + 'T00:00:00').getTime() - new Date(iso(hoy) + 'T00:00:00').getTime()) / 864e5)
      const v: Venc[] = []
      const add = (que: string, quien: string, fecha: string | null) => { if (fecha && dias(fecha) <= DIAS_VENCIMIENTO) v.push({ que, quien, fecha, dias: dias(fecha) }) }
      for (const x of (itv.data ?? []) as { furgoneta_id: string; proxima_fecha: string | null }[]) add('ITV', furgo.get(x.furgoneta_id) ?? '', x.proxima_fecha)
      for (const x of (seg.data ?? []) as { furgoneta_id: string; compania: string | null; fecha_renovacion: string | null; fecha_proximo_cobro: string | null }[]) {
        add(`Renovación seguro${x.compania ? ` · ${x.compania}` : ''}`, furgo.get(x.furgoneta_id) ?? '', x.fecha_renovacion)
        add(`Recibo seguro${x.compania ? ` · ${x.compania}` : ''}`, furgo.get(x.furgoneta_id) ?? '', x.fecha_proximo_cobro)
      }
      for (const x of (pre.data ?? []) as { furgoneta_id: string; entidad: string | null; fecha_fin: string | null }[]) add(`Fin del préstamo${x.entidad ? ` · ${x.entidad}` : ''}`, furgo.get(x.furgoneta_id) ?? '', x.fecha_fin)
      for (const x of (cond.data ?? []) as { nombre: string; carnet_caducidad: string | null; activo: boolean | null }[]) if (x.activo !== false) add('Carnet de conducir', x.nombre, x.carnet_caducidad)
      setVencimientos(v.sort((a, b) => a.dias - b.dias))
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

  /* "Ya la tengo enviada": marca el mes de Cade como enviado y el aviso desaparece */
  async function marcarEnviada() {
    const mes = docs[0]?.mes_cade
    if (!mes) return
    const err = await marcarDocumentacionEnviada(mes)
    if (err) { setErrEnviada(err); return }
    setErrEnviada(null)
    setDocs([])
  }

  const propias = cuentas.filter(c => c.activa !== false && !c.personal)
  const saldo = propias.reduce((s, c) => s + Number(c.saldo_actual ?? 0), 0)
  const porBanco = ['BBVA', 'N26'].map(b => ({ b, v: propias.filter(c => c.banco === b).reduce((s, c) => s + Number(c.saldo_actual ?? 0), 0), n: propias.filter(c => c.banco === b).length })).filter(x => x.n > 0)
  const ultimos4 = (c: Cuenta) => (c.iban ? c.iban.replace(/\s/g, '').slice(-4) : (c.iban_mask ?? '').replace(/\D/g, '').slice(-4)) || '····'
  const hogarCuentas = cuentas.filter(c => c.activa !== false && c.personal)
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
  /* Robots: parados más de 2 días, con error, o conexión bancaria a punto de caducar */
  const diasDesde = (f: string | null) => (f ? Math.floor((Date.now() - new Date(f).getTime()) / 864e5) : 999)
  const robotsMal = robots.map(r => ({ ...r, nombre: ROBOT_NOMBRE[r.fuente] ?? r.fuente, dias: diasDesde(r.ultima_ejecucion) }))
    .filter(r => r.dias >= DIAS_SIN_ROBOT || r.estado !== 'ok')
  const caducidadPorBanco = (() => {
    const m = new Map<string, string>()
    for (const s of sesiones) if (s.valida_hasta && (!m.has(s.banco) || s.valida_hasta > (m.get(s.banco) as string))) m.set(s.banco, s.valida_hasta)
    return [...m.entries()].map(([banco, hasta]) => ({ banco, hasta, dias: Math.floor((new Date(hasta).getTime() - Date.now()) / 864e5) }))
  })()
  const sesionesCaducan = caducidadPorBanco.filter(x => x.dias <= DIAS_AVISO_CADUCIDAD)
  const ultimaDescarga = robots.find(r => r.fuente === 'banco_sync')?.ultima_ejecucion ?? null
  const primeraCaducidad = caducidadPorBanco.map(x => x.hasta).sort()[0] ?? null
  const fmtCorto = (f: string) => new Date(f).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  const hayAvisos = docs.length > 0 || sinEnviar > 0 || sinCategorizar > 0 || tareasHoy.length > 0 || robotsMal.length > 0 || sesionesCaducan.length > 0 || vencimientos.length > 0 || desviaciones.length > 0
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

      {/* 1b. SALDO POR CUENTA: banco, alias y 4 últimos dígitos */}
      {cuentas.length > 0 && (
        <Banda bg={BLANCO}>
          {[{ t: 'Empresa', lista: propias }, { t: 'Hogar', lista: hogarCuentas }].filter(g => g.lista.length > 0).map(g => (
            <div key={g.t} style={{ marginBottom: 18 }}>
              <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 14, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                Cuentas {g.t.toLowerCase()} · {eur(g.lista.reduce((a, c) => a + Number(c.saldo_actual ?? 0), 0))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
                {[...g.lista].sort((a, b) => Number(b.saldo_actual ?? 0) - Number(a.saldo_actual ?? 0)).map(c => {
                  const sinSaldo = c.saldo_fecha == null
                  return (
                    <div key={`${c.banco}-${ultimos4(c)}`} style={{ background: ARENA_CL, border: BORDER_CARD, boxShadow: SHADOW, padding: '12px 14px' }}>
                      <div style={{ fontFamily: OSW, fontWeight: 600, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>{c.banco} · …{ultimos4(c)}</div>
                      <AliasEditable c={c} onGuardado={alias => setCuentas(cs => cs.map(x => x.id === c.id ? { ...x, alias } : x))} />
                      <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 26, color: sinSaldo ? GRIS : Number(c.saldo_actual ?? 0) >= 0 ? OLIVA : NARANJA }}>
                        {sinSaldo ? 'Sin saldo' : eur(Number(c.saldo_actual ?? 0))}
                      </div>
                      <div style={{ fontFamily: LEX, fontSize: 11, color: GRIS }}>
                        {sinSaldo ? 'El banco no facilita el saldo de esta cuenta' : `Actualizado ${new Date(c.saldo_fecha as string).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </Banda>
      )}

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
            <div style={{ fontSize: 12, fontWeight: 600, color: GRIS }}>Lo facturado en {MESES[(hoy.getMonth() + 11) % 12]} ({cadeMes.n} facturas), con IVA. {ciclo.texto ?? TEXTO_SIN_CONFIRMAR}</div>
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
              {cadeMes.previsto === 0 ? 'Aún no hay facturas del mes pasado.' : falta <= 0 ? 'Cade ya ha pagado todo lo previsto.' : ciclo.diaLimite ? (diaMes > ciclo.diaLimite ? `Cade se retrasa: faltan ${eur0(falta)} y ya pasó el día ${ciclo.diaLimite}.` : `Faltan ${eur0(falta)}: el plazo acaba el día ${ciclo.diaLimite}.`) : `Faltan ${eur0(falta)}.`}
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
            {robotsMal.map(r => (
              <Aviso key={r.fuente} color={TERRA} enlace="/configuracion/bancos" boton="Revisar"
                texto={r.dias >= DIAS_SIN_ROBOT ? `${r.nombre}: ${r.dias >= 999 ? 'nunca se ha ejecutado' : `lleva ${r.dias} días sin ejecutarse`}` : `${r.nombre}: terminó con error`} />
            ))}
            {sesionesCaducan.map(s => (
              <Aviso key={s.banco} color={NARANJA} enlace="/configuracion/bancos" boton="Renovar"
                texto={s.dias < 0 ? `La conexión con ${s.banco} ha caducado` : `La conexión con ${s.banco} caduca el ${fmtCorto(s.hasta)}`} />
            ))}
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
                <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Link to="/finanzas/documentacion" style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: ARENA, background: NARANJA, border: `2px solid ${INK}`, padding: '5px 12px', textDecoration: 'none' }}>Subir documentos →</Link>
                  <button onClick={marcarEnviada} style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: ARENA, background: OLIVA, border: `2px solid ${INK}`, padding: '5px 12px', cursor: 'pointer' }}>Ya la tengo enviada</button>
                  {errEnviada && <span style={{ fontSize: 12, fontWeight: 700, color: TERRA }}>No se pudo marcar: {errEnviada}</span>}
                </div>
              </div>
            )}
            {desviaciones.map((x, i) => (
              <Aviso key={`d${i}`} color={x.gravedad === 'alerta' ? TERRA : NARANJA} texto={x.texto} enlace={x.texto.includes('cargos') ? '/reclamaciones' : '/entregas'} boton={x.texto.includes('cargos') ? 'Reclamar' : 'Ver rutas'} />
            ))}
            {vencimientos.length > 0 && (
              <div style={card}>
                <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 15, textTransform: 'uppercase' }}>Vencimientos · próximos {DIAS_VENCIMIENTO} días</div>
                <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
                  {vencimientos.map((x, i) => (
                    <div key={i} style={{ fontSize: 13, fontWeight: 600, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
                      <span style={{ fontFamily: OSW, fontWeight: 700, color: x.dias < 0 ? TERRA : x.dias <= 7 ? NARANJA : INK, minWidth: 92 }}>
                        {x.dias < 0 ? `hace ${-x.dias} d` : x.dias === 0 ? 'hoy' : `en ${x.dias} d`}
                      </span>
                      <span>{x.que}</span>
                      <span style={{ color: GRIS }}>{x.quien} · {new Date(x.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 10 }}><Link to="/flota" style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: INK, background: ARENA, border: `2px solid ${INK}`, padding: '5px 12px', textDecoration: 'none' }}>Ver flota →</Link></div>
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
        {robots.length > 0 && (
          <span style={{ marginLeft: 10, color: robotsMal.length === 0 && sesionesCaducan.length === 0 ? OLIVA : TERRA }}>
            Robots: {robotsMal.length === 0 ? 'todo en marcha' : `${robotsMal.length} con problemas`}
            {ultimaDescarga ? ` · última descarga bancaria ${new Date(ultimaDescarga).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
            {primeraCaducidad ? ` · conexiones bancarias hasta el ${fmtCorto(primeraCaducidad)}` : ''}
          </span>
        )}
      </section>
    </>
  )
}

/* Nombre de la cuenta editable en el sitio: se pulsa, se escribe y Enter guarda */
function AliasEditable({ c, onGuardado }: { c: Cuenta; onGuardado: (alias: string) => void }) {
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState(c.alias ?? '')
  const [error, setError] = useState(false)
  async function guardar() {
    const nuevo = valor.trim()
    setEditando(false)
    if (!nuevo || nuevo === c.alias) return
    const { error: e } = await supabase.from('cuentas_bancarias').update({ alias: nuevo }).eq('id', c.id)
    if (e) { setError(true); return }
    setError(false)
    onGuardado(nuevo)
  }
  if (editando) {
    return (
      <input autoFocus value={valor} onChange={e => setValor(e.target.value)} onBlur={guardar}
        onKeyDown={e => { if (e.key === 'Enter') guardar(); if (e.key === 'Escape') setEditando(false) }}
        style={{ width: '100%', fontFamily: LEX, fontSize: 13, fontWeight: 700, border: `2px solid ${INK}`, padding: '2px 6px', margin: '2px 0' }} />
    )
  }
  return (
    <div onClick={() => { setValor(c.alias ?? ''); setEditando(true) }} title="Pulsa para cambiar el nombre"
      style={{ fontFamily: LEX, fontSize: 13, fontWeight: 700, color: error ? TERRA : INK, cursor: 'pointer', borderBottom: `1px dashed ${GRIS}`, display: 'inline-block', margin: '2px 0' }}>
      {c.alias || 'Ponle nombre'}{error ? ' · no se pudo guardar' : ''}
    </div>
  )
}
