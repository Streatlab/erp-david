import { useState } from 'react'
import { marcarDocumentacionEnviada, desmarcarDocumentacionEnviada } from '@/lib/documentacionEnviada'
import type { ResSubida } from '@/hooks/useSubidaDocumentacion'
import { INK, ARENA, BLANCO, GRIS, OLIVA, TERRA, OSW, BORDER_CARD, SHADOW } from '@/styles/neobrutal'
import { BadgeNeo, BotonNeo } from '@/components/neo/NeoUI'

/* Piezas compartidas de la documentación mensual de Cade (pantalla Documentación Cade y pestaña de Facturación):
   · BotonSubirDocumentacion: UN solo botón para subir los PDF de David y de Juan a la vez.
   · ResultadoSubida: qué ha reconocido de cada fichero.
   · MarcaEnviadaCade: "Ya la tengo enviada" del mes. Marcado, el aviso diario por correo se para. */

const NOMBRE: Record<string, string> = { DAVID: 'David', JUAN: 'Juan' }

export function BotonSubirDocumentacion({ subir, subiendo }: { subir: (files: FileList | null) => void; subiendo: boolean }) {
  return (
    <label style={{ cursor: subiendo ? 'wait' : 'pointer' }}>
      <input id="subir-documentacion" type="file" multiple accept="application/pdf" style={{ display: 'none' }} disabled={subiendo}
        onChange={e => { subir(e.target.files); e.currentTarget.value = '' }} />
      <span style={{ display: 'inline-block', background: INK, color: ARENA, border: BORDER_CARD, boxShadow: SHADOW, padding: '12px 20px', fontFamily: OSW, fontWeight: 700, fontSize: 15, letterSpacing: 1, textTransform: 'uppercase', opacity: subiendo ? 0.6 : 1 }}>
        {subiendo ? 'Subiendo y clasificando…' : 'Subir documentación de David y Juan'}
      </span>
    </label>
  )
}

export function ResultadoSubida({ res, err }: { res: ResSubida[] | null; err: string | null }) {
  return (
    <>
      {err && <div style={{ marginTop: 12, background: TERRA, color: ARENA, border: BORDER_CARD, padding: '8px 12px', fontWeight: 700 }}>{err}</div>}
      {res && (
        <div style={{ marginTop: 12, background: BLANCO, border: BORDER_CARD, padding: '10px 14px', fontSize: 13, fontWeight: 600, color: INK }}>
          {res.map(r => (
            <div key={r.fichero} style={{ padding: '3px 0', color: r.ok ? INK : TERRA }}>
              {r.ok ? `✓ ${r.fichero} → ${NOMBRE[r.emisor ?? ''] ?? r.emisor}: ${r.documento}` : `✗ ${r.fichero}: ${r.motivo}`}
            </div>
          ))}
          <div style={{ color: GRIS, fontSize: 12, marginTop: 4 }}>Si algo no lo reconoce, vuelve a sacarlo como PDF original de la sede o del banco, o súbelo a mano en su fila.</div>
        </div>
      )}
    </>
  )
}

export function MarcaEnviadaCade({ mes, enviada, onCambio }: { mes: string; enviada: boolean; onCambio: (mensaje: string) => void | Promise<void> }) {
  const [ocupado, setOcupado] = useState(false)
  const mesTxt = new Date(mes + 'T00:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  async function alternar() {
    setOcupado(true)
    const err = enviada ? await desmarcarDocumentacionEnviada(mes) : await marcarDocumentacionEnviada(mes)
    setOcupado(false)
    await onCambio(err
      ? `No se pudo guardar: ${err}`
      : enviada
        ? 'Marca quitada: vuelven los avisos si falta algo.'
        : `Hecho: documentación de ${mesTxt} marcada como enviada. No habrá más avisos por correo este mes.`)
  }

  return (
    <div style={{ background: BLANCO, border: BORDER_CARD, boxShadow: SHADOW, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', color: INK }}>
      {enviada ? (
        <>
          <BadgeNeo color={OLIVA}>Enviada a Cade</BadgeNeo>
          <span style={{ fontSize: 13, fontWeight: 600 }}>La documentación de {mesTxt} está dada por enviada: el correo de aviso ya no se manda.</span>
          <BotonNeo bg={ARENA} onClick={alternar} disabled={ocupado}>Deshacer</BotonNeo>
        </>
      ) : (
        <>
          <BotonNeo bg={OLIVA} onClick={alternar} disabled={ocupado}>Ya la tengo enviada</BotonNeo>
          <span style={{ fontSize: 12, fontWeight: 600, color: GRIS, maxWidth: 560 }}>
            Pulsa cuando hayas mandado a Cade la documentación de {mesTxt}. Desde ese momento el ERP deja de avisarte por correo y de marcarla como pendiente. Cada mes hay que volver a pulsarlo.
          </span>
        </>
      )}
    </div>
  )
}
