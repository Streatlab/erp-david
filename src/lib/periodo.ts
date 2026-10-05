// Periodos Semana / Mes (lunes a domingo). Presupuestos en €/mes se pasan a semana × 12 ÷ 52.

export function lunesDe(fecha: Date): Date {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
  const dia = (d.getDay() + 6) % 7 // lunes = 0
  d.setDate(d.getDate() - dia)
  return d
}

export function rangoSemana(fecha: Date, desplazamiento = 0): { inicio: Date; fin: Date } {
  const inicio = lunesDe(fecha)
  inicio.setDate(inicio.getDate() + desplazamiento * 7)
  const fin = new Date(inicio)
  fin.setDate(fin.getDate() + 6)
  fin.setHours(23, 59, 59, 999)
  return { inicio, fin }
}

export function rangoMes(fecha: Date, desplazamiento = 0): { inicio: Date; fin: Date } {
  const inicio = new Date(fecha.getFullYear(), fecha.getMonth() + desplazamiento, 1)
  const fin = new Date(fecha.getFullYear(), fecha.getMonth() + desplazamiento + 1, 0, 23, 59, 59, 999)
  return { inicio, fin }
}

export const mensualASemanal = (euros: number) => (euros * 12) / 52

/* yyyy-mm-dd local, sin desfases de zona horaria */
export function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function etiquetaSemana(inicio: Date): string {
  const fin = new Date(inicio); fin.setDate(fin.getDate() + 6)
  const f = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  return `SEMANA ${f(inicio)} — ${f(fin)}`.toUpperCase()
}
