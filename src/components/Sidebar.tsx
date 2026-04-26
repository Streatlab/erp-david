import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
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
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useSidebarState } from '@/hooks/useSidebarState'
import { ThemeToggle } from './ThemeToggle'
import { useThemeMode, getTokens, FONT, FS, FW, RADIUS, SPACE, TRACKING } from '@/styles/tokens'
import { getFurgonetas, type Furgoneta } from '@/lib/flota/queries'

interface NavItem {
  path: string
  label: string
  icon: React.ComponentType<{
    size?: number
    strokeWidth?: number
    color?: string
    style?: React.CSSProperties
  }>
  perfiles: string[]
  expandable?: boolean
}

const ITEMS: NavItem[] = [
  { path: '/entregas',         label: 'Entregas',         icon: Truck,         perfiles: ['admin'] },
  { path: '/personal',         label: 'Personal',         icon: Users,         perfiles: ['admin'] },
  { path: '/flota',            label: 'Flota',            icon: RouteIcon,     perfiles: ['admin'], expandable: true },
  { path: '/liquidacion-cade', label: 'Liquidación Cade', icon: Wallet,        perfiles: ['admin'] },
  { path: '/conciliacion',     label: 'Conciliación',     icon: Scale,         perfiles: ['admin'] },
  { path: '/running',          label: 'Running',          icon: ClipboardList, perfiles: ['admin'] },
  { path: '/punto-equilibrio', label: 'Punto equilibrio', icon: Building2,     perfiles: ['admin'] },
  { path: '/contabilidad',     label: 'Contabilidad',     icon: Calculator,    perfiles: ['admin'] },
  { path: '/hacienda',         label: 'Hacienda',         icon: Landmark,      perfiles: ['admin'] },
  { path: '/operativa',        label: 'Operativa',        icon: Settings,      perfiles: ['admin'] },
  { path: '/configuracion',    label: 'Configuración',    icon: Settings,      perfiles: ['admin'] },
]

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { usuario, logout } = useAuth()
  const { collapsed, toggle } = useSidebarState()
  const theme = useThemeMode()
  const t = getTokens(theme)
  const perfil = usuario?.perfil ?? ''
  const location = useLocation()

  const sidebarWidth = collapsed ? 56 : 240
  const visibleItems = ITEMS.filter(i => i.perfiles.includes(perfil))

  // Cargar furgonetas para subhijos
  const [furgos, setFurgos] = useState<Furgoneta[]>([])
  // Estado expansión: por defecto, abierto si estamos en /flota
  const [flotaExpanded, setFlotaExpanded] = useState<boolean>(location.pathname.startsWith('/flota'))

  useEffect(() => {
    if (location.pathname.startsWith('/flota')) setFlotaExpanded(true)
  }, [location.pathname])

  useEffect(() => {
    if (perfil === 'admin') {
      getFurgonetas().then(setFurgos).catch(() => setFurgos([]))
    }
  }, [perfil])

  const itemStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px 10px 12px',
    margin: '2px 8px',
    borderRadius: RADIUS.md,
    fontFamily: FONT.sans,
    fontSize: FS.sm,
    fontWeight: isActive ? FW.medium : FW.regular,
    color: isActive ? t.textOnPrimary : t.textPrimary,
    background: isActive ? t.brandPrimary : 'transparent',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    flex: 1,
  })

  const subItemStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 14px 6px 36px',
    margin: '1px 8px',
    borderRadius: RADIUS.sm ?? 6,
    fontFamily: FONT.sans,
    fontSize: FS.xs,
    fontWeight: isActive ? FW.medium : FW.regular,
    color: isActive ? t.brandPrimary : t.textSecondary,
    background: isActive ? `${t.brandPrimary}1A` : 'transparent',
    textDecoration: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  })

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />}

      <aside
        style={{
          background: t.bgSurface,
          borderRight: `0.5px solid ${t.borderDefault}`,
          width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth,
        }}
        className={`fixed top-0 left-0 z-40 h-full flex flex-col transition-all duration-200 overflow-hidden lg:translate-x-0 lg:static lg:z-auto ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {collapsed ? (
          <div style={{ borderBottom: `0.5px solid ${t.borderSubtle}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 64, padding: '6px 0', gap: 4 }}>
            <button onClick={toggle} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 2 }} title="Expandir">
              <img src="/logo-davidreparte.svg" alt="David Reparte" style={{ height: 32, width: 'auto', display: 'block' }} />
            </button>
          </div>
        ) : (
          <div style={{ padding: SPACE[3], borderBottom: `0.5px solid ${t.borderSubtle}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 88, position: 'relative' }}>
            <img src="/logo-davidreparte.svg" alt="David Reparte" style={{ height: 44, width: 'auto', display: 'block' }} />
            <span style={{ fontFamily: FONT.sans, fontSize: FS['2xs'], color: t.textSecondary, letterSpacing: TRACKING.wider, textTransform: 'uppercase', fontWeight: FW.medium, marginTop: 6 }}>
              David Reparte
            </span>
            <button onClick={toggle} style={{ color: t.textSecondary, background: 'none', border: 'none', cursor: 'pointer', padding: 6, position: 'absolute', top: 8, right: 8 }} className="hidden lg:block" title="Colapsar">«</button>
          </div>
        )}

        <nav className="flex-1 py-2 overflow-y-auto" style={{ overflowX: 'hidden' }}>
          {(!collapsed && perfil) && (
            <NavLink to="/" end onClick={onClose}
              style={({ isActive }) => ({
                width: 'auto', background: isActive ? t.brandPrimary : 'transparent',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                gap: 10, padding: '10px 14px 10px 12px', margin: '2px 8px', borderRadius: RADIUS.md,
                fontFamily: FONT.sans, fontSize: FS.xs, textTransform: 'uppercase',
                letterSpacing: TRACKING.wide, fontWeight: FW.bold,
                color: isActive ? t.textOnPrimary : t.brandPrimary, textDecoration: 'none',
                transition: 'background var(--dur-fast) var(--ease-out)',
              })}>
              {({ isActive }) => (<>
                <LayoutDashboard size={18} strokeWidth={1.5} color={isActive ? t.textOnPrimary : t.brandPrimary} style={{ flexShrink: 0 }} />
                <span>Panel global</span>
              </>)}
            </NavLink>
          )}

          {collapsed && perfil && (
            <NavLink to="/" end onClick={onClose} title="Panel global"
              style={{ width: '100%', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
              {({ isActive }) => (<LayoutDashboard size={20} strokeWidth={1.5} color={isActive ? t.brandPrimary : t.textSecondary} />)}
            </NavLink>
          )}

          {visibleItems.map(item => {
            const Icon = item.icon
            if (collapsed) {
              return (
                <NavLink key={item.path} to={item.path} onClick={onClose} title={item.label}
                  style={{ width: '100%', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                  {({ isActive }) => (<Icon size={20} strokeWidth={1.5} color={isActive ? t.brandPrimary : t.textSecondary} />)}
                </NavLink>
              )
            }

            // Expandable Flota
            if (item.expandable && item.path === '/flota') {
              const isActive = location.pathname.startsWith('/flota')
              return (
                <div key={item.path}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <NavLink to={item.path} onClick={onClose} end style={() => itemStyle(isActive)}>
                      <Icon size={18} strokeWidth={1.5} color={isActive ? t.textOnPrimary : t.textSecondary} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                    </NavLink>
                    <button
                      onClick={() => setFlotaExpanded(v => !v)}
                      style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        padding: '8px 12px', marginRight: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      title={flotaExpanded ? 'Colapsar' : 'Expandir'}
                    >
                      <ChevronRight
                        size={14}
                        strokeWidth={2.5}
                        color={isActive ? t.textOnPrimary : t.textSecondary}
                        style={{ transform: flotaExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }}
                      />
                    </button>
                  </div>

                  {flotaExpanded && furgos.map(f => (
                    <NavLink
                      key={f.id}
                      to={`/flota/${f.codigo}`}
                      onClick={onClose}
                      style={({ isActive }) => subItemStyle(isActive)}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: t.brandAccent ?? t.brandPrimary, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.matricula} · {f.nombre_corto ?? f.conductor}
                      </span>
                    </NavLink>
                  ))}
                </div>
              )
            }

            // Item normal
            return (
              <NavLink key={item.path} to={item.path} onClick={onClose} end
                style={({ isActive }) => itemStyle(isActive)}>
                {({ isActive }) => (<>
                  <Icon size={18} strokeWidth={1.5} color={isActive ? t.textOnPrimary : t.textSecondary} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                </>)}
              </NavLink>
            )
          })}
        </nav>

        <div style={{ padding: collapsed ? '8px' : '12px', borderTop: `0.5px solid ${t.borderSubtle}`, display: 'flex', justifyContent: 'center' }}>
          <ThemeToggle />
        </div>

        <div style={{ padding: SPACE[3], borderTop: `0.5px solid ${t.borderSubtle}`, fontFamily: FONT.sans, fontSize: FS.xs, color: t.textSecondary, textAlign: collapsed ? 'center' : 'left' }}>
          {!collapsed ? (
            <>
              <div style={{ marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: t.textPrimary }}>
                {usuario?.nombre} — <span style={{ color: t.brandAccent, fontWeight: FW.medium }}>{usuario?.perfil}</span>
              </div>
              <button onClick={logout} style={{ color: t.textSecondary, fontSize: FS.xs, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: FONT.sans }}>
                Cerrar sesión
              </button>
            </>
          ) : (
            <button onClick={logout} style={{ color: t.textSecondary, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Cerrar sesión">
              <LogOut size={16} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
