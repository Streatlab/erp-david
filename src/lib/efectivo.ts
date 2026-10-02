// Destino del efectivo retirado del banco (Conciliación). Cada destino es una categoría de gasto.
export const DESTINOS_EFECTIVO: { codigo: string; nombre: string }[] = [
  { codigo: 'devolucion-bi-prior',     nombre: 'Prior' },
  { codigo: 'extras-en-mano',          nombre: 'Extras en mano' },
  { codigo: 'incentivos-en-mano',      nombre: 'Incentivos en mano' },
  { codigo: 'mantenimiento-vehiculos', nombre: 'Mantenimiento' },
  { codigo: 'alquiler-furgoneta',      nombre: 'Alquiler furgoneta' },
  { codigo: 'gastos-personales',       nombre: 'Gastos personales' },
  { codigo: 'efectivo-retirado',       nombre: 'Sin justificar' },
]

/* Misma regla que la vista v_efectivo: sin categoría o en categorías de espera = por justificar */
export function efectivoPorJustificar(categoria: string | null | undefined): boolean {
  return !categoria || categoria === 'efectivo-retirado' || categoria === 'pendiente-revisar-gasto'
}

export type Ambito = 'actividad' | 'personal' | 'interno' | 'pendiente'
