import { useEffect, useState } from 'react'
import { Inbox, Check, Paperclip } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fmtDate } from '@/lib/format'
import { INK, ARENA, BLANCO, GRIS, OLIVA, NARANJA, CELESTE, AMBAR, BERENJENA, MARINO, OSW, LEX } from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda, KpiNeo, PillsNeo, TablaWrap, thNeo, tdNeo, tdEstado, AvisoNeo, BadgeNeo } from '@/components/neo/NeoUI'
import { TIPOS_CORREO, reglaDesdeCorreo } from '@/lib/papeleo'

/* Papeleo = bandeja del cartero (correo_entrante). Reclasificar crea regla en correo_reglas. */

interface Adjunto { nombre: string; ruta: string; tipo?: string; tamano?: number }
interface Correo { id: number; remitente: string | null; asunto: string | null; recibido_en: string | null; tipo: string | null; adjuntos: Adjunto[]; estado: string; detalle: string | null }

const COLOR_TIPO: Record<string, string> = { liquidacion: BERENJENA, penalizacion: NARANJA, factura: CELESTE, documentacion: MARINO, otro: GRIS }

export default function Papeleo() {
  const [correos, setCorreos] = useState<Correo[]>([])
  const [filtro, setFiltro] = useState('Pendientes')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    supabase.from('correo_entrante').select('id, remitente, asunto, recibido_en, tipo, adjuntos, estado, detalle')
      .order('recibido_en', { ascending: false }).limit(300)
      .then(({ data, error: e }) => {
        if (e) setError(e.message); else setCorreos((data ?? []) as Correo[])
        setCargando(false)
      })
  }, [tick])

  const pendientes = correos.filter(c => c.estado !== 'archivado')
  const visibles = filtro === 'Todos' ? correos : filtro === 'Pendientes' ? pendientes : correos.filter(c => c.estado === 'archivado')

  async function archivar(id: number) {
    const { error: e } = await supabase.from('correo_entrante').update({ estado: 'archivado' }).eq('id', id)
    if (e) setError(e.message); else setTick(t => t + 1)
  }

  async function reclasificar(c: Correo, tipo: string) {
    if (!tipo || tipo === c.tipo) return
    const regla = reglaDesdeCorreo(c.remitente ?? '', c.asunto ?? '', tipo)
    const [u, r] = await Promise.all([
      supabase.from('correo_entrante').update({ tipo }).eq('id', c.id),
      supabase.from('correo_reglas').insert(regla),
    ])
    const e = u.error ?? r.error
    if (e) { setError(e.message); return }
    setAviso(`Regla creada: correos de ${regla.remitente_contiene}${regla.asunto_contiene ? ` con «${regla.asunto_contiene}» en el asunto` : ''} → ${tipo}.`)
    setTick(t => t + 1)
  }

  async function abrir(a: Adjunto) {
    const { data, error: e } = await supabase.storage.from('correo').createSignedUrl(a.ruta, 300)
    if (e || !data?.signedUrl) { setError(e?.message ?? 'No se pudo abrir el adjunto'); return }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  const sel = { fontFamily: OSW, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, padding: '4px 6px', border: `2px dashed ${CELESTE}`, background: BLANCO, color: INK }

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Finanzas" titulo="Papeleo">
        <PillsNeo value={filtro} onChange={setFiltro} options={['Pendientes', 'Archivados', 'Todos']} />
      </CabeceraNeo>
      {error && <AvisoNeo>ERROR: {error}</AvisoNeo>}
      {aviso && (
        <Banda bg={OLIVA} style={{ padding: '12px 40px' }}>
          <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: ARENA }}>{aviso}</div>
        </Banda>
      )}

      {!cargando && correos.length === 0 ? (
        <AvisoNeo>En construcción · sin datos. El cartero aún no ha traído correos.</AvisoNeo>
      ) : (
        <Banda bg={BLANCO}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 22 }}>
            <KpiNeo label="Correos traídos" valor={String(correos.length)} color={CELESTE} sub="por el cartero (cada día 05:00)" />
            <KpiNeo label="Pendientes" valor={String(pendientes.length)} color={pendientes.length > 0 ? NARANJA : OLIVA} />
            <KpiNeo label="Liquidaciones Cade" valor={String(correos.filter(c => c.tipo === 'liquidacion').length)} color={BERENJENA} />
          </div>

          {visibles.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: GRIS, fontFamily: OSW, fontWeight: 700, textTransform: 'uppercase' }}>
              <Inbox size={20} /> Bandeja vacía para este filtro
            </div>
          ) : (
            <TablaWrap>
              <thead><tr>{['Recibido', 'Remitente', 'Asunto', 'Adjuntos', 'Tipo', 'Estado', ''].map(h => <th key={h} style={thNeo}>{h}</th>)}</tr></thead>
              <tbody>
                {visibles.map((c, i) => {
                  const alt = i % 2 === 1
                  return (
                    <tr key={c.id}>
                      <td style={{ ...tdEstado(alt, COLOR_TIPO[c.tipo ?? 'otro'] ?? GRIS), fontFamily: OSW, fontWeight: 700 }}>{c.recibido_en ? fmtDate(c.recibido_en) : '—'}</td>
                      <td style={{ ...tdNeo(alt), fontSize: 12 }}>{c.remitente ?? '—'}</td>
                      <td style={{ ...tdNeo(alt), whiteSpace: 'normal' }}>{c.asunto ?? '—'}{c.detalle && <div style={{ fontSize: 11, color: GRIS }}>{c.detalle}</div>}</td>
                      <td style={tdNeo(alt)}>
                        {(c.adjuntos ?? []).map(a => (
                          <button key={a.ruta} onClick={() => abrir(a)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontFamily: LEX, fontSize: 12, fontWeight: 600, color: MARINO, textDecoration: 'underline', padding: '2px 0' }}>
                            <Paperclip size={12} /> {a.nombre}
                          </button>
                        ))}
                        {!(c.adjuntos ?? []).length && '—'}
                      </td>
                      <td style={tdNeo(alt)}>
                        <select value={c.tipo ?? 'otro'} onChange={e => reclasificar(c, e.target.value)} style={sel}>
                          {TIPOS_CORREO.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td style={tdNeo(alt)}><BadgeNeo color={c.estado === 'archivado' ? OLIVA : AMBAR}>{c.estado.replace('_', ' ')}</BadgeNeo></td>
                      <td style={tdNeo(alt)}>
                        {c.estado !== 'archivado' && (
                          <button onClick={() => archivar(c.id)} style={{ background: INK, color: ARENA, border: 'none', padding: '6px 12px', cursor: 'pointer', fontFamily: OSW, fontWeight: 700, fontSize: 12, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <Check size={13} /> Archivar
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </TablaWrap>
          )}
        </Banda>
      )}
    </PageNeo>
  )
}
