import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { INK, ARENA, BLANCO, GRIS, OLIVA, TERRA, NARANJA, OSW, BORDER, BORDER_CARD, SHADOW, PAD, eyebrow, d } from '@/styles/neobrutal'

/* Documentación mensual para Cade (mes anterior). Rubén la saca con certificado digital y la sube
   aquí de una vez, la de David y la de Juan juntas: el servidor reconoce de quién es cada PDF (por NIF)
   y qué documento es (Hacienda, Seguridad Social, autónomos, régimen general). */

interface Pend { emisor: string; documento: string; mes_cade: string; ultimo_expedido: string | null; estado: 'ok' | 'pedir' }
interface Res { fichero: string; ok: boolean; emisor?: string; documento?: string; motivo?: string }

const NOMBRE: Record<string, string> = { DAVID: 'David', JUAN: 'Juan' }
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function aB64(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result).split(',')[1] ?? '')
    r.onerror = () => rej(new Error('no se pudo leer ' + f.name))
    r.readAsDataURL(f)
  })
}

export default function BloqueDocumentacionCade() {
  const [pend, setPend] = useState<Pend[]>([])
  const [subiendo, setSubiendo] = useState(false)
  const [res, setRes] = useState<Res[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function cargar() {
    const { data } = await supabase.from('v_documentacion_pendiente').select('*')
    setPend((data ?? []) as Pend[])
  }
  useEffect(() => { cargar() }, [])

  async function subir(files: FileList | null) {
    if (!files || !files.length) return
    setSubiendo(true); setErr(null); setRes(null)
    try {
      const ficheros = await Promise.all(Array.from(files).map(async f => ({ nombre: f.name, b64: await aB64(f) })))
      const { data, error } = await supabase.functions.invoke('documentacion-subir', { body: { ficheros } })
      if (error) throw error
      setRes((data?.resultados ?? []) as Res[])
      await cargar()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setSubiendo(false)
    }
  }

  if (!pend.length) return null
  const mes = pend[0]?.mes_cade ? new Date(pend[0].mes_cade + 'T00:00:00') : null
  const mesTxt = mes ? `${MESES[mes.getMonth()]} ${mes.getFullYear()}` : ''
  const faltan = pend.filter(p => p.estado === 'pedir').length
  const emisores = Array.from(new Set(pend.map(p => p.emisor)))

  return (
    <section style={{ background: faltan ? NARANJA : OLIVA, borderBottom: BORDER, padding: `22px ${PAD}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <div>
          <span style={eyebrow(INK, ARENA)}>Documentación Cade · {mesTxt}</span>
          <div style={{ ...d('clamp(20px,2.4vw,30px)', ARENA), marginTop: 10 }}>
            {faltan ? `FALTAN ${faltan} DOCUMENTO${faltan > 1 ? 'S' : ''}` : 'TODO AL DÍA'}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: ARENA, marginTop: 4, maxWidth: 520 }}>
            Sube los PDF de David y de Juan a la vez: el ERP reconoce de quién es cada uno y qué documento es.
            Mientras falte algo, las facturas de ese emisor no salen a Cade.
          </div>
        </div>
        <label style={{ cursor: subiendo ? 'wait' : 'pointer' }}>
          <input type="file" multiple accept="application/pdf" style={{ display: 'none' }} disabled={subiendo}
            onChange={e => { subir(e.target.files); e.currentTarget.value = '' }} />
          <span style={{ display: 'inline-block', background: INK, color: ARENA, border: BORDER_CARD, boxShadow: SHADOW, padding: '12px 20px', fontFamily: OSW, fontWeight: 700, fontSize: 15, letterSpacing: 1, textTransform: 'uppercase' }}>
            {subiendo ? 'Subiendo…' : 'Subir documentación'}
          </span>
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginTop: 16 }}>
        {emisores.map(em => (
          <div key={em} style={{ background: BLANCO, border: BORDER_CARD, padding: '12px 14px' }}>
            <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 14, textTransform: 'uppercase', marginBottom: 8, color: INK }}>{NOMBRE[em] ?? em}</div>
            {pend.filter(p => p.emisor === em).map(p => (
              <div key={p.documento} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '5px 0', borderTop: '1px solid rgba(11,21,36,.1)', fontSize: 13, fontWeight: 600, color: INK }}>
                <span>{p.documento}</span>
                <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 12, color: BLANCO, background: p.estado === 'ok' ? OLIVA : TERRA, padding: '1px 8px', border: `2px solid ${INK}`, whiteSpace: 'nowrap' }}>
                  {p.estado === 'ok' ? 'OK' : 'FALTA'}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {err && <div style={{ marginTop: 12, background: TERRA, color: ARENA, border: BORDER_CARD, padding: '8px 12px', fontWeight: 700 }}>{err}</div>}
      {res && (
        <div style={{ marginTop: 12, background: BLANCO, border: BORDER_CARD, padding: '10px 14px', fontSize: 13, fontWeight: 600, color: INK }}>
          {res.map(r => (
            <div key={r.fichero} style={{ padding: '3px 0', color: r.ok ? INK : TERRA }}>
              {r.ok ? `✓ ${r.fichero} → ${NOMBRE[r.emisor ?? ''] ?? r.emisor}: ${r.documento}` : `✗ ${r.fichero}: ${r.motivo}`}
            </div>
          ))}
          <div style={{ color: GRIS, fontSize: 12, marginTop: 4 }}>Si algo no lo reconoce, vuelve a sacarlo como PDF original de la sede o del banco.</div>
        </div>
      )}
    </section>
  )
}
