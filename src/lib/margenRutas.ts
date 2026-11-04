/* Rutas y margen: reglas puras sobre los datos reales de las liquidaciones de Cade.
   Entrada: días por repartidor (vista v_dia_repartidor), entregas (liquidaciones_cade_entregas)
   y el P&G mensual (v_pyg_mensual). Nada de aquí inventa un dato: cuando falta, devuelve null. */

export interface DiaRep {
  fecha: string; transportista: string; repartidor: string | null; entregas: number
  por_pedidos: number; compensacion_minimo: number; recorte_tope: number; cargo_cade: number; pagado: number
}
export interface EntregaRow { fecha: string; transportista: string | null; cliente: string | null; destino: string | null; kilos: number | null; importe_base: number | null; importe: number | null }
export interface PygFila { mes: string; ambito: string; signo: string; importe: number; grupo?: string | null; categoria?: string | null }

export interface RepResumen {
  transportista: string; repartidor: string; dias: number; entregas: number; entregasDia: number
  pagado: number; porPedidos: number; garantia: number; recorteTope: number; cargos: number
  eurPorEntrega: number | null; pctGarantia: number
}
export interface RutaResumen {
  ruta: string; n: number; kilos: number; base: number; dias: number; entregasDia: number
  precioMedio: number | null; codigos: string[]
}

const r2 = (n: number) => Math.round(n * 100) / 100
const num = (v: unknown) => Number(v ?? 0) || 0

/* Nombre de ruta: destino de Cade sin la cola numérica tipo "5,00" que Cade añade a algunos puntos */
export function normalizaDestino(destino: string | null | undefined): string {
  const d = (destino ?? '').trim().replace(/\s+/g, ' ')
  if (!d) return '(sin destino)'
  return d.replace(/\s\d+,\d{2}$/, '').trim()
}

export function resumenRepartidores(dias: DiaRep[]): RepResumen[] {
  const m = new Map<string, RepResumen>()
  for (const d of dias) {
    const k = d.transportista
    const r = m.get(k) ?? { transportista: k, repartidor: d.repartidor ?? k, dias: 0, entregas: 0, entregasDia: 0, pagado: 0, porPedidos: 0, garantia: 0, recorteTope: 0, cargos: 0, eurPorEntrega: null, pctGarantia: 0 }
    r.dias += 1
    r.entregas += num(d.entregas)
    r.pagado = r2(r.pagado + num(d.pagado))
    r.porPedidos = r2(r.porPedidos + num(d.por_pedidos))
    r.garantia = r2(r.garantia + num(d.compensacion_minimo))
    r.recorteTope = r2(r.recorteTope + Math.abs(num(d.recorte_tope)))
    r.cargos = r2(r.cargos + Math.abs(num(d.cargo_cade)))
    m.set(k, r)
  }
  for (const r of m.values()) {
    r.entregasDia = r.dias ? r2(r.entregas / r.dias) : 0
    r.eurPorEntrega = r.entregas ? r2(r.pagado / r.entregas) : null
    r.pctGarantia = r.pagado > 0 ? r.garantia / r.pagado : 0
  }
  return [...m.values()].sort((a, b) => b.pagado - a.pagado)
}

export function resumenRutas(entregas: EntregaRow[]): RutaResumen[] {
  const m = new Map<string, RutaResumen & { fechas: Set<string>; cods: Set<string> }>()
  for (const e of entregas) {
    const ruta = normalizaDestino(e.destino)
    const r = m.get(ruta) ?? { ruta, n: 0, kilos: 0, base: 0, dias: 0, entregasDia: 0, precioMedio: null, codigos: [], fechas: new Set<string>(), cods: new Set<string>() }
    r.n += 1
    r.kilos = r2(r.kilos + num(e.kilos))
    r.base = r2(r.base + num(e.importe_base))
    r.fechas.add(e.fecha)
    if (e.transportista) r.cods.add(e.transportista)
    m.set(ruta, r)
  }
  return [...m.values()].map(r => ({
    ruta: r.ruta, n: r.n, kilos: r.kilos, base: r.base, dias: r.fechas.size,
    entregasDia: r.fechas.size ? r2(r.n / r.fechas.size) : 0,
    precioMedio: r.n ? r2(r.base / r.n) : null, codigos: [...r.cods].sort(),
  })).sort((a, b) => b.n - a.n)
}

/* Días de un mes que caen dentro del periodo [desde, hasta] (ambos ISO yyyy-mm-dd) */
export function fraccionMesEnPeriodo(mesIso: string, desdeIso: string, hastaIso: string): number {
  const y = Number(mesIso.slice(0, 4)), mo = Number(mesIso.slice(5, 7))
  const diasMes = new Date(y, mo, 0).getDate()
  const ini = `${mesIso.slice(0, 7)}-01`, fin = `${mesIso.slice(0, 7)}-${String(diasMes).padStart(2, '0')}`
  const a = desdeIso > ini ? desdeIso : ini
  const b = hastaIso < fin ? hastaIso : fin
  if (b < a) return 0
  const dias = Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 864e5) + 1
  return dias / diasMes
}

/* Coste de la actividad en el periodo: gastos de ámbito 'actividad' del P&G, prorrateados por los días del mes
   que caen dentro del periodo. Excluye 'devolucion-bi-prior' (es dinero de Prior que pasa por caja, no coste). */
export function costeActividad(pyg: PygFila[], desdeIso: string, hastaIso: string): { total: number; porGrupo: { grupo: string; importe: number }[] } {
  const porGrupo = new Map<string, number>()
  let total = 0
  for (const f of pyg) {
    if (f.ambito !== 'actividad' || f.signo !== 'gasto' || f.categoria === 'devolucion-bi-prior') continue
    const frac = fraccionMesEnPeriodo(String(f.mes).slice(0, 10), desdeIso, hastaIso)
    if (frac <= 0) continue
    const imp = Math.abs(num(f.importe)) * frac
    total += imp
    const g = f.grupo ?? 'Otros'
    porGrupo.set(g, (porGrupo.get(g) ?? 0) + imp)
  }
  return { total: r2(total), porGrupo: [...porGrupo.entries()].map(([grupo, importe]) => ({ grupo, importe: r2(importe) })).sort((a, b) => b.importe - a.importe) }
}

/* Precio mínimo por entrega: lo que tiene que pagar Cade por entrega para cubrir el coste de un día de repartidor
   al ritmo real de entregas por día. */
export function precioMinimoEntrega(costeDia: number, entregasDia: number): number | null {
  if (!entregasDia || entregasDia <= 0) return null
  return r2(costeDia / entregasDia)
}

/* Ingreso de un día según las reglas de Cade: por entregas, con suelo (garantía) y techo (tope) iguales a la garantía
   cuando el tope está activo. cargos = media de cargos por día. */
export function ingresoDia(entregasDia: number, precio: number, garantia: number | null, conTope: boolean, cargosDia = 0): number {
  let v = entregasDia * precio
  if (garantia != null) {
    if (v < garantia) v = garantia
    if (conTope && v > garantia) v = garantia
  }
  return r2(v - cargosDia)
}

export function deltaPct(actual: number, anterior: number): number | null {
  if (!anterior) return null
  return r2(((actual - anterior) / Math.abs(anterior)) * 100)
}
