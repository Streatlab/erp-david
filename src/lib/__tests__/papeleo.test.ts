import { describe, it, expect } from 'vitest'
import { emailDe, claveAsunto, reglaDesdeCorreo } from '@/lib/papeleo'

describe('papeleo', () => {
  it('extrae el correo del remitente', () => {
    expect(emailDe('Proveedores <proveedor@cade-distribucion.es>')).toBe('proveedor@cade-distribucion.es')
    expect(emailDe('x@y.com')).toBe('x@y.com')
  })
  it('clave del asunto sin tildes', () => {
    expect(claveAsunto('Liquidación Agosto 2026')).toBe('liquidacion')
    expect(claveAsunto('RE: 2026 Penalización')).toBe('penalizacion')
  })
  it('regla al reclasificar', () => {
    const r = reglaDesdeCorreo('Cade <a@cade.es>', 'Circularización proveedores', 'documentacion')
    expect(r).toMatchObject({ remitente_contiene: 'a@cade.es', asunto_contiene: 'circularizacion', tipo: 'documentacion', prioridad: 30 })
  })
})
