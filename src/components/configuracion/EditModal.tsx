import type { ReactNode } from 'react'

interface Props {
  title: string
  onSave: () => Promise<void> | void
  onCancel: () => void
  onDelete?: () => Promise<void> | void
  saving?: boolean
  canSave?: boolean
  children: ReactNode
  width?: number
}

export function EditModal({
  title, onSave, onCancel, onDelete, saving = false, canSave = true, children, width = 480,
}: Props) {
  return (
    <div
      className="fixed inset-0 bg-bg-overlay flex items-center justify-center z-50"
      onClick={onCancel}
    >
      <div
        className="bg-bg-surface rounded-xl shadow-modal overflow-hidden"
        style={{ width: `${width}px`, maxWidth: '92vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-border-default">
          <h2 className="text-[15px] font-bold text-text-primary uppercase tracking-[0.12em]">{title}</h2>
        </div>
        <div className="px-6 py-5 space-y-4">{children}</div>
        <div className="px-6 py-4 border-t border-border-default flex items-center gap-2">
          {onDelete && (
            <button
              onClick={onDelete}
              disabled={saving}
              className="px-4 py-2 text-xs font-medium text-danger-text hover:bg-danger-bg rounded-lg disabled:opacity-50"
            >Eliminar</button>
          )}
          <div className="flex-1" />
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-xs font-medium text-text-secondary hover:bg-bg-surface-alt rounded-lg disabled:opacity-50"
          >Cancelar</button>
          <button
            onClick={onSave}
            disabled={saving || !canSave}
            className="px-4 py-2 text-xs font-medium bg-brand-accent text-text-on-accent rounded-lg hover:bg-brand-accent-hover disabled:opacity-50"
          >{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] tracking-[0.14em] uppercase text-text-tertiary mb-1 font-medium">{label}</label>
      {children}
    </div>
  )
}
