import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Truck,
  Users,
  Route as RouteIcon,
  Wallet,
  ClipboardList,
  Settings,
  LogOut,
  ChevronRight,
  ListChecks,
  FileText,
  BookOpen,
  AlertTriangle,
  Library,
  Wrench,
  Boxes,
  ShoppingCart,
  HardHat,
  CarFront,
  BarChart3,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useSidebarState } from '@/hooks/useSidebarState'
import { SIDEBAR, SIDEBAR_SECTION_BG, OSW, LEX, AMBAR, ARENA, INK, NARANJA } from '@/styles/neobrutal'
import { getFurgonetas, type Furgoneta } from '@/lib/flota/queries'

type IconType = React.ComponentType<{
  size?: number
  strokeWidth?: number
  color?: string
  style?: React.CSSProperties
}>

interface NavChild { path: string; label: string }

interface NavItem {
  path: string
  label: string
  icon: IconType
  perfiles: string[]
  expandable?: 'flota' | 'group'
  children?: NavChild[]
}

interface NavSection {
  id: keyof typeof SIDEBAR_SECTION_BG
  label: string
  items: NavItem[]
}

const FINANZAS_CHILDREN: NavChild[] = [
  { path: '/finanzas/facturacion',   label: 'Facturación emitida' },
  { path: '/finanzas/liquidaciones', label: 'Liquidaciones' },
  { path: '/finanzas/pagos-cobros',  label: 'Pagos y Cobros' },
  { path: '/finanzas/ventas',        label: 'Ventas' },
  { path: '/punto-equilibrio',       label: 'Punto equilibrio' },
  { path: '/running',                label: 'Running' },
  { path: '/conciliacion',           label: 'Conciliación' },
]

/* Sistema decorativo: menú agrupado por áreas con cabecera de color sólido
   (espejo estructural del sidebar Binagre, paleta mediterránea David). */
const SECCIONES: NavSection[] = [
  {
    id: 'finanzas', label: 'Finanzas',
    items: [
      { path: '/finanzas',      label: 'Finanzas',           icon: Wallet,        perfiles: ['admin'], expandable: 'group', children: FINANZAS_CHILDREN },
      { path: '/reclamaciones', label: 'Reclamaciones Cade', icon: AlertTriangle, perfiles: ['admin'] },
    ],
  },
  {
    id: 'operaciones', label: 'Operaciones',
    items: [
      { path: '/entregas',        label: 'Entregas',        icon: Truck,     perfiles: ['admin'] },
      { path: '/flota',           label: 'Flota',           icon: RouteIcon, perfiles: ['admin'], expandable: 'flota' },
      { path: '/danos-vehiculos', label: 'Daños vehículos', icon: CarFront,  perfiles: ['admin'] },
      { path: '/mantenimiento',   label: 'Mantenimiento',   icon: Wrench,    perfiles: ['admin'] },
    ],
  },
  {
    id: 'equipo', label: 'Equipo',
    items: [
      { path: '/personal',        label: 'Personal',        icon: Users,         perfiles: ['admin'] },
      { path: '/tareas',          label: 'Tareas',          icon: ListChecks,    perfiles: ['admin'] },
      { path: '/checklists',      label: 'Checklists',      icon: ClipboardList, perfiles: ['admin'] },
      { path: '/equipos',         label: 'Equipos',         icon: HardHat,       perfiles: ['admin'] },
      { path: '/informes-equipo', label: 'Informes equipo', icon: BarChart3,     perfiles: ['admin'] },
    ],
  },
  {
    id: 'almacen', label: 'Almacén',
    items: [
      { path: '/pedidos',     label: 'Pedidos',     icon: ShoppingCart, perfiles: ['admin'] },
      { path: '/inventarios', label: 'Inventarios', icon: Boxes,        perfiles: ['admin'] },
    ],
  },
  {
    id: 'documentos', label: 'Documentos',
    items: [
      { path: '/papeleo',        label: 'Papeleo',        icon: FileText, perfiles: ['admin'] },
      { path: '/manuales',       label: 'Manuales',       icon: BookOpen, perfiles: ['admin'] },
      { path: '/libro-facturas', label: 'Libro registro', icon: Library,  perfiles: ['admin'] },
    ],
  },
  {
    id: 'configuracion', label: 'Configuración',
    items: [
      { path: '/configuracion', label: 'Configuración', icon: Settings, perfiles: ['admin'] },
    ],
  },
]

const TEXTO_SUAVE = 'rgba(245,236,217,0.72)' // ARENA al 72% para items inactivos

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { usuario, logout } = useAuth()
  const { collapsed, toggle } = useSidebarState()
  const perfil = usuario?.perfil ?? ''
  const location = useLocation()

  const sidebarWidth = collapsed ? SIDEBAR.widthCollapsed : SIDEBAR.widthOpen

  const [furgos, setFurgos] = useState<Furgoneta[]>([])
  const [flotaExpanded, setFlotaExpanded] = useState<boolean>(location.pathname.startsWith('/flota'))
  const finanzasActiva = FINANZAS_CHILDREN.some(c => location.pathname.startsWith(c.path))
  const [finanzasExpanded, setFinanzasExpanded] = useState<boolean>(finanzasActiva)

  useEffect(() => {
    if (location.pathname.startsWith('/flota')) setFlotaExpanded(true)
    if (FINANZAS_CHILDREN.some(c => location.pathname.startsWith(c.path))) setFinanzasExpanded(true)
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
    padding: '9px 14px 9px 12px',
    margin: '3px 10px',
    borderRadius: 0,
    fontFamily: LEX,
    fontSize: 13,
    fontWeight: isActive ? 700 : 600,
    color: isActive ? ARENA : TEXTO_SUAVE,
    background: isActive ? NARANJA : 'transparent',
    border: isActive ? `2px solid ${INK}` : '2px solid transparent',
    boxShadow: isActive ? `3px 3px 0 ${INK}` : 'none',
    textDecoration: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    flex: 1,
  })

  const subItemStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 14px 6px 36px',
    margin: '1px 10px',
    borderRadius: 0,
    fontFamily: LEX,
    fontSize: 12,
    fontWeight: isActive ? 700 : 400,
    color: isActive ? AMBAR : TEXTO_SUAVE,
    background: isActive ? 'rgba(11,21,36,0.55)' : 'transparent',
    borderLeft: isActive ? `3px solid ${AMBAR}` : '3px solid transparent',
    textDecoration: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  })

  /** Cabecera decorativa de sección: bloque de color sólido con borde INK. */
  const sectionHeaderStyle = (id: NavSection['id']): React.CSSProperties => {
    const s = SIDEBAR_SECTION_BG[id]
    return {
      background: s.bg,
      color: s.color,
      fontFamily: OSW,
      fontWeight: 600,
      fontSize: 11,
      letterSpacing: '2px',
      textTransform: 'uppercase',
      padding: '5px 14px',
      margin: '14px 10px 4px',
      border: `2px solid ${INK}`,
      boxShadow: `3px 3px 0 ${INK}`,
    }
  }

  const chevron = (expanded: boolean, active: boolean, onClick: () => void, title: string) => (
    <button
      onClick={onClick}
      style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        padding: '8px 12px', marginRight: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      title={title}
    >
      <ChevronRight
        size={14}
        strokeWidth={2.5}
        color={active ? ARENA : TEXTO_SUAVE}
        style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }}
      />
    </button>
  )

  const renderItem = (item: NavItem) => {
    const Icon = item.icon
    if (collapsed) {
      const to = item.expandable === 'group' ? (item.children?.[0]?.path ?? item.path) : item.path
      return (
        <NavLink key={item.path} to={to} onClick={onClose} title={item.label}
          style={{ width: '100%', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
          {({ isActive }) => (<Icon size={20} strokeWidth={2} color={isActive ? NARANJA : TEXTO_SUAVE} />)}
        </NavLink>
      )
    }

    // Grupo Finanzas
    if (item.expandable === 'group') {
      const isActive = finanzasActiva
      return (
        <div key={item.path}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              onClick={() => setFinanzasExpanded(v => !v)}
              style={itemStyle(isActive)}
            >
              <Icon size={18} strokeWidth={2} color={isActive ? ARENA : TEXTO_SUAVE} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
            </div>
            {chevron(finanzasExpanded, isActive, () => setFinanzasExpanded(v => !v), finanzasExpanded ? 'Colapsar' : 'Expandir')}
          </div>
          {finanzasExpanded && item.children?.map(c => (
            <NavLink key={c.path} to={c.path} onClick={onClose} style={({ isActive }) => subItemStyle(isActive)}>
              <span style={{ width: 6, height: 6, background: AMBAR, flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
            </NavLink>
          ))}
        </div>
      )
    }

    // Flota expandible
    if (item.expandable === 'flota') {
      const isActive = location.pathname.startsWith('/flota')
      return (
        <div key={item.path}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <NavLink to={item.path} onClick={onClose} end style={() => itemStyle(isActive)}>
              <Icon size={18} strokeWidth={2} color={isActive ? ARENA : TEXTO_SUAVE} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
            </NavLink>
            {chevron(flotaExpanded, isActive, () => setFlotaExpanded(v => !v), flotaExpanded ? 'Colapsar' : 'Expandir')}
          </div>

          {flotaExpanded && furgos.map(f => (
            <NavLink
              key={f.id}
              to={`/flota/${f.codigo}`}
              onClick={onClose}
              style={({ isActive }) => subItemStyle(isActive)}
            >
              <span style={{ width: 6, height: 6, background: AMBAR, flexShrink: 0 }} />
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
          <Icon size={18} strokeWidth={2} color={isActive ? ARENA : TEXTO_SUAVE} style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
        </>)}
      </NavLink>
    )
  }

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />}

      <aside
        style={{
          background: SIDEBAR.BG,
          borderRight: SIDEBAR.border,
          width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth,
        }}
        className={`fixed top-0 left-0 z-40 h-full flex flex-col transition-all duration-200 overflow-hidden lg:translate-x-0 lg:static lg:z-auto ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {collapsed ? (
          <div style={{ borderBottom: SIDEBAR.sep, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 64, padding: '6px 0', gap: 4 }}>
            <button onClick={toggle} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 2 }} title="Expandir">
              <img src="/logo-davidreparte.svg" alt="David Reparte" style={{ height: 32, width: 'auto', display: 'block' }} />
            </button>
          </div>
        ) : (
          <div style={{ padding: 14, borderBottom: SIDEBAR.sep, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 88, position: 'relative', background: SIDEBAR.BG }}>
            <img src="/logo-davidreparte.svg" alt="David Reparte" style={{ height: 44, width: 'auto', display: 'block' }} />
            <span style={{ fontFamily: OSW, fontSize: 12, color: ARENA, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600, marginTop: 6 }}>
              David Reparte
            </span>
            <button onClick={toggle} style={{ color: TEXTO_SUAVE, background: 'none', border: 'none', cursor: 'pointer', padding: 6, position: 'absolute', top: 8, right: 8, fontFamily: OSW }} className="hidden lg:block" title="Colapsar">«</button>
          </div>
        )}

        <nav className="flex-1 py-2 overflow-y-auto" style={{ overflowX: 'hidden' }}>
          {(!collapsed && perfil) && (
            <NavLink to="/" end onClick={onClose}
              style={({ isActive }) => ({
                width: 'auto', background: isActive ? NARANJA : 'transparent',
                border: isActive ? `2px solid ${INK}` : '2px solid transparent',
                boxShadow: isActive ? `3px 3px 0 ${INK}` : 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                gap: 10, padding: '10px 14px 10px 12px', margin: '3px 10px', borderRadius: 0,
                fontFamily: OSW, fontSize: 12, textTransform: 'uppercase',
                letterSpacing: '1.5px', fontWeight: 700,
                color: isActive ? ARENA : AMBAR, textDecoration: 'none',
              })}>
              {({ isActive }) => (<>
                <LayoutDashboard size={18} strokeWidth={2} color={isActive ? ARENA : AMBAR} style={{ flexShrink: 0 }} />
                <span>Panel global</span>
              </>)}
            </NavLink>
          )}

          {collapsed && perfil && (
            <NavLink to="/" end onClick={onClose} title="Panel global"
              style={{ width: '100%', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
              {({ isActive }) => (<LayoutDashboard size={20} strokeWidth={2} color={isActive ? NARANJA : TEXTO_SUAVE} />)}
            </NavLink>
          )}

          {SECCIONES.map(sec => {
            const items = sec.items.filter(i => i.perfiles.includes(perfil))
            if (items.length === 0) return null
            return (
              <div key={sec.id}>
                {!collapsed && <div style={sectionHeaderStyle(sec.id)}>{sec.label}</div>}
                {items.map(renderItem)}
              </div>
            )
          })}
        </nav>

        <div style={{ padding: 14, borderTop: SIDEBAR.sep, fontFamily: LEX, fontSize: 12, color: TEXTO_SUAVE, textAlign: collapsed ? 'center' : 'left', background: SIDEBAR.BG }}>
          {!collapsed ? (
            <>
              <div style={{ marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: ARENA, fontWeight: 600 }}>
                {usuario?.nombre} — <span style={{ color: AMBAR, fontWeight: 700 }}>{usuario?.perfil}</span>
              </div>
              <button onClick={logout} style={{ color: TEXTO_SUAVE, fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: LEX }}>
                Cerrar sesión
              </button>
            </>
          ) : (
            <button onClick={logout} style={{ color: TEXTO_SUAVE, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Cerrar sesión">
              <LogOut size={16} strokeWidth={2} />
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
