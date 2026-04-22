import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useAuth } from '@/context/AuthContext'

const BG = '#f5f3ef'
const CARD = '#ffffff'
const BRD = '#d0c8bc'
const PRI = '#111111'
const MUT = '#7a8090'
const RED = '#B01D23'
const FONT_BODY = 'Lexend, sans-serif'
const FONT_HEADING = 'Oswald, sans-serif'

export default function Login() {
  const { login } = useAuth()
  const [nombre, setNombre] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusField, setFocusField] = useState<'nombre' | 'pin' | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length !== 4) { setError('El PIN debe tener 4 dígitos'); return }
    setLoading(true)
    setError('')

    console.log('[LOGIN DEBUG] submitting from form:')
    console.log('  nombre →', JSON.stringify(nombre.trim()))
    console.log('  pin    →', JSON.stringify(pin), 'typeof:', typeof pin, 'length:', pin.length)

    const err = await login(nombre.trim(), pin)
    if (err) setError(err)
    setLoading(false)
  }

  const handlePinChange = (value: string) => {
    const onlyDigits = value.replace(/\D/g, '').slice(0, 4)
    setPin(onlyDigits)
  }

  const labelStyle: CSSProperties = {
    fontFamily: FONT_HEADING,
    fontSize: 10,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: MUT,
    marginBottom: 6,
    display: 'block',
  }

  const inputStyle = (focused: boolean): CSSProperties => ({
    fontFamily: FONT_BODY,
    fontSize: 13,
    backgroundColor: CARD,
    border: `1px solid ${focused ? RED : BRD}`,
    borderRadius: 8,
    padding: '10px 12px',
    color: PRI,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  })

  const pinInputStyle = (focused: boolean): CSSProperties => ({
    ...inputStyle(focused),
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: '12px',
    paddingLeft: 12,
    paddingRight: 0,
  })

  return (
    <div style={{ minHeight: '100vh', backgroundColor: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form
        onSubmit={handleSubmit}
        style={{ backgroundColor: CARD, border: `0.5px solid ${BRD}`, borderRadius: 16, padding: 32, width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 20 }}
      >
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src="/logo-davidreparte.svg" alt="David Reparte" style={{ height: 120, width: 'auto', display: 'block' }} />
          <p style={{ fontFamily: FONT_HEADING, fontSize: 10, color: MUT, letterSpacing: '2px', textTransform: 'uppercase', marginTop: 16, marginBottom: 0 }}>
            Acceso
          </p>
        </div>

        <div>
          <label style={labelStyle} htmlFor="login-nombre">Usuario</label>
          <input
            id="login-nombre"
            type="text"
            name="nombre"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            onFocus={() => setFocusField('nombre')}
            onBlur={() => setFocusField(null)}
            autoFocus
            autoComplete="username"
            required
            style={inputStyle(focusField === 'nombre')}
          />
        </div>

        <div>
          <label style={labelStyle} htmlFor="login-pin">PIN</label>
          <input
            id="login-pin"
            type="password"
            name="pin"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoComplete="current-password"
            value={pin}
            onChange={e => handlePinChange(e.target.value)}
            onFocus={() => setFocusField('pin')}
            onBlur={() => setFocusField(null)}
            required
            style={pinInputStyle(focusField === 'pin')}
          />
        </div>

        {error && (
          <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: RED, textAlign: 'center', margin: 0 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            fontFamily: FONT_HEADING,
            fontSize: 14,
            fontWeight: 700,
            backgroundColor: RED,
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            padding: '12px 0',
            width: '100%',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            transition: 'filter 0.15s',
          }}
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
