import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { INK, ARENA, BLANCO, GRIS, OLIVA, TERRA, NARANJA, MARINO, OSW, BORDER_CARD, SHADOW } from '@/styles/neobrutal'

/* Facturación ▸ Envío de facturas por emisor.
   Con las plantillas Excel de Rubén (subidas una vez), genera "FACTURA_N.xlsx" + PDF y la "01_RELACIÓN_FACTURAS"
   actualizada. Dos salidas: descargar todo en ZIP, o dejar el correo a Cade preparado para revisarlo y enviarlo a mano:
   · David → borrador dentro de su Gmail (davidsanzn@gmail.com)
   · Juan  → admin@streatlab.com no es Gmail: se descarga un correo (.eml) que con doble clic se abre en Outlook
             como mensaje sin enviar, con los PDF adjuntos. */

const EMISORES = [
  { k: 'DAVID', l: 'David', buzon: 'davidsanzn@gmail.com', gmail: true },
  { k: 'JUAN', l: 'Juan', buzon: 'admin@streatlab.com', gmail: false },
]
const PLANTILLAS = [
  { f: 'factura_cade.xlsx', l: 'Factura Cade (una tuya ya hecha)' },
  { f: 'factura_prior.xlsx', l: 'Factura Prior (una tuya ya hecha)' },
  { f: 'relacion.xlsx', l: '01 Relación de facturas actual' },
]
const AUTH_DAVID = 'https://rribmludsuirmyprfkop.supabase.co/functions/v1/correo-auth?llave=david-correo-2026&accion=conectar&cuenta=david'

export default function EnvioFacturas({ mes }: { mes: string }) {
  const [tiene, setTiene] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<Record<string, string>>({})
  const [verPlantillas, setVerPlantillas] = useState(false)

  async function revisar() {
    const out: Record<string, boolean> = {}
    for (const e of EMISORES) {
      const { data } = await supabase.storage.from('documentacion').list(`plantillas/${e.k}`)
      for (const p of PLANTILLAS) out[`${e.k}/${p.f}`] = !!data?.some(x => x.name === p.f)
    }
    setTiene(out)
  }
  useEffect(() => { revisar() }, [])

  async function subir(em: string, f: string, file: File) {
    setBusy(`${em}/${f}`)
    const { error } = await supabase.storage.from('documentacion').upload(`plantillas/${em}/${f}`, file, { upsert: true })
    setMsg(m => ({ ...m, [em]: error ? 'No se pudo subir: ' + error.message : 'Plantilla guardada.' }))
    setBusy(null); revisar()
  }

  async function ejecutar(em: string, accion: 'zip' | 'borrador') {
    setBusy(`${em}-${accion}`); setMsg(m => ({ ...m, [em]: '' }))
    const { data, error } = await supabase.functions.invoke('facturas-paquete', { body: { mes, emisor: em, accion } })
    setBusy(null)
    const err = error ? (data?.error ?? error.message) : data?.error
    if (err) { setMsg(m => ({ ...m, [em]: err })); return }
    if (accion === 'zip' && data?.url) { window.open(data.url, '_blank'); setMsg(m => ({ ...m, [em]: `Descargado: ${data.ficheros.join(', ')}` })) }
    if (accion === 'borrador' && data?.eml && data?.url) {
      window.open(data.url, '_blank')
      setMsg(m => ({ ...m, [em]: `Correo descargado. Ábrelo con doble clic: se abre en Outlook sin enviar, con ${data.adjuntos.join(', ')} adjuntos. Revísalo y envíalo.` }))
    } else if (accion === 'borrador') {
      setMsg(m => ({ ...m, [em]: `Borrador preparado en ${data.buzon}: revísalo en Gmail y envíalo. Adjuntos: ${data.adjuntos.join(', ')}` }))
    }
  }

  const boton = (txt: string, onClick: () => void, color: string, dis = false) => (
    <button onClick={onClick} disabled={dis} style={{ background: dis ? GRIS : color, color: ARENA, border: BORDER_CARD, boxShadow: dis ? 'none' : SHADOW, padding: '9px 14px', fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', cursor: dis ? 'wait' : 'pointer' }}>{txt}</button>
  )

  return (
    <div style={{ marginTop: 16, background: BLANCO, border: BORDER_CARD, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 15, textTransform: 'uppercase', color: INK }}>Enviar facturas a Cade</div>
        <button onClick={() => setVerPlantillas(v => !v)} style={{ border: `2px solid ${INK}`, background: ARENA, fontFamily: OSW, fontWeight: 700, fontSize: 12, padding: '4px 10px', cursor: 'pointer', textTransform: 'uppercase' }}>Plantillas</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginTop: 12 }}>
        {EMISORES.map(e => {
          const ok = PLANTILLAS.filter(p => p.f !== 'factura_prior.xlsx').every(p => tiene[`${e.k}/${p.f}`])
          return (
            <div key={e.k} style={{ border: `2px solid ${INK}`, padding: '12px 14px', background: ARENA }}>
              <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 14, textTransform: 'uppercase' }}>{e.l}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: GRIS, marginBottom: 10 }}>Sale desde {e.buzon}</div>
              {!ok && <div style={{ fontSize: 12, fontWeight: 700, color: TERRA, marginBottom: 8 }}>Faltan plantillas: pulsa "Plantillas" y súbelas una vez.</div>}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {boton(busy === `${e.k}-zip` ? 'Preparando…' : 'Descargar facturas + relación', () => ejecutar(e.k, 'zip'), MARINO, !!busy || !ok)}
                {boton(busy === `${e.k}-borrador` ? 'Preparando…' : e.gmail ? 'Correo en borrador (Gmail)' : 'Correo para Outlook', () => ejecutar(e.k, 'borrador'), NARANJA, !!busy || !ok)}
              </div>
              {msg[e.k] && <div style={{ fontSize: 12, fontWeight: 600, marginTop: 8, color: /^No |falta|Gmail:|error|no está/i.test(msg[e.k]) ? TERRA : OLIVA }}>
                {msg[e.k]}{e.gmail && /no está conectado|volver a conectar/.test(msg[e.k]) && <> · <a href={AUTH_DAVID} target="_blank" rel="noreferrer" style={{ color: INK }}>Conectar buzón</a></>}
              </div>}
            </div>
          )
        })}
      </div>

      {verPlantillas && (
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
          {EMISORES.map(e => (
            <div key={e.k} style={{ border: `2px dashed ${INK}`, padding: '10px 12px' }}>
              <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', marginBottom: 6 }}>Plantillas de {e.l}</div>
              {PLANTILLAS.map(p => (
                <div key={p.f} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13, fontWeight: 600 }}>
                  <span>{tiene[`${e.k}/${p.f}`] ? '✓' : '✗'} {p.l}</span>
                  <label style={{ cursor: 'pointer' }}>
                    <input type="file" accept=".xlsx" style={{ display: 'none' }} onChange={ev => { const f = ev.target.files?.[0]; if (f) subir(e.k, p.f, f); ev.currentTarget.value = '' }} />
                    <span style={{ border: `2px solid ${INK}`, background: BLANCO, padding: '2px 8px', fontFamily: OSW, fontSize: 12, fontWeight: 700 }}>{busy === `${e.k}/${p.f}` ? '…' : tiene[`${e.k}/${p.f}`] ? 'Cambiar' : 'Subir'}</span>
                  </label>
                </div>
              ))}
              <div style={{ fontSize: 11, color: GRIS, marginTop: 4 }}>La relación se actualiza sola cada mes después de usarla.</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
