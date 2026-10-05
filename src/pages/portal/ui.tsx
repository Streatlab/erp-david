/**
 * Piezas del Portal del empleado. Estilo NeoUI de David, pensado para móvil:
 * nada por debajo de 14 px, botones de 48 px, palabras de persona.
 */
import type { CSSProperties, ReactNode } from 'react'
import { INK, BLANCO, GRIS, NARANJA, ARENA, OSW, LEX, SHADOW, BORDER_CARD } from '@/styles/neobrutal'

export function Tarjeta({ color = INK, bg = BLANCO, children, style }: { color?: string; bg?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{
      background: bg, border: BORDER_CARD, boxShadow: SHADOW, borderLeft: `10px solid ${color}`,
      padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8, ...style,
    }}>
      {children}
    </div>
  )
}

export function Titulo({ children, color = INK }: { children: ReactNode; color?: string }) {
  return (
    <h2 style={{ fontFamily: OSW, fontWeight: 700, fontSize: 20, textTransform: 'uppercase', letterSpacing: '-0.2px', margin: 0, color }}>
      {children}
    </h2>
  )
}

export function Etiqueta({ children }: { children: ReactNode }) {
  return <div style={{ fontFamily: OSW, fontWeight: 600, fontSize: 14, letterSpacing: 1, textTransform: 'uppercase', color: GRIS }}>{children}</div>
}

export function Cifra({ children, color = INK, size = 40 }: { children: ReactNode; color?: string; size?: number }) {
  return <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: size, lineHeight: 1.05, color }}>{children}</div>
}

export function Texto({ children, suave, style }: { children: ReactNode; suave?: boolean; style?: CSSProperties }) {
  return <div style={{ fontFamily: LEX, fontSize: suave ? 14 : 16, fontWeight: suave ? 500 : 600, color: suave ? GRIS : INK, lineHeight: 1.4, ...style }}>{children}</div>
}

export function BotonGrande({ onClick, children, bg = NARANJA, color = ARENA, disabled, type = 'button' }: {
  onClick?: () => void; children: ReactNode; bg?: string; color?: string; disabled?: boolean; type?: 'button' | 'submit'
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      minHeight: 52, padding: '12px 20px', background: disabled ? GRIS : bg, color, border: BORDER_CARD, boxShadow: disabled ? 'none' : SHADOW,
      fontFamily: OSW, fontWeight: 700, fontSize: 17, textTransform: 'uppercase', letterSpacing: 0.5, cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    }}>
      {children}
    </button>
  )
}

export function Vacio({ children }: { children: ReactNode }) {
  return <Tarjeta color={GRIS}><Texto>{children}</Texto></Tarjeta>
}

export function Pildora({ texto, bg, color = ARENA }: { texto: string; bg: string; color?: string }) {
  return (
    <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', background: bg, color, border: `2px solid ${INK}`, padding: '3px 10px', whiteSpace: 'nowrap' }}>
      {texto}
    </span>
  )
}

export const campo: CSSProperties = {
  width: '100%', minHeight: 50, background: BLANCO, border: `3px solid ${INK}`, borderRadius: 0,
  padding: '10px 12px', fontFamily: LEX, fontWeight: 600, fontSize: 17, color: INK, boxSizing: 'border-box',
}

export const etiquetaCampo: CSSProperties = {
  fontFamily: OSW, fontWeight: 600, fontSize: 14, letterSpacing: 1, textTransform: 'uppercase', color: INK, marginBottom: 6, display: 'block',
}

export const rejilla = (min = 200): CSSProperties => ({ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: 14 })
export const columna: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 14 }
