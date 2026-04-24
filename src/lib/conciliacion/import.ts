import * as XLSX from 'xlsx'

export interface MovimientoImportado {
  fecha: string
  fecha_valor: string | null
  concepto: string
  concepto_normalizado: string
  importe: number
  saldo: number | null
  banco: string
  hash_unico: string
}

export interface ImportResumen {
  leidos: number
  nuevos: number
  duplicados: number
  errores: number
}

const BANCO_DEFAULT = 'BBVA'

export function normalizarConcepto(raw: string): string {
  return (raw ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function parseFechaISO(raw: unknown): string {
  if (raw == null) return ''
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const y = raw.getFullYear()
    const m = String(raw.getMonth() + 1).padStart(2, '0')
    const d = String(raw.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const s = String(raw).trim()
  if (!s) return ''
  let m = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(s)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  m = /^(\d{2})[/-](\d{2})[/-](\d{2})$/.exec(s)
  if (m) return `20${m[3]}-${m[2]}-${m[1]}`
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return ''
}

function parseNumero(raw: unknown): number {
  if (typeof raw === 'number') return raw
  if (raw == null) return NaN
  let s = String(raw).trim().replace(/€/g, '').replace(/EUR/gi, '').trim()
  if (!s) return NaN
  if (/^\(.*\)$/.test(s)) s = '-' + s.slice(1, -1).trim()
  if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(s) || /^-?\d+,\d+$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.')
  }
  const n = parseFloat(s)
  return isNaN(n) ? NaN : n
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function armarMovimiento(fecha: string, fechaValor: string | null, concepto: string, importe: number, saldo: number | null): Promise<MovimientoImportado> {
  const normalizado = normalizarConcepto(concepto)
  const hash = await sha256Hex(`${fecha}|${concepto}|${importe.toFixed(2)}`)
  return {
    fecha,
    fecha_valor: fechaValor || null,
    concepto: concepto.trim() || '(sin concepto)',
    concepto_normalizado: normalizado,
    importe,
    saldo,
    banco: BANCO_DEFAULT,
    hash_unico: hash,
  }
}

async function parseFilas(filas: { fecha: string; fechaValor: string | null; concepto: string; importe: number; saldo: number | null }[]): Promise<MovimientoImportado[]> {
  const out: MovimientoImportado[] = []
  for (const r of filas) {
    if (!r.fecha || !r.concepto || isNaN(r.importe)) continue
    out.push(await armarMovimiento(r.fecha, r.fechaValor, r.concepto, r.importe, r.saldo))
  }
  return out
}

function findHeaderIdx(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const cells = (rows[i] || []).map(c => String(c ?? '').trim().toLowerCase())
    const tieneFecha    = cells.some(c => c === 'fecha' || c === 'f.valor' || c === 'f. valor')
    const tieneConcepto = cells.some(c => c === 'concepto' || c.includes('concepto') || c.includes('descrip'))
    const tieneImporte  = cells.some(c => c === 'importe' || c.includes('importe') || c.includes('amount'))
    if (tieneFecha && tieneConcepto && tieneImporte) return i
  }
  return -1
}

function splitCSVLine(line: string): string[] {
  const sepCount = (s: string) => (line.match(new RegExp(s === '|' ? '\\|' : s, 'g')) || []).length
  const sep = [';', '\t', ',', '|'].reduce((best, cur) => sepCount(cur) > sepCount(best) ? cur : best, ';')
  return line.split(sep).map(c => c.replace(/^"|"$/g, '').trim())
}

export async function parseCSV(text: string): Promise<MovimientoImportado[]> {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length < 2) return []
  const asMatrix: string[][] = lines.map(splitCSVLine)
  const headerIdx = findHeaderIdx(asMatrix)
  if (headerIdx === -1) return []
  const header = asMatrix[headerIdx].map(c => c.toLowerCase())
  const find = (...names: string[]) => header.findIndex(h => names.some(n => h === n || h.includes(n)))
  const idxFecha    = find('fecha')
  const idxFvalor   = find('f.valor', 'f. valor', 'fecha valor')
  const idxConcepto = find('concepto', 'descripcion', 'descripción')
  const idxImporte  = find('importe', 'amount')
  const idxSaldo    = find('saldo', 'disponible')

  const filas = asMatrix.slice(headerIdx + 1).map(row => {
    const fecha = parseFechaISO(idxFecha >= 0 ? row[idxFecha] : '')
    const fechaValor = idxFvalor >= 0 ? parseFechaISO(row[idxFvalor]) : ''
    const concepto = idxConcepto >= 0 ? row[idxConcepto] ?? '' : ''
    const importe = idxImporte >= 0 ? parseNumero(row[idxImporte]) : NaN
    const saldoN = idxSaldo >= 0 ? parseNumero(row[idxSaldo]) : NaN
    return {
      fecha,
      fechaValor: fechaValor || null,
      concepto,
      importe,
      saldo: isNaN(saldoN) ? null : saldoN,
    }
  })
  return parseFilas(filas)
}

export async function parseXLSX(buffer: ArrayBuffer): Promise<MovimientoImportado[]> {
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) return []
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false })
  const headerIdx = findHeaderIdx(rows)
  if (headerIdx === -1) return []
  const header = (rows[headerIdx] || []).map(c => String(c ?? '').trim().toLowerCase())
  const find = (...names: string[]) => header.findIndex(h => names.some(n => h === n || h.includes(n)))
  const idxFecha    = find('fecha')
  const idxFvalor   = find('f.valor', 'f. valor', 'fecha valor')
  const idxConcepto = find('concepto', 'descripcion', 'descripción')
  const idxMovim    = find('movimiento')
  const idxImporte  = find('importe', 'amount')
  const idxSaldo    = find('saldo', 'disponible')

  const filas: { fecha: string; fechaValor: string | null; concepto: string; importe: number; saldo: number | null }[] = []
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] || []
    const fecha = parseFechaISO(row[idxFecha])
    const fechaValor = idxFvalor >= 0 ? parseFechaISO(row[idxFvalor]) : ''
    const concepto = String(
      (idxConcepto >= 0 && row[idxConcepto] != null && row[idxConcepto] !== '' ? row[idxConcepto] :
       idxMovim >= 0 ? row[idxMovim] : '') ?? ''
    )
    const importe = idxImporte >= 0 ? parseNumero(row[idxImporte]) : NaN
    const saldoN = idxSaldo >= 0 ? parseNumero(row[idxSaldo]) : NaN
    filas.push({
      fecha,
      fechaValor: fechaValor || null,
      concepto,
      importe,
      saldo: isNaN(saldoN) ? null : saldoN,
    })
  }
  return parseFilas(filas)
}

export async function parseArchivo(file: File): Promise<MovimientoImportado[]> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return parseXLSX(await file.arrayBuffer())
  }
  return parseCSV(await file.text())
}
