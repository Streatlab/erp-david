/**
 * PresupuestoFamilia.tsx — Presupuesto por categoría (Fijos / Variables), editable en la propia tabla.
 * Gastado del periodo elegido, presupuesto, desviación, % consumido y cobertura del mes siguiente.
 * El presupuesto se guarda en € al MES (presupuestos_hogar, mes = null); en vista semanal se lee × 12 ÷ 52.
 */
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePeriodo } from '@/lib/periodoGlobal'
import { INK, ARENA_CL, BLANCO, GRIS, OLIVA, NARANJA, CELESTE, MARINO, AMBAR, OSW, E, E2, P0 } from '@/styles/neobrutal'
import { Banda, KpiNeo, TablaWrap, thNeo, tdNeo, tdEstado, BadgeNeo, BotonNeo } from '@/components/neo/NeoUI'
import { IconoRubro } from './ComercioIcon'

interface Cat { codigo: string; nombre: string; bloque: 'fijo' | 'variable'; orden: number }
interface Fila { cat: Cat; gastado: number; presupuesto: number | null; sugerido: number }

const mesKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

export default function PresupuestoFamilia({ escala }: { escala: 'mes' | 'semana' }) {
  const per = usePeriodo()
  const k = escala === 'semana' ? 12 / 52 : 1
  const uni = escala === 'semana' ? 'semana' : 'mes'
  const [cats, setCats] = useState<Cat[]>([])
  const [pres, setPres] = useState<Record<string, number>>({})
  const [plan, setPlan] = useState<Record<string, number>>({})
  const [movs, setMovs] = useState<{ fecha: string; mes: string; categoria: string; bloque: string; importe: number }[]>([])
  const [editando, setEditando] = useState<string | null>(null)
  const [valor, setValor] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function cargar() {
    const [c, p, f, m] = await Promise.all([
      supabase.from('categorias_familia').select('codigo, nombre, bloque, orden').in('bloque', ['fijo', 'variable']).order('orden'),
      supabase.from('presupuestos_hogar').select('categoria, importe').is('mes', null),
      supabase.from('familia_fijos').select('categoria, importe_mensual').eq('activo', true),
      supabase.from('v_familia_mov').select('fecha, mes, categoria, bloque, importe').order('fecha', { ascending: false }).range(0, 4999),
    ])
    const err = c.error ?? p.error ?? f.error ?? m.error
    if (err) { setError(err.message); return }
    setCats((c.data ?? []) as Cat[])
    const pr: Record<string, number> = {}
    for (const r of (p.data ?? []) as { categoria: string; importe: number }[]) pr[r.categoria] = Number(r.importe)
    setPres(pr)
    const pl: Record<string, number> = {}
    for (const r of (f.data ?? []) as { categoria: string; importe_mensual: number }[]) pl[r.categoria] = (pl[r.categoria] ?? 0) + Number(r.importe_mensual)
    setPlan(pl)
    setMovs(((m.data ?? []) as any[]).map(x => ({ ...x, importe: Number(x.importe) })))
  }
  useEffect(() => { cargar() }, [])

  /* Últimos 3 meses cerrados: base del "sugerido" y de los ingresos previstos */
  const hoy = new Date()
  const cerrados = [1, 2, 3].map(i => mesKey(new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)))
  const nMeses = Math.max(1, new Set(movs.filter(x => cerrados.includes(x.mes)).map(x => x.mes)).size)

  const filas = useMemo<Fila[]>(() => cats.map(cat => {
    const delPeriodo = movs.filter(x => x.categoria === cat.codigo && x.fecha >= per.desdeIso && x.fecha <= per.hastaIso)
    const gastado = -delPeriodo.reduce((s, x) => s + x.importe, 0)
    const media = -movs.filter(x => x.categoria === cat.codigo && cerrados.includes(x.mes)).reduce((s, x) => s + x.importe, 0) / nMeses
    const sugerido = cat.bloque === 'fijo' && plan[cat.codigo] != null ? plan[cat.codigo] : Math.max(0, media)
    return { cat, gastado, presupuesto: pres[cat.codigo] ?? null, sugerido }
  }), [cats, movs, pres, plan, per.desdeIso, per.hastaIso, nMeses]) // eslint-disable-line react-hooks/exhaustive-deps

  /* El presupuesto es mensual; se lleva a la duración del periodo elegido para comparar con lo gastado */
  const dias = Math.max(1, Math.round((per.rango.fin.getTime() - per.rango.inicio.getTime()) / 86_400_000) + 1)
  const factorPeriodo = per.esSemana ? 12 / 52 : per.meses.length > 1 ? per.meses.length : dias >= 28 ? 1 : dias / 30.44

  async function guardar(cat: string, importe: number) {
    const { error: e } = await supabase.from('presupuestos_hogar').upsert({ categoria: cat, mes: null, importe }, { onConflict: 'categoria,mes' })
    if (e) { setError(e.message); return }
    setPres(p => ({ ...p, [cat]: importe }))
    setEditando(null); setValor('')
  }
  function confirmar(cat: string) {
    const n = Number(valor.replace(',', '.'))
    if (isNaN(n) || n < 0) { setEditando(null); return }
    guardar(cat, escala === 'semana' ? (n * 52) / 12 : n) // lo tecleado está en la escala visible; se guarda al mes
  }

  /* Cobertura del mes siguiente: presupuesto (o sugerido) frente a lo que entra de media */
  const ingresoMes = movs.filter(x => x.bloque === 'ingreso' && cerrados.includes(x.mes)).reduce((s, x) => s + x.importe, 0) / nMeses
  const presupuestoMes = filas.reduce((s, f) => s + (f.presupuesto ?? f.sugerido), 0)
  const cobertura = presupuestoMes > 0 ? ingresoMes / presupuestoMes : null
  const sinFijar = filas.filter(f => f.presupuesto == null).length

  const estado = (f: Fila) => {
    if (f.presupuesto == null) return { t: 'Sin presupuesto', c: GRIS }
    const p = f.presupuesto * factorPeriodo
    if (f.gastado <= p * 0.9) return { t: 'Holgado', c: OLIVA }
    if (f.gastado <= p) return { t: 'Ajustado', c: AMBAR }
    return { t: 'Desviado', c: NARANJA }
  }
  const desviadas = filas.filter(f => estado(f).t === 'Desviado').length

  const bloques: { t: string; b: Cat['bloque']; color: string }[] = [
    { t: 'Fijos', b: 'fijo', color: NARANJA }, { t: 'Variables', b: 'variable', color: CELESTE },
  ]

  return (
    <>
      <Banda bg={ARENA_CL}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 16, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14, color: INK }}>
          Cobertura del mes siguiente
        </div>
        {error && <div style={{ color: NARANJA, fontWeight: 700, marginBottom: 10 }}>ERROR: {error}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 18 }}>
          <KpiNeo label={`Presupuesto /${uni}`} valor={E(presupuestoMes * k)} color={MARINO} sub={sinFijar ? `${sinFijar} categorías sin fijar: cuenta el sugerido` : 'Todas las categorías fijadas'} />
          <KpiNeo label={`Entra de media /${uni}`} valor={E(ingresoMes * k)} color={OLIVA} sub="Nómina de Rebeca + aportaciones de David (3 meses)" />
          <KpiNeo label="Cobertura" valor={cobertura != null ? P0(cobertura * 100) : '—'} color={cobertura != null && cobertura >= 1 ? OLIVA : NARANJA}
            sub={cobertura != null ? (cobertura >= 1 ? `Sobran ${E((ingresoMes - presupuestoMes) * k)} /${uni}` : `Faltan ${E((presupuestoMes - ingresoMes) * k)} /${uni}`) : undefined} />
          <KpiNeo label="Categorías desviadas" valor={String(desviadas)} color={desviadas > 0 ? NARANJA : OLIVA} sub={per.etiqueta} />
        </div>
      </Banda>

      <Banda bg={BLANCO}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 16, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, color: INK }}>
          Presupuesto por categoría · {per.etiqueta}
        </div>
        <div style={{ fontSize: 12, color: GRIS, fontWeight: 600, marginBottom: 12 }}>
          Pulsa el presupuesto para editarlo (en € /{uni}). "Sugerido" es el plan de recibos en los fijos y la media de los 3 últimos meses en los variables.
        </div>
        <TablaWrap>
          <thead>
            <tr>{['Categoría', 'Gastado', `Presupuesto /${uni}`, 'Sugerido', 'Desviación', '% consumido', 'Estado'].map(h => <th key={h} style={thNeo}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {bloques.map(bl => {
              const del = filas.filter(f => f.cat.bloque === bl.b)
              const totG = del.reduce((s, f) => s + f.gastado, 0)
              const totP = del.reduce((s, f) => s + (f.presupuesto ?? 0), 0)
              return [
                <tr key={`h-${bl.b}`}>
                  <td colSpan={7} style={{ ...tdNeo(false), background: bl.color, color: BLANCO, fontFamily: OSW, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
                    {bl.t} · gastado {E(totG)} · presupuesto {E(totP * k)} /{uni}
                  </td>
                </tr>,
                ...del.map((f, i) => {
                  const alt = i % 2 === 1
                  const st = estado(f)
                  const pPeriodo = f.presupuesto != null ? f.presupuesto * factorPeriodo : null
                  const desv = pPeriodo != null ? f.gastado - pPeriodo : null
                  return (
                    <tr key={f.cat.codigo}>
                      <td style={tdEstado(alt, st.c)}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><IconoRubro clave={f.cat.codigo} size={14} />{f.cat.nombre}</span>
                      </td>
                      <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{E(f.gastado)}</td>
                      <td style={{ ...tdNeo(alt), textAlign: 'right' }}>
                        {editando === f.cat.codigo ? (
                          <input autoFocus value={valor} placeholder={`€/${uni}`} onChange={e => setValor(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') confirmar(f.cat.codigo); if (e.key === 'Escape') setEditando(null) }}
                            onBlur={() => confirmar(f.cat.codigo)}
                            style={{ width: 90, textAlign: 'right', border: `2px solid ${INK}`, padding: '3px 6px', fontFamily: OSW, fontSize: 13 }} />
                        ) : (
                          <span onClick={() => { setEditando(f.cat.codigo); setValor(f.presupuesto != null ? String(Math.round(f.presupuesto * k)) : '') }}
                            style={{ cursor: 'pointer', borderBottom: `1px dashed ${GRIS}`, fontFamily: OSW, fontWeight: 700 }} title="Pulsa para editar">
                            {f.presupuesto != null ? E2(f.presupuesto * k) : 'Fijar →'}
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdNeo(alt), textAlign: 'right', color: GRIS }}>
                        {E(f.sugerido * k)}
                        {f.presupuesto == null && f.sugerido > 0 && (
                          <span style={{ marginLeft: 8 }}><BotonNeo bg={ARENA_CL} onClick={() => guardar(f.cat.codigo, Math.round(f.sugerido))}>Usar</BotonNeo></span>
                        )}
                      </td>
                      <td style={{ ...tdNeo(alt), textAlign: 'right', color: desv != null && desv > 0 ? NARANJA : OLIVA, fontFamily: OSW, fontWeight: 700 }}>
                        {desv != null ? `${desv > 0 ? '+' : ''}${E(desv)}` : '—'}
                      </td>
                      <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{pPeriodo ? P0((f.gastado / pPeriodo) * 100) : '—'}</td>
                      <td style={tdNeo(alt)}><BadgeNeo color={st.c}>{st.t}</BadgeNeo></td>
                    </tr>
                  )
                }),
              ]
            })}
          </tbody>
        </TablaWrap>
      </Banda>
    </>
  )
}
