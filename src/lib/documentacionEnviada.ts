import { supabase } from '@/lib/supabase'

/* Documentación de Cade: marcar un mes como "ya enviada" para que dejen de salir avisos
   (pantalla Hoy, Facturación y correo diario). Se guarda por mes de Cade (primer día del mes). */

export async function marcarDocumentacionEnviada(mes: string): Promise<string | null> {
  const { error } = await supabase
    .from('documentacion_enviada')
    .upsert([{ mes, marcada_por: 'ERP' }], { onConflict: 'mes' })
  return error ? error.message : null
}

export async function desmarcarDocumentacionEnviada(mes: string): Promise<string | null> {
  const { error } = await supabase.from('documentacion_enviada').delete().eq('mes', mes)
  return error ? error.message : null
}
