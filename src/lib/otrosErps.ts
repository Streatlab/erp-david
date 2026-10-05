/**
 * Selector de ERPs (Binagre · De la Salud · David Reparte).
 *
 * Solo decide QUÉ botones se enseñan en el menú. No da acceso:
 * cada ERP sigue teniendo su propio login y su propia base de datos (aislados).
 * Cada ERP guarda su sesión en el aparato: se entra una vez y luego el cambio es un clic.
 */
export interface OtroErp { id: 'binagre' | 'delasalud' | 'david'; nombre: string; url: string }

const ERPS: OtroErp[] = [
  { id: 'binagre', nombre: 'Binagre', url: 'https://binagre.vercel.app' },
  { id: 'delasalud', nombre: 'De la Salud', url: 'https://delasalud.vercel.app' },
  { id: 'david', nombre: 'David Reparte', url: 'https://davidparte.vercel.app' },
]

const RUBEN: OtroErp['id'][] = ['binagre', 'delasalud', 'david']
const EMILIO: OtroErp['id'][] = ['binagre', 'delasalud']

/** Quién ve qué (por correo). David (solo su ERP) no tiene selector. */
const ACCESOS: Record<string, OtroErp['id'][]> = {
  'ruben@streatlab.com': RUBEN,
  'rubenrodriguezvinagre@gmail.com': RUBEN,
  'emiliodorcamartinez@gmail.com': EMILIO,
}

/** Otros ERPs a los que esta persona puede saltar (sin el ERP en el que ya está). */
export function otrosErpsPara(email: string | null | undefined): OtroErp[] {
  const permitidos = ACCESOS[(email ?? '').trim().toLowerCase()]
  if (!permitidos) return []
  const aqui = typeof window !== 'undefined' ? window.location.hostname : ''
  return ERPS.filter(e => permitidos.includes(e.id) && new URL(e.url).hostname !== aqui)
}
