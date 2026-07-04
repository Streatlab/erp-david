/**
 * neobrutal.ts — TOKENS CANÓNICOS · Neobrutal Mediterráneo · ERP David Reparte.
 *
 * Espejo ESTRUCTURAL del neobrutal.ts de Binagre (bloque, borde, sombra, dato)
 * con paleta mediterránea propia. PROHIBIDO usar colores Binagre
 * (#B01D23, #FF2E63, #FFC400, #FCEFD6). Aislamiento absoluto.
 *
 * Fuente de verdad: MANUAL DE ESTILO · Neobrutal Mediterráneo David (Notion, único·definitivo).
 * Mantra: bloque, borde, sombra, dato — sol y mar.
 *
 * ROTUNDO (no se toca): sombra única 4px 4px 0 INK · bordes INK 3-4px · radio 0 ·
 * solo Oswald+Lexend · color con significado fijo · fondo papel ARENA ·
 * cifras es-ES (miles punto, decimal coma, − real, — sin dato, € solo en hero).
 *
 * NO improvisar hex ni medidas: usar estas constantes tal cual.
 */
import type { CSSProperties } from 'react'

/* ── Familias tipográficas ───────────────────────── */
export const OSW = "'Oswald', sans-serif"   // titulares, cifras, etiquetas (MAYÚS)
export const LEX = "'Lexend', sans-serif"   // texto corrido

/* ── Tinta y papel ───────────────────────────────── */
export const INK      = '#0B1524'  // bordes, sombras, texto, fondos invertidos
export const MARINO   = '#16355C'  // corporativo David · fondos oscuros · titular duro
export const ARENA    = '#F5ECD9'  // papel. Fondo base
export const ARENA_CL = '#EDE1C4'  // paneles secundarios cálidos
export const BLANCO   = '#FFFFFF'  // interior de tarjetas
export const GRIS     = '#A89472'  // deshabilitado, estimado o vacío

/* ── Acentos semánticos (significado FIJO) ───────── */
export const OLIVA   = '#7A8C3E'  // positivo · cobrado · margen sano
export const TERRA   = '#C94A2C'  // negativo real · recorte · vencido · pérdida
export const NARANJA = '#F26B1F'  // coste · aviso · pendiente · CTA (naranja Valencia)
export const CELESTE = '#2D7DD2'  // por cobrar · bruto · campos editables
export const AMBAR   = '#F5B84A'  // foco · héroe · objetivos · días pico

/** Paleta agrupada (acceso por objeto). */
export const NEO = {
  INK, MARINO, ARENA, ARENA_CL, BLANCO, GRIS,
  OLIVA, TERRA, NARANJA, CELESTE, AMBAR,
} as const

/* ── Operadores (clientes de reparto) ────────────── */
export const OPERADOR: Record<string, string> = {
  mercadona: '#F26B1F',
  carrefour: '#7A8C3E',
  lidl:      '#F5B84A',
  dia:       '#C94A2C',
  otros:     '#2D7DD2',
}
/** true = fondo claro → texto INK · false = fondo oscuro → texto ARENA/BLANCO */
export const OPERADOR_CLARO: Record<string, boolean> = {
  mercadona: false, carrefour: false, lidl: true, dia: false, otros: false,
}

/* ── Estructura (ADN) ────────────────────────────── */
export const SHADOW      = `4px 4px 0 ${INK}`   // sombra ÚNICA de todo el ERP
export const PAD         = '40px'               // padding lateral de sección
export const BORDER      = `4px solid ${INK}`   // contenedores y secciones
export const BORDER_CARD = `3px solid ${INK}`   // cards y barras

/* ── Sidebar (marino sólido) ─────────────────────── */
export const SIDEBAR = {
  BG: MARINO, TEXTO: ARENA, ACTIVO: NARANJA, INK,
  widthOpen: 240, widthCollapsed: 56,
  border: `4px solid ${INK}`, sep: `3px solid ${INK}`,
} as const

/* ── Helpers de estilo ───────────────────────────── */
/** Número/título neobrutal: Oswald 700, uppercase, interlineado apretado. */
export const d = (size: string, color: string = INK): CSSProperties => ({
  fontFamily: OSW, fontWeight: 700, fontSize: size, lineHeight: 0.95,
  letterSpacing: '-0.5px', textTransform: 'uppercase', color,
})

/** Etiqueta tipo pastilla con borde 2px (la "eyebrow" de cada banda). */
export const eyebrow = (bg: string, color: string = INK): CSSProperties => ({
  display: 'inline-block', background: bg, color, border: `2px solid ${INK}`,
  fontFamily: OSW, fontWeight: 600, fontSize: 13, letterSpacing: '2px',
  textTransform: 'uppercase', padding: '4px 12px',
})

/** Tarjeta canónica: borde 3px + sombra dura + radio 0. */
export const card = (bg: string = BLANCO): CSSProperties => ({
  background: bg, border: BORDER_CARD, boxShadow: SHADOW, borderRadius: 0,
})

/* ── Formato de cifras es-ES ─────────────────────── */
const fx = (n: number, dec: number): string => {
  const parts = Math.abs(n).toFixed(dec).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return parts.join(',')
}
const sg = (n: number, signed = false): string => (n < 0 ? '−' : signed && n > 0 ? '+' : '')
const ok = (n: number | null | undefined): n is number => n != null && !isNaN(Number(n))

/** Importe hero CON €: "1.234 €" (€ solo en hero) */
export const EUR = (n?: number | null) => (ok(n) ? `${sg(n)}${fx(n, 0)} €` : '—')
/** Importe SIN € (contexto ya monetario): "1.234" */
export const E = (n?: number | null) => (ok(n) ? `${sg(n)}${fx(n, 0)}` : '—')
/** Importe SIN €, 2 decimales: "1.234,56" */
export const E2 = (n?: number | null) => (ok(n) ? `${sg(n)}${fx(n, 2)}` : '—')
/** Importe CON signo y €: "+1.234,56 €" */
export const ES = (n?: number | null) => (ok(n) ? `${sg(n, true)}${fx(n, 2)} €` : '—')
/** Conteo entero con miles: "1.234" */
export const N = (n?: number | null) => (ok(n) ? `${sg(n)}${fx(n, 0)}` : '—')
/** Porcentaje entero: "12%" */
export const P0 = (n?: number | null) => (ok(n) ? `${sg(n)}${fx(n, 0)}%` : '—')
/** Porcentaje 2 decimales: "12,34%" */
export const P2 = (n?: number | null) => (ok(n) ? `${sg(n)}${fx(n, 2)}%` : '—')
/** Variación con signo: null→"—", si no "+5,4%" / "−3,2%" */
export const DELTA = (v?: number | null) => (ok(v) ? `${sg(v, true)}${fx(v, 1)}%` : '—')
