// Cobros: días que lleva una factura sin cobrar.
export function diasDesde(fecha: string | null | undefined, hoy: Date = new Date()): number | null {
  if (!fecha) return null
  const f = new Date(fecha + 'T00:00:00')
  const h = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  return Math.max(0, Math.round((h.getTime() - f.getTime()) / 86400000))
}
