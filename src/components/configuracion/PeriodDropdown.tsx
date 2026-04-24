import { useState } from 'react'

export type Periodo = '30d' | 'mes_curso' | '60d' | '90d' | 'custom'

interface Props {
  value: Periodo
  onChange: (v: Periodo, range?: [string, string]) => void
  customRange?: [string, string]
}

const LABELS: Record<Periodo, string> = {
  '30d': 'Últimos 30 días',
  'mes_curso': 'Mes en curso',
  '60d': 'Últimos 60 días',
  '90d': 'Últimos 90 días',
  'custom': 'Personalizado',
}

export function PeriodDropdown({ value, onChange, customRange }: Props) {
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState(customRange?.[0] ?? '')
  const [to, setTo] = useState(customRange?.[1] ?? '')

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-brand-accent text-xs font-medium underline decoration-dotted underline-offset-4 hover:text-brand-accent-hover"
      >{LABELS[value]} ▾</button>
      {open && (
        <div className="absolute right-0 mt-2 w-[220px] bg-bg-surface border border-border-default rounded-lg shadow-md z-20 p-1">
          {(['30d','mes_curso','60d','90d','custom'] as Periodo[]).map(p => (
            <button
              key={p}
              onClick={() => {
                if (p !== 'custom') { onChange(p); setOpen(false) }
                else onChange(p, [from || '', to || ''])
              }}
              className={`block w-full text-left px-3 py-2 text-xs rounded ${value === p ? 'bg-naranja-50 text-brand-accent font-medium' : 'hover:bg-bg-surface-alt text-text-primary'}`}
            >{LABELS[p]}</button>
          ))}
          {value === 'custom' && (
            <div className="p-2 border-t border-border-default mt-1 space-y-2">
              <div>
                <label className="text-[10px] uppercase text-text-tertiary tracking-[0.12em]">Desde</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full px-2 py-1 border border-border-default rounded text-xs bg-bg-surface text-text-primary" />
              </div>
              <div>
                <label className="text-[10px] uppercase text-text-tertiary tracking-[0.12em]">Hasta</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full px-2 py-1 border border-border-default rounded text-xs bg-bg-surface text-text-primary" />
              </div>
              <button
                onClick={() => { onChange('custom', [from, to]); setOpen(false) }}
                disabled={!from || !to}
                className="w-full px-3 py-1.5 text-xs bg-brand-accent text-text-on-accent rounded-md hover:bg-brand-accent-hover disabled:opacity-50"
              >Aplicar</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
