import { createClient } from '@supabase/supabase-js'
const url = 'https://idclhnxttdbwayxeowrm.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkY2xobnh0dGRid2F5eGVvd3JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MzcwNjMsImV4cCI6MjA5MjQxMzA2M30.RRqke6crTJIhcUrWO0kjShJYLLzuMHnkz1MC-9sv8qc'
const sb = createClient(url, key)

// Pull all rows
const { data: a } = await sb.from('movimientos_banco').select('fecha, importe').limit(2000)
const { data: b } = await sb.from('conciliacion').select('fecha, importe').limit(2000)
const key2 = (r) => `${r.fecha}|${Number(r.importe).toFixed(2)}`

// multiset por (fecha, importe)
const mapA = new Map(), mapB = new Map()
for (const r of a ?? []) mapA.set(key2(r), (mapA.get(key2(r)) ?? 0) + 1)
for (const r of b ?? []) mapB.set(key2(r), (mapB.get(key2(r)) ?? 0) + 1)
let solapadas = 0, soloA = 0, soloB = 0
for (const [k, n] of mapA) {
  const m = mapB.get(k) ?? 0
  solapadas += Math.min(n, m)
  if (n > m) soloA += (n - m)
}
for (const [k, n] of mapB) {
  const m = mapA.get(k) ?? 0
  if (n > m) soloB += (n - m)
}
console.log(`movimientos_banco filas: ${(a ?? []).length}`)
console.log(`conciliacion       filas: ${(b ?? []).length}`)
console.log(`pares (fecha,importe) que solapan: ${solapadas}`)
console.log(`solo en movimientos_banco:        ${soloA}`)
console.log(`solo en conciliacion:             ${soloB}`)

// Categorización: cuántos están categorizados en cada tabla?
const { count: mbSinCat } = await sb.from('movimientos_banco').select('*', { count: 'exact', head: true }).is('subcategoria_id', null)
const { count: mbConCat } = await sb.from('movimientos_banco').select('*', { count: 'exact', head: true }).not('subcategoria_id', 'is', null)
const { count: cSinCat } = await sb.from('conciliacion').select('*', { count: 'exact', head: true }).is('categoria', null)
const { count: cConCat } = await sb.from('conciliacion').select('*', { count: 'exact', head: true }).not('categoria', 'is', null)
console.log(`\ncategorización:`)
console.log(`  movimientos_banco: ${mbConCat} con categoría · ${mbSinCat} sin categoría`)
console.log(`  conciliacion:      ${cConCat} con categoría · ${cSinCat} sin categoría`)

// proveedor_id en conciliacion (David ya enriqueció)
const { count: cConProv } = await sb.from('conciliacion').select('*', { count: 'exact', head: true }).not('proveedor_id', 'is', null)
console.log(`  conciliacion con proveedor_id: ${cConProv}`)

// gasto_id en conciliacion (sincronizado a Running)
const { count: cConGasto } = await sb.from('conciliacion').select('*', { count: 'exact', head: true }).not('gasto_id', 'is', null)
console.log(`  conciliacion con gasto_id (sync Running): ${cConGasto}`)
