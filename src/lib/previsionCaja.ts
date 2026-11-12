/* Previsión de caja a 30/60 días. Reglas puras, probadas.
   Entra: saldo real del banco, cobros esperados con fecha, movimientos de los últimos meses (para sacar
   los gastos que se repiten y el día en que suelen pagarse). Sale: saldo día a día y el punto más bajo. */

export interface MovHist { fecha: string; importe: number; categoria: string | null }
export interface GastoRecurrente { categoria: string; mediaMes: number; diaTipico: number; meses: number }
export interface CobroPrevisto { fecha: string; importe: number; concepto: string }
export interface MovPrevisto { fecha: string; importe: number; concepto: string; tipo: 'cobro' | 'gasto' }
export interface PuntoCaja { fecha: string; saldo: number }

const r2 = (n: number) => Math.round(n * 100) / 100
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDias = (isoDia: string, n: number) => { const d = new Date(isoDia + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d) }
const diasMes = (y: number, m: number) => new Date(y, m, 0).getDate()

/* Gastos que se repiten cada mes: media mensual y día típico (mediana del día de pago) por categoría de actividad.
   Solo categorías presentes en al menos `minMeses` meses distintos, para no proyectar gastos puntuales. */
export function gastosRecurrentes(movs: MovHist[], categoriasActividad: Set<string>, excluir: Set<string> = new Set(['devolucion-bi-prior']), minMeses = 2): GastoRecurrente[] {
  const porCat = new Map<string, { porMes: Map<string, number>; dias: number[] }>()
  for (const m of movs) {
    const cat = m.categoria ?? ''
    if (!cat || Number(m.importe) >= 0 || !categoriasActividad.has(cat) || excluir.has(cat)) continue
    const mes = m.fecha.slice(0, 7)
    const e = porCat.get(cat) ?? { porMes: new Map<string, number>(), dias: [] }
    e.porMes.set(mes, (e.porMes.get(mes) ?? 0) + Math.abs(Number(m.importe)))
    e.dias.push(Number(m.fecha.slice(8, 10)))
    porCat.set(cat, e)
  }
  const mesesTotales = new Set(movs.map(m => m.fecha.slice(0, 7))).size || 1
  const out: GastoRecurrente[] = []
  for (const [categoria, e] of porCat) {
    if (e.porMes.size < minMeses) continue
    const total = [...e.porMes.values()].reduce((s, v) => s + v, 0)
    const dias = e.dias.slice().sort((a, b) => a - b)
    const diaTipico = dias[Math.floor(dias.length / 2)]
    out.push({ categoria, mediaMes: r2(total / mesesTotales), diaTipico, meses: e.porMes.size })
  }
  return out.sort((a, b) => b.mediaMes - a.mediaMes)
}

/* Gastos recurrentes colocados en el calendario de los próximos `dias` días. Si en el mes en curso ya hay un
   movimiento de esa categoría, no se vuelve a proyectar para ese mes (ya está pagado). */
export function proyectarGastos(rec: GastoRecurrente[], desdeIso: string, dias: number, yaPagadosMesActual: Set<string>, nombres: Map<string, string> = new Map()): MovPrevisto[] {
  const out: MovPrevisto[] = []
  const hastaIso = addDias(desdeIso, dias)
  const mesActual = desdeIso.slice(0, 7)
  for (const g of rec) {
    for (let k = 0; k < 4; k++) {
      const base = new Date(desdeIso + 'T00:00:00')
      const y = base.getFullYear(), m = base.getMonth() + 1 + k
      const yy = y + Math.floor((m - 1) / 12), mm = ((m - 1) % 12) + 1
      const dia = Math.min(g.diaTipico, diasMes(yy, mm))
      const f = `${yy}-${String(mm).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
      if (f.slice(0, 7) === mesActual && yaPagadosMesActual.has(g.categoria)) continue
      if (f < desdeIso) continue
      if (f > hastaIso) break
      out.push({ fecha: f, importe: -g.mediaMes, concepto: nombres.get(g.categoria) ?? g.categoria, tipo: 'gasto' })
    }
  }
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha))
}

/* Saldo día a día desde hoy: saldo inicial + cobros previstos − gastos proyectados */
export function proyectarCaja(saldoInicial: number, movimientos: MovPrevisto[], desdeIso: string, dias: number): { serie: PuntoCaja[]; minimo: PuntoCaja; final: number } {
  const porDia = new Map<string, number>()
  for (const m of movimientos) porDia.set(m.fecha, (porDia.get(m.fecha) ?? 0) + Number(m.importe))
  const serie: PuntoCaja[] = []
  let saldo = saldoInicial
  let minimo: PuntoCaja = { fecha: desdeIso, saldo: saldoInicial }
  for (let i = 0; i <= dias; i++) {
    const f = addDias(desdeIso, i)
    saldo = r2(saldo + (porDia.get(f) ?? 0))
    serie.push({ fecha: f, saldo })
    if (saldo < minimo.saldo) minimo = { fecha: f, saldo }
  }
  return { serie, minimo, final: saldo }
}

/* Semáforo: rojo si la caja baja de cero; ámbar si el mínimo no cubre medio mes de gastos; verde si sí */
export function semaforoCaja(minimo: number, gastoMensual: number): 'bien' | 'justo' | 'mal' {
  if (minimo < 0) return 'mal'
  if (minimo < gastoMensual / 2) return 'justo'
  return 'bien'
}
