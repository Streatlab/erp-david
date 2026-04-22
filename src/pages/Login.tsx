import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
  useTheme,
  getTokens,
  FONT,
  FS,
  FW,
  RADIUS,
  SPACE,
  TRACKING,
} from '@/styles/tokens'

export default function Login() {
  const { login } = useAuth()
  const theme = useTheme()
  const t = getTokens(theme)

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
    fontFamily: FONT.sans,
    fontSize: FS['2xs'],
    letterSpacing: TRACKING.wide,
    textTransform: 'uppercase',
    color: t.textSecondary,
    fontWeight: FW.medium,
    marginBottom: 6,
    display: 'block',
  }

  const inputStyle = (focused: boolean): CSSProperties => ({
    fontFamily: FONT.sans,
    fontSize: FS.sm,
    backgroundColor: t.bgSurface,
    border: `0.5px solid ${focused ? t.brandAccent : t.borderDefault}`,
    borderRadius: RADIUS.md,
    padding: '10px 12px',
    color: t.textPrimary,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color var(--dur-fast) var(--ease-out)',
  })

  const pinInputStyle = (focused: boolean): CSSProperties => ({
    ...inputStyle(focused),
    fontSize: FS.lg,
    textAlign: 'center',
    letterSpacing: '12px',
    paddingLeft: 12,
    paddingRight: 0,
  })

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: t.bgApp,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACE[4],
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          backgroundColor: t.bgSurface,
          border: `0.5px solid ${t.borderDefault}`,
          borderRadius: RADIUS.lg,
          padding: SPACE[8],
          width: '100%',
          maxWidth: 340,
          display: 'flex',
          flexDirection: 'column',
          gap: SPACE[5],
          boxShadow: t.shadowSm,
        }}
      >
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src="/logo-davidreparte.svg" alt="David Reparte" style={{ height: 96, width: 'auto', display: 'block' }} />
          <p style={{
            fontFamily: FONT.sans,
            fontSize: FS['2xs'],
            color: t.textSecondary,
            letterSpacing: TRACKING.wider,
            textTransform: 'uppercase',
            fontWeight: FW.medium,
            marginTop: SPACE[4],
            marginBottom: 0,
          }}>
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
          <p style={{
            fontFamily: FONT.sans,
            fontSize: FS.xs,
            color: t.dangerText,
            textAlign: 'center',
            margin: 0,
          }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            fontFamily: FONT.sans,
            fontSize: FS.sm,
            fontWeight: FW.medium,
            backgroundColor: t.brandAccent,
            color: t.textOnAccent,
            border: '0.5px solid transparent',
            borderRadius: RADIUS.md,
            padding: '12px 0',
            width: '100%',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            letterSpacing: TRACKING.wide,
            textTransform: 'uppercase',
            transition: 'background var(--dur-fast) var(--ease-out)',
          }}
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
