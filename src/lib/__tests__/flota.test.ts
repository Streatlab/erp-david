import { describe, it, expect } from 'vitest'
import { aNumero } from '@/components/flota/FormFlota'

describe('flota · importes', () => {
  it('acepta formato español y con punto decimal', () => {
    expect(aNumero('268.39')).toBe(268.39)
    expect(aNumero('1.234,50')).toBe(1234.5)
    expect(aNumero('90')).toBe(90)
    expect(aNumero('')).toBeNull()
  })
})
