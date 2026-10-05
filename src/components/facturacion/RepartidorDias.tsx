import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { INK, ARENA, BLANCO, GRIS, OLIVA, TERRA, NARANJA, MARINO, OSW, BORDER_CARD } from '@/styles/neobrutal'

/* Por repartidor y día: lo que habría ganado por sus pedidos (tarifa Cade por entrega + km) frente a lo que
   Cade le paga de verdad. Muestra la compensación hasta el mínimo, el recorte por tope y los cargos (SPC, MAT CONS…). */

interface Dia {
  fecha: string; transportista: string; repartidor: string; entregas: number
  por_pedidos: number; compensacion_minimo: number; recorte_tope: number
  cargo_cade: number; motivo_cargo: string | null; extra: number; extra_motivo: string | null; pagado: number
}
interface Alerta { transportista: string; fecha: string; descripcion: string; estado: string }

const eur = (n: number) => Number(n ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
/* Módulos: el IVA también se cobra (o se pierde) → todo importe va con su IVA al lado */
const eurIva = (n: number) => `${eur(n)} · ${eur(Math.round(Number(n ?? 0) * 121) / 100)} con IVA`
const diaTxt = (f: string) => new Date(f + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })

export default function RepartidorDias({ mes }: { mes: string }) {
  const [dias, setDias] = useState<Dia[]>([])
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [sel, setSel] = useState<string>('')

  useEffect(() => {
    Promise.all([
      supabase.from('v_dia_repartidor').select('*').eq('mes', mes).order('fecha'),
      supabase.from('liquidaciones_cade_incidencias').select('transportista, fecha, descripcion, estado').eq('codigo', 'DIA NO PAGADO').gte('fecha', mes).lt('fecha', new Date(new Date(mes).getFullYear(), new Date(mes).getMonth() + 1, 1).toISOString().slice(0, 10)),
    ]).then(([d, a]) => {
      const rows = (d.data ?? []) as Dia[]
      setDias(rows); setAlertas((a.data ?? []) as Alerta[])
      if (rows.length && !rows.some(r => r.repartidor === sel)) setSel(rows[0].repartidor)
    })
  }, [mes]) // eslint-disable-line react-hooks/exhaustive-deps

  const reps = Array.from(new Set(dias.map(d => d.repartidor)))
  const dd = dias.filter(d => d.repartidor === sel)
  if (!reps.length) return null

  const sum = (k: keyof Dia) => dd.reduce((s, d) => s + Number(d[k] ?? 0), 0)
  const max = Math.max(1, ...dd.map(d => Math.max(Number(d.por_pedidos), Number(d.pagado))))
  const alertasSel = alertas.filter(a => dd.some(d => d.transportista === a.transportista) || reps.length === 1)

  return (
    <div style={{ marginTop: 16, background: BLANCO, border: BORDER_CARD, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 15, textTransform: 'uppercase', color: INK }}>Día a día por repartidor</div>
        <div style={{ display: 'flex', gap: 0, border: BORDER_CARD }}>
          {reps.map((r, i) => (
            <button key={r} onClick={() => setSel(r)} style={{ padding: '6px 14px', border: 'none', borderRight: i < reps.length - 1 ? `2px solid ${INK}` : 'none', background: sel === r ? NARANJA : BLANCO, color: sel === r ? ARENA : INK, fontFamily: OSW, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', cursor: 'pointer' }}>{r}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 12 }}>
        {[
          { l: 'Por sus pedidos', v: sum('por_pedidos'), c: MARINO },
          { l: 'Compensado hasta el mínimo', v: sum('compensacion_minimo'), c: OLIVA },
          { l: 'Recortado por el tope', v: sum('recorte_tope'), c: TERRA },
          { l: 'Cargos de Cade', v: sum('cargo_cade'), c: TERRA },
          { l: 'Pagado de verdad', v: sum('pagado'), c: INK },
        ].map(k => (
          <div key={k.l} style={{ border: `2px solid ${INK}`, padding: '8px 10px', background: ARENA }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: GRIS }}>{k.l}</div>
            <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 18, color: k.c }}>{eur(k.v)}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: GRIS }}>{eur(Math.round(k.v * 121) / 100)} con IVA</div>
          </div>
        ))}
      </div>

      {/* Gráfico: barra marino = lo que valen sus pedidos; barra negra = lo pagado */}
      <div style={{ overflowX: 'auto', marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 170, minWidth: dd.length * 26 }}>
          {dd.map(d => {
            const cargo = Number(d.cargo_cade) < 0, tope = Number(d.recorte_tope) < 0
            return (
              <div key={d.fecha} title={`${diaTxt(d.fecha)} · ${d.entregas} entregas · por pedidos ${eur(d.por_pedidos)} · pagado ${eurIva(d.pagado)}${tope ? ` · recorte tope ${eurIva(d.recorte_tope)}` : ''}${Number(d.compensacion_minimo) > 0 ? ` · compensado ${eur(d.compensacion_minimo)}` : ''}${cargo ? ` · ${d.motivo_cargo} ${eurIva(d.cargo_cade)}` : ''}`}
                style={{ flex: '0 0 20px', display: 'flex', alignItems: 'flex-end', gap: 2, height: '100%', position: 'relative' }}>
                <div style={{ width: 9, height: `${(Number(d.por_pedidos) / max) * 100}%`, background: MARINO }} />
                <div style={{ width: 9, height: `${(Number(d.pagado) / max) * 100}%`, background: cargo ? TERRA : tope ? NARANJA : INK }} />
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 6, minWidth: dd.length * 26 }}>
          {dd.map(d => <div key={d.fecha} style={{ flex: '0 0 20px', fontSize: 9, fontWeight: 700, textAlign: 'center', color: GRIS }}>{new Date(d.fecha + 'T00:00:00').getDate()}</div>)}
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 11, fontWeight: 700, marginTop: 6, flexWrap: 'wrap' }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: MARINO, marginRight: 4 }} />Lo que valen sus pedidos</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: INK, marginRight: 4 }} />Pagado</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: NARANJA, marginRight: 4 }} />Pagado con recorte por tope</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: TERRA, marginRight: 4 }} />Pagado con cargo de Cade</span>
        </div>
      </div>

      {/* Solo los días con algo que contar */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
        <thead><tr>{['Día', 'Entregas', 'Por pedidos', 'Ajuste', 'Pagado'].map(h => <th key={h} style={{ textAlign: 'left', fontFamily: OSW, fontSize: 12, textTransform: 'uppercase', padding: '6px 8px', borderBottom: `2px solid ${INK}` }}>{h}</th>)}</tr></thead>
        <tbody>
          {dd.filter(d => Number(d.recorte_tope) < 0 || Number(d.cargo_cade) < 0 || Number(d.extra) > 0).map(d => (
            <tr key={d.fecha}>
              <td style={{ padding: '5px 8px', fontSize: 13, fontWeight: 600 }}>{diaTxt(d.fecha)}</td>
              <td style={{ padding: '5px 8px', fontSize: 13 }}>{d.entregas}</td>
              <td style={{ padding: '5px 8px', fontSize: 13 }}>{eur(d.por_pedidos)}</td>
              <td style={{ padding: '5px 8px', fontSize: 13, color: TERRA, fontWeight: 600 }}>
                {[Number(d.recorte_tope) < 0 ? `Recorte por tope ${eurIva(d.recorte_tope)}` : '', Number(d.cargo_cade) < 0 ? `${d.motivo_cargo ?? 'Cargo'} ${eurIva(d.cargo_cade)}` : '', Number(d.extra) > 0 ? `${d.extra_motivo ?? 'Extra'} +${eurIva(d.extra)}` : ''].filter(Boolean).join(' · ')}
              </td>
              <td style={{ padding: '5px 8px', fontSize: 13, fontWeight: 700 }}>{eurIva(d.pagado)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {alertasSel.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {alertasSel.map(a => (
            <div key={a.transportista + a.fecha} style={{ background: a.estado === 'propuesta' ? TERRA : ARENA, color: a.estado === 'propuesta' ? ARENA : INK, border: `2px solid ${INK}`, padding: '6px 10px', fontSize: 13, fontWeight: 700, marginTop: 6 }}>
              {a.transportista} · {a.descripcion}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
