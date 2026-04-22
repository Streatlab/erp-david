import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Truck,
  Users,
  Route as RouteIcon,
  Wallet,
  Scale,
  ClipboardList,
  Building2,
  Calculator,
  Landmark,
  Settings,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useSidebarState } from '@/hooks/useSidebarState'
import { ThemeToggle } from './ThemeToggle'
import { useTheme, FONT } from '@/styles/tokens'

interface NavItem {
  path: string
  label: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>
  color: string
  perfiles: string[]
}

const ITEMS: NavItem[] = [
  { path: '/entregas',         label: 'Entregas',         icon: Truck,          color: '#06C167', perfiles: ['admin'] },
  { path: '/personal',         label: 'Personal',         icon: Users,          color: '#66aaff', perfiles: ['admin'] },
  { path: '/flota',            label: 'Flota',            icon: RouteIcon,      color: '#f5a623', perfiles: ['admin'] },
  { path: '/liquidacion-cade', label: 'Liquidación Cade', icon: Wallet,         color: '#B01D23', perfiles: ['admin'] },
  { path: '/conciliacion',     label: 'Conciliación',     icon: Scale,          color: '#FF4757', perfiles: ['admin'] },
  { path: '/running',          label: 'Running',          icon: ClipboardList,  color: '#06C167', perfiles: ['admin'] },
  { path: '/punto-equilibrio', label: 'Punto Equilibrio', icon: Building2,      color: '#66aaff', perfiles: ['admin'] },
  { path: '/contabilidad',     label: 'Contabilidad',     icon: Calculator,     color: '#f5a623', perfiles: ['admin'] },
  { path: '/hacienda',         label: 'Hacienda',         icon: Landmark,       color: '#B01D23', perfiles: ['admin'] },
  { path: '/operativa',        label: 'Operativa',        icon: Settings,       color: '#9ba8c0', perfiles: ['admin'] },
]

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { usuario, logout } = useAuth()
  const { collapsed, toggle } = useSidebarState()
  const { T, isDark } = useTheme()
  const perfil = usuario?.perfil ?? ''

  const activeTextColor = '#ffffff'
  const hoverBg = isDark ? T.card : T.group

  const sidebarWidth = collapsed ? 56 : 220

  const visibleItems = ITEMS.filter(i => i.perfiles.includes(perfil))

  const itemStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px 10px 12px',
    margin: '1px 8px',
    borderRadius: 6,
    fontFamily: FONT.body,
    fontSize: 14,
    color: isActive ? activeTextColor : T.pri,
    background: isActive ? '#FF4757' : 'transparent',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'background 150ms',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
  })

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={onClose} />}

      <aside
        style={{ background: T.group, borderRadius: 16, width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth }}
        className={`
          fixed top-0 left-0 z-40 h-full border-r border-[var(--sl-border)]
          flex flex-col transition-all duration-200 overflow-hidden
          lg:translate-x-0 lg:static lg:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {collapsed ? (
          <div style={{ borderBottom: `1px solid ${T.brd}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 64, padding: '6px 0', gap: 4 }}>
            <button onClick={toggle} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 2 }} title="Expandir">
              <img src="/logo-davidreparte.svg" alt="David Reparte" style={{ height: 32, width: 'auto', display: 'block' }} />
            </button>
          </div>
        ) : (
          <div style={{ padding: 12, borderBottom: `1px solid ${T.brd}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 88, position: 'relative' }}>
            <img src="/logo-davidreparte.svg" alt="David Reparte" style={{ height: 44, width: 'auto', display: 'block' }} />
            <span style={{ fontFamily: FONT.heading, fontSize: 9, color: T.mut, letterSpacing: '3px', textTransform: 'uppercase', marginTop: 6 }}>David Reparte</span>
            <button onClick={toggle} style={{ color: T.mut, background: 'none', border: 'none', cursor: 'pointer', padding: 6, position: 'absolute', top: 8, right: 8 }} className="hover:text-[var(--sl-text-primary)] transition-colors hidden lg:block" title="Colapsar">«</button>
          </div>
        )}

        <nav className="flex-1 py-2 overflow-y-auto" style={{ overflowX: 'hidden' }}>
          {(!collapsed && perfil) && (
            <NavLink
              to="/"
              end
              onClick={onClose}
              style={({ isActive }) => ({
                width: '100%',
                background: isActive ? '#FF4757' : 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 10,
                padding: '10px 14px 10px 12px',
                fontFamily: FONT.heading,
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: isActive ? '#ffffff' : T.pri,
                textDecoration: 'none',
                transition: 'background 150ms',
              })}
            >
              {({ isActive }) => (
                <>
                  <LayoutDashboard size={18} strokeWidth={1.8} color={isActive ? '#ffffff' : '#FF4757'} style={{ flexShrink: 0 }} />
                  <span>Panel Global</span>
                </>
              )}
            </NavLink>
          )}

          {collapsed && perfil && (
            <NavLink
              to="/"
              end
              onClick={onClose}
              title="Panel Global"
              style={{ width: '100%', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
            >
              <LayoutDashboard size={20} strokeWidth={1.8} color="#FF4757" />
            </NavLink>
          )}

          {visibleItems.map(item => {
            const Icon = item.icon
            return collapsed ? (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                title={item.label}
                style={{ width: '100%', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
              >
                {({ isActive }) => (
                  <Icon size={20} strokeWidth={1.8} color={isActive ? '#ffffff' : item.color} />
                )}
              </NavLink>
            ) : (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                style={({ isActive }) => itemStyle(isActive)}
                className={({ isActive }) => isActive ? '' : `hover:!bg-[${hoverBg}] hover:!text-[${T.pri}]`}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} strokeWidth={1.8} color={isActive ? '#ffffff' : item.color} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isActive ? activeTextColor : T.pri }}>{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div style={{ padding: collapsed ? '8px' : '12px', borderTop: `1px solid ${T.brd}`, display: 'flex', justifyContent: 'center' }}>
          <ThemeToggle />
        </div>

        <div style={{ padding: 12, borderTop: `1px solid ${T.brd}`, fontFamily: FONT.body, fontSize: 12, color: T.mut, textAlign: collapsed ? 'center' : 'left' }}>
          {!collapsed ? (
            <>
              <div style={{ marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: T.sec }}>
                {usuario?.nombre} — <span style={{ color: '#FF4757' }}>{usuario?.perfil}</span>
              </div>
              <button onClick={logout} style={{ color: T.mut, fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>Cerrar sesión</button>
            </>
          ) : (
            <button onClick={logout} style={{ color: T.mut, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }} title="Cerrar sesión">⏏</button>
          )}
        </div>
      </aside>
    </>
  )
}
