// Utilidades de conexión bancaria (Enable Banking): caducidad por banco.
export interface Sesion {
  id: number
  banco: string
  estado: string
  valida_hasta: string | null
  created_at: string
}

export function diasHasta(fecha: string | null | undefined, hoy: Date = new Date()): number | null {
  if (!fecha) return null
  return Math.floor((new Date(fecha).getTime() - hoy.getTime()) / 86400000)
}

/* La sesión que manda por banco: la autorizada más reciente; si no hay, la más reciente. */
export function sesionPorBanco(sesiones: Sesion[]): Map<string, Sesion> {
  const m = new Map<string, Sesion>()
  for (const s of [...sesiones].sort((a, b) => b.id - a.id)) {
    const actual = m.get(s.banco)
    if (!actual || (actual.estado !== 'autorizada' && s.estado === 'autorizada')) m.set(s.banco, s)
  }
  return m
}
