import type { ReactNode } from 'react'
import { useTheme, getTokens, FONT } from '@/styles/tokens'

export function ConfigModal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const theme = useTheme()
  const t = getTokens(theme)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: t.bgOverlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: t.bgSurface,
          border: `1px solid ${t.borderDefault}`,
          borderRadius: 12,
          padding: 24,
          width: 480,
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: t.shadowModal,
        }}
      >
        <h2
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: t.textPrimary,
            marginBottom: 16,
            fontFamily: FONT.sans,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}

export function ConfigField({ label, children }: { label: string; children: ReactNode }) {
  const theme = useTheme()
  const t = getTokens(theme)
  return (
    <div style={{ marginBottom: 12 }}>
      <label
        style={{
          display: 'block',
          fontSize: 11,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: t.textTertiary,
          marginBottom: 6,
          fontWeight: 500,
          fontFamily: FONT.sans,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

export function useInputStyle() {
  const theme = useTheme()
  const t = getTokens(theme)
  return {
    width: '100%',
    padding: '8px 12px',
    border: `1px solid ${t.borderDefault}`,
    borderRadius: 8,
    fontSize: 13,
    background: t.bgSurfaceAlt,
    color: t.textPrimary,
    fontFamily: FONT.sans,
    outline: 'none',
  } as const
}

export function ModalActions({
  onCancel,
  onSave,
  saving,
  disabled,
}: {
  onCancel: () => void
  onSave: () => void
  saving?: boolean
  disabled?: boolean
}) {
  const theme = useTheme()
  const t = getTokens(theme)
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
      <button
        type="button"
        onClick={onCancel}
        style={{
          padding: '9px 16px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          background: 'transparent',
          color: t.textSecondary,
          border: 'none',
          cursor: 'pointer',
          fontFamily: FONT.sans,
        }}
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving || disabled}
        style={{
          padding: '9px 16px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          background: t.brandAccent,
          color: t.textOnAccent,
          border: 'none',
          cursor: (saving || disabled) ? 'not-allowed' : 'pointer',
          opacity: (saving || disabled) ? 0.5 : 1,
          fontFamily: FONT.sans,
        }}
      >
        {saving ? 'Guardando…' : 'Guardar'}
      </button>
    </div>
  )
}
