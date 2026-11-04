import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { fmtEur } from '@/lib/format'
import { INK, ARENA, ARENA_CL, BLANCO, GRIS, OLIVA, TERRA, NARANJA, AMBAR, OSW, BORDER_CARD, SHADOW } from '@/styles/neobrutal'
import { PageNeo, Banda, CabeceraNeo, HeroNeo, BotonNeo } from '@/components/neo/NeoUI'

/* Cierre de mes guiado: cinco pasos en orden, cada uno dice qué falta y lleva a la pantalla donde se arregla.
   Sustituye a ir saltando entre doce pantallas de Dinero. Todo sale de la base; nada se inventa. */

interface Liq { id: string; transportista: string | null; estado: string | null; factura_id: string | null; total: number | null }
interface Inc { id: number; transportista: string | null; importe: number }
interface Fac { id: string; transportista: string | null; estado: string; base_imponible: number | null; total: number | null; emisor: string | null }
interface Env { factura_id: string | null; estado: string; tipo: string | null }
interface Doc { estado: string; mes_cade: string | null; documento: string }
interface Pyg { ambito: string; signo: string; importe: number; categoria: string | null }
interface Emisor { transportista: string; vigente_desde: string | null; vigente_hasta: string | null }

type Estado = 'hecho' | 'falta' | 'sin_datos'
interface Paso { n: number; titulo: string; estado: Estado; resumen: string; detalle: string[]; enlace: string; boton: string }

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const mesAnterior = () => { const h = new Date(); return new Date(h.getFullYear(), h.getMonth() - 1, 1) }
const isoMes = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
const finMes = (d: Date) => { const f = new Date(d.getFullYear(), d.getMonth() + 1, 0); return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}` }
const eur2 = (n: number | null | undefined) => fmtEur(n, { decimals: 2 })
const COLOR: Record<Estado, string> = { hecho: OLIVA, falta: NARANJA, sin_datos: GRIS }
const TXT: Record<Estado, string> = { hecho: 'Hecho', falta: 'Falta', sin_datos: 'Sin datos' }

export default function CierreMes() {
  const [mes, setMes] = useState<Date>(mesAnterior())
  const [pendientes, setPendientes] = useState(0)
  const [robotOk, setRobotOk] = useState<boolean | null>(null)
  const [liqs, setLiqs] = useState<Liq[]>([])
  const [incs, setIncs] = useState<Inc[]>([])
  const [facs, setFacs] = useState<Fac[]>([])
  const [envs, setEnvs] = useState<Env[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [docEnviada, setDocEnviada] = useState(false)
  const [pyg, setPyg] = useState<Pyg[]>([])
  const [emisores, setEmisores] = useState<Emisor[]>([])
  const [cargando, setCargando] = useState(true)

  const m = isoMes(mes), fin = finMes(mes)

  useEffect(() => {
    let vivo = true
    Promise.all([
      supabase.from('conciliacion').select('id', { count: 'exact', head: true }).gte('fecha', m).lte('fecha', fin).like('categoria', 'pendiente-revisar%'),
      supabase.from('robot_salud').select('fuente, estado, ultima_ejecucion').eq('fuente', 'banco_sync').maybeSingle(),
      supabase.from('liquidaciones_cade').select('id, transportista, estado, factura_id, total').eq('mes', m),
      supabase.from('liquidaciones_cade_incidencias').select('id, transportista, importe').eq('estado', 'propuesta').gte('fecha', m).lte('fecha', fin),
      supabase.from('facturas_emitidas').select('id, transportista, estado, base_imponible, total, emisor').eq('periodo', m).eq('cliente', 'CADE'),
      supabase.from('envios_cade').select('factura_id, estado, tipo').eq('tipo', 'factura'),
      supabase.from('v_documentacion_pendiente').select('estado, mes_cade, documento'),
      supabase.from('documentacion_enviada').select('mes').eq('mes', m),
      supabase.from('v_pyg_mensual').select('ambito, signo, importe, categoria').eq('mes', m),
      supabase.from('emisores_transportistas').select('transportista, vigente_desde, vigente_hasta'),
    ]).then(([p, r, l, i, f, e, d, de, g, em]) => {
      if (!vivo) return
      setPendientes(p.count ?? 0)
      const ult = r.data?.ultima_ejecucion ? (Date.now() - new Date(r.data.ultima_ejecucion as string).getTime()) / 864e5 : null
      setRobotOk(ult == null ? null : ult < 2 && r.data?.estado === 'ok')
      setLiqs((l.data ?? []) as Liq[]); setIncs((i.data ?? []) as Inc[]); setFacs((f.data ?? []) as Fac[]); setEnvs((e.data ?? []) as Env[])
      setDocs((d.data ?? []) as Doc[]); setDocEnviada((de.data ?? []).length > 0); setPyg((g.data ?? []) as Pyg[]); setEmisores((em.data ?? []) as Emisor[])
      setCargando(false)
    })
    return () => { vivo = false }
  }, [m, fin])

  const pasos = useMemo<Paso[]>(() => {
    const codigosVigentes = [...new Set(emisores.filter(e => (!e.vigente_desde || e.vigente_desde <= fin) && (!e.vigente_hasta || e.vigente_hasta >= m)).map(e => e.transportista))]
    const liqPor = new Map(liqs.map(l => [l.transportista ?? '', l]))
    const faltanLiq = codigosVigentes.filter(c => !liqPor.has(c))
    const noCuadran = liqs.filter(l => l.estado === 'error_cuadre')
    const incEur = incs.reduce((s, x) => s + Math.abs(Number(x.importe)), 0)

    const p1: Paso = {
      n: 1, titulo: 'Banco al día', enlace: '/conciliacion', boton: 'Ir a Conciliación',
      estado: robotOk === false ? 'falta' : pendientes > 0 ? 'falta' : 'hecho',
      resumen: pendientes > 0 ? `${pendientes} movimiento${pendientes > 1 ? 's' : ''} del mes sin categorizar` : 'Todos los movimientos del mes están categorizados',
      detalle: [robotOk === false ? 'La descarga bancaria lleva más de 2 días parada: revisa Robots en Hoy.' : robotOk ? 'Descarga bancaria en marcha.' : 'Sin información del robot bancario.'],
    }
    const p2: Paso = {
      n: 2, titulo: 'Liquidaciones de Cade cuadradas', enlace: '/finanzas/liquidaciones', boton: 'Ver liquidaciones',
      estado: liqs.length === 0 ? 'sin_datos' : faltanLiq.length || noCuadran.length ? 'falta' : 'hecho',
      resumen: liqs.length === 0 ? 'Aún no ha llegado ninguna liquidación de este mes (Cade las manda a principios del mes siguiente)'
        : `${liqs.length} de ${codigosVigentes.length} códigos con liquidación · ${eur2(liqs.reduce((s, l) => s + Number(l.total ?? 0), 0))}`,
      detalle: [
        ...(faltanLiq.length ? [`Faltan los códigos ${faltanLiq.join(', ')}.`] : []),
        ...(noCuadran.length ? [`No cuadran: ${noCuadran.map(l => l.transportista).join(', ')}. No facturar hasta aclararlo.`] : []),
        ...(incs.length ? [`${incs.length} cargo${incs.length > 1 ? 's' : ''} de Cade por decidir (${eur2(incEur)}): reclamar o descartar en Reclamaciones.`] : []),
      ],
    }
    const sinFactura = liqs.filter(l => !l.factura_id && l.estado !== 'facturada_fuera_erp')
    const facIds = new Set(facs.map(f => f.id))
    const enviadas = envs.filter(e => e.factura_id && facIds.has(e.factura_id) && !e.estado.startsWith('borrador'))
    const p3: Paso = {
      n: 3, titulo: 'Facturas emitidas y enviadas', enlace: '/finanzas/facturacion', boton: 'Ir a Facturación',
      estado: liqs.length === 0 ? 'sin_datos' : sinFactura.length ? 'falta' : facs.length && enviadas.length < facs.length ? 'falta' : 'hecho',
      resumen: liqs.length === 0 ? 'Sin liquidaciones, no hay nada que facturar todavía'
        : `${facs.length} factura${facs.length === 1 ? '' : 's'} del mes · ${eur2(facs.reduce((s, f) => s + Number(f.total ?? 0), 0))} con IVA · ${enviadas.length} enviada${enviadas.length === 1 ? '' : 's'} a Cade`,
      detalle: [
        ...(sinFactura.length ? [`Sin factura: códigos ${sinFactura.map(l => l.transportista).join(', ')}.`] : []),
        ...(facs.length && enviadas.length < facs.length ? [`${facs.length - enviadas.length} factura${facs.length - enviadas.length > 1 ? 's' : ''} sin enviar a Cade (quedan en borrador).`] : []),
        ...(facs.filter(f => f.estado === 'COBRADA').length ? [`${facs.filter(f => f.estado === 'COBRADA').length} ya cobrada${facs.filter(f => f.estado === 'COBRADA').length > 1 ? 's' : ''}.`] : []),
      ],
    }
    const docsMes = docs.filter(d => d.estado === 'pedir' && (!d.mes_cade || d.mes_cade.slice(0, 7) === m.slice(0, 7)))
    const p4: Paso = {
      n: 4, titulo: 'Documentación enviada a Cade', enlace: '/finanzas/documentacion', boton: 'Ir a Documentación',
      estado: docEnviada ? 'hecho' : docsMes.length ? 'falta' : 'hecho',
      resumen: docEnviada ? 'Marcada como enviada' : docsMes.length ? `Faltan ${docsMes.length} documento${docsMes.length > 1 ? 's' : ''}` : 'Nada pendiente de enviar',
      detalle: docsMes.slice(0, 5).map(d => d.documento),
    }
    const ing = pyg.filter(x => x.ambito === 'actividad' && x.signo === 'ingreso').reduce((s, x) => s + Number(x.importe), 0)
    const gas = pyg.filter(x => x.ambito === 'actividad' && x.signo === 'gasto' && x.categoria !== 'devolucion-bi-prior').reduce((s, x) => s + Math.abs(Number(x.importe)), 0)
    const base = facs.reduce((s, f) => s + Number(f.base_imponible ?? 0), 0)
    const listo = [p1, p2, p3, p4].every(p => p.estado === 'hecho')
    const p5: Paso = {
      n: 5, titulo: 'Resultado del mes', enlace: '/running', boton: 'Ver Running',
      estado: pyg.length === 0 ? 'sin_datos' : listo ? 'hecho' : 'falta',
      resumen: pyg.length === 0 ? 'Sin movimientos del mes' : `Entró ${eur2(ing)} y salió ${eur2(gas)} de la actividad: ${ing - gas >= 0 ? 'quedan' : 'faltan'} ${eur2(Math.abs(ing - gas))}`,
      detalle: [
        ...(base ? [`IVA a guardar de lo facturado a Cade: ${eur2(base * 0.21)} (21 % de ${eur2(base)}).`] : []),
        ...(listo ? ['Mes cerrado: todo cuadra.'] : ['El resultado es provisional hasta completar los pasos anteriores.']),
      ],
    }
    return [p1, p2, p3, p4, p5]
  }, [emisores, liqs, incs, facs, envs, docs, docEnviada, pyg, pendientes, robotOk, m, fin])

  const hechos = pasos.filter(p => p.estado === 'hecho').length
  const etiqueta = `${MESES[mes.getMonth()]} ${mes.getFullYear()}`

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Dinero" titulo="Cierre de mes">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <BotonNeo bg={ARENA} onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}>‹</BotonNeo>
          <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 18, color: ARENA, textTransform: 'capitalize', minWidth: 160, textAlign: 'center' }}>{etiqueta}</span>
          <BotonNeo bg={ARENA} onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} disabled={isoMes(mes) >= isoMes(new Date())}>›</BotonNeo>
        </div>
      </CabeceraNeo>

      <HeroNeo
        eyebrowTxt={`Cierre de ${etiqueta}`}
        cifra={cargando ? '…' : `${hechos} / 5`}
        color={hechos === 5 ? OLIVA : hechos >= 3 ? AMBAR : NARANJA}
        frase={cargando ? 'Comprobando…' : hechos === 5 ? 'Mes cerrado. Todo cuadra y está enviado.' : `Quedan ${5 - hechos} paso${5 - hechos > 1 ? 's' : ''}. Empieza por el primero que falte: cada uno lleva a la pantalla donde se arregla.`}
      />

      <Banda bg={ARENA}>
        <div style={{ display: 'grid', gap: 12 }}>
          {pasos.map(p => <TarjetaPaso key={p.n} p={p} />)}
        </div>
      </Banda>
    </PageNeo>
  )
}

function TarjetaPaso({ p }: { p: Paso }) {
  const c = COLOR[p.estado]
  return (
    <div style={{ background: BLANCO, border: BORDER_CARD, boxShadow: SHADOW, borderLeft: `10px solid ${c}`, padding: '12px 16px', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '6px 16px', alignItems: 'center' }}>
      <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 28, color: c, lineHeight: 1 }}>{p.n}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 17 }}>{p.titulo}</span>
          <Etiqueta color={c}>{TXT[p.estado]}</Etiqueta>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{p.resumen}</div>
        {p.detalle.length > 0 && (
          <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: 12, fontWeight: 600, color: p.estado === 'falta' ? TERRA : GRIS }}>
            {p.detalle.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        )}
      </div>
      <Link to={p.enlace} style={{ fontFamily: OSW, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: p.estado === 'falta' ? ARENA : INK, background: p.estado === 'falta' ? NARANJA : ARENA_CL, border: `2px solid ${INK}`, padding: '6px 12px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
        {p.boton} →
      </Link>
    </div>
  )
}

function Etiqueta({ color, children }: { color: string; children: ReactNode }) {
  return <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', background: color, color: color === GRIS || color === OLIVA || color === NARANJA || color === TERRA ? ARENA : INK, border: `2px solid ${INK}`, padding: '1px 8px' }}>{children}</span>
}
