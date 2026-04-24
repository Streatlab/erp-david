// Mapping código categoría contable → subcategoría / grupo usados en tabla `gastos`.

import type { Categoria } from './running'

/**
 * Mapea un slug de Conciliación (categorias_contables_*.codigo) al enum Categoria
 * que usan los componentes Running. Devuelve null si la categoría no computa en
 * Running (movimientos internos, etc.) — en ese caso no se debe insertar en
 * la tabla `gastos`.
 */
export function mapSlugToCategoria(slug: string | null | undefined): Categoria | null {
  if (!slug) return null
  const s = slug.toLowerCase().trim()

  // Suministros y energía
  if (s === 'suministros' || s === 'sumin') return 'SUMINISTROS'
  if (s === 'combustible' || s === 'combustible-energia-vehiculo' || s === 'recargas-electricas') return 'SUMINISTROS'

  // Admin / generales (leasing, seguros, mantenimiento, impuestos, telefonía)
  if (s === 'leasing-furgonetas' || s === 'leasing') return 'ADMIN_GENERALES'
  if (s === 'seguros') return 'ADMIN_GENERALES'
  if (s === 'mantenimiento-vehiculos') return 'ADMIN_GENERALES'
  if (s === 'impuestos' || s === 'impue') return 'ADMIN_GENERALES'
  if (s === 'telefonia') return 'ADMIN_GENERALES'

  // RRHH
  if (s === 'nominas' || s === 'seguridad-social') return 'RRHH'

  // Alquiler
  if (s === 'alquiler') return 'ALQUILER'

  // Producto (proveedores de alimentos)
  if (s === 'proveedores') return 'PRODUCTO'

  // Movimientos internos / otros → no computan
  if (s === 'movimientos-internos') return null

  return null
}


const SUBCATEGORIA: Record<string, string> = {
  'PRD-ALI': 'ALIMENTOS',
  'PRD-PKG': 'ALIMENTOS',
  'PRD-ENT': 'ENTREGAS',
  'RRH-CAU': 'FIJOS_RRHH',
  'RRH-SUE': 'FIJOS_RRHH',
  'RRH-IRP': 'FIJOS_RRHH',
  'RRH-SS':  'FIJOS_RRHH',
  'RRH-GES': 'FIJOS_RRHH',
  'RRH-SEL': 'FIJOS_RRHH',
  'RRH-INC': 'VARIABLES_RRHH',
  'RRH-UNI': 'VARIABLES_RRHH',
  'RRH-FOR': 'VARIABLES_RRHH',
  'RRH-COM': 'VARIABLES_RRHH',
  'ALQ-LOC': 'ALQUILER_INMUEBLE',
  'ALQ-SEG': 'ALQUILER_INMUEBLE',
  'ALQ-RSU': 'ALQUILER_INMUEBLE',
  'ALQ-REP': 'ALQUILER_INMUEBLE',
  'CTR-ADS': 'MARKETING',
  'CTR-PUB': 'MARKETING',
  'CTR-DIS': 'MARKETING',
  'CTR-IGF': 'MARKETING',
  'CTR-GGL': 'MARKETING',
  'CTR-DOM': 'INTERNET_VENTAS',
  'CTR-HOS': 'INTERNET_VENTAS',
  'CTR-TOL': 'INTERNET_VENTAS',
  'CTR-WEB': 'INTERNET_VENTAS',
  'CTR-AGU': 'SUMINISTROS',
  'CTR-GAS': 'SUMINISTROS',
  'CTR-ELE': 'SUMINISTROS',
  'CTR-TEL': 'SUMINISTROS',
}

export function categoriaToSubcategoria(codigo: string | null | undefined): string {
  if (!codigo) return 'ADMIN_GENERALES'
  return SUBCATEGORIA[codigo] ?? 'ADMIN_GENERALES'
}

// Grupo se lee preferentemente de categorias_contables_gastos.grupo (ya poblado).
// Si viene vacío o === 'CONTROLABLES', diferenciamos por código.
export function grupoFromCategoria(
  codigo: string | null | undefined,
  grupoDB: string | null | undefined,
): string {
  if (!codigo) return 'ADMIN_GENERALES'
  if (grupoDB && grupoDB !== 'CONTROLABLES') return grupoDB
  if (codigo.startsWith('PRD-')) return 'PRODUCTO'
  if (codigo.startsWith('RRH-')) return 'RRHH'
  if (codigo.startsWith('ALQ-')) return 'ALQUILER'
  if (['CTR-ADS', 'CTR-PUB', 'CTR-DIS', 'CTR-IGF', 'CTR-GGL'].includes(codigo)) return 'MARKETING'
  if (['CTR-DOM', 'CTR-HOS', 'CTR-TOL', 'CTR-WEB'].includes(codigo)) return 'INTERNET_VENTAS'
  if (['CTR-AGU', 'CTR-GAS', 'CTR-ELE', 'CTR-TEL'].includes(codigo)) return 'SUMINISTROS'
  return 'ADMIN_GENERALES'
}
