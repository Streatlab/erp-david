import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import RepartidorDias from '@/components/facturacion/RepartidorDias'
import EnvioFacturas from '@/components/facturacion/EnvioFacturas'
import { INK, ARENA, ARENA_CL, BLANCO, GRIS, OLIVA, TERRA, NARANJA, MARINO, OSW, BORDER, BORDER_CARD, SHADOW, PAD, eyebrow, d } from '@/styles/neobrutal'

/* Facturación ▸ Liquidaciones del mes: qué ha liquidado Cade por código, cuánto pagaría sin el tope diario,
   ajustes (cargos, extras, pendientes), generar facturas y descargar su PDF, y totales con IVA por emisor.
   Aquí también viven los días laborables que Cade no ha pagado (para reclamar). */

interface Liq { id: string; transportista: string; emisor: string; entregas: number; dias: number; total: number; factura_id: string | null; recortes_detalle: string | null }
interface Exc { transportista: string; repartidor: string; exceso_no_pagado: number; pagaria_sin_tope: number; dias_con_exceso: number }
interface Fac { id: string; emisor: string; numero_factura: number; transportista: string; base_imponible: number; pdf_ruta: string | null }
interface Env { factura_id: string; estado: string; detalle: string | null }
interface Alerta { transportista: string; fecha: string; descripcion: string }

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const NOMBRE: Record<string, string> = { DAVID: 'David', JUAN: 'Juan' }
const eur = (n: number) => Number(n ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const mesAnterior = () => { const h = new Date(); return new Date(h.getFullYear(), h.getMonth() - 1, 1) }
const iso = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-01`

export default function LiquidacionesMes() {
  const [mes, setMes] = useState<Date>(mesAnterior())
  const [liqs, setLiqs] = useState<Liq[]>([])
  const [exc, setExc] = useState<Exc[]>([])
  const [facs, setFacs] = useState<Fac[]>([])
  const [envs, setEnvs] = useState<Env[]>([])
  const [docsFaltan, setDocsFaltan] = useState(0)
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  async function cargar() {
    const m = iso(mes)
    const finMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 1)
    const [l, e, f, dc, al] = await Promise.all([
      supabase.from('liquidaciones_cade').select('id, transportista, emisor, entregas, dias, total, factura_id, recortes_detalle').eq('mes', m).order('transportista'),
      supabase.from('v_excesos_cade').select('transportista, repartidor, exceso_no_pagado, pagaria_sin_tope, dias_con_exceso').eq('mes', m),
      supabase.from('facturas_emitidas').select('id, emisor, numero_factura, transportista, base_imponible, pdf_ruta').eq('periodo', m).eq('cliente', 'CADE'),
      supabase.from('v_documentacion_pendiente').select('estado').eq('estado', 'pedir'),
      supabase.from('liquidaciones_cade_incidencias').select('transportista, fecha, descripcion').eq('codigo', 'DIA NO PAGADO').eq('estado', 'propuesta').gte('fecha', m).lt('fecha', iso(finMes)),
    ])
    setLiqs((l.data ?? []) as Liq[]); setExc((e.data ?? []) as Exc[]); setFacs((f.data ?? []) as Fac[])
    setDocsFaltan(dc.data?.length ?? 0)
    setAlertas((al.data ?? []) as Alerta[])
    const ids = (f.data ?? []).map((x: any) => x.id)
    if (ids.length) {
      const { data: en } = await supabase.from('envios_cade').select('factura_id, estado, detalle').in('factura_id', ids)
      setEnvs((en ?? []) as Env[])
    } else setEnvs([])
  }
  useEffect(() => { cargar() }, [mes]) // eslint-disable-line react-hooks/exhaustive-deps

  async function generar() {
    setBusy('generar'); setMsg(null)
    const { data, error } = await supabase.rpc('generar_facturas_cade', { p_mes: iso(mes) })
    setMsg(error ? 'No se pudieron generar: ' + error.message : `${(data ?? []).length} factura(s) generada(s) en borrador.`)
    setBusy(null); cargar()
  }

  async function pdf(f: Fac) {
    setBusy(f.id)
    const { data, error } = await supabase.functions.invoke('factura-pdf', { body: { factura_id: f.id } })
    setBusy(null)
    if (error || !data?.url) { setMsg('No se pudo generar el PDF'); return }
    window.open(data.url, '_blank'); cargar()
  }

  const pendientes = liqs.filter(l => !l.factura_id).length
  const tot = (em?: string) => {
    const fs = facs.filter(f => !em || f.emisor === em)
    const b = fs.reduce((s, f) => s + Number(f.base_imponible), 0)
    return { b, iva: Math.round(b * 21) / 100, t: Math.round(b * 121) / 100, n: fs.length }
  }
  const excesoTotal = exc.reduce((s, e) => s + Number(e.exceso_no_pagado), 0)
  const th = { fontFamily: OSW, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1, textAlign: 'left' as const, padding: '8px 10px', borderBottom: `3px solid ${INK}`, background: ARENA }
  const td = { padding: '8px 10px', fontSize: 13, fontWeight: 600, borderBottom: '1px solid rgba(11,21,36,.12)', color: INK }

  return (
    <section style={{ background: ARENA_CL, borderBottom: BORDER, padding: `24px ${PAD}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <span style={eyebrow(MARINO, ARENA)}>Liquidaciones Cade</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <button onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))} style={{ border: BORDER_CARD, background: BLANCO, fontFamily: OSW, fontWeight: 700, padding: '4px 10px', cursor: 'pointer' }}>‹</button>
            <div style={d('clamp(20px,2.4vw,30px)')}>{MESES[mes.getMonth()].toUpperCase()} {mes.getFullYear()}</div>
            <button onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} style={{ border: BORDER_CARD, background: BLANCO, fontFamily: OSW, fontWeight: 700, padding: '4px 10px', cursor: 'pointer' }}>›</button>
          </div>
        </div>
        <button onClick={generar} disabled={!pendientes || busy === 'generar'}
          title={docsFaltan ? 'Puedes generarlas, pero no se enviarán a Cade hasta completar la documentación' : ''}
          style={{ background: pendientes ? NARANJA : GRIS, color: ARENA, border: BORDER_CARD, boxShadow: pendientes ? SHADOW : 'none', padding: '12px 20px', fontFamily: OSW, fontWeight: 700, fontSize: 15, letterSpacing: 1, textTransform: 'uppercase', cursor: pendientes ? 'pointer' : 'default' }}>
          {busy === 'generar' ? 'Generando…' : pendientes ? `Generar ${pendientes} factura${pendientes > 1 ? 's' : ''}` : 'Facturas generadas'}
        </button>
      </div>

      {msg && <div style={{ marginTop: 12, background: BLANCO, border: BORDER_CARD, padding: '8px 12px', fontWeight: 700 }}>{msg}</div>}
      {docsFaltan > 0 && <div style={{ marginTop: 12, background: TERRA, color: ARENA, border: BORDER_CARD, padding: '8px 12px', fontWeight: 700 }}>Faltan {docsFaltan} documento(s): las facturas no salen a Cade hasta completarlo.</div>}

      {alertas.length > 0 && (
        <div style={{ marginTop: 12, background: TERRA, color: ARENA, border: BORDER_CARD, boxShadow: SHADOW, padding: '10px 14px' }}>
          <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 14, letterSpacing: 1, textTransform: 'uppercase' }}>Reclamar a Cade: días laborables sin pagar</div>
          {alertas.map((a, i) => <div key={i} style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{a.transportista} · {a.descripcion}</div>)}
        </div>
      )}

      <div style={{ overflowX: 'auto', marginTop: 16, background: BLANCO, border: BORDER_CARD }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Código', 'Repartidor', 'Factura', 'Entregas', 'Cade paga', 'Sin tope pagaría', 'Exceso no pagado', 'Ajustes', 'Nº', ''].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {liqs.length === 0 && <tr><td colSpan={10} style={{ ...td, textAlign: 'center', color: GRIS, padding: 24 }}>Sin liquidaciones este mes.</td></tr>}
            {liqs.map(l => {
              const e = exc.find(x => x.transportista === l.transportista)
              const f = facs.find(x => x.transportista === l.transportista)
              const en = f ? envs.find(x => x.factura_id === f.id) : undefined
              return (
                <tr key={l.id}>
                  <td style={{ ...td, fontFamily: OSW, fontWeight: 700 }}>{l.transportista}</td>
                  <td style={td}>{e?.repartidor ?? '—'}</td>
                  <td style={td}>{NOMBRE[f?.emisor ?? l.emisor] ?? l.emisor}</td>
                  <td style={td}>{l.entregas} · {l.dias} días</td>
                  <td style={{ ...td, textAlign: 'right' }}>{eur(l.total)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{eur(e?.pagaria_sin_tope ?? l.total)}</td>
                  <td style={{ ...td, textAlign: 'right', color: Number(e?.exceso_no_pagado) > 0 ? TERRA : GRIS }}>{eur(e?.exceso_no_pagado ?? 0)}{e?.dias_con_exceso ? ` · ${e.dias_con_exceso} d` : ''}</td>
                  <td style={{ ...td, fontSize: 12, maxWidth: 260 }}>{l.recortes_detalle ?? '—'}</td>
                  <td style={{ ...td, fontFamily: OSW, fontWeight: 700 }}>{f ? f.numero_factura : '—'}{en ? <div style={{ fontSize: 11, color: GRIS, fontWeight: 600 }}>{en.estado}</div> : null}</td>
                  <td style={td}>{f && <button onClick={() => pdf(f)} disabled={busy === f.id} style={{ border: `2px solid ${INK}`, background: ARENA, fontFamily: OSW, fontWeight: 700, fontSize: 12, padding: '3px 10px', cursor: 'pointer' }}>{busy === f.id ? '…' : 'PDF'}</button>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <RepartidorDias mes={iso(mes)} />
      <EnvioFacturas mes={iso(mes)} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 16 }}>
        {[{ k: 'DAVID', l: 'David' }, { k: 'JUAN', l: 'Juan' }, { k: undefined, l: 'Total' }].map(x => {
          const v = tot(x.k)
          return (
            <div key={x.l} style={{ background: x.k ? BLANCO : MARINO, border: BORDER_CARD, padding: '12px 14px', color: x.k ? INK : ARENA }}>
              <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 14, textTransform: 'uppercase' }}>{x.l} · {v.n} factura{v.n === 1 ? '' : 's'}</div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>Base {eur(v.b)} · IVA {eur(v.iva)}</div>
              <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 24, marginTop: 2 }}>{eur(v.t)}</div>
            </div>
          )
        })}
        <div style={{ background: excesoTotal > 0 ? TERRA : OLIVA, border: BORDER_CARD, padding: '12px 14px', color: ARENA }}>
          <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 14, textTransform: 'uppercase' }}>Exceso no pagado</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>Trabajo por encima del tope diario</div>
          <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 24, marginTop: 2 }}>{eur(excesoTotal)}</div>
        </div>
      </div>
    </section>
  )
}
