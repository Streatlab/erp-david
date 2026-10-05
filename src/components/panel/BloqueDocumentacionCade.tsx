import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { INK, ARENA, TERRA, NARANJA, OSW, BORDER, PAD } from '@/styles/neobrutal'

/* Pestaña Hoy: solo un aviso de una línea si hay algo que hacer hoy con Cade
   (documentación pendiente o un emisor cerca del tope). El detalle vive en Facturación. */

export default function BloqueDocumentacionCade() {
  const [faltan, setFaltan] = useState(0)
  const [topeCerca, setTopeCerca] = useState<string[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('v_documentacion_pendiente').select('estado').eq('estado', 'pedir'),
      supabase.from('v_tope_facturacion').select('emisor, pct_consumido'),
    ]).then(([p, t]) => {
      setFaltan(p.data?.length ?? 0)
      setTopeCerca(((t.data ?? []) as { emisor: string; pct_consumido: number }[])
        .filter(x => Number(x.pct_consumido) >= 90).map(x => x.emisor === 'JUAN' ? 'Juan' : 'David'))
    })
  }, [])

  if (!faltan && !topeCerca.length) return null
  const partes: string[] = []
  if (faltan) partes.push(`Faltan ${faltan} documento${faltan > 1 ? 's' : ''} de Cade`)
  if (topeCerca.length) partes.push(`${topeCerca.join(' y ')} al 90 % del tope de facturación`)

  return (
    <section style={{ background: topeCerca.length ? TERRA : NARANJA, borderBottom: BORDER, padding: `12px ${PAD}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 15, letterSpacing: 1, textTransform: 'uppercase', color: ARENA }}>
        {partes.join(' · ')}
      </span>
      <Link to="/finanzas/facturacion" style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: INK, background: ARENA, border: `2px solid ${INK}`, padding: '5px 12px', textDecoration: 'none' }}>
        Ir a Facturación →
      </Link>
    </section>
  )
}
