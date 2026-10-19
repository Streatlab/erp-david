/**
 * periodoGlobal.tsx — Periodo único para todo el ERP David.
 * El selector vive en la barra superior (Layout). Cada pantalla que filtra por fechas llama a usePeriodo():
 * al montarse, el selector aparece solo; al salir, desaparece. Así nunca hay un selector que no haga nada.
 * Las claves son las mismas que ya usaban Running y Conciliación (semana, mes, trimestre, anio_AAAA…).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isoLocal, rangoSemana } from '@/lib/periodo'

export type PeriodoKey =
  | 'semana' | 'semana_anterior' | 'mes' | 'mes_anterior' | '30d' | 'trimestre' | 'personalizado' | `anio_${number}`

export interface RangoFechas { inicio: Date; fin: Date }

const CLAVE_GUARDADA = 'david.periodo.v1'
const fmtCorta = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

export function rangoDe(key: PeriodoKey, customDesde?: string, customHasta?: string, ahora = new Date()): RangoFechas {
  const y = ahora.getFullYear(), m = ahora.getMonth()
  const finDia = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }
  const iniDia = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
  if (key === 'semana') { const r = rangoSemana(ahora, 0); return { inicio: iniDia(r.inicio), fin: r.fin } }
  if (key === 'semana_anterior') { const r = rangoSemana(ahora, -1); return { inicio: iniDia(r.inicio), fin: r.fin } }
  if (key === 'mes_anterior') return { inicio: new Date(y, m - 1, 1), fin: finDia(new Date(y, m, 0)) }
  if (key === '30d') { const i = new Date(ahora); i.setDate(i.getDate() - 29); return { inicio: iniDia(i), fin: finDia(ahora) } }
  if (key === 'trimestre') { const i = new Date(ahora); i.setDate(i.getDate() - 89); return { inicio: iniDia(i), fin: finDia(ahora) } }
  if (typeof key === 'string' && key.startsWith('anio_')) {
    const a = Number(key.slice(5)); return { inicio: new Date(a, 0, 1), fin: finDia(new Date(a, 11, 31)) }
  }
  if (key === 'personalizado' && customDesde && customHasta) {
    return { inicio: new Date(customDesde + 'T00:00:00'), fin: new Date(customHasta + 'T23:59:59') }
  }
  return { inicio: new Date(y, m, 1), fin: finDia(new Date(y, m + 1, 0)) } // 'mes'
}

export function etiquetaPeriodo(key: PeriodoKey, r: RangoFechas): string {
  if (key === 'mes') return r.inicio.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  if (key === 'mes_anterior') return r.inicio.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  if (key === 'trimestre') return 'Últimos 3 meses'
  if (key === '30d') return 'Últimos 30 días'
  if (typeof key === 'string' && key.startsWith('anio_')) return `Año ${key.slice(5)}`
  return `${fmtCorta(r.inicio)} — ${fmtCorta(r.fin)} ${r.fin.getFullYear()}`
}

/* Meses (AAAA-MM) que toca el rango */
export function mesesDeRango(r: RangoFechas): string[] {
  const out: string[] = []
  const c = new Date(r.inicio.getFullYear(), r.inicio.getMonth(), 1)
  while (c <= r.fin) { out.push(`${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, '0')}`); c.setMonth(c.getMonth() + 1) }
  return out
}

/* Rango equivalente inmediatamente anterior, para comparar */
export function rangoAnteriorDe(r: RangoFechas): RangoFechas {
  const dur = r.fin.getTime() - r.inicio.getTime()
  const fin = new Date(r.inicio.getTime() - 86_400_000); fin.setHours(23, 59, 59, 999)
  const inicio = new Date(fin.getTime() - dur); inicio.setHours(0, 0, 0, 0)
  return { inicio, fin }
}

interface Estado { key: PeriodoKey; desde: string; hasta: string }
interface Ctx {
  key: PeriodoKey
  customDesde: string
  customHasta: string
  setKey: (k: PeriodoKey) => void
  setRango: (desde: string, hasta: string) => void
  /** nº de pantallas montadas que usan el periodo (el selector solo se ve si hay alguna) */
  consumidores: number
  registrar: (delta: number) => void
}

const PeriodoCtx = createContext<Ctx | null>(null)

function leerGuardado(): Estado {
  try {
    const raw = localStorage.getItem(CLAVE_GUARDADA)
    if (raw) {
      const p = JSON.parse(raw) as Estado
      if (typeof p.key === 'string') return { key: p.key, desde: p.desde ?? '', hasta: p.hasta ?? '' }
    }
  } catch { /* sin almacenamiento: seguimos con el valor por defecto */ }
  return { key: 'mes', desde: '', hasta: '' }
}

export function PeriodoProvider({ children }: { children: ReactNode }) {
  const [est, setEst] = useState<Estado>(leerGuardado)
  const [consumidores, setConsumidores] = useState(0)

  useEffect(() => {
    try { localStorage.setItem(CLAVE_GUARDADA, JSON.stringify(est)) } catch { /* ignorar */ }
  }, [est])

  const setKey = useCallback((k: PeriodoKey) => setEst(e => ({ ...e, key: k })), [])
  const setRango = useCallback((desde: string, hasta: string) => setEst(e => ({ ...e, desde, hasta })), [])
  const registrar = useCallback((delta: number) => setConsumidores(n => Math.max(0, n + delta)), [])

  const valor = useMemo<Ctx>(() => ({
    key: est.key, customDesde: est.desde, customHasta: est.hasta, setKey, setRango, consumidores, registrar,
  }), [est, setKey, setRango, consumidores, registrar])

  return <PeriodoCtx.Provider value={valor}>{children}</PeriodoCtx.Provider>
}

export function usePeriodoCtx(): Ctx {
  const c = useContext(PeriodoCtx)
  if (!c) throw new Error('usePeriodoCtx debe usarse dentro de PeriodoProvider')
  return c
}

/**
 * Hook para las pantallas. Devuelve el periodo elegido en la barra superior ya resuelto
 * (rango, rango anterior, etiqueta, meses, fechas ISO). Al usarlo, el selector aparece arriba.
 */
export function usePeriodo() {
  const { key, customDesde, customHasta, setKey, setRango, registrar } = usePeriodoCtx()
  useEffect(() => { registrar(1); return () => registrar(-1) }, [registrar])
  return useMemo(() => {
    const rango = rangoDe(key, customDesde, customHasta)
    const anterior = rangoAnteriorDe(rango)
    return {
      key, setKey, customDesde, customHasta, setRango,
      rango, anterior,
      etiqueta: etiquetaPeriodo(key, rango),
      meses: mesesDeRango(rango),
      desdeIso: isoLocal(rango.inicio),
      hastaIso: isoLocal(rango.fin),
      esSemana: key === 'semana' || key === 'semana_anterior',
    }
  }, [key, customDesde, customHasta, setKey, setRango])
}
