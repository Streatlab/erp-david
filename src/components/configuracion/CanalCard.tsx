import { fmtEur } from '@/lib/format'
import { useThemeMode, getTokens, PALETTE } from '@/styles/tokens'

type CanalColor = 'ue' | 'gl' | 'je'

export function CanalCard({
  color, label, bruto, pedidos,
}: {
  color: CanalColor
  label: string
  bruto: number
  pedidos: number
}) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  const p = PALETTE[theme]

  // Mapeo a familias David — oliva (success), ambar (warning), naranja (accent)
  const COLORS = {
    ue: { bg: t.successBg, border: t.successBorder, text: t.successText, val: t.success },
    gl: { bg: t.warningBg, border: t.warningBorder, text: t.warningText, val: t.warning },
    je: { bg: p.naranja[50], border: p.naranja[300], text: p.naranja[700], val: p.naranja[500] },
  } as const

  const c = COLORS[color]
  return (
    <div className="rounded-xl p-5 border-2" style={{ backgroundColor: c.bg, borderColor: c.border }}>
      <div className="text-[11px] tracking-[0.14em] font-bold uppercase mb-3" style={{ color: c.text }}>{label}</div>
      <div className="text-[28px] font-extrabold leading-none" style={{ color: c.val }}>{fmtEur(bruto)}</div>
      <div className="text-[11px] mt-2 opacity-70" style={{ color: c.text }}>{pedidos} pedidos</div>
    </div>
  )
}
