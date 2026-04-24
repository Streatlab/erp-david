export type Categoria =
  | 'compras'
  | 'rrhh'
  | 'marketing'
  | 'suministros'
  | 'alquiler'
  | 'otros'

export const CATEGORIAS_ORDEN: Categoria[] = [
  'compras',
  'rrhh',
  'marketing',
  'suministros',
  'alquiler',
  'otros',
]

export const CATEGORIA_NOMBRE: Record<Categoria, string> = {
  compras: 'Compras',
  rrhh: 'RRHH',
  marketing: 'Marketing',
  suministros: 'Suministros',
  alquiler: 'Alquiler',
  otros: 'Otros',
}

export const MESES_CORTO = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
] as const

export const MESES_ES = MESES_CORTO

export function calcularDiasMes(anio: number, mes: number): number {
  return new Date(anio, mes, 0).getDate()
}

export function diasTranscurridos(): number {
  return new Date().getDate()
}
