import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { OLIVA, TERRA, GRIS, ARENA_CL, BLANCO, ARENA, INK, OSW } from '@/styles/neobrutal'
import { PageNeo, Banda, CabeceraNeo, AvisoNeo, TablaWrap, thNeo, tdNeo, tdEstado, BadgeNeo, BotonNeo } from '@/components/neo/NeoUI'

interface Pend { emisor: string; documento: string; como_obtenerlo: string | null; ultimo_expedido: string | null; estado: 'ok' | 'pedir' }
interface Doc { id: number; emisor: string; documento: string; expedido: string | null; caduca: string | null; importe: number | null; ruta: string | null; created_at: string }

const NOMBRE: Record<string, string> = { DAVID: 'David Sanz Navarro', JUAN: 'Juan Rus Martínez' }
const fmt = (d: string | null) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
const slug = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()

export default function DocumentacionCade() {
  const [pend, setPend] = useState<Pend[]>([])
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [subiendo, setSubiendo] = useState<string | null>(null)
  const [fechas, setFechas] = useState<Record<string, string>>({})

  async function cargar() {
    setLoading(true)
    const [p, d] = await Promise.all([
      supabase.from('v_documentacion_pendiente').select('*'),
      supabase.from('documentos_emisor').select('*').order('created_at', { ascending: false }).limit(40),
    ])
    if (p.error) setMsg(p.error.message)
    setPend((p.data ?? []) as Pend[])
    setDocs((d.data ?? []) as Doc[])
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  async function subir(p: Pend, file: File) {
    const clave = `${p.emisor}|${p.documento}`
    setSubiendo(clave); setMsg(null)
    const hoy = new Date().toISOString().slice(0, 10)
    const expedido = fechas[clave] || hoy
    const ruta = `${p.emisor}/${expedido.slice(0, 7)}/${slug(p.documento)}-${Date.now()}.${file.name.split('.').pop() || 'pdf'}`
    const up = await supabase.storage.from('documentacion').upload(ruta, file, { upsert: true })
    if (up.error) { setMsg('No se pudo subir: ' + up.error.message); setSubiendo(null); return }
    const ins = await supabase.from('documentos_emisor').insert([{
      emisor: p.emisor, documento: p.documento, periodo: expedido.slice(0, 7) + '-01', expedido, ruta, subido_por: 'erp',
    }])
    if (ins.error) setMsg('Subido, pero no se registró: ' + ins.error.message)
    else setMsg(`${p.documento} de ${NOMBRE[p.emisor] ?? p.emisor} guardado.`)
    setSubiendo(null)
    cargar()
  }

  async function abrir(ruta: string) {
    const r = await supabase.storage.from('documentacion').createSignedUrl(ruta, 120)
    if (r.data?.signedUrl) window.open(r.data.signedUrl, '_blank')
  }

  const emisores = Array.from(new Set(pend.map(p => p.emisor)))
  const faltan = pend.filter(p => p.estado === 'pedir').length

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Finanzas · Cade" titulo="Documentación Cade">
        <div style={{ fontSize: 13, fontWeight: 600, color: ARENA, opacity: 0.85, maxWidth: 440 }}>
          Lo que hay que mandar a Cade cada mes con las facturas. Se saca con certificado digital: el ERP te lo pide por correo del 1 al 10 y aquí lo subes.
        </div>
      </CabeceraNeo>

      {msg && <AvisoNeo>{msg}</AvisoNeo>}
      {!loading && faltan > 0 && <AvisoNeo>FALTAN {faltan} DOCUMENTO{faltan > 1 ? 'S' : ''}. Las facturas de ese emisor no salen a Cade hasta completarlo.</AvisoNeo>}

      {emisores.map(em => (
        <Banda key={em} bg={BLANCO}>
          <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 16, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, color: INK }}>
            {NOMBRE[em] ?? em}
          </div>
          <TablaWrap>
            <thead><tr>{['Documento', 'Estado', 'Último', 'Cómo sacarlo', 'Fecha del documento', ''].map(h => <th key={h} style={thNeo}>{h}</th>)}</tr></thead>
            <tbody>
              {pend.filter(p => p.emisor === em).map((p, i) => {
                const alt = i % 2 === 1
                const clave = `${p.emisor}|${p.documento}`
                const ok = p.estado === 'ok'
                return (
                  <tr key={clave}>
                    <td style={tdEstado(alt, ok ? OLIVA : TERRA)}>{p.documento}</td>
                    <td style={tdNeo(alt)}><BadgeNeo color={ok ? OLIVA : TERRA}>{ok ? 'Al día' : 'Falta'}</BadgeNeo></td>
                    <td style={tdNeo(alt)}>{fmt(p.ultimo_expedido)}</td>
                    <td style={{ ...tdNeo(alt), fontSize: 12, color: GRIS, maxWidth: 280 }}>{p.como_obtenerlo}</td>
                    <td style={tdNeo(alt)}>
                      <input type="date" value={fechas[clave] ?? ''} onChange={e => setFechas(f => ({ ...f, [clave]: e.target.value }))}
                        style={{ border: `2px solid ${INK}`, padding: '3px 6px', fontFamily: OSW, fontSize: 13, background: ARENA_CL }} />
                    </td>
                    <td style={tdNeo(alt)}>
                      <label style={{ cursor: 'pointer' }}>
                        <input type="file" accept="application/pdf,image/*" style={{ display: 'none' }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) subir(p, f); e.currentTarget.value = '' }} />
                        <span style={{ display: 'inline-block', background: ok ? ARENA : '#F26B1F', color: ok ? INK : BLANCO, border: `2px solid ${INK}`, padding: '5px 12px', fontFamily: OSW, fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>
                          {subiendo === clave ? 'Subiendo…' : ok ? 'Reemplazar' : 'Subir'}
                        </span>
                      </label>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </TablaWrap>
        </Banda>
      ))}

      <Banda bg={ARENA_CL}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 16, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, color: INK }}>Historial</div>
        <TablaWrap>
          <thead><tr>{['Emisor', 'Documento', 'Fecha', 'Caduca', ''].map(h => <th key={h} style={thNeo}>{h}</th>)}</tr></thead>
          <tbody>
            {docs.length === 0 && <tr><td colSpan={5} style={{ ...tdNeo(false), textAlign: 'center', color: GRIS, padding: 24 }}>Sin documentos todavía.</td></tr>}
            {docs.map((d, i) => (
              <tr key={d.id}>
                <td style={tdNeo(i % 2 === 1)}>{NOMBRE[d.emisor] ?? d.emisor}</td>
                <td style={tdNeo(i % 2 === 1)}>{d.documento}</td>
                <td style={tdNeo(i % 2 === 1)}>{fmt(d.expedido)}</td>
                <td style={tdNeo(i % 2 === 1)}>{fmt(d.caduca)}</td>
                <td style={tdNeo(i % 2 === 1)}>{d.ruta ? <BotonNeo bg={ARENA} onClick={() => abrir(d.ruta!)}>Ver</BotonNeo> : <span style={{ color: GRIS, fontSize: 12 }}>sin fichero</span>}</td>
              </tr>
            ))}
          </tbody>
        </TablaWrap>
      </Banda>
    </PageNeo>
  )
}
