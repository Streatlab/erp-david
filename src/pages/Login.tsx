import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useAuth } from '@/context/AuthContext'
import { INK, MARINO, ARENA, BLANCO, TERRA, NARANJA, CELESTE, AMBAR, OSW, LEX, SHADOW, BORDER_CARD } from '@/styles/neobrutal'

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

    const err = await login(nombre.trim(), pin)
    if (err) setError(err)
    setLoading(false)
  }

  const handlePinChange = (value: string) => {
    const onlyDigits = value.replace(/\D/g, '').slice(0, 4)
    setPin(onlyDigits)
  }

  const labelStyle: CSSProperties = {
    fontFamily: OSW, fontSize: 12, fontWeight: 600, letterSpacing: 2,
    textTransform: 'uppercase', color: INK, marginBottom: 6, display: 'block',
  }

  const inputStyle = (focused: boolean): CSSProperties => ({
    fontFamily: LEX, fontSize: 14, fontWeight: 600,
    backgroundColor: BLANCO, color: INK,
    border: `2px dashed ${focused ? NARANJA : CELESTE}`,
    borderRadius: 0, padding: '11px 12px', outline: 'none',
    width: '100%', boxSizing: 'border-box',
  })

  const pinInputStyle = (focused: boolean): CSSProperties => ({
    ...inputStyle(focused),
    fontFamily: OSW, fontSize: 24, fontWeight: 700,
    textAlign: 'center', letterSpacing: '14px', paddingLeft: 14, paddingRight: 0,
  })

  return (
    <div
      style={{
        minHeight: '100vh', background: MARINO,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, fontFamily: LEX,
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        <form
          onSubmit={handleSubmit}
          style={{
            background: ARENA, border: `4px solid ${INK}`, boxShadow: `8px 8px 0 ${INK}`,
            borderRadius: 0, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}
        >
          {/* Franja ámbar con logo */}
          <div style={{ background: AMBAR, borderBottom: `4px solid ${INK}`, padding: '22px 24px', textAlign: 'center' }}>
            <img src="/logo-davidreparte.svg" alt="David Reparte" style={{ height: 84, width: 'auto', display: 'inline-block' }} />
            <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 22, letterSpacing: '-0.5px', textTransform: 'uppercase', color: INK, marginTop: 10 }}>
              David Reparte
            </div>
            <div style={{ fontFamily: OSW, fontWeight: 600, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: INK, marginTop: 2 }}>
              Alcoi · Ontinyent
            </div>
          </div>

          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
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
              <div style={{
                background: TERRA, color: ARENA, border: BORDER_CARD,
                fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 1,
                textTransform: 'uppercase', textAlign: 'center', padding: '8px 10px',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                fontFamily: OSW, fontSize: 16, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
                background: NARANJA, color: ARENA, border: `3px solid ${INK}`, boxShadow: SHADOW,
                borderRadius: 0, padding: '13px 0', width: '100%',
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Entrando…' : 'Entrar →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
