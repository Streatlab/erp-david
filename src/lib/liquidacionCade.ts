/* Reglas de dinero de las liquidaciones de Cade, en una sola pieza probada.
   El robot lector (liquidacion-parser) rellena liquidaciones_cade, _lineas, _entregas e _incidencias;
   aquí viven las reglas que cualquier pantalla puede volver a aplicar sobre esos datos:
   cuadre, alertas, penalizaciones, referencias repetidas, texto de reclamación y quién factura cada código. */

export interface LineaDia {
  fecha: string
  entregas: number
  importe_entregas: number      // ya neto de penalizaciones del día
  garantia_aplicada: number     // complemento hasta la garantía diaria
  penalizacion: number          // positivo: importe que Cade ha restado ese día
  penalizacion_motivo: string | null
  extra: number
  total_linea: number           // importe_entregas + garantia_aplicada + extra
}

export interface EntregaRef { fecha: string; ref_cliente: string | null }

export interface EmisorVigencia { transportista: string; emisor: string; vigente_desde: string | null; vigente_hasta: string | null }

export interface IncidenciaTexto { fecha: string | null; transportista: string | null; codigo: string; importe: number }

export const TOLERANCIA_CUADRE = 0.01
export const UMBRAL_GARANTIA = 0.7

const r2 = (n: number) => Math.round(n * 100) / 100

/* Suma de los días contra el total del PDF. Si no cuadra, no se factura. */
export function cuadrar(lineas: LineaDia[], totalPdf: number | null | undefined) {
  const sumaLineas = r2(lineas.reduce((s, l) => s + Number(l.total_linea ?? 0), 0))
  const total = totalPdf == null ? null : r2(Number(totalPdf))
  const diferencia = total == null ? 0 : r2(sumaLineas - total)
  return { sumaLineas, totalPdf: total, diferencia, cuadra: total != null && Math.abs(diferencia) <= TOLERANCIA_CUADRE }
}

/* Días en los que la garantía supone más del 70 % de lo cobrado: poca carga de trabajo ese día. */
export function diasConGarantiaAlta(lineas: LineaDia[], umbral = UMBRAL_GARANTIA): LineaDia[] {
  return lineas.filter(l => Number(l.total_linea) > 0 && Number(l.garantia_aplicada) / Number(l.total_linea) > umbral)
}

/* Porcentaje del total que es garantía (complemento), no entregas. */
export function pctGarantia(lineas: LineaDia[]): number {
  const total = lineas.reduce((s, l) => s + Number(l.total_linea ?? 0), 0)
  if (total <= 0) return 0
  return lineas.reduce((s, l) => s + Number(l.garantia_aplicada ?? 0), 0) / total
}

/* Cargos negativos aplicados por Cade (SPC, material, inventario…), con signo negativo como en incidencias. */
export function penalizaciones(lineas: LineaDia[]): { fecha: string; importe: number; motivo: string }[] {
  return lineas
    .filter(l => Number(l.penalizacion ?? 0) > 0)
    .map(l => ({ fecha: l.fecha, importe: -r2(Number(l.penalizacion)), motivo: (l.penalizacion_motivo ?? '').trim() || 'CARGO' }))
}

/* Misma referencia de cliente repetida el mismo día: posible entrega contada dos veces (o pagada una sola vez). */
export function referenciasRepetidas(entregas: EntregaRef[]): { fecha: string; ref: string; n: number }[] {
  const m = new Map<string, number>()
  for (const e of entregas) {
    const ref = (e.ref_cliente ?? '').trim()
    if (!ref) continue
    const k = `${e.fecha}|${ref}`
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m.entries()].filter(([, n]) => n > 1).map(([k, n]) => ({ fecha: k.split('|')[0], ref: k.split('|')[1], n })).sort((a, b) => a.fecha.localeCompare(b.fecha))
}

/* Textos de alerta en el mismo formato que escribe el robot lector, para que pantalla y robot digan lo mismo. */
export function alertasLiquidacion(lineas: LineaDia[], entregas: EntregaRef[], totalPdf: number | null | undefined): string[] {
  const out: string[] = []
  const c = cuadrar(lineas, totalPdf)
  if (c.totalPdf != null && !c.cuadra) out.push(`No cuadra: los días suman ${c.sumaLineas.toFixed(2)} y el PDF dice ${c.totalPdf.toFixed(2)} (diferencia ${c.diferencia.toFixed(2)})`)
  const rep = referenciasRepetidas(entregas)
  if (rep.length) out.push(`${rep.length} referencia(s) repetida(s) el mismo día: ${rep.map(x => x.ref).join(', ')}`)
  const alta = diasConGarantiaAlta(lineas)
  if (alta.length) out.push(`${alta.length} día(s) con más del ${Math.round(UMBRAL_GARANTIA * 100)}% de garantía (poca carga de trabajo)`)
  return out
}

/* Quién factura un código de transportista en una fecha (misma regla que la función emisor_de de la base). */
export function emisorDe(emisores: EmisorVigencia[], transportista: string, fecha: string): string | null {
  const vig = emisores
    .filter(e => e.transportista === transportista && (!e.vigente_desde || e.vigente_desde <= fecha) && (!e.vigente_hasta || e.vigente_hasta >= fecha))
    .sort((a, b) => (b.vigente_desde ?? '').localeCompare(a.vigente_desde ?? ''))
  return vig[0]?.emisor ?? null
}

const eur = (n: number) => Math.abs(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
const fecha = (f: string | null) => {
  if (!f) return '—'
  const d = new Date(f.slice(0, 10) + 'T00:00:00')
  return isNaN(d.getTime()) ? f : d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/* Correo de reclamación a Cade: una línea por cargo, total, y firma del emisor que factura esos códigos. */
export function textoReclamacion(items: IncidenciaTexto[], firma?: string): string {
  const lineas = items
    .slice()
    .sort((a, b) => (a.fecha ?? '').localeCompare(b.fecha ?? ''))
    .map(i => `- ${fecha(i.fecha)} · transportista ${i.transportista ?? '—'} · ${i.codigo} · ${eur(i.importe)}`)
  const total = items.reduce((s, i) => s + Math.abs(Number(i.importe)), 0)
  return `Buenos días,\n\nRevisando las liquidaciones vemos los siguientes cargos que no son habituales y que solicitamos revisar:\n\n${lineas.join('\n')}\n\nTotal: ${eur(total)}\n\nQuedamos a la espera de su respuesta.\n\nUn saludo${firma ? `,\n${firma}` : ''}`
}

export function asuntoReclamacion(nombreEmisor: string, transportistas: string[]): string {
  return `Revisión de cargos en liquidaciones — ${nombreEmisor} — transportista${transportistas.length > 1 ? 's' : ''} ${transportistas.join(', ')}`
}
