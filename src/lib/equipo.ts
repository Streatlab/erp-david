// Equipo: código Cade y emisor vigente de cada repartidor según la fecha (emisores_transportistas).
export interface EmisorFila {
  transportista: string
  emisor: string
  repartidor: string | null
  vigente_desde: string
  vigente_hasta: string | null
}

/* Igual que la función SQL emisor_de(transportista, fecha) */
export function emisorEn(filas: EmisorFila[], codigo: string, fecha: string): EmisorFila | null {
  return filas
    .filter(f => f.transportista === codigo && f.vigente_desde <= fecha && (!f.vigente_hasta || f.vigente_hasta >= fecha))
    .sort((a, b) => b.vigente_desde.localeCompare(a.vigente_desde))[0] ?? null
}

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase()

/* Código(s) Cade de una persona, por nombre de repartidor */
export function codigosDe(filas: EmisorFila[], alias: string, fecha: string): EmisorFila[] {
  const codigos = [...new Set(filas.map(f => f.transportista))]
  return codigos.map(c => emisorEn(filas, c, fecha)).filter((f): f is EmisorFila => !!f && norm(f.repartidor) === norm(alias))
}

/* Quién factura qué en una fecha: { emisor → filas } */
export function facturacionPorEmisor(filas: EmisorFila[], fecha: string): Record<string, EmisorFila[]> {
  const out: Record<string, EmisorFila[]> = {}
  for (const c of [...new Set(filas.map(f => f.transportista))]) {
    const f = emisorEn(filas, c, fecha)
    if (f) (out[f.emisor] = out[f.emisor] ?? []).push(f)
  }
  return out
}
