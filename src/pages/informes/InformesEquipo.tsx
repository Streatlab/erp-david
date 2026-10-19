import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmtEur } from '@/lib/format'
import { usePeriodo } from '@/lib/periodoGlobal'
import { INK, ARENA, GRIS, OLIVA, MARINO, AMBAR, OSW } from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda, TablaWrap, thNeo, tdNeo, tdEstado, AvisoNeo, BadgeNeo, HeroNeo } from '@/components/neo/NeoUI'

/* Informes de equipo: facturación por repartidor (v_facturacion_consolidada) y, cuando existan,
   entregas y penalizaciones por repartidor (v_liquidacion_repartidor). */

interface Fac { mes: string; transportista: string | null; repartidor: string | null; emisor: string | null; total: number }
interface Liq { mes: string; repartidor: string; transportista: string; dias_trabajados: number; entregas: number; penalizaciones: number; dias_con_penalizacion: number; total: number }

const mesCorto = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })

export default function InformesEquipo() {
  const per = usePeriodo()
  const [facTodo, setFac] = useState<Fac[]>([])
  const [liqTodo, setLiq] = useState<Liq[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('v_facturacion_consolidada').select('mes, transportista, repartidor, emisor, total').not('transportista', 'is', null),
      supabase.from('v_liquidacion_repartidor').select('*'),
    ]).then(([f, l]) => {
      if (f.error ?? l.error) setError((f.error ?? l.error)!.message)
      setFac(((f.data ?? []) as any[]).map(r => ({ ...r, total: Number(r.total) })))
      setLiq((l.data ?? []) as Liq[])
    })
  }, [])

  const enPeriodo = (mes: string) => per.meses.includes(String(mes).slice(0, 7))
  const fac = useMemo(() => facTodo.filter(f => enPeriodo(f.mes)), [facTodo, per.meses]) // eslint-disable-line react-hooks/exhaustive-deps
  const liq = useMemo(() => liqTodo.filter(l => enPeriodo(l.mes)), [liqTodo, per.meses]) // eslint-disable-line react-hooks/exhaustive-deps
  const totalFac = fac.reduce((s, f) => s + f.total, 0)
  const meses = useMemo(() => [...new Set(fac.map(f => f.mes))].sort().reverse().slice(0, 12), [fac])
  const reps = useMemo(() => [...new Set(fac.map(f => f.repartidor ?? f.transportista ?? '—'))].sort(), [fac])
  const celda = (rep: string, mes: string) => fac.filter(f => (f.repartidor ?? f.transportista) === rep && f.mes === mes)

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Informes" titulo="Informes de equipo" />
      {error && <AvisoNeo>ERROR: {error}</AvisoNeo>}
      <HeroNeo eyebrowTxt={`Facturado · ${per.etiqueta}`} cifra={fac.length === 0 ? '—' : fmtEur(totalFac)}
        frase={fac.length === 0 ? 'Sin datos todavía' : `facturados con IVA por ${reps.length} ${reps.length === 1 ? 'repartidor' : 'repartidores'}`}
        color={fac.length === 0 ? AMBAR : OLIVA} />

      <Banda bg={ARENA}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', color: INK, marginBottom: 14 }}>Facturación por repartidor (con IVA)</div>
        {fac.length === 0 ? (
          <div style={{ fontFamily: OSW, fontWeight: 700, textTransform: 'uppercase', color: GRIS }}>En construcción · sin datos</div>
        ) : (
          <TablaWrap>
            <thead><tr><th style={thNeo}>Repartidor</th>{meses.map(m => <th key={m} style={{ ...thNeo, textAlign: 'right' }}>{mesCorto(m)}</th>)}</tr></thead>
            <tbody>
              {reps.map((r, i) => (
                <tr key={r}>
                  <td style={{ ...tdEstado(i % 2 === 1, MARINO), fontFamily: OSW, fontWeight: 700 }}>{r}</td>
                  {meses.map(m => {
                    const cs = celda(r, m)
                    const t = cs.reduce((s, c) => s + c.total, 0)
                    return (
                      <td key={m} style={{ ...tdNeo(i % 2 === 1), textAlign: 'right' }}>
                        {cs.length ? <>{fmtEur(t)} {cs.some(c => c.emisor === 'JUAN') && <BadgeNeo color={AMBAR}>Juan</BadgeNeo>}</> : '—'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </TablaWrap>
        )}
      </Banda>

      <Banda bg={ARENA}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', color: INK, marginBottom: 14 }}>Entregas y penalizaciones por repartidor</div>
        {liq.length === 0 ? (
          <div style={{ fontFamily: OSW, fontWeight: 700, textTransform: 'uppercase', color: GRIS }}>En construcción · sin datos (llegan con el lector de liquidaciones de Cade)</div>
        ) : (
          <TablaWrap>
            <thead><tr>{['Mes', 'Repartidor', 'Código', 'Días', 'Entregas', 'Días con penalización', 'Penalizaciones', 'Total'].map(h => <th key={h} style={thNeo}>{h}</th>)}</tr></thead>
            <tbody>
              {liq.map((l, i) => (
                <tr key={`${l.mes}-${l.transportista}-${l.repartidor}`}>
                  <td style={{ ...tdNeo(i % 2 === 1), fontFamily: OSW, fontWeight: 700 }}>{mesCorto(l.mes)}</td>
                  <td style={tdNeo(i % 2 === 1)}>{l.repartidor}</td>
                  <td style={tdNeo(i % 2 === 1)}>{l.transportista}</td>
                  <td style={tdNeo(i % 2 === 1)}>{l.dias_trabajados}</td>
                  <td style={tdNeo(i % 2 === 1)}>{l.entregas}</td>
                  <td style={tdNeo(i % 2 === 1)}>{l.dias_con_penalizacion}</td>
                  <td style={tdNeo(i % 2 === 1)}>{fmtEur(Number(l.penalizaciones), { decimals: 2 })}</td>
                  <td style={{ ...tdNeo(i % 2 === 1), fontFamily: OSW, fontWeight: 700 }}>{fmtEur(Number(l.total), { decimals: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </TablaWrap>
        )}
      </Banda>
    </PageNeo>
  )
}
