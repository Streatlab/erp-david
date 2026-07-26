import { NavLink } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  LayoutDashboard,
  BellRing,
  Wallet,
  AlertTriangle,
  Truck,
  Route as RouteIcon,
  CarFront,
  Wrench,
  Users,
  User,
  ClipboardList,
  HardHat,
  BarChart3,
  FileText,
  BookOpen,
  Library,
  Settings,
  Network,
  Clock,
  Banknote,
  UserCog,
  Receipt,
  TrendingUp,
  ArrowLeftRight,
  Scale,
  Activity,
  CheckCheck,
  ChevronRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ThemeToggle } from '@/components/ThemeToggle'
import {
  OSW, INK, MARINO, ARENA, BLANCO, AMBAR, NARANJA,
  CELESTE, OLIVA, BERENJENA, VERDEMAR,
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

/* Estructura espejo de Binagre, adaptada a David. Bloques de color sólido sobre
   sidebar marino. Comportamiento: hover-abre + auto-colapsa 20s + acordeón máx 2. */
const SECTIONS: NavSection[] = [
  {
    key: 'finanzas', label: 'Finanzas', icon: Wallet,
    headBg: CELESTE, headColor: ARENA, perfiles: ['admin'],
    items: [
      { path: '/papeleo',               label: 'Papeleo',             perfiles: ['admin'] },
      { path: '/finanzas/facturacion',  label: 'Facturación',         perfiles: ['admin'] },
      { path: '/finanzas/ventas',       label: 'Ventas',              perfiles: ['admin'] },
      { path: '/finanzas/liquidaciones',label: 'Liquidaciones',       perfiles: ['admin'] },
      { path: '/finanzas/pagos-cobros', label: 'Pagos y Cobros',      perfiles: ['admin'] },
      { path: '/punto-equilibrio',      label: 'Punto equilibrio',    perfiles: ['admin'] },
      { path: '/running',               label: 'Running',             perfiles: ['admin'] },
      { path: '/finanzas/escenarios',   label: 'Escenarios',          perfiles: ['admin'] },
      { path: '/conciliacion',          label: 'Conciliación',        perfiles: ['admin'] },
      { path: '/reclamaciones',         label: 'Reclamaciones Cade',  perfiles: ['admin'] },
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
      { path: '/checklists',      label: 'Checklists',      perfiles: ['admin'] },
      { path: '/manuales',        label: 'Manuales',        perfiles: ['admin'] },
      { path: '/equipos',         label: 'Libro Equipos',   perfiles: ['admin'] },
    ],
  },
  {
    key: 'equipo', label: 'Equipo', icon: Users,
    headBg: OLIVA, headColor: ARENA, perfiles: ['admin'],
    items: [
      { path: '/personal',    label: 'Personas',    perfiles: ['admin'] },
      { path: '/organigrama', label: 'Organigrama', perfiles: ['admin'] },
      { path: '/presencia',   label: 'Presencia',   perfiles: ['admin'] },
    ],
  },
  {
    key: 'informes', label: 'Informes', icon: BarChart3,
    headBg: BERENJENA, headColor: ARENA, perfiles: ['admin'],
    items: [
      { path: '/informes',         label: 'Panel informes',  perfiles: ['admin'] },
      { path: '/informes-equipo',  label: 'Informes equipo', perfiles: ['admin'] },
    ],
  },
  {
    key: 'configuracion', label: 'Configuración', icon: Settings,
    headBg: VERDEMAR, headColor: ARENA, perfiles: ['admin'],
    items: [
      { path: '/configuracion/bancos',   label: 'Bancos y Cuentas', perfiles: ['admin'] },
      { path: '/configuracion/usuarios', label: 'Usuarios',         perfiles: ['admin'] },
    ],
  },
]

/* Icono propio para CADA módulo (como en Binagre). */
const ICON_ROUTE: Record<string, LucideIcon> = {
  '/papeleo': FileText,
  '/finanzas/facturacion': Receipt,
  '/finanzas/ventas': TrendingUp,
  '/finanzas/liquidaciones': Wallet,
  '/finanzas/pagos-cobros': ArrowLeftRight,
  '/punto-equilibrio': Scale,
  '/running': Activity,
  '/finanzas/escenarios': Clock,
  '/conciliacion': CheckCheck,
  '/reclamaciones': AlertTriangle,
  '/entregas': Truck,
  '/flota': RouteIcon,
  '/danos-vehiculos': CarFront,
  '/mantenimiento': Wrench,
  '/checklists': ClipboardList,
  '/manuales': BookOpen,
  '/equipos': HardHat,
  '/libro-facturas': Library,
  '/personal': User,
  '/organigrama': Network,
  '/presencia': Clock,
  '/informes': BarChart3,
  '/informes-equipo': Users,
  '/configuracion/bancos': Banknote,
  '/configuracion/usuarios': UserCog,
}

const OPEN_SECTIONS_LS_KEY = 'david.sidebar.openSections'
const TEXTO_SUAVE = 'rgba(245,236,217,0.72)' // ARENA 72% sobre marino

function loadOpenSections(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(OPEN_SECTIONS_LS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) return arr.filter((x) => typeof x === 'string').slice(-2)
    return []
  } catch { return [] }
}

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { usuario, logout } = useAuth()
  const perfil = usuario?.perfil ?? ''

  // Detección de móvil (equivalente a useEsMovil de Binagre)
  const [esMovil, setEsMovil] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 767px)')
    const on = () => setEsMovil(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const [openSections, setOpenSections] = useState<string[]>(() => loadOpenSections())
  useEffect(() => {
    if (typeof window === 'undefined') return
    try { localStorage.setItem(OPEN_SECTIONS_LS_KEY, JSON.stringify(openSections)) } catch { /* noop */ }
  }, [openSections])

  // Colapso Binagre: hover/clic ABRE y queda 20s; luego autocolapsa
  const [abierto, setAbierto] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const OPEN_MS = 20000

  const abrir20s = () => {
    setAbierto(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setAbierto(false), OPEN_MS)
  }

  useEffect(() => {
    abrir20s()
    return () => { if (timer.current) clearTimeout(timer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const collapsed = esMovil ? false : !abierto

  const toggleSection = (key: string) => {
    abrir20s()
    setOpenSections((prev) => {
      if (prev.includes(key)) return prev.filter((s) => s !== key)
      const next = [...prev, key]
      if (next.length > 2) next.shift()
      return next
    })
  }

  const filterItems = (items: NavItem[]) => items.filter((i) => i.perfiles.includes(perfil))
  const sidebarWidth = collapsed ? 72 : 252

  const asideStyle: CSSProperties = {
    background: MARINO,
    borderRight: `4px solid ${INK}`,
    width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth,
    scrollbarWidth: 'none',
  }

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={onClose} />}

      <aside
        style={asideStyle}
        onMouseEnter={() => { if (!esMovil) abrir20s() }}
        className={`sl-noscroll fixed top-0 left-0 z-40 h-full flex flex-col overflow-hidden transition-all duration-[250ms] ease-[ease] md:translate-x-0 md:static md:z-auto ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <style>{`.sl-noscroll *::-webkit-scrollbar{width:0;height:0;display:none}.sl-noscroll *{scrollbar-width:none}`}</style>

        {/* HEADER */}
        {collapsed ? (
          <div style={{ background: MARINO, borderBottom: `4px solid ${INK}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 64, padding: '8px 0', gap: 4 }}>
            <img src="/logo-davidreparte.svg" alt="David Reparte" style={{ height: 34, width: 'auto' }} />
            <button onClick={abrir20s} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 34 }} title="Abrir">
              <ChevronRight size={20} color={ARENA} />
            </button>
          </div>
        ) : (
          <div style={{ background: MARINO, borderBottom: `4px solid ${INK}`, display: 'flex', alignItems: 'center', gap: 11, padding: '15px 16px' }}>
            <img src="/logo-davidreparte.svg" alt="David Reparte" style={{ height: 38, width: 'auto', flexShrink: 0 }} />
            <span style={{ fontFamily: OSW, fontWeight: 800, letterSpacing: '2px', color: ARENA, fontSize: 20, textTransform: 'uppercase', flex: 1, lineHeight: 1.05 }}>David Reparte</span>
            <button
              onClick={() => { if (esMovil) onClose(); else setAbierto(false) }}
              style={{ color: ARENA, background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, fontWeight: 800, minWidth: 32, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Colapsar"
            >«</button>
          </div>
        )}

        {/* NAV */}
        <nav className="flex-1 overflow-y-auto" style={{ overflowX: 'hidden', background: MARINO }}>

          {/* Panel Global (directo) */}
          {!collapsed && perfil && (
            <NavLink to="/" end onClick={onClose}
              style={({ isActive }) => ({
                fontFamily: OSW, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 18,
                padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 11,
                borderBottom: `3px solid ${INK}`, cursor: 'pointer', textDecoration: 'none',
                color: isActive ? INK : ARENA, background: isActive ? AMBAR : MARINO,
              })}>
              {({ isActive }) => (<>
                <LayoutDashboard size={20} strokeWidth={2.4} color={isActive ? INK : AMBAR} style={{ flexShrink: 0 }} />
                <span>Panel Global</span>
              </>)}
            </NavLink>
          )}
          {collapsed && perfil && (
            <NavLink to="/" end onClick={() => { abrir20s(); onClose() }} title="Panel Global"
              style={({ isActive }) => ({
                width: '100%', height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', borderBottom: `3px solid ${INK}`,
                background: isActive ? AMBAR : MARINO,
              })}>
              {({ isActive }) => <LayoutDashboard size={22} strokeWidth={2.4} color={isActive ? INK : AMBAR} />}
            </NavLink>
          )}

          {/* Tareas (directo) */}
          {!collapsed && perfil && (
            <NavLink to="/tareas" onClick={onClose}
              style={({ isActive }) => ({
                fontFamily: OSW, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 18,
                padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 11,
                borderBottom: `3px solid ${INK}`, cursor: 'pointer', textDecoration: 'none',
                color: isActive ? INK : ARENA, background: isActive ? AMBAR : MARINO,
              })}>
              {({ isActive }) => (<>
                <BellRing size={20} strokeWidth={2.4} color={isActive ? INK : AMBAR} style={{ flexShrink: 0 }} />
                <span>Tareas</span>
              </>)}
            </NavLink>
          )}
          {collapsed && perfil && (
            <NavLink to="/tareas" onClick={() => { abrir20s(); onClose() }} title="Tareas"
              style={({ isActive }) => ({
                width: '100%', height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', borderBottom: `3px solid ${INK}`,
                background: isActive ? AMBAR : MARINO,
              })}>
              {({ isActive }) => <BellRing size={22} strokeWidth={2.4} color={isActive ? INK : AMBAR} />}
            </NavLink>
          )}

          {/* Secciones de color sólido */}
          {SECTIONS.map((section) => {
            const visibleItems = filterItems(section.items)
            if (!section.perfiles.includes(perfil) || visibleItems.length === 0) return null
            const isOpen = openSections.includes(section.key)
            const Icon = section.icon

            return (
              <div key={section.key}>
                {collapsed ? (
                  <button type="button" onClick={() => toggleSection(section.key)} title={section.label}
                    style={{ width: '100%', height: 46, background: section.headBg, border: 'none', borderBottom: `3px solid ${INK}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={22} strokeWidth={2.4} color={section.headColor} />
                  </button>
                ) : (
                  <button type="button" onClick={() => toggleSection(section.key)}
                    style={{
                      width: '100%', background: section.headBg, color: section.headColor,
                      border: 'none', borderBottom: `3px solid ${INK}`, cursor: 'pointer',
                      boxShadow: isOpen ? `inset 0 -5px 0 ${INK}` : 'none',
                      display: 'flex', alignItems: 'center', gap: 11, padding: '11px 16px',
                      fontFamily: OSW, fontWeight: 800, fontSize: 19, textTransform: 'uppercase', letterSpacing: '0.02em',
                    }}>
                    <Icon size={20} strokeWidth={2.4} color={section.headColor} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, textAlign: 'left' }}>{section.label}</span>
                    <span style={{ fontWeight: 800, fontSize: 17, transition: 'transform .2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>›</span>
                  </button>
                )}

                {!collapsed && isOpen && (
                  <div style={{ background: BLANCO, borderBottom: `3px solid ${INK}` }}>
                    {visibleItems.map((item, idx) => {
                      const SubIcon = ICON_ROUTE[item.path] ?? FileText
                      return (
                        <NavLink key={`${item.path}-${idx}`} to={item.path} end onClick={onClose}
                          style={({ isActive }) => ({
                            fontFamily: OSW, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.01em', fontSize: 16,
                            padding: '8px 16px 8px 18px', display: 'flex', alignItems: 'center', gap: 9,
                            cursor: 'pointer', textDecoration: 'none',
                            borderTop: idx > 0 ? '1.5px solid rgba(11,21,36,.14)' : 'none',
                            background: isActive ? INK : BLANCO,
                            color: isActive ? AMBAR : INK,
                          })}>
                          {({ isActive }) => (<>
                            <SubIcon size={15} strokeWidth={2.2} color={isActive ? AMBAR : INK} style={{ flexShrink: 0 }} />
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

        {/* FOOTER con toggle modo oscuro */}
        {collapsed ? (
          <div style={{ marginTop: 'auto', background: MARINO, borderTop: `4px solid ${INK}`, padding: '10px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ background: ARENA, border: `2px solid ${INK}`, width: 40, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ThemeToggle />
            </div>
            <button onClick={logout} style={{ width: 44, height: 30, color: ARENA, background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Cerrar sesión">⏏</button>
          </div>
        ) : (
          <div style={{ marginTop: 'auto', background: MARINO, borderTop: `4px solid ${INK}`, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ background: ARENA, border: `2px solid ${INK}`, width: 40, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ThemeToggle />
            </div>
            <div style={{ fontFamily: OSW, textTransform: 'uppercase', fontSize: 12, letterSpacing: '0.04em', color: TEXTO_SUAVE, lineHeight: 1.4, textAlign: 'right' }}>
              {usuario?.nombre} — <span style={{ color: AMBAR, fontWeight: 700 }}>{usuario?.perfil}</span><br />
              <button onClick={logout} style={{ color: AMBAR, background: 'none', border: 'none', cursor: 'pointer', fontFamily: OSW, textTransform: 'uppercase', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', padding: 0 }}>
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
