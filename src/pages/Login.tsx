import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useAuth } from '@/context/AuthContext'
import { INK, MARINO, ARENA, BLANCO, TERRA, NARANJA, CELESTE, AMBAR, OSW, LEX, SHADOW, BORDER_CARD } from '@/styles/neobrutal'

export default function Login() {
  const { login, loginGoogle, errorGoogle } = useAuth()

  const [nombre, setNombre] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusField, setFocusField] = useState<'nombre' | 'pin' | null>(null)
  const [verPin, setVerPin] = useState(false)

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
    setPin(value.replace(/\D/g, '').slice(0, 4))
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

  const errorBox = (msg: string) => (
    <div style={{
      background: TERRA, color: ARENA, border: BORDER_CARD,
      fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 1,
      textTransform: 'uppercase', textAlign: 'center', padding: '8px 10px',
    }}>{msg}</div>
  )

  return (
    <div style={{ minHeight: '100vh', background: MARINO, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: LEX }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{
          background: ARENA, border: `4px solid ${INK}`, boxShadow: `8px 8px 0 ${INK}`,
          borderRadius: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
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
            {/* Acceso principal: Google */}
            <button
              type="button"
              onClick={loginGoogle}
              style={{
                fontFamily: OSW, fontSize: 16, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
                background: BLANCO, color: INK, border: `3px solid ${INK}`, boxShadow: SHADOW,
                borderRadius: 0, padding: '13px 0', width: '100%', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
              </svg>
              Entrar con Google
            </button>

            {errorGoogle && errorBox(errorGoogle)}

            {!verPin ? (
              <button
                type="button"
                onClick={() => setVerPin(true)}
                style={{ background: 'none', border: 'none', color: INK, fontFamily: OSW, fontSize: 12, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', textDecoration: 'underline', cursor: 'pointer' }}
              >
                Entrar con PIN
              </button>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18, borderTop: `2px dashed ${INK}`, paddingTop: 18 }}>
                <div>
                  <label style={labelStyle} htmlFor="login-nombre">Usuario</label>
                  <input
                    id="login-nombre" type="text" name="nombre" value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    onFocus={() => setFocusField('nombre')} onBlur={() => setFocusField(null)}
                    autoFocus autoComplete="username" required
                    style={inputStyle(focusField === 'nombre')}
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="login-pin">PIN</label>
                  <input
                    id="login-pin" type="password" name="pin" inputMode="numeric" pattern="[0-9]*" maxLength={4}
                    autoComplete="current-password" value={pin}
                    onChange={e => handlePinChange(e.target.value)}
                    onFocus={() => setFocusField('pin')} onBlur={() => setFocusField(null)}
                    required style={pinInputStyle(focusField === 'pin')}
                  />
                </div>
                {error && errorBox(error)}
                <button
                  type="submit" disabled={loading}
                  style={{
                    fontFamily: OSW, fontSize: 16, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
                    background: NARANJA, color: ARENA, border: `3px solid ${INK}`, boxShadow: SHADOW,
                    borderRadius: 0, padding: '13px 0', width: '100%',
                    cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? 'Entrando…' : 'Entrar →'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
