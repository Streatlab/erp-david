import { useState } from 'react'
import { Archive, ArchiveRestore } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { INK, MARINO, ARENA, BLANCO, GRIS, OLIVA, AMBAR, OSW } from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda, TablaWrap, thNeo, tdNeo, tdEstado, BotonNeo, BadgeNeo, KpiNeo, AvisoNeo } from '@/components/neo/NeoUI'
import { useEquipo, hoyISO } from '@/hooks/useEquipo'
import { codigosDe } from '@/lib/equipo'

/* Personas: equipo real de David con su código Cade, quién le factura (emisor vigente a la fecha elegida) y su furgoneta. */

export default function Personas() {
  const [tick, setTick] = useState(0)
  const [fecha, setFecha] = useState(hoyISO())
  const [verArchivo, setVerArchivo] = useState(false)
  const { personas, emisores, furgoDe, error, cargando } = useEquipo(tick)
  const [errGuardar, setErrGuardar] = useState<string | null>(null)

  const activas = personas.filter(p => p.estado !== 'exempleado')
  const lista = verArchivo ? personas.filter(p => p.estado === 'exempleado') : activas
  const conCodigo = activas.filter(p => codigosDe(emisores, p.alias ?? p.nombre, fecha).length > 0)

  async function cambiarEstado(id: string, estado: string) {
    const { error: e } = await supabase.from('equipo').update({ estado }).eq('id', id)
    if (e) setErrGuardar(e.message); else setTick(t => t + 1)
  }

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Equipo" titulo="Personas">
        <label style={{ fontFamily: OSW, fontWeight: 700, color: ARENA, textTransform: 'uppercase', fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          A fecha
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value || hoyISO())}
            style={{ fontFamily: OSW, fontWeight: 700, padding: '6px 8px', border: `3px solid ${INK}`, background: ARENA, color: INK }} />
        </label>
      </CabeceraNeo>
      {(error || errGuardar) && <AvisoNeo>ERROR: {error ?? errGuardar}</AvisoNeo>}

      <Banda bg={BLANCO}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
          <KpiNeo label="Personas activas" valor={String(activas.length)} color={MARINO} />
          <KpiNeo label="Repartidores con código Cade" valor={String(conCodigo.length)} color={OLIVA} />
          <KpiNeo label="Archivadas" valor={String(personas.length - activas.length)} color={GRIS} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <BotonNeo bg={verArchivo ? BLANCO : AMBAR} onClick={() => setVerArchivo(false)}>Activas</BotonNeo>
          <BotonNeo bg={verArchivo ? AMBAR : BLANCO} onClick={() => setVerArchivo(true)}>Archivo</BotonNeo>
        </div>

        {cargando ? (
          <div style={{ fontFamily: OSW, fontWeight: 700, textTransform: 'uppercase', color: GRIS }}>Cargando…</div>
        ) : lista.length === 0 ? (
          <div style={{ fontFamily: OSW, fontWeight: 700, textTransform: 'uppercase', color: GRIS, padding: 18, background: ARENA }}>Sin personas en esta vista.</div>
        ) : (
          <TablaWrap>
            <thead><tr>{['Nombre', 'Código Cade', 'Le factura', 'Furgoneta', 'Ciudad', 'Notas', ''].map(h => <th key={h} style={thNeo}>{h}</th>)}</tr></thead>
            <tbody>
              {lista.map((p, i) => {
                const alias = p.alias ?? p.nombre
                const cods = codigosDe(emisores, alias, fecha)
                const f = furgoDe(alias)
                const alt = i % 2 === 1
                return (
                  <tr key={p.id}>
                    <td style={{ ...tdEstado(alt, p.estado === 'exempleado' ? GRIS : OLIVA), fontFamily: OSW, fontWeight: 700 }}>{p.nombre}</td>
                    <td style={{ ...tdNeo(alt), fontFamily: OSW, fontWeight: 700 }}>{cods.map(c => c.transportista).join(', ') || '—'}</td>
                    <td style={tdNeo(alt)}>
                      {cods.length ? cods.map(c => <BadgeNeo key={c.transportista} color={c.emisor === 'JUAN' ? AMBAR : MARINO}>{c.emisor}</BadgeNeo>) : '—'}
                    </td>
                    <td style={tdNeo(alt)}>{f ? `${f.codigo} · ${f.matricula ?? f.nombre_corto}` : '—'}</td>
                    <td style={tdNeo(alt)}>{p.ciudad ?? '—'}</td>
                    <td style={{ ...tdNeo(alt), whiteSpace: 'normal', fontWeight: 500 }}>{p.notas ?? ''}</td>
                    <td style={tdNeo(alt)}>
                      {p.estado === 'exempleado'
                        ? <BotonNeo bg={OLIVA} onClick={() => cambiarEstado(p.id, 'activo')}><ArchiveRestore size={13} style={{ marginRight: 4 }} />Reactivar</BotonNeo>
                        : <BotonNeo bg={BLANCO} onClick={() => cambiarEstado(p.id, 'exempleado')}><Archive size={13} style={{ marginRight: 4 }} />Archivar</BotonNeo>}
                    </td>
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
