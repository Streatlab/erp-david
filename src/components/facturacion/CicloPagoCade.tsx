import { useState, type CSSProperties } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useCicloPagoCade, guardarCicloPagoCade, TEXTO_SIN_CONFIRMAR } from '@/lib/configCade'
import { ARENA, INK, AMBAR, TERRA, OSW, LEX } from '@/styles/neobrutal'

/* Texto del ciclo de pago de Cade. Sale de configuración (nunca escrito a mano) y el admin lo
   confirma o corrige aquí mismo. Se usa en Liquidaciones y en el Panel global. */
const btn = (bg: string, color: string): CSSProperties => ({
  fontFamily: OSW, fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase',
  background: bg, color, border: `2px solid ${INK}`, padding: '3px 10px', cursor: 'pointer',
})
const input: CSSProperties = {
  fontFamily: LEX, fontSize: 13, fontWeight: 600, color: INK, background: ARENA,
  border: `2px solid ${INK}`, padding: '5px 8px', minWidth: 0,
}

export default function CicloPagoCade({ prefijo = '', color = ARENA }: { prefijo?: string; color?: string }) {
  const { usuario } = useAuth()
  const { texto, diaLimite, cargando, recargar } = useCicloPagoCade()
  const [editando, setEditando] = useState(false)
  const [t, setT] = useState('')
  const [dia, setDia] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const admin = usuario?.perfil === 'admin'

  if (cargando) return null

  async function guardar() {
    const n = dia.trim() === '' ? null : Number(dia)
    if (n !== null && (!Number.isInteger(n) || n < 1 || n > 31)) { setErr('El día tiene que estar entre 1 y 31'); return }
    setGuardando(true)
    const e = await guardarCicloPagoCade(t, n)
    setGuardando(false)
    if (e) { setErr(e); return }
    setErr(null)
    setEditando(false)
    recargar()
  }

  if (editando) {
    return (
      <div style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
        <input id="cade-ciclo-texto" value={t} onChange={e => setT(e.target.value)} placeholder="Ej.: Cade liquida el mes trabajado a 30 días" style={input} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color, fontFamily: LEX, fontSize: 12, fontWeight: 600 }}>
          Día límite de cobro del mes siguiente (opcional)
          <input id="cade-ciclo-dia" value={dia} onChange={e => setDia(e.target.value)} inputMode="numeric" placeholder="—" style={{ ...input, width: 60 }} />
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => void guardar()} disabled={guardando} style={btn(AMBAR, INK)}>Guardar</button>
          <button type="button" onClick={() => { setEditando(false); setErr(null) }} style={btn('transparent', color)}>Cancelar</button>
        </div>
        {err && <span style={{ color: TERRA, fontSize: 12, fontWeight: 700 }}>{err}</span>}
      </div>
    )
  }

  return (
    <div style={{ fontSize: 13, fontWeight: 600, color, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', maxWidth: 480 }}>
      <span>
        {prefijo}{texto ?? TEXTO_SIN_CONFIRMAR}
        {texto && diaLimite ? ` Límite de cobro: día ${diaLimite} del mes siguiente.` : ''}
      </span>
      {admin && (
        <button type="button" onClick={() => { setT(texto ?? ''); setDia(diaLimite ? String(diaLimite) : ''); setEditando(true) }} style={btn(AMBAR, INK)}>
          {texto ? 'Editar' : 'Confirmar ciclo'}
        </button>
      )}
    </div>
  )
}
