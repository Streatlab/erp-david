import { useEffect, useState } from 'react'
import { PANTALLAS, pantallasPermitidas, fijarPantalla, type Pantalla } from '@/lib/portal'
import { INK, ARENA, ARENA_CL, BLANCO, GRIS, OLIVA, OSW } from '@/styles/neobrutal'
import { Banda } from '@/components/neo/NeoUI'

/* Configuración ▸ Usuarios: qué pantallas del portal ve cada repartidor. Un toque da o quita. */
export default function PermisosPortal({ repartidores }: { repartidores: { id: number; nombre: string }[] }) {
  const [perm, setPerm] = useState<Record<number, Set<Pantalla>>>({})
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    let vivo = true
    Promise.all(repartidores.map(r => pantallasPermitidas(r.id).then(s => [r.id, s] as const))).then(pares => { if (vivo) setPerm(Object.fromEntries(pares)) })
    return () => { vivo = false }
  }, [repartidores])
  if (repartidores.length === 0) return null
  async function alternar(usuarioId: number, p: Pantalla) {
    const actual = perm[usuarioId] ?? new Set<Pantalla>(PANTALLAS.map(x => x.key))
    const permitido = !actual.has(p)
    const { error } = await fijarPantalla(usuarioId, p, permitido)
    if (error) { setMsg(`No se pudo guardar: ${error.message}`); return }
    const nuevo = new Set(actual); if (permitido) nuevo.add(p); else nuevo.delete(p)
    setPerm(x => ({ ...x, [usuarioId]: nuevo })); setMsg(null)
  }
  return (
    <Banda bg={ARENA}>
      <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 18, textTransform: 'uppercase', marginBottom: 4 }}>Portal del repartidor · pantallas por persona</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: GRIS, marginBottom: 12 }}>Toca una pantalla para darla o quitarla. El cambio se aplica al momento.</div>
      {msg && <div style={{ color: INK, background: BLANCO, border: `2px solid ${INK}`, padding: '6px 10px', marginBottom: 10, fontSize: 13, fontWeight: 700 }}>{msg}</div>}
      <div style={{ display: 'grid', gap: 10 }}>
        {repartidores.map(r => {
          const s = perm[r.id] ?? new Set<Pantalla>(PANTALLAS.map(x => x.key))
          return (
            <div key={r.id} style={{ background: BLANCO, border: `3px solid ${INK}`, padding: '10px 14px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 16, minWidth: 90 }}>{r.nombre}</span>
              {PANTALLAS.map(p => {
                const on = s.has(p.key)
                return (
                  <button key={p.key} type="button" onClick={() => void alternar(r.id, p.key)}
                    style={{ fontFamily: OSW, fontWeight: 700, fontSize: 12, letterSpacing: 0.5, padding: '4px 10px', border: `2px solid ${INK}`, cursor: 'pointer', background: on ? OLIVA : ARENA_CL, color: on ? ARENA : GRIS, textDecoration: on ? 'none' : 'line-through' }}>
                    {p.label}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </Banda>
  )
}
