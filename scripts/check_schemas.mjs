import { createClient } from '@supabase/supabase-js'
const url = 'https://idclhnxttdbwayxeowrm.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkY2xobnh0dGRid2F5eGVvd3JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MzcwNjMsImV4cCI6MjA5MjQxMzA2M30.RRqke6crTJIhcUrWO0kjShJYLLzuMHnkz1MC-9sv8qc'
const sb = createClient(url, key)

const counts = {}
for (const t of ['movimientos_banco', 'conciliacion']) {
  const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true })
  counts[t] = error ? `ERR: ${error.message}` : count
}
console.log('counts:', counts)

// rangos fechas + ejemplos
for (const t of ['movimientos_banco', 'conciliacion']) {
  const { data: minMax } = await sb.from(t).select('fecha').order('fecha', { ascending: true }).limit(1)
  const { data: maxMax } = await sb.from(t).select('fecha').order('fecha', { ascending: false }).limit(1)
  console.log(`\n${t} fecha_min=${minMax?.[0]?.fecha ?? '—'} fecha_max=${maxMax?.[0]?.fecha ?? '—'}`)
  const { data: muestra } = await sb.from(t).select('fecha, concepto, importe').order('fecha', { ascending: false }).limit(3)
  for (const r of muestra ?? []) console.log(`   ${r.fecha} | ${String(r.concepto).slice(0, 60)} | ${r.importe}`)
}

// ¿solapan? compara claves naturales
const { data: a } = await sb.from('movimientos_banco').select('fecha, importe, concepto').limit(2000)
const { data: b } = await sb.from('conciliacion').select('fecha, importe, concepto').limit(2000)
const norm = (r) => `${r.fecha}|${Number(r.importe).toFixed(2)}|${String(r.concepto || '').toUpperCase().slice(0, 40)}`
const setA = new Set((a ?? []).map(norm))
const setB = new Set((b ?? []).map(norm))
let inter = 0
for (const k of setA) if (setB.has(k)) inter++
console.log(`\nintersección (fecha+importe+concepto-prefix): ${inter} / A=${setA.size} B=${setB.size}`)
