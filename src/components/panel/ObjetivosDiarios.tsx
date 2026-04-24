import { useState, type CSSProperties } from 'react'
import { useThemeMode, getTokens, FONT, FS, FW, SPACE, RADIUS } from '@/styles/tokens'
import { CardBase, Label, fmtMoney } from './shared'
import { setObjetivoDia, isoWeek, type ObjetivoDiaFila } from '@/lib/panel/queries'

interface Props {
  filas: ObjetivoDiaFila[]
  onSaved: () => void
}

function colorForPct(theme: 'light' | 'dark', pct: number, esFuturo: boolean) {
  const t = getTokens(theme)
  if (esFuturo) return t.textTertiary
  if (pct >= 0.95) return t.success
  if (pct >= 0.6)  return t.warning
  return t.danger
}

export default function ObjetivosDiarios({ filas, onSaved }: Props) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  const [editando, setEditando] = useState<ObjetivoDiaFila | null>(null)
  const [valor, setValor] = useState('')
  const [guardando, setGuardando] = useState(false)

  const semana = filas.length ? isoWeek(new Date(filas[0].fecha + 'T00:00:00')) : 0

  function abrirEdicion(f: ObjetivoDiaFila) {
    setEditando(f)
    setValor(String(f.objetivo))
  }

  async function guardar() {
    if (!editando) return
    const num = Number(valor.replace(',', '.'))
    if (!isFinite(num) || num < 0) return
    setGuardando(true)
    try {
      await setObjetivoDia(editando.fecha, num)
      onSaved()
      setEditando(null)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <CardBase>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Label>Objetivo por día · S{semana}</Label>
        <div style={{ fontFamily: FONT.body, fontSize: FS.xs, color: t.textTertiary }}>
          Entregas Cade día a día · Click para editar
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[2] }}>
        {filas.map(f => {
          const pctClamp = Math.min(1, Math.max(0, f.pct))
          const color = colorForPct(theme, f.pct, f.esFuturo)
          const fechaStr = new Date(f.fecha + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
          const rowStyle: CSSProperties = {
            display: 'grid',
            gridTemplateColumns: '64px 1fr 110px',
            gap: SPACE[3],
            alignItems: 'center',
            padding: '8px 10px',
            borderRadius: RADIUS.md,
            cursor: 'pointer',
            opacity: f.esFuturo ? 0.55 : 1,
            background: f.esHoy ? 'rgba(242, 107, 31, 0.10)' : 'transparent',
            border: f.esHoy ? '1px solid rgba(242, 107, 31, 0.45)' : '1px solid transparent',
            transition: 'background 120ms',
          }
          return (
            <div
              key={f.fecha}
              style={rowStyle}
              onClick={() => abrirEdicion(f)}
              onMouseEnter={(e) => { if (!f.esHoy) (e.currentTarget as HTMLDivElement).style.background = t.bgSurfaceAlt }}
              onMouseLeave={(e) => { if (!f.esHoy) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontFamily: FONT.title, fontWeight: FW.bold, fontSize: FS.sm, color: t.textPrimary, letterSpacing: '0.08em' }}>
                  {f.diaSemana}
                </span>
                <span style={{ fontFamily: FONT.body, fontSize: FS['2xs'], color: t.textTertiary }}>{fechaStr}</span>
              </div>
              <div>
                <div style={{ height: 10, background: t.borderSubtle, borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pctClamp * 100}%`, background: color }} />
                </div>
              </div>
              <div style={{ textAlign: 'right', fontFamily: FONT.title, fontWeight: FW.medium, fontSize: FS.sm, color: t.textPrimary }}>
                {f.esFuturo
                  ? <span style={{ color: t.textTertiary }}>plan {fmtMoney(f.objetivo)}</span>
                  : <>{fmtMoney(f.conseguido)} <span style={{ color: t.textTertiary, fontSize: FS.xs }}>/ {fmtMoney(f.objetivo)}</span></>}
              </div>
            </div>
          )
        })}
      </div>

      {editando && (
        <ModalEditarDia
          fila={editando}
          valor={valor}
          setValor={setValor}
          guardando={guardando}
          onCancelar={() => setEditando(null)}
          onGuardar={guardar}
        />
      )}
    </CardBase>
  )
}

function ModalEditarDia({
  fila, valor, setValor, guardando, onCancelar, onGuardar,
}: {
  fila: ObjetivoDiaFila
  valor: string
  setValor: (v: string) => void
  guardando: boolean
  onCancelar: () => void
  onGuardar: () => void
}) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  const fechaTxt = new Date(fila.fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div
      onClick={onCancelar}
      style={{
        position: 'fixed', inset: 0, background: t.bgOverlay,
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 420, maxWidth: 'calc(100% - 32px)',
          background: t.bgSurface, borderRadius: RADIUS.lg, padding: SPACE[6],
          border: `0.5px solid ${t.borderDefault}`,
          boxShadow: t.shadowModal,
          display: 'flex', flexDirection: 'column', gap: SPACE[4],
        }}
      >
        <div>
          <Label>Editar objetivo</Label>
          <div style={{ fontFamily: FONT.title, fontSize: FS.lg, fontWeight: FW.bold, color: t.textPrimary, textTransform: 'capitalize', marginTop: 4 }}>
            {fechaTxt}
          </div>
        </div>
        <label style={{ fontFamily: FONT.body, fontSize: FS.sm, color: t.textSecondary }}>
          Importe objetivo (€)
          <input
            type="number"
            min={0}
            step={50}
            value={valor}
            onChange={e => setValor(e.target.value)}
            autoFocus
            style={{
              width: '100%', marginTop: 6,
              padding: '10px 12px',
              fontFamily: FONT.title, fontSize: FS.md,
              background: t.bgSurfaceAlt,
              color: t.textPrimary,
              border: `1px solid ${t.borderDefault}`,
              borderRadius: RADIUS.md,
              outline: 'none',
            }}
          />
        </label>
        <div style={{ display: 'flex', gap: SPACE[2], justifyContent: 'flex-end' }}>
          <button onClick={onCancelar} style={{
            padding: '8px 16px', borderRadius: RADIUS.md, border: `1px solid ${t.borderDefault}`,
            background: 'transparent', color: t.textSecondary, fontFamily: FONT.body, fontSize: FS.sm, cursor: 'pointer',
          }}>Cancelar</button>
          <button onClick={onGuardar} disabled={guardando} style={{
            padding: '8px 16px', borderRadius: RADIUS.md, border: 0,
            background: t.brandAccent, color: '#fff', fontFamily: FONT.body, fontSize: FS.sm, fontWeight: FW.medium, cursor: 'pointer',
            opacity: guardando ? 0.6 : 1,
          }}>{guardando ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}
