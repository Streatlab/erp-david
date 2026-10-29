import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmtEur, fmtDate } from '@/lib/format'
import { OLIVA, TERRA, NARANJA, GRIS, BLANCO, OSW } from '@/styles/neobrutal'
import {
  PageNeo, Banda, CabeceraNeo, HeroNeo, PillsNeo, AvisoNeo, TabsNeo, usePestana,
  TablaWrap, thNeo, tdNeo, tdEstado, BadgeNeo, BotonNeo,
} from '@/components/neo/NeoUI'
import DocumentacionYTope from '@/components/facturacion/DocumentacionYTope'
import LiquidacionesMes from '@/components/facturacion/LiquidacionesMes'
import { useCicloPagoCade, fechaLimiteCobro } from '@/lib/configCade'

interface FacturaEmitida {
  id: string
  cliente: string
  concepto: string | null
  transportista: string | null
  periodo: string | null
  fecha_factura: string | null
  numero_factura: number | null
  base_imponible: number | null
  cuota_iva: number | null
  total: number | null
  estado: string
  fecha_cobro: string | null
  emisor: string | null
  notas: string | null
}

type EmisorFilter = 'TODOS' | 'DAVID' | 'JUAN'
type EstadoFilter = 'TODAS' | 'PENDIENTE' | 'COBRADA'

/* El plazo de cobro de Cade sale de configuración (Liquidaciones Cade ▸ Confirmar ciclo). Sin plazo confirmado, nada se marca vencido. */

const PESTANAS_FE = ['cobros', 'liquidaciones', 'documentacion'] as const

export default function FacturacionEmitida() {
  const [pestana, setPestana] = usePestana('facturacion-emitida', PESTANAS_FE, 'cobros')
  const [facturas, setFacturas] = useState<FacturaEmitida[]>([])
  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [emisor, setEmisor] = useState<EmisorFilter>('TODOS')
  const [estado, setEstado] = useState<EstadoFilter>('TODAS')
  const [saving, setSaving] = useState<string | null>(null)
  const ciclo = useCicloPagoCade()

  async function cargar() {
    setLoading(true)
    setErrMsg(null)
    const { data, error } = await supabase
      .from('facturas_emitidas')
      .select('*')
      .order('fecha_factura', { ascending: false })
      .order('numero_factura', { ascending: false })
    if (error) setErrMsg(error.message)
    setFacturas((data ?? []) as FacturaEmitida[])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const hoy = new Date()

  const visibles = useMemo(() => facturas.filter(f => {
    if (emisor !== 'TODOS' && (f.emisor ?? '').toUpperCase() !== emisor) return false
    if (estado !== 'TODAS' && f.estado !== estado) return false
    return true
  }), [facturas, emisor, estado])

  const kpis = useMemo(() => {
    const base = facturas.filter(f => emisor === 'TODOS' || (f.emisor ?? '').toUpperCase() === emisor)
    const total = base.reduce((s, f) => s + (f.total ?? 0), 0)
    const pendientes = base.filter(f => f.estado === 'PENDIENTE')
    const pendiente = pendientes.reduce((s, f) => s + (f.total ?? 0), 0)
    const vencidas = pendientes.filter(f => {
      const fe = f.cliente?.toUpperCase().includes('CADE') ? fechaLimiteCobro(f.periodo, ciclo.diaLimite) : null
      return fe !== null && hoy > fe
    })
    const vencido = vencidas.reduce((s, f) => s + (f.total ?? 0), 0)
    return { total, pendiente, vencido, nVencidas: vencidas.length, n: base.length }
  }, [facturas, emisor, ciclo.diaLimite]) // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleCobro(f: FacturaEmitida) {
    setSaving(f.id)
    const cobrada = f.estado === 'COBRADA'
    const { error } = await supabase
      .from('facturas_emitidas')
      .update(cobrada
        ? { estado: 'PENDIENTE', fecha_cobro: null }
        : { estado: 'COBRADA', fecha_cobro: new Date().toISOString().slice(0, 10) })
      .eq('id', f.id)
    if (error) setErrMsg(error.message)
    else await cargar()
    setSaving(null)
  }

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Finanzas" titulo="Facturación emitida">
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <PillsNeo value={emisor} onChange={v => setEmisor(v as EmisorFilter)} options={['TODOS', 'DAVID', 'JUAN']} />
          <PillsNeo value={estado} onChange={v => setEstado(v as EstadoFilter)} options={['TODAS', 'PENDIENTE', 'COBRADA']} />
        </div>
      </CabeceraNeo>

      <HeroNeo
        eyebrowTxt="Lo que te debe Cade"
        cifra={loading || kpis.n === 0 ? '—' : fmtEur(kpis.pendiente)}
        frase={loading || kpis.n === 0 ? 'Sin datos todavía'
          : kpis.nVencidas > 0 ? `${kpis.nVencidas} factura${kpis.nVencidas > 1 ? 's' : ''} fuera de plazo (${fmtEur(kpis.vencido)}). Reclama ya.`
          : kpis.pendiente > 0 ? 'Pendiente de cobro y dentro de plazo. Nada que reclamar aún.' : 'Todo cobrado. Sin pendientes.'}
        color={loading || kpis.n === 0 ? undefined : kpis.nVencidas > 0 ? NARANJA : kpis.pendiente > 0 ? undefined : OLIVA}
        apoyo={kpis.n === 0 ? undefined : [
          ciclo.diaLimite
            ? { label: `Vencido · pasado día ${ciclo.diaLimite}`, valor: fmtEur(kpis.vencido) }
            : { label: 'Plazo de cobro', valor: 'Sin confirmar' },
          { label: 'Cobrado', valor: fmtEur(kpis.total - kpis.pendiente) },
          { label: 'Facturado', valor: fmtEur(kpis.total) },
        ]}
      />

      <TabsNeo value={pestana} onChange={setPestana} tabs={[
        { id: 'cobros', label: 'Cobros', badge: kpis.nVencidas || undefined },
        { id: 'liquidaciones', label: 'Liquidaciones del mes' },
        { id: 'documentacion', label: 'Documentación y tope' },
      ]} />

      {pestana === 'liquidaciones' && <LiquidacionesMes />}
      {pestana === 'documentacion' && <DocumentacionYTope />}

      {errMsg && <AvisoNeo>ERROR: {errMsg}</AvisoNeo>}

      {pestana === 'cobros' && kpis.nVencidas > 0 && (
        <AvisoNeo>
          CADE TE DEBE {fmtEur(kpis.vencido)} FUERA DE PLAZO · {kpis.nVencidas} factura{kpis.nVencidas > 1 ? 's' : ''} sin cobrar pasado el día {ciclo.diaLimite}. Reclamar ya.
        </AvisoNeo>
      )}

      {pestana === 'cobros' && (<>

      {/* Tabla Neobrutal */}
      <Banda bg={BLANCO}>
        <TablaWrap>
          <thead>
            <tr>
              {['Nº', 'Fecha', 'Cliente', 'Concepto', 'Transp.', 'Emisor', 'Base', 'IVA', 'Total', 'Cobro esperado', 'Estado', ''].map(h => (
                <th key={h} style={thNeo}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={12} style={{ ...tdNeo(false), textAlign: 'center', color: GRIS, padding: 32 }}>Cargando…</td></tr>
            )}
            {!loading && visibles.length === 0 && (
              <tr><td colSpan={12} style={{ ...tdNeo(false), textAlign: 'center', color: GRIS, padding: 32 }}>Sin facturas para este filtro.</td></tr>
            )}
            {visibles.map((f, i) => {
              const fe = f.cliente?.toUpperCase().includes('CADE') ? fechaLimiteCobro(f.periodo, ciclo.diaLimite) : null
              const vencida = f.estado === 'PENDIENTE' && fe !== null && hoy > fe
              const alt = i % 2 === 1
              const estadoColor = f.estado === 'COBRADA' ? OLIVA : vencida ? TERRA : NARANJA
              return (
                <tr key={f.id}>
                  <td style={{ ...tdEstado(alt, estadoColor), fontFamily: OSW, fontWeight: 700 }}>{f.numero_factura ?? '—'}</td>
                  <td style={tdNeo(alt)}>{fmtDate(f.fecha_factura ?? '')}</td>
                  <td style={tdNeo(alt)}>{f.cliente}</td>
                  <td style={{ ...tdNeo(alt), maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.concepto ?? ''}>{f.concepto ?? '—'}</td>
                  <td style={tdNeo(alt)}>{f.transportista ?? '—'}</td>
                  <td style={tdNeo(alt)}>
                    <BadgeNeo color={(f.emisor ?? '').toUpperCase() === 'JUAN' ? '#F5B84A' : '#16355C'}>{f.emisor ?? '—'}</BadgeNeo>
                  </td>
                  <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{fmtEur(f.base_imponible)}</td>
                  <td style={{ ...tdNeo(alt), textAlign: 'right' }}>{fmtEur(f.cuota_iva)}</td>
                  <td style={{ ...tdNeo(alt), textAlign: 'right', fontFamily: OSW, fontWeight: 700, fontSize: 15 }}>{fmtEur(f.total)}</td>
                  <td style={{ ...tdNeo(alt), color: vencida ? TERRA : undefined, fontWeight: vencida ? 700 : 600 }}>
                    {f.estado === 'COBRADA' ? fmtDate(f.fecha_cobro ?? '') : fe ? fmtDate(fe) : '—'}
                  </td>
                  <td style={tdNeo(alt)}>
                    <BadgeNeo color={estadoColor}>{vencida ? 'VENCIDA' : f.estado}</BadgeNeo>
                  </td>
                  <td style={tdNeo(alt)}>
                    <BotonNeo onClick={() => toggleCobro(f)} disabled={saving === f.id} bg={f.estado === 'COBRADA' ? '#F5ECD9' : '#7A8C3E'}>
                      {f.estado === 'COBRADA' ? '↩ Pendiente' : '✓ Cobrada'}
                    </BotonNeo>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </TablaWrap>
      </Banda>
      </>)}
    </PageNeo>
  )
}
