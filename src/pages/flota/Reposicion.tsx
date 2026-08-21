/**
 * Reposicion.tsx — Fondo de reposición de flota.
 * Dice cuándo toca cambiar cada furgoneta y cuánto hay que apartar cada mes
 * desde hoy para pagarla al contado, sin encadenar préstamos.
 */
import { Fragment, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  cargarDatos, guardarParams, calcular, resumirFlota, aportacionPorAnio, DEFAULTS,
  type ParamsReposicion, type ResultadoReposicion, type PrestamoVivo,
} from '@/lib/flota/reposicion'
import type { Furgoneta } from '@/lib/flota/queries'
import {
  INK, MARINO, ARENA, ARENA_CL, BLANCO, GRIS, OLIVA, TERRA, NARANJA, AMBAR, CELESTE,
  OSW, LEX, SHADOW, BORDER_CARD, EUR, E, N, P0,
} from '@/styles/neobrutal'
import {
  PageNeo, Banda, CabeceraNeo, KpiNeo, TablaWrap, thNeo, tdNeo, tdEstado, BadgeNeo, BotonNeo,
} from '@/components/neo/NeoUI'

/* ── Input neobrutal ────────────────────────────────────────── */
const inputStyle: CSSProperties = {
  width: '100%', background: BLANCO, border: `2px solid ${INK}`, borderRadius: 0,
  padding: '7px 9px', fontFamily: OSW, fontWeight: 700, fontSize: 15, color: INK,
}

function CampoNeo({
  label, valor, onChange, tipo = 'number', sufijo,
}: {
  label: string
  valor: string | number
  onChange: (v: string) => void
  tipo?: 'number' | 'date'
  sufijo?: string
}) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{
        fontFamily: OSW, fontWeight: 600, fontSize: 11, letterSpacing: 1.5,
        textTransform: 'uppercase', color: INK, marginBottom: 5,
      }}>
        {label}{sufijo ? ` (${sufijo})` : ''}
      </div>
      <input
        type={tipo}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </label>
  )
}

/* ── Página ─────────────────────────────────────────────────── */
export default function Reposicion() {
  const [furgos, setFurgos] = useState<Furgoneta[]>([])
  const [params, setParams] = useState<Record<string, ParamsReposicion>>({})
  const [prestamos, setPrestamos] = useState<Record<string, PrestamoVivo>>({})
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const d = await cargarDatos()
        setFurgos(d.furgonetas)
        setParams(d.params)
        setPrestamos(d.prestamos)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const setCampo = (id: string, campo: keyof ParamsReposicion, valor: string) => {
    setParams((prev) => {
      const actual = prev[id]
      if (!actual) return prev
      const next: Record<string, ParamsReposicion> = {
        ...prev,
        [id]: {
          ...actual,
          [campo]: campo === 'fechaCompra' ? valor : Number(valor === '' ? 0 : valor),
        },
      }
      guardarParams(next)
      return next
    })
  }

  const resultados: ResultadoReposicion[] = useMemo(
    () => furgos.map((f) =>
      calcular(f, params[f.id] ?? { ...DEFAULTS, furgonetaId: f.id }, prestamos[f.id]),
    ),
    [furgos, params, prestamos],
  )

  const resumen = useMemo(() => resumirFlota(resultados), [resultados])
  const porAnio = useMemo(() => aportacionPorAnio(resultados), [resultados])

  const ordenados = useMemo(
    () => [...resultados].sort((a, b) => {
      if (a.completo !== b.completo) return a.completo ? -1 : 1
      return a.mesesHasta - b.mesesHasta
    }),
    [resultados],
  )

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Flota · Fondo de reposición" titulo="Cuánto apartar cada mes">
        <div style={{ fontSize: 13, fontWeight: 600, color: ARENA, opacity: 0.85, maxWidth: 460 }}>
          Calcula cuándo toca cambiar cada furgoneta y cuánto tienes que ahorrar
          al mes desde hoy para pagarla sin pedir otro préstamo.
        </div>
      </CabeceraNeo>

      {loading && (
        <Banda bg={ARENA}>
          <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 22, textTransform: 'uppercase', color: GRIS }}>
            Cargando flota…
          </div>
        </Banda>
      )}

      {!loading && (<>
        {/* ── Resumen ── */}
        <Banda bg={ARENA_CL}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 18 }}>
            <KpiNeo
              label="Ahorro necesario / mes"
              valor={EUR(resumen.cuotaMensualTotal)}
              color={NARANJA}
              sub="Toda la flota, desde hoy"
            />
            <KpiNeo
              label="Falta por reunir"
              valor={EUR(resumen.necesidadTotal)}
              color={MARINO}
              sub={`Ya apartado: ${EUR(resumen.ahorroAcumuladoTotal)}`}
            />
            <KpiNeo
              label="Préstamos hoy / mes"
              valor={EUR(resumen.prestamoMensualTotal)}
              color={CELESTE}
              sub={`Esfuerzo total: ${EUR(resumen.esfuerzoMensualTotal)}/mes`}
            />
            <KpiNeo
              label="Próximo cambio"
              valor={resumen.proxima ? resumen.proxima.fechaReposicion : '—'}
              color={resumen.proxima ? AMBAR : GRIS}
              sub={resumen.proxima
                ? `${resumen.proxima.furgoneta.matricula} · ${resumen.proxima.limitante === 'KM' ? 'por kilómetros' : 'por años'}`
                : 'Faltan datos'}
            />
          </div>

          {resumen.conSolape > 0 && (
            <div style={{
              marginTop: 18, background: TERRA, color: ARENA, border: `3px solid ${INK}`,
              boxShadow: SHADOW, padding: '12px 16px', fontFamily: OSW, fontWeight: 700,
              fontSize: 16, textTransform: 'uppercase', letterSpacing: '-0.3px',
            }}>
              Ojo: {resumen.conSolape} furgoneta{resumen.conSolape > 1 ? 's' : ''} toca cambiarla antes de terminar de pagar su préstamo.
            </div>
          )}

          {resumen.incompletas > 0 && (
            <div style={{
              marginTop: 14, background: AMBAR, color: INK, border: `3px solid ${INK}`,
              boxShadow: SHADOW, padding: '12px 16px', fontFamily: OSW, fontWeight: 700,
              fontSize: 15, textTransform: 'uppercase',
            }}>
              {resumen.incompletas} furgoneta{resumen.incompletas > 1 ? 's' : ''} sin datos.
              Rellena precio de furgo nueva y km al año para que entren en el cálculo.
            </div>
          )}
        </Banda>

        {/* ── Tabla por furgoneta ── */}
        <Banda bg={BLANCO}>
          <div style={{
            fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(18px,2.2vw,26px)',
            textTransform: 'uppercase', letterSpacing: '-0.5px', marginBottom: 16,
          }}>
            Furgoneta a furgoneta
          </div>

          <TablaWrap>
            <thead>
              <tr>
                <th style={thNeo}>Furgoneta</th>
                <th style={thNeo}>Km/año</th>
                <th style={thNeo}>Km ahora</th>
                <th style={thNeo}>Toca cambiar</th>
                <th style={thNeo}>Límite</th>
                <th style={thNeo}>Coste estimado</th>
                <th style={thNeo}>Falta reunir</th>
                <th style={thNeo}>Ahorro / mes</th>
                <th style={thNeo}>&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map((r, i) => {
                const alt = i % 2 === 1
                const p = r.params
                const color = !r.completo ? GRIS : r.solapa ? TERRA : r.mesesHasta <= 18 ? NARANJA : OLIVA
                const abierto = editando === r.furgoneta.id

                return (
                  <Fragment key={r.furgoneta.id}>
                    <tr>
                      <td style={tdEstado(alt, color)}>
                        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 15 }}>
                          {r.furgoneta.matricula}
                        </div>
                        <div style={{ fontSize: 11, color: GRIS, fontWeight: 600 }}>
                          {r.furgoneta.modelo || r.furgoneta.codigo}
                        </div>
                      </td>
                      <td style={tdNeo(alt)}>{p.kmAnio > 0 ? N(p.kmAnio) : '—'}</td>
                      <td style={tdNeo(alt)}>{p.kmActual > 0 ? N(p.kmActual) : '—'}</td>
                      <td style={tdNeo(alt)}>
                        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 15 }}>
                          {r.fechaReposicion}
                        </div>
                        {r.completo && (
                          <div style={{ fontSize: 11, color: GRIS, fontWeight: 600 }}>
                            en {N(r.mesesHasta)} meses
                          </div>
                        )}
                      </td>
                      <td style={tdNeo(alt)}>
                        {r.completo
                          ? <BadgeNeo color={r.limitante === 'KM' ? CELESTE : MARINO}>{r.limitante === 'KM' ? 'Kilómetros' : 'Años'}</BadgeNeo>
                          : <BadgeNeo color={GRIS}>Faltan datos</BadgeNeo>}
                      </td>
                      <td style={tdNeo(alt)}>{r.completo ? EUR(r.costeFuturo) : '—'}</td>
                      <td style={tdNeo(alt)}>{r.completo ? EUR(r.necesidad) : '—'}</td>
                      <td style={r.completo ? { ...tdNeo(alt), background: AMBAR } : tdNeo(alt)}>
                        <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 17 }}>
                          {r.completo ? EUR(r.cuotaMensual) : '—'}
                        </span>
                      </td>
                      <td style={tdNeo(alt)}>
                        <BotonNeo
                          bg={abierto ? MARINO : NARANJA}
                          onClick={() => setEditando(abierto ? null : r.furgoneta.id)}
                        >
                          {abierto ? 'Cerrar' : 'Datos'}
                        </BotonNeo>
                      </td>
                    </tr>

                    {abierto && (
                      <tr>
                        <td colSpan={9} style={{ background: ARENA, borderBottom: BORDER_CARD, padding: '18px 14px' }}>
                          <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14,
                          }}>
                            <CampoNeo label="Precio furgo nueva hoy" sufijo="€" valor={p.precioNuevoHoy}
                              onChange={(v) => setCampo(r.furgoneta.id, 'precioNuevoHoy', v)} />
                            <CampoNeo label="Km al año" valor={p.kmAnio}
                              onChange={(v) => setCampo(r.furgoneta.id, 'kmAnio', v)} />
                            <CampoNeo label="Km actuales" valor={p.kmActual}
                              onChange={(v) => setCampo(r.furgoneta.id, 'kmActual', v)} />
                            <CampoNeo label="Vida útil" sufijo="km" valor={p.vidaKm}
                              onChange={(v) => setCampo(r.furgoneta.id, 'vidaKm', v)} />
                            <CampoNeo label="Vida útil" sufijo="años" valor={p.vidaAnios}
                              onChange={(v) => setCampo(r.furgoneta.id, 'vidaAnios', v)} />
                            <CampoNeo label="Fecha de compra" tipo="date" valor={p.fechaCompra}
                              onChange={(v) => setCampo(r.furgoneta.id, 'fechaCompra', v)} />
                            <CampoNeo label="Subida de precio" sufijo="% año" valor={p.inflacion}
                              onChange={(v) => setCampo(r.furgoneta.id, 'inflacion', v)} />
                            <CampoNeo label="Te dan por la vieja" sufijo="%" valor={p.residualPct}
                              onChange={(v) => setCampo(r.furgoneta.id, 'residualPct', v)} />
                            <CampoNeo label="Ya ahorrado" sufijo="€" valor={p.ahorroAcumulado}
                              onChange={(v) => setCampo(r.furgoneta.id, 'ahorroAcumulado', v)} />
                          </div>

                          <div style={{
                            marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 22,
                            fontFamily: LEX, fontSize: 13, fontWeight: 600, color: INK,
                          }}>
                            <span>Préstamo hoy: <b>{EUR(r.cuotaPrestamo)}/mes</b></span>
                            <span>Fin préstamo: <b>{r.finPrestamo ?? '—'}</b></span>
                            <span>Te dan por la vieja: <b>{EUR(r.residual)}</b></span>
                            <span>Esfuerzo total: <b>{EUR(r.esfuerzoMensual)}/mes</b></span>
                            {r.completo && (
                              <span>Ahorro cubierto: <b>{P0(r.costeFuturo > 0 ? (p.ahorroAcumulado / r.costeFuturo) * 100 : 0)}</b></span>
                            )}
                          </div>

                          {r.solapa && (
                            <div style={{
                              marginTop: 14, background: TERRA, color: ARENA, border: `2px solid ${INK}`,
                              padding: '9px 12px', fontFamily: OSW, fontWeight: 700, fontSize: 14,
                              textTransform: 'uppercase',
                            }}>
                              Toca cambiarla antes de acabar de pagarla. Sube el ahorro mensual o alarga su vida útil.
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </TablaWrap>

          <div style={{ marginTop: 14, fontSize: 12, fontWeight: 600, color: GRIS, fontFamily: LEX }}>
            Los km al año salen de los partes semanales. Los datos que tú metes se guardan en este navegador.
          </div>
        </Banda>

        {/* ── Calendario de caja ── */}
        {porAnio.length > 0 && (
          <Banda bg={ARENA}>
            <div style={{
              fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(18px,2.2vw,26px)',
              textTransform: 'uppercase', letterSpacing: '-0.5px', marginBottom: 6,
            }}>
              Cuánto hay que apartar cada año
            </div>
            <div style={{ fontFamily: LEX, fontSize: 13, fontWeight: 600, color: INK, opacity: 0.8, marginBottom: 18 }}>
              En naranja, los años en los que además toca comprar furgoneta.
            </div>

            <div style={{ background: BLANCO, border: BORDER_CARD, boxShadow: SHADOW, padding: '18px 12px 8px' }}>
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porAnio} margin={{ top: 6, right: 12, left: 6, bottom: 6 }}>
                    <CartesianGrid stroke={ARENA_CL} strokeWidth={2} vertical={false} />
                    <XAxis
                      dataKey="anio"
                      tick={{ fontFamily: OSW, fontSize: 13, fill: INK }}
                      axisLine={{ stroke: INK, strokeWidth: 2 }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontFamily: OSW, fontSize: 12, fill: INK }}
                      axisLine={{ stroke: INK, strokeWidth: 2 }}
                      tickLine={false}
                      width={64}
                      tickFormatter={(v) => E(Number(v))}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(11,21,36,0.06)' }}
                      contentStyle={{ border: `3px solid ${INK}`, borderRadius: 0, background: BLANCO, fontFamily: OSW, fontWeight: 700 }}
                      formatter={(v) => [EUR(Number(v)), 'A apartar']}
                    />
                    <Bar dataKey="aportacion" stroke={INK} strokeWidth={2}>
                      {porAnio.map((a) => (
                        <Cell key={a.anio} fill={a.reposiciones > 0 ? NARANJA : CELESTE} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 18 }}>
              {porAnio.filter((a) => a.reposiciones > 0).map((a) => (
                <div key={a.anio} style={{
                  background: NARANJA, color: ARENA, border: `3px solid ${INK}`, boxShadow: SHADOW,
                  padding: '10px 14px', fontFamily: OSW, fontWeight: 700, fontSize: 15,
                  textTransform: 'uppercase',
                }}>
                  {a.anio} · cambian {a.reposiciones} furgoneta{a.reposiciones > 1 ? 's' : ''}
                </div>
              ))}
            </div>
          </Banda>
        )}
      </>)}
    </PageNeo>
  )
}
