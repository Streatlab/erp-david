import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fmtEur, fmtDate } from '@/lib/format'
import { GRIS, OLIVA, NARANJA, CELESTE, MARINO, OSW, LEX, BLANCO, ARENA } from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda, TablaWrap, thNeo, tdNeo, tdEstado, KpiNeo, BotonNeo, AvisoNeo } from '@/components/neo/NeoUI'
import { FormAlta, nombreFurgo, aNumero } from '@/components/flota/FormFlota'
import type { FurgoMin } from '@/components/flota/FormFlota'

/* Mantenimiento de la flota real: histórico por furgoneta y gastos de taller del banco sin vincular. */

interface Mant { id: string; furgoneta_id: string; fecha: string; km: number | null; taller: string | null; tipo: string | null; descripcion: string | null; coste_eur: number | null; conciliacion_id: string | null }
interface GastoTaller { id: string; fecha: string; concepto: string; importe: number }

const TIPOS = ['Revisión', 'Neumáticos', 'Frenos', 'ITV', 'Avería', 'Carga / batería', 'Otro']

export default function Mantenimiento() {
  const [furgos, setFurgos] = useState<FurgoMin[]>([])
  const [mants, setMants] = useState<Mant[]>([])
  const [gastos, setGastos] = useState<GastoTaller[]>([])
  const [alta, setAlta] = useState<Partial<Record<string, string>> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    Promise.all([
      supabase.from('furgonetas').select('id, codigo, nombre_corto, matricula').eq('activa', true).order('codigo'),
      supabase.from('furgonetas_mantenimientos_hist').select('id, furgoneta_id, fecha, km, taller, tipo, descripcion, coste_eur, conciliacion_id').order('fecha', { ascending: false }),
      supabase.from('conciliacion').select('id, fecha, concepto, importe').eq('categoria', 'mantenimiento-vehiculos').order('fecha', { ascending: false }),
    ]).then(([f, m, g]) => {
      const e = f.error ?? m.error ?? g.error
      if (e) setError(e.message)
      setFurgos((f.data ?? []) as FurgoMin[])
      setMants((m.data ?? []) as Mant[])
      setGastos(((g.data ?? []) as any[]).map(x => ({ ...x, importe: Number(x.importe) })))
    })
  }, [tick])

  const vinculados = useMemo(() => new Set(mants.map(m => m.conciliacion_id).filter(Boolean)), [mants])
  const sinVincular = gastos.filter(g => !vinculados.has(g.id))
  const porId = useMemo(() => Object.fromEntries(furgos.map(f => [f.id, f])), [furgos])
  const anio = String(new Date().getFullYear())
  const costeAnio = mants.filter(m => m.fecha.startsWith(anio)).reduce((s, m) => s + Number(m.coste_eur ?? 0), 0)
  const porFurgo = furgos.map(f => ({ f, coste: mants.filter(m => m.furgoneta_id === f.id && m.fecha.startsWith(anio)).reduce((s, m) => s + Number(m.coste_eur ?? 0), 0), ultimo: mants.find(m => m.furgoneta_id === f.id) }))

  async function guardar(v: Record<string, string>) {
    const { error: e } = await supabase.from('furgonetas_mantenimientos_hist').insert({
      furgoneta_id: v.furgoneta_id, fecha: v.fecha, tipo: v.tipo, descripcion: v.descripcion || null,
      coste_eur: aNumero(v.coste), taller: v.taller || null, km: aNumero(v.km),
      conciliacion_id: v.conciliacion_id || null,
    })
    if (e) return e.message
    setAlta(null); setTick(t => t + 1)
    return null
  }

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Operaciones" titulo="Mantenimiento">
        <BotonNeo onClick={() => setAlta({})} disabled={!furgos.length}><Plus size={14} style={{ marginRight: 6 }} /> Registrar mantenimiento</BotonNeo>
      </CabeceraNeo>
      {error && <AvisoNeo>ERROR: {error}</AvisoNeo>}

      {alta && (
        <Banda bg={BLANCO}>
          <FormAlta furgos={furgos} tipos={TIPOS} inicial={alta}
            extra={[{ clave: 'taller', txt: 'Taller' }, { clave: 'km', txt: 'Km' }]}
            onGuardar={guardar} onCancelar={() => setAlta(null)} />
        </Banda>
      )}

      <Banda bg={BLANCO}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 22 }}>
          <KpiNeo label={`Coste mantenimiento ${anio}`} valor={fmtEur(costeAnio)} color={NARANJA} sub={`${mants.length} registros`} />
          <KpiNeo label="Gastos de taller sin vincular" valor={String(sinVincular.length)} color={sinVincular.length ? CELESTE : OLIVA} sub="del banco (conciliación)" />
          {porFurgo.map(p => (
            <KpiNeo key={p.f.id} label={nombreFurgo(p.f)} valor={fmtEur(p.coste)} color={MARINO} sub={p.ultimo ? `último: ${fmtDate(p.ultimo.fecha)}` : 'sin registros'} />
          ))}
        </div>

        {mants.length === 0 ? (
          <div style={{ fontFamily: OSW, fontWeight: 700, textTransform: 'uppercase', color: GRIS, padding: 18, background: ARENA }}>
            En construcción · sin datos. Registra el primer mantenimiento o vincula un gasto de taller del banco.
          </div>
        ) : (
          <TablaWrap>
            <thead><tr>{['Fecha', 'Furgoneta', 'Tipo', 'Taller', 'Km', 'Descripción', 'Coste'].map(h => <th key={h} style={thNeo}>{h}</th>)}</tr></thead>
            <tbody>
              {mants.map((m, i) => (
                <tr key={m.id}>
                  <td style={{ ...tdEstado(i % 2 === 1, m.conciliacion_id ? OLIVA : NARANJA), fontFamily: OSW, fontWeight: 700 }}>{fmtDate(m.fecha)}</td>
                  <td style={tdNeo(i % 2 === 1)}>{nombreFurgo(porId[m.furgoneta_id])}</td>
                  <td style={tdNeo(i % 2 === 1)}>{m.tipo ?? '—'}</td>
                  <td style={tdNeo(i % 2 === 1)}>{m.taller ?? '—'}</td>
                  <td style={tdNeo(i % 2 === 1)}>{m.km ?? '—'}</td>
                  <td style={{ ...tdNeo(i % 2 === 1), whiteSpace: 'normal' }}>{m.descripcion ?? '—'}</td>
                  <td style={{ ...tdNeo(i % 2 === 1), fontFamily: OSW, fontWeight: 700 }}>{fmtEur(m.coste_eur, { decimals: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </TablaWrap>
        )}
      </Banda>

      {sinVincular.length > 0 && (
        <Banda bg={ARENA}>
          <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 18, textTransform: 'uppercase', marginBottom: 12 }}>Gastos de taller del banco · ¿de qué furgoneta?</div>
          <TablaWrap>
            <thead><tr>{['Fecha', 'Concepto', 'Importe', ''].map(h => <th key={h} style={thNeo}>{h}</th>)}</tr></thead>
            <tbody>
              {sinVincular.slice(0, 30).map((g, i) => (
                <tr key={g.id}>
                  <td style={{ ...tdNeo(i % 2 === 1), fontFamily: OSW, fontWeight: 700 }}>{fmtDate(g.fecha)}</td>
                  <td style={tdNeo(i % 2 === 1)}>{g.concepto}</td>
                  <td style={{ ...tdNeo(i % 2 === 1), fontFamily: OSW, fontWeight: 700 }}>{fmtEur(Math.abs(g.importe), { decimals: 2 })}</td>
                  <td style={tdNeo(i % 2 === 1)}>
                    <BotonNeo bg={CELESTE} onClick={() => { setAlta({ fecha: g.fecha, coste: String(Math.abs(g.importe)), taller: g.concepto, descripcion: g.concepto, conciliacion_id: g.id }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Vincular</BotonNeo>
                  </td>
                </tr>
              ))}
            </tbody>
          </TablaWrap>
          <div style={{ fontFamily: LEX, fontSize: 12, fontWeight: 600, color: GRIS, marginTop: 10 }}>«Vincular» abre el alta con fecha, importe y taller del banco; solo eliges la furgoneta.</div>
        </Banda>
      )}
    </PageNeo>
  )
}
