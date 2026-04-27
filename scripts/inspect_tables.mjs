import { createClient } from '@supabase/supabase-js'
const url = 'https://idclhnxttdbwayxeowrm.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkY2xobnh0dGRid2F5eGVvd3JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MzcwNjMsImV4cCI6MjA5MjQxMzA2M30.RRqke6crTJIhcUrWO0kjShJYLLzuMHnkz1MC-9sv8qc'
const supabase = createClient(url, key)

const tablas = ['movimientos_banco','categorias','subcategorias','reglas_aprendidas','furgonetas','furgonetas_mantenimientos','presupuestos_mensuales','objetivos_facturacion','objetivos_diarios','cuentas_bancarias','conciliacion','gastos','categorias_contables_ingresos','categorias_contables_gastos','provisiones','configuracion']
for (const t of tablas) {
  const r = await supabase.from(t).select('*').limit(1)
  if (r.error) {
    console.log(`✗ ${t}: ${r.error.message}`)
  } else {
    const cols = r.data?.[0] ? Object.keys(r.data[0]).join(',') : '(empty)'
    console.log(`✓ ${t}: ${cols}`)
  }
}
