// Identificador estable de este navegador/dispositivo (síncrono, en localStorage).
const CLAVE = 'david_dispositivo'

export function dispositivoId(): string {
  try {
    let id = localStorage.getItem(CLAVE)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(CLAVE, id)
    }
    return id
  } catch {
    return 'sin-almacenamiento'
  }
}
