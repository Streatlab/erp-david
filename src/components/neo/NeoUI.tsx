/**
 * NeoUI.tsx — Piezas compartidas del estilo Neobrutal Mediterráneo (ERP David).
 * Usadas por las páginas recompuestas (Panel, Finanzas, Conciliación…).
 * Fuente de tokens: src/styles/neobrutal.ts. NO improvisar hex.
 */
import type { CSSProperties, ReactNode } from 'react'
import {
  INK, MARINO, ARENA, ARENA_CL, BLANCO, GRIS, OLIVA, TERRA, NARANJA, AMBAR,
  OSW, LEX, SHADOW, BORDER, BORDER_CARD, PAD, d, eyebrow, card,
} from '@/styles/neobrutal'

/* Página full-bleed: escapa el padding del Layout y pone papel arena + cierre */
export function PageNeo({ children }: { children: ReactNode }) {
  return (
    <div className="-m-4 md:-m-6" style={{ fontFamily: LEX, color: INK, background: ARENA }}>
      {children}
      <section style={{ background: MARINO, padding: `22px ${PAD}` }}>
        <div style={{ ...d('16px', ARENA), letterSpacing: '1px' }}>DAVID REPARTE. ALCOI · ONTINYENT.</div>
      </section>
    </div>
  )
}

export function Banda({ bg, children, style }: { bg: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <section style={{ background: bg, borderBottom: BORDER, padding: `28px ${PAD}`, ...style }}>
      {children}
    </section>
  )
}

/* Cabecera de página: banda marino con eyebrow + título + acciones a la derecha */
export function CabeceraNeo({ eyebrowTxt, titulo, children }: { eyebrowTxt: string; titulo: string; children?: ReactNode }) {
  return (
    <Banda bg={MARINO}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <span style={eyebrow(AMBAR)}>{eyebrowTxt}</span>
          <h1 style={{ ...d('clamp(24px,3vw,38px)', ARENA), margin: '10px 0 0' }}>{titulo}</h1>
        </div>
        {children}
      </div>
    </Banda>
  )
}

/* Selector segmentado neobrutal */
export function PillsNeo({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', border: BORDER_CARD, boxShadow: SHADOW }}>
      {options.map(o => {
        const active = value === o
        return (
          <button key={o} onClick={() => onChange(o)}
            style={{
              padding: '8px 14px', border: 'none', borderRight: `3px solid ${INK}`,
              background: active ? NARANJA : ARENA, color: active ? ARENA : INK,
              fontFamily: OSW, fontSize: 12, fontWeight: 600, letterSpacing: 1,
              textTransform: 'uppercase', cursor: 'pointer',
            }}>
            {o}
          </button>
        )
      })}
    </div>
  )
}

/* KPI bloque: número gigante semántico en tarjeta dura */
export function KpiNeo({ label, valor, sub, color = INK, bg = BLANCO }: { label: string; valor: string; sub?: string; color?: string; bg?: string }) {
  return (
    <div style={{ ...card(bg), padding: '16px 18px' }}>
      <div style={{ fontFamily: OSW, fontWeight: 600, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(22px,3vw,40px)', lineHeight: 0.95, letterSpacing: '-0.5px', color }}>{valor}</div>
      {sub && <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: GRIS }}>{sub}</div>}
    </div>
  )
}

/* Banda de aviso TERRA (vencidos, recortes, atención) */
export function AvisoNeo({ children }: { children: ReactNode }) {
  return (
    <Banda bg={TERRA} style={{ padding: `18px ${PAD}` }}>
      <div style={{ ...d('16px', ARENA) }}>{children}</div>
    </Banda>
  )
}

/* ── Tabla Neobrutal (patrón P&L): cabecera INK texto arena, filas alternas,
     banda lateral de estado por fila ── */
export const thNeo: CSSProperties = {
  textAlign: 'left', padding: '10px 12px', fontFamily: OSW, fontSize: 12,
  letterSpacing: 1.5, textTransform: 'uppercase', color: ARENA, fontWeight: 600,
  background: INK, whiteSpace: 'nowrap', borderBottom: BORDER_CARD,
}

export function tdNeo(alt: boolean): CSSProperties {
  return {
    padding: '9px 12px', borderBottom: `2px solid ${ARENA_CL}`,
    background: alt ? ARENA : BLANCO, color: INK, fontSize: 13, fontWeight: 600,
  }
}

/** Banda lateral de estado: aplicar al PRIMER td de la fila */
export function tdEstado(alt: boolean, color: string): CSSProperties {
  return { ...tdNeo(alt), borderLeft: `6px solid ${color}` }
}

export function BadgeNeo({ color, children }: { color: string; children: ReactNode }) {
  const claro = color === AMBAR || color === ARENA || color === BLANCO
  return (
    <span style={{
      fontFamily: OSW, fontWeight: 700, fontSize: 11, letterSpacing: 1,
      textTransform: 'uppercase', background: color, color: claro ? INK : ARENA,
      border: `2px solid ${INK}`, padding: '2px 8px', whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

export function BotonNeo({ onClick, disabled, children, bg = NARANJA }: { onClick: () => void; disabled?: boolean; children: ReactNode; bg?: string }) {
  const claro = bg === AMBAR || bg === ARENA || bg === BLANCO
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        background: bg, color: claro ? INK : ARENA, border: `2px solid ${INK}`,
        boxShadow: `3px 3px 0 ${INK}`, padding: '5px 12px', cursor: disabled ? 'default' : 'pointer',
        fontFamily: OSW, fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
        opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap',
      }}>
      {children}
    </button>
  )
}

export function TablaWrap({ children }: { children: ReactNode }) {
  return (
    <div style={{ border: BORDER_CARD, boxShadow: SHADOW, background: BLANCO, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: LEX }}>{children}</table>
    </div>
  )
}

export const COLORES = { INK, MARINO, ARENA, ARENA_CL, BLANCO, GRIS, OLIVA, TERRA, NARANJA, AMBAR }
