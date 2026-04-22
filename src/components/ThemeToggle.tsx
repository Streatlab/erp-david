import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      style={{
        background: 'transparent',
        border: '0.5px solid var(--border-default)',
        borderRadius: 'var(--radius-pill)',
        padding: 8,
        cursor: 'pointer',
        color: 'var(--brand-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        transition: 'border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)',
      }}
    >
      {isDark ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
    </button>
  )
}
