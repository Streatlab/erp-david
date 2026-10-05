import { useState } from 'react'
import { INK, MARINO, ARENA, BLANCO, GRIS, AMBAR, NARANJA, OSW, LEX, BORDER_CARD, SHADOW } from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda, AvisoNeo } from '@/components/neo/NeoUI'
import { useEquipo, hoyISO } from '@/hooks/useEquipo'
import { facturacionPorEmisor } from '@/lib/equipo'
import { fmtDate } from '@/lib/format'

/* Organigrama real: Cade → quién factura (David / Juan) → códigos y repartidores, a la fecha elegida. */

function Caja({ titulo, sub, color }: { titulo: string; sub?: string; color: string }) {
  const claro = color === AMBAR || color === ARENA || color === BLANCO
  return (
    <div style={{ background: color, color: claro ? INK : ARENA, border: BORDER_CARD, boxShadow: SHADOW, padding: '12px 16px', minWidth: 170, textAlign: 'center' }}>
      <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 17, textTransform: 'uppercase' }}>{titulo}</div>
      {sub && <div style={{ fontFamily: LEX, fontSize: 12, fontWeight: 600, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function Organigrama() {
  const [fecha, setFecha] = useState(hoyISO())
  const { emisores, furgoDe, error, cargando } = useEquipo()
  const porEmisor = facturacionPorEmisor(emisores, fecha)
  const emisoresOrden = Object.keys(porEmisor).sort()

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Equipo" titulo="Organigrama">
        <label style={{ fontFamily: OSW, fontWeight: 700, color: ARENA, textTransform: 'uppercase', fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          A fecha
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value || hoyISO())}
            style={{ fontFamily: OSW, fontWeight: 700, padding: '6px 8px', border: `3px solid ${INK}`, background: ARENA, color: INK }} />
        </label>
      </CabeceraNeo>
      {error && <AvisoNeo>ERROR: {error}</AvisoNeo>}

      <Banda bg={ARENA}>
        {cargando ? (
          <div style={{ fontFamily: OSW, fontWeight: 700, textTransform: 'uppercase', color: GRIS }}>Cargando…</div>
        ) : emisoresOrden.length === 0 ? (
          <div style={{ fontFamily: OSW, fontWeight: 700, textTransform: 'uppercase', color: GRIS }}>Sin datos de emisores a esta fecha.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
            <Caja titulo="Cade" sub="cliente único · paga la facturación" color={INK} />
            <div style={{ width: 4, height: 22, background: INK }} />
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', justifyContent: 'center' }}>
              {emisoresOrden.map(em => (
                <div key={em} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                  <Caja titulo={`Factura ${em === 'DAVID' ? 'David' : em === 'JUAN' ? 'Juan' : em}`} sub={`${porEmisor[em].length} código(s)`} color={em === 'JUAN' ? AMBAR : MARINO} />
                  <div style={{ width: 4, height: 14, background: INK }} />
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {porEmisor[em].sort((a, b) => a.transportista.localeCompare(b.transportista)).map(c => {
                      const f = furgoDe(c.repartidor)
                      return <Caja key={c.transportista} titulo={`${c.repartidor ?? '—'} · ${c.transportista}`} sub={f ? `furgoneta ${f.codigo}` : 'sin furgoneta asignada'} color={BLANCO} />
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontFamily: LEX, fontSize: 13, fontWeight: 600, color: INK, maxWidth: 640, textAlign: 'center' }}>
              Situación a {fmtDate(fecha)}. Desde el 1 de septiembre de 2026 Juan factura 972, 939 y 9391; David solo 9392.
              Todo lo facturado es ingreso del negocio de David, entre por la cuenta que entre.
            </div>
            <div style={{ fontFamily: OSW, fontSize: 12, fontWeight: 700, color: NARANJA, textTransform: 'uppercase' }}>Cambia la fecha para ver el reparto anterior a septiembre.</div>
          </div>
        )}
      </Banda>
    </PageNeo>
  )
}
