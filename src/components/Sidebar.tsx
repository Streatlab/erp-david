import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import type { CSSProperties } from 'react'
import {
  LayoutDashboard,
  Wallet,
  AlertTriangle,
  Truck,
  Route as RouteIcon,
  CarFront,
  Wrench,
  Users,
  ListChecks,
  ClipboardList,
  HardHat,
  BarChart3,
  ShoppingCart,
  Boxes,
  FileText,
  BookOpen,
  Library,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useSidebarState } from '@/hooks/useSidebarState'
import {
  OSW, INK, ARENA, BLANCO, AMBAR, NARANJA,
  CELESTE, OLIVA, MARINO, GRIS, BERENJENA, VERDEMAR,
} from '@/styles/neobrutal'

interface NavItem { path: string; label: string; perfiles: string[] }
interface NavSection {
  key: string
  label: string
  icon: LucideIcon
  headBg: string
  headColor: string
  perfiles: string[]
  items: NavItem[]
}

/* Bloques de color sólido sobre sidebar marino (mar) — Neobrutal Mediterráneo David. */
const SECTIONS: NavSection[] = [
  {
    key: 'finanzas', label: 'Finanzas', icon: Wallet,
    headBg: CELESTE, headColor: ARENA, perfiles: ['admin'],
    items: [
      { path: '/finanzas/facturacion',   label: 'Facturación emitida', perfiles: ['admin'] },
      { path: '/finanzas/liquidaciones', label: 'Liquidaciones',       perfiles: ['admin'] },
      { path: '/finanzas/pagos-cobros',  label: 'Pagos y Cobros',      perfiles: ['admin'] },
      { path: '/finanzas/ventas',        label: 'Ventas',              perfiles: ['admin'] },
      { path: '/punto-equilibrio',       label: 'Punto equilibrio',    perfiles: ['admin'] },
      { path: '/running',                label: 'Running',             perfiles: ['admin'] },
      { path: '/conciliacion',           label: 'Conciliación',        perfiles: ['admin'] },
      { path: '/reclamaciones',          label: 'Reclamaciones Cade',  perfiles: ['admin'] },
    ],
  },
  {
    key: 'operaciones', label: 'Operaciones', icon: Truck,
    headBg: NARANJA, headColor: ARENA, perfiles: ['admin'],
    items: [
      { path: '/entregas',        label: 'Entregas',        perfiles: ['admin'] },
      { path: '/flota',           label: 'Flota',           perfiles: ['admin'] },
      { path: '/danos-vehiculos', label: 'Daños vehículos', perfiles: ['admin'] },
      { path: '/mantenimiento',   label: 'Mantenimiento',   perfiles: ['admin'] },
    ],
  },
  {
    key: 'equipo', label: 'Equipo', icon: Users,
    headBg: OLIVA, headColor: ARENA, perfiles: ['admin'],
    items: [
      { path: '/personal',        label: 'Personal',        perfiles: ['admin'] },
      { path: '/tareas',          label: 'Tareas',          perfiles: ['admin'] },
      { path: '/checklists',      label: 'Checklists',      perfiles: ['admin'] },
      { path: '/equipos',         label: 'Equipos',         perfiles: ['admin'] },
      { path: '/informes-equipo', label: 'Informes equipo', perfiles: ['admin'] },
    ],
  },
  {
    key: 'almacen', label: 'Almacén', icon: Boxes,
    headBg: AMBAR, headColor: INK, perfiles: ['admin'],
    items: [
      { path: '/pedidos',     label: 'Pedidos',     perfiles: ['admin'] },
      { path: '/inventarios', label: 'Inventarios', perfiles: ['admin'] },
    ],
  },
  {
    key: 'documentos', label: 'Documentos', icon: FileText,
    headBg: BERENJENA, headColor: ARENA, perfiles: ['admin'],
    items: [
      { path: '/papeleo',        label: 'Papeleo',        perfiles: ['admin'] },
      { path: '/manuales',       label: 'Manuales',       perfiles: ['admin'] },
      { path: '/libro-facturas', label: 'Libro registro', perfiles: ['admin'] },
    ],
  },
  {
    key: 'configuracion', label: 'Configuración', icon: Settings,
    headBg: VERDEMAR, headColor: ARENA, perfiles: ['admin'],
    items: [
      { path: '/configuracion', label: 'Configuración', perfiles: ['admin'] },
    ],
  },
]

const ICON_ROUTE: Record<string, LucideIcon> = {
  '/finanzas/liquidaciones': Wallet,
  '/reclamaciones': AlertTriangle,
  '/flota': RouteIcon,
  '/danos-vehiculos': CarFront,
  '/mantenimiento': Wrench,
  '/tareas': ListChecks,
  '/checklists': ClipboardList,
  '/equipos': HardHat,
  '/informes-equipo': BarChart3,
  '/pedidos': ShoppingCart,
  '/manuales': BookOpen,
  '/libro-facturas': Library,
}

const OPEN_LS_KEY = 'david.sidebar.openSections'
const TEXTO_SUAVE = 'rgba(245,236,217,0.72)' // ARENA 72% sobre marino

function loadOpen(pathname: string): string[] {
  if (typeof window === 'undefined') return ['finanzas']
  try {
    const raw = localStorage.getItem(OPEN_LS_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr.filter((x) => typeof x === 'string')
    }
  } catch { /* noop */ }
  const activa = SECTIONS.find((s) => s.items.some((i) => pathname.startsWith(i.path)))
  return activa ? [activa.key] : ['finanzas']
}

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { usuario, logout } = useAuth()
  const { collapsed, toggle } = useSidebarState()
  const perfil = usuario?.perfil ?? ''
  const location = useLocation()

  const [openSections, setOpenSections] = useState<string[]>(() => loadOpen(location.pathname))

  useEffect(() => {
    try { localStorage.setItem(OPEN_LS_KEY, JSON.stringify(openSections)) } catch { /* noop */ }
  }, [openSections])

  useEffect(() => {
    const activa = SECTIONS.find((s) => s.items.some((i) => location.pathname.startsWith(i.path)))
    if (activa && !openSections.includes(activa.key)) {
      setOpenSections((prev) => [...prev, activa.key])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  const toggleSection = (key: string) =>
    setOpenSections((prev) => (prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]))

  const sidebarWidth = collapsed ? 56 : 248

  const asideStyle: CSSProperties = {
    background: MARINO,
    borderRight: `4px solid ${INK}`,
    width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth,
  }

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={onClose} />}

      <aside
        style={asideStyle}
        className={`fixed top-0 left-0 z-40 h-full flex flex-col overflow-hidden transition-all duration-200 lg:translate-x-0 lg:static lg:z-auto ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* HEADER */}
        {collapsed ? (
          <div style={{ background: MARINO, borderBottom: `4px solid ${INK}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 64, padding: '6px 0', gap: 4 }}>
            <img src="/logo-davidreparte.svg" alt="David Reparte" style={{ height: 30, width: 'auto' }} />
            <button onClick={toggle} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 32 }} title="Abrir">
              <ChevronRight size={18} color={ARENA} />
            </button>
          </div>
        ) : (
          <div style={{ background: MARINO, borderBottom: `4px solid ${INK}`, display: 'flex', alignItems: 'center', gap: 11, padding: '14px 16px' }}>
            <img src="/logo-davidreparte.svg" alt="David Reparte" style={{ height: 38, width: 'auto', flexShrink: 0 }} />
            <span style={{ fontFamily: OSW, fontWeight: 800, letterSpacing: '2px', color: ARENA, fontSize: 18, textTransform: 'uppercase', flex: 1, lineHeight: 1.05 }}>David Reparte</span>
            <button onClick={toggle} style={{ color: ARENA, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, fontWeight: 800, minWidth: 30, minHeight: 30 }} title="Colapsar">«</button>
          </div>
        )}

        {/* NAV */}
        <nav className="flex-1 overflow-y-auto" style={{ overflowX: 'hidden', background: MARINO }}>

          {/* Panel Global (directo) */}
          {!collapsed && perfil && (
            <NavLink to="/" end onClick={onClose}
              style={({ isActive }) => ({
                fontFamily: OSW, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 17,
                padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 11,
                borderBottom: `3px solid ${INK}`, cursor: 'pointer', textDecoration: 'none',
                color: isActive ? INK : ARENA, background: isActive ? AMBAR : MARINO,
              })}>
              {({ isActive }) => (<>
                <LayoutDashboard size={20} strokeWidth={2.4} color={isActive ? INK : AMBAR} style={{ flexShrink: 0 }} />
                <span>Panel global</span>
              </>)}
            </NavLink>
          )}
          {collapsed && perfil && (
            <NavLink to="/" end onClick={onClose} title="Panel global"
              style={({ isActive }) => ({
                width: '100%', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
                borderBottom: `3px solid ${INK}`, background: isActive ? AMBAR : MARINO,
              })}>
              {({ isActive }) => <LayoutDashboard size={20} strokeWidth={2.4} color={isActive ? INK : AMBAR} />}
            </NavLink>
          )}

          {/* Secciones de color sólido */}
          {SECTIONS.map((section) => {
            const items = section.items.filter((i) => i.perfiles.includes(perfil))
            if (!section.perfiles.includes(perfil) || items.length === 0) return null
            const isOpen = openSections.includes(section.key)
            const Icon = section.icon

            if (collapsed) {
              return (
                <button key={section.key} type="button" onClick={() => toggleSection(section.key)} title={section.label}
                  style={{ width: '100%', height: 44, background: section.headBg, border: 'none', borderBottom: `3px solid ${INK}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} strokeWidth={2.4} color={section.headColor} />
                </button>
              )
            }

            return (
              <div key={section.key}>
                <button type="button" onClick={() => toggleSection(section.key)}
                  style={{
                    width: '100%', background: section.headBg, color: section.headColor,
                    border: 'none', borderBottom: `3px solid ${INK}`, cursor: 'pointer',
                    boxShadow: isOpen ? `inset 0 -5px 0 ${INK}` : 'none',
                    display: 'flex', alignItems: 'center', gap: 11, padding: '11px 16px',
                    fontFamily: OSW, fontWeight: 800, fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.02em',
                  }}>
                  <Icon size={20} strokeWidth={2.4} color={section.headColor} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, textAlign: 'left' }}>{section.label}</span>
                  <span style={{ fontWeight: 800, fontSize: 17, display: 'inline-block', transition: 'transform .2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
                </button>

                {isOpen && (
                  <div style={{ background: BLANCO, borderBottom: `3px solid ${INK}` }}>
                    {items.map((item, idx) => {
                      const SubIcon = ICON_ROUTE[item.path]
                      return (
                        <NavLink key={item.path} to={item.path} end onClick={onClose}
                          style={({ isActive }) => ({
                            fontFamily: OSW, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.01em', fontSize: 15,
                            padding: '8px 16px 8px 18px', display: 'flex', alignItems: 'center', gap: 9,
                            cursor: 'pointer', textDecoration: 'none',
                            borderTop: idx > 0 ? '1.5px solid rgba(11,21,36,.14)' : 'none',
                            background: isActive ? INK : BLANCO,
                            color: isActive ? AMBAR : INK,
                          })}>
                          {({ isActive }) => (<>
                            {SubIcon
                              ? <SubIcon size={14} strokeWidth={2.2} color={isActive ? AMBAR : INK} style={{ flexShrink: 0 }} />
                              : <span style={{ width: 7, height: 7, flexShrink: 0, background: isActive ? AMBAR : INK, display: 'inline-block' }} />}
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                          </>)}
                        </NavLink>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* FOOTER */}
        {collapsed ? (
          <div style={{ marginTop: 'auto', background: MARINO, borderTop: `4px solid ${INK}`, padding: '10px 0', display: 'flex', justifyContent: 'center' }}>
            <button onClick={logout} style={{ width: 44, height: 32, color: ARENA, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Cerrar sesión">
              <LogOut size={16} strokeWidth={2.2} />
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 'auto', background: MARINO, borderTop: `4px solid ${INK}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ fontFamily: OSW, textTransform: 'uppercase', fontSize: 12, letterSpacing: '0.04em', color: TEXTO_SUAVE, lineHeight: 1.4 }}>
              {usuario?.nombre} — <span style={{ color: AMBAR, fontWeight: 700 }}>{usuario?.perfil}</span>
            </div>
            <button onClick={logout} style={{ color: AMBAR, background: 'none', border: 'none', cursor: 'pointer', fontFamily: OSW, textTransform: 'uppercase', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', padding: 0 }}>
              Cerrar sesión
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
