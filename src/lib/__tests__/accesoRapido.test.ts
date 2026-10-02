import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

const almacen = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => almacen.get(k) ?? null,
  setItem: (k: string, v: string) => { almacen.set(k, v) },
  removeItem: (k: string) => { almacen.delete(k) },
})

const { textoError, estaDesbloqueado, marcarDesbloqueado, borrarDesbloqueo, marcarAccesoPendiente, consumirAccesoPendiente } = await import('@/lib/accesoRapido')

describe('acceso rápido', () => {
  beforeEach(() => almacen.clear())

  it('explica PIN incorrecto y bloqueo', () => {
    expect(textoError({ error: 'incorrecto', restantes: 3 })).toBe('PIN incorrecto. Te quedan 3 intentos.')
    expect(textoError({ error: 'bloqueado' })).toContain('bloqueado')
  })

  it('desbloqueo ligado a dispositivo y usuario, y se borra al salir', () => {
    marcarDesbloqueado('David@Ejemplo.com')
    expect(estaDesbloqueado('david@ejemplo.com')).toBe(true)
    expect(estaDesbloqueado('otro@ejemplo.com')).toBe(false)
    borrarDesbloqueo()
    expect(estaDesbloqueado('david@ejemplo.com')).toBe(false)
  })

  it('el acceso pendiente se consume una sola vez', () => {
    marcarAccesoPendiente()
    expect(consumirAccesoPendiente()).toBe(true)
    expect(consumirAccesoPendiente()).toBe(false)
  })
})
