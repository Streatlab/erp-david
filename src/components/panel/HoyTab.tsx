import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { INK, ARENA, ARENA_CL, BLANCO, GRIS, OLIVA, TERRA, NARANJA, MARINO, AMBAR, OSW, LEX, BORDER, BORDER_CARD, SHADOW, PAD, eyebrow, d } from '@/styles/neobrutal'

/* Pestaña HOY del Panel global. Lo que hay que mirar hoy de Cade, sin ruido:
   1. Documentación del mes (qué falta, de quién y cómo sacarlo)
   2. Tope de facturación anual por emisor
   3. Días laborables que Cade no ha pagado (para reclamar)
   4. Facturas del mes: qué se factura y qué se ha perdido por recortes y cargos (todo con IVA)
   Más bloques se irán añadiendo aquí a medida que se pidan. */

interface Doc { emisor: string; documento: string; como_obtenerlo: string; estado: string; mes_cade: string }
interface Tope { emisor: string; tope: number; facturado: number; margen_restante: number; pct_consumido: number }
interface Alerta { transportista: string; fecha: string; descripcion: string; estado: string }
interface Fac { id: string; emisor: string; numero_factura: number; transportista: string; base_imponible: number }
interface Desc { repartidor: string; transportista: string; recorte_tope: number; cargos: number }

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const NOMBRE: Record<string, string> = { DAVID: 'David', JUAN: 'Juan' }
const eur = (n: number) => Number(n ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const conIva = (n: number) => Math.round(Number(n ?? 0) * 121) / 100
const iso = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-01`

function Banda({ bg, children }: { bg: string; children: ReactNode }) {
  return <section style={{ background: bg, borderBottom: BORDER, padding: `28px ${PAD}` }}>{children}</section>
}

export default function HoyTab() {
  const h = new Date()
  const mesAnt = new Date(h.getFullYear(), h.getMonth() - 1, 1)
  const mes = iso(mesAnt)
  const [docs, setDocs] = useState<Doc[]>([])
  const [topes, setTopes] = useState<Tope[]>([])
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [facs, setFacs] = useState<Fac[]>([])
  const [descs, setDescs] = useState<Desc[]>([])
  const [listo, setListo] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('v_documentacion_pendiente').select('emisor, documento, como_obtenerlo, estado, mes_cade'),
      supabase.from('v_tope_facturacion').select('emisor, tope, facturado, margen_restante, pct_consumido'),
      supabase.from('liquidaciones_cade_incidencias').select('transportista, fecha, descripcion, estado').eq('codigo', 'DIA NO PAGADO').eq('estado', 'propuesta'),
      supabase.from('facturas_emitidas').select('id, emisor, numero_factura, transportista, base_imponible').eq('periodo', mes).eq('cliente', 'CADE').order('emisor').order('numero_factura'),
      supabase.from('v_descuentos_cade_iva').select('repartidor, transportista, recorte_tope, cargos').eq('mes', mes),
    ]).then(([a, b, c, f, e]) => {
      setDocs((a.data ?? []) as Doc[]); setTopes((b.data ?? []) as Tope[]); setAlertas((c.data ?? []) as Alerta[])
      setFacs((f.data ?? []) as Fac[]); setDescs((e.data ?? []) as Desc[]); setListo(true)
    })
  }, [mes])

  const pedir = docs.filter(x => x.estado === 'pedir')
  const totalIva = (em?: string) => conIva(facs.filter(f => !em || f.emisor === em).reduce((s, f) => s + Number(f.base_imponible), 0))
  const perdido = descs.reduce((s, x) => s + Number(x.recorte_tope) + Number(x.cargos), 0)
  const th = { fontFamily: OSW, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1, textAlign: 'left' as const, padding: '8px 10px', borderBottom: `3px solid ${INK}`, background: ARENA }
  const td = { padding: '8px 10px', fontSize: 13, fontWeight: 600, borderBottom: '1px solid rgba(11,21,36,.12)', color: INK }

  return (
    <>
      <Banda bg={ARENA_CL}>
        <span style={eyebrow(NARANJA, ARENA)}>Hoy · {h.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        <h2 style={{ ...d('clamp(22px,2.6vw,32px)'), margin: '12px 0 4px' }}>Cade · {MESES[mesAnt.getMonth()]} {mesAnt.getFullYear()}</h2>
        <div style={{ fontSize: 13, fontWeight: 600, color: GRIS }}>Lo que hay que mirar hoy. Todos los importes, con IVA.</div>
        {!listo && <div style={{ fontFamily: OSW, fontWeight: 700, marginTop: 14, color: GRIS }}>CARGANDO…</div>}
      </Banda>

      {/* 1. Documentación */}
      <Banda bg={pedir.length ? AMBAR : ARENA}>
        <span style={eyebrow(pedir.length ? TERRA : OLIVA, ARENA)}>Documentación para Cade</span>
        <h2 style={{ ...d('clamp(20px,2.4vw,28px)'), margin: '12px 0 16px' }}>
          {pedir.length ? `Faltan ${pedir.length} documento${pedir.length > 1 ? 's' : ''}` : 'Todo al día'}
        </h2>
        <div style={{ overflowX: 'auto', background: BLANCO, border: BORDER_CARD }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Emisor', 'Documento', 'Estado', 'Cómo sacarlo'].map(x => <th key={x} style={th}>{x}</th>)}</tr></thead>
            <tbody>
              {docs.length === 0 && <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: GRIS, padding: 20 }}>Sin datos de documentación.</td></tr>}
              {[...docs].sort((x, y) => (x.estado === 'pedir' ? 0 : 1) - (y.estado === 'pedir' ? 0 : 1)).map((x, i) => (
                <tr key={i}>
                  <td style={{ ...td, fontFamily: OSW, fontWeight: 700 }}>{NOMBRE[x.emisor] ?? x.emisor}</td>
                  <td style={td}>{x.documento}</td>
                  <td style={td}>
                    <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', background: x.estado === 'pedir' ? TERRA : OLIVA, color: ARENA, border: `2px solid ${INK}`, padding: '1px 8px' }}>
                      {x.estado === 'pedir' ? 'Falta' : 'OK'}
                    </span>
                  </td>
                  <td style={{ ...td, fontSize: 12, color: x.estado === 'pedir' ? INK : GRIS }}>{x.estado === 'pedir' ? x.como_obtenerlo : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 12 }}>
          <Link to="/finanzas/documentacion-cade" style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: INK, background: ARENA, border: `2px solid ${INK}`, padding: '5px 12px', textDecoration: 'none' }}>Subir documentos →</Link>
        </div>
      </Banda>

      {/* 2. Tope de facturación */}
      <Banda bg={BLANCO}>
        <span style={eyebrow(MARINO, ARENA)}>Tope de facturación anual</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18, marginTop: 16 }}>
          {topes.map(t => {
            const pct = Number(t.pct_consumido)
            const c = pct >= 90 ? TERRA : pct >= 75 ? NARANJA : OLIVA
            return (
              <div key={t.emisor} style={{ border: BORDER_CARD, boxShadow: SHADOW, background: ARENA, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 15, textTransform: 'uppercase' }}>{NOMBRE[t.emisor] ?? t.emisor}</span>
                  <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 24, color: c }}>{pct.toFixed(1).replace('.', ',')} %</span>
                </div>
                <div style={{ background: BLANCO, border: BORDER_CARD, height: 20, position: 'relative', marginTop: 8 }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${Math.min(100, pct)}%`, background: c }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>
                  Facturado {eur(t.facturado)} de {eur(t.tope)} <span style={{ color: GRIS }}>(sin IVA)</span>
                </div>
                <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 16, marginTop: 4 }}>Margen: {eur(t.margen_restante)}</div>
              </div>
            )
          })}
        </div>
      </Banda>

      {/* 3. Días sin pagar */}
      {alertas.length > 0 && (
        <Banda bg={TERRA}>
          <span style={eyebrow(ARENA, TERRA)}>Reclamar a Cade</span>
          <h2 style={{ ...d('clamp(20px,2.4vw,28px)', ARENA), margin: '12px 0 14px' }}>Días laborables sin pagar</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            {alertas.map((a, i) => (
              <div key={i} style={{ background: ARENA, border: BORDER_CARD, padding: '8px 12px', fontSize: 13, fontWeight: 700 }}>{a.transportista} · {a.descripcion}</div>
            ))}
          </div>
        </Banda>
      )}

      {/* 4. Facturas del mes */}
      <Banda bg={ARENA_CL}>
        <span style={eyebrow(NARANJA, ARENA)}>Facturas de {MESES[mesAnt.getMonth()]}</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, margin: '16px 0' }}>
          {[{ l: 'David', v: totalIva('DAVID'), bg: BLANCO, c: INK }, { l: 'Juan', v: totalIva('JUAN'), bg: BLANCO, c: INK }, { l: 'Total con IVA', v: totalIva(), bg: MARINO, c: ARENA }].map(k => (
            <div key={k.l} style={{ background: k.bg, color: k.c, border: BORDER_CARD, padding: '12px 14px' }}>
              <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>{k.l}</div>
              <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 26 }}>{eur(k.v)}</div>
            </div>
          ))}
          <div style={{ background: perdido > 0 ? TERRA : OLIVA, color: ARENA, border: BORDER_CARD, padding: '12px 14px' }}>
            <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>Perdido por recortes y cargos</div>
            <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 26 }}>{eur(conIva(perdido))}</div>
            <div style={{ fontSize: 11, fontWeight: 600 }}>{eur(perdido)} sin IVA</div>
          </div>
        </div>
        {descs.length > 0 && (
          <div style={{ overflowX: 'auto', background: BLANCO, border: BORDER_CARD }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Repartidor', 'Código', 'Recorte por tope', 'Cargos de Cade', 'Total con IVA'].map(x => <th key={x} style={th}>{x}</th>)}</tr></thead>
              <tbody>
                {descs.map(x => (
                  <tr key={x.transportista}>
                    <td style={{ ...td, fontFamily: OSW, fontWeight: 700 }}>{x.repartidor}</td>
                    <td style={td}>{x.transportista}</td>
                    <td style={td}>{eur(x.recorte_tope)}</td>
                    <td style={td}>{eur(x.cargos)}</td>
                    <td style={{ ...td, fontWeight: 700, color: Number(x.recorte_tope) + Number(x.cargos) > 0 ? TERRA : INK }}>{eur(conIva(Number(x.recorte_tope) + Number(x.cargos)))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <Link to="/finanzas/facturacion" style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: ARENA, background: NARANJA, border: `2px solid ${INK}`, boxShadow: SHADOW, padding: '8px 16px', textDecoration: 'none' }}>Ir a Facturación →</Link>
        </div>
      </Banda>

      <section style={{ background: ARENA, borderBottom: BORDER, padding: `18px ${PAD}`, fontFamily: LEX, fontSize: 12, fontWeight: 600, color: GRIS }}>
        Aquí irán más cosas a medida que las pidas.
      </section>
    </>
  )
}
