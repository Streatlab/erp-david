/* Reglas puras del ciclo de pago de Cade (sin dependencias de React ni de Supabase, para poder probarlas). */
export const CLAVE_TEXTO = 'cade_ciclo_pago_texto'
export const CLAVE_DIA = 'cade_dia_cobro_limite'
export const TEXTO_SIN_CONFIRMAR = 'Ciclo de pago de Cade pendiente de confirmar.'

/* Fecha límite de cobro de una factura de Cade a partir del mes trabajado: el día límite del mes siguiente.
   Sin día confirmado no hay fecha límite y nada se marca como vencido. */
export function fechaLimiteCobro(periodo: string | null | undefined, diaLimite: number | null): Date | null {
  if (!periodo || !diaLimite) return null
  const p = new Date(periodo + 'T00:00:00')
  if (isNaN(p.getTime())) return null
  return new Date(p.getFullYear(), p.getMonth() + 1, diaLimite)
}
