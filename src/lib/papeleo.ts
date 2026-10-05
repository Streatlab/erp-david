// Papeleo: bandeja del cartero. Reclasificar un correo crea una regla para los siguientes.
export const TIPOS_CORREO = ['liquidacion', 'penalizacion', 'factura', 'documentacion', 'otro'] as const

export function emailDe(remitente: string): string {
  const m = remitente.match(/<([^>]+)>/)
  return (m ? m[1] : remitente).trim().toLowerCase()
}

/* Primera palabra significativa del asunto (≥ 4 letras), sin tildes ni mayúsculas */
export function claveAsunto(asunto: string): string | null {
  const palabras = asunto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9ñ]+/)
  return palabras.find(p => p.length >= 4 && !/^\d+$/.test(p)) ?? null
}

export function reglaDesdeCorreo(remitente: string, asunto: string, tipo: string) {
  return { remitente_contiene: emailDe(remitente), asunto_contiene: claveAsunto(asunto), adjunto_contiene: null, tipo, activa: true, prioridad: 30, notas: 'Creada al reclasificar en Papeleo' }
}
