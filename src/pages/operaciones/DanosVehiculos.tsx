import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fmtEur, fmtDate } from '@/lib/format'
import { GRIS, OLIVA, TERRA, NARANJA, AMBAR, OSW, BLANCO, ARENA } from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda, TablaWrap, thNeo, tdNeo, tdEstado, KpiNeo, BotonNeo, BadgeNeo, AvisoNeo } from '@/components/neo/NeoUI'
import { FormAlta, nombreFurgo, aNumero } from '@/components/flota/FormFlota'
import type { FurgoMin } from '@/components/flota/FormFlota'

/* Daños vehículos: siniestros, multas y otros daños de las furgonetas reales (furgonetas_incidencias). */

interface Inc { id: string; furgoneta_id: string; tipo: string; fecha: string; importe_eur: number | null; descripcion: string | null; estado: string | null }

const TIPOS = ['SINIESTRO', 'MULTA', 'OTRO']

export default function DanosVehiculos() {
  const [furgos, setFurgos] = useState<FurgoMin[]>([])
  const [incs, setIncs] = useState<Inc[]>([])
  const [alta, setAlta] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    Promise.all([
      supabase.from('furgonetas').select('id, codigo, nombre_corto, matricula').eq('activa', true).order('codigo'),
      supabase.from('furgonetas_incidencias').select('id, furgoneta_id, tipo, fecha, importe_eur, descripcion, estado').order('fecha', { ascending: false }),
    ]).then(([f, i]) => {
      const e = f.error ?? i.error
      if (e) setError(e.message)
      setFurgos((f.data ?? []) as FurgoMin[])
      setIncs((i.data ?? []) as Inc[])
    })
  }, [tick])

  const porId = useMemo(() => Object.fromEntries(furgos.map(f => [f.id, f])), [furgos])
  const pendientes = incs.filter(i => (i.estado ?? 'pendiente') !== 'resuelto')
  const coste = incs.reduce((s, i) => s + Number(i.importe_eur ?? 0), 0)

  async function guardar(v: Record<string, string>) {
    const { error: e } = await supabase.from('furgonetas_incidencias').insert({
      furgoneta_id: v.furgoneta_id, fecha: v.fecha, tipo: v.tipo, descripcion: v.descripcion || null,
      importe_eur: aNumero(v.coste), estado: 'pendiente',
    })
    if (e) return e.message
    setAlta(false); setTick(t => t + 1)
    return null
  }

  async function resolver(id: string) {
    const { error: e } = await supabase.from('furgonetas_incidencias').update({ estado: 'resuelto' }).eq('id', id)
    if (e) setError(e.message); else setTick(t => t + 1)
  }

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Operaciones" titulo="Daños vehículos">
        <BotonNeo onClick={() => setAlta(true)} disabled={!furgos.length}><Plus size={14} style={{ marginRight: 6 }} /> Registrar daño</BotonNeo>
      </CabeceraNeo>
      {error && <AvisoNeo>ERROR: {error}</AvisoNeo>}

      {alta && (
        <Banda bg={BLANCO}>
          <FormAlta furgos={furgos} tipos={TIPOS} onGuardar={guardar} onCancelar={() => setAlta(false)} />
        </Banda>
      )}

      <Banda bg={BLANCO}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 22 }}>
          <KpiNeo label="Daños registrados" valor={String(incs.length)} color={NARANJA} />
          <KpiNeo label="Pendientes" valor={String(pendientes.length)} color={pendientes.length ? TERRA : OLIVA} />
          <KpiNeo label="Coste total" valor={fmtEur(coste)} color={AMBAR} />
        </div>

        {incs.length === 0 ? (
          <div style={{ fontFamily: OSW, fontWeight: 700, textTransform: 'uppercase', color: GRIS, padding: 18, background: ARENA }}>
            En construcción · sin datos. Registra un daño con el botón de arriba.
          </div>
        ) : (
          <TablaWrap>
            <thead><tr>{['Fecha', 'Furgoneta', 'Tipo', 'Descripción', 'Coste', 'Estado', ''].map(h => <th key={h} style={thNeo}>{h}</th>)}</tr></thead>
            <tbody>
              {incs.map((d, i) => {
                const resuelto = d.estado === 'resuelto'
                return (
                  <tr key={d.id}>
                    <td style={{ ...tdEstado(i % 2 === 1, resuelto ? OLIVA : TERRA), fontFamily: OSW, fontWeight: 700 }}>{fmtDate(d.fecha)}</td>
                    <td style={tdNeo(i % 2 === 1)}>{nombreFurgo(porId[d.furgoneta_id])}</td>
                    <td style={tdNeo(i % 2 === 1)}>{d.tipo}</td>
                    <td style={{ ...tdNeo(i % 2 === 1), whiteSpace: 'normal' }}>{d.descripcion ?? '—'}</td>
                    <td style={{ ...tdNeo(i % 2 === 1), fontFamily: OSW, fontWeight: 700 }}>{fmtEur(d.importe_eur, { decimals: 2 })}</td>
                    <td style={tdNeo(i % 2 === 1)}><BadgeNeo color={resuelto ? OLIVA : AMBAR}>{resuelto ? 'Resuelto' : 'Pendiente'}</BadgeNeo></td>
                    <td style={tdNeo(i % 2 === 1)}>{!resuelto && <BotonNeo bg={OLIVA} onClick={() => resolver(d.id)}>Marcar resuelto</BotonNeo>}</td>
                  </tr>
                )
              })}
            </tbody>
          </TablaWrap>
        )}
      </Banda>
    </PageNeo>
  )
}
