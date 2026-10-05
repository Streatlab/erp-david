import { describe, it, expect } from 'vitest'
import { diasDesde } from '@/lib/cobros'

describe('cobros', () => {
  it('días sin cobrar desde la fecha de factura', () => {
    expect(diasDesde('2026-09-30', new Date(2026, 9, 2))).toBe(2)
    expect(diasDesde('2026-10-05', new Date(2026, 9, 2))).toBe(0)
    expect(diasDesde(null)).toBeNull()
  })
})
