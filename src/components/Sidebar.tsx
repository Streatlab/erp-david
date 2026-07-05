import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Truck,
  Users,
  Wallet,
  Settings,
  ChevronRight,
  FileText,
  Boxes,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useSidebarState } from '@/hooks/useSidebarState'
import { SIDEBAR, SIDEBAR_SECTION_BG, OSW, LEX, AMBAR, ARENA, BLANCO, INK, MARINO, NARANJA, TERRA } from '@/styles/neobrutal'
import { getFurgonetas, type Furgoneta } from '@/lib/flota/queries'

type IconType = React.ComponentType<{
  size?: number
  strokeWidth?: number
  color?: string
  style?: React.CSSProperties
}>

interface Row { path: string; label: string }

interface Section {
  id: keyof typeof SIDEBAR_SECTION_BG
  label: string
  icon: IconType
  rows: Row[]
}

/* Sistema decorativo espejo de Binagre: bloques de sección a todo el ancho
   en color sólido + filas blancas con tinta. Paleta mediterránea David. */
const SECCIONES: Section[] = [
  {
    id: 'finanzas', label: 'Finanzas', icon: Wallet,
    rows: [
      { path: '/finanzas/facturacion',   label: 'Facturación emitida' },
      { path: '/finanzas/liquidaciones', label: 'Liquidaciones' },
      { path: '/finanzas/pagos-cobros',  label: 'Pagos y cobros' },
      { path: '/finanzas/ventas',        label: 'Ventas' },
      { path: '/punto-equilibrio',       label: 'Punto equilibrio' },
      { path: '/running',                label: 'Running' },
      { path: '/conciliacion',           label: 'Conciliación' },
      { path: '/reclamaciones',          label: 'Reclamaciones Cade' },
    ],
  },
  {
    id: 'operaciones', label: 'Operaciones', icon: Truck,
    rows: [
      { path: '/entregas',        label: 'Entregas' },
      { path: '/flota',           label: 'Flota' },
      { path: '/danos-vehiculos', label: 'Daños vehículos' },
      { path: '/mantenimiento',   label: 'Mantenimiento' },
    ],
  },
  {
    id: 'equipo', label: 'Equipo', icon: Users,
    rows: [
      { path: '/personal',        label: 'Personal' },
      { path: '/tareas',          label: 'Tareas' },
      { path: '/checklists',      label: 'Checklists' },
      { path: '/equipos',         label: 'Equipos' },
      { path: '/informes-equipo', label: 'Informes equipo' },
    ],
  },
  {
    id: 'almacen', label: 'Almacén', icon: Boxes,
    rows: [
      { path: '/pedidos',     label: 'Pedidos' },
      { path: '/inventarios', label: 'Inventarios' },
    ],
  },
  {
    id: 'documentos', label: 'Documentos', icon: FileText,
    rows: [
      { path: '/papeleo',        label: 'Papeleo' },
      { path: '/manuales',       label: 'Manuales' },
      { path: '/libro-facturas', label: 'Libro registro' },
    ],
  },
  {
    id: 'configuracion', label: 'Configuración', icon: Settings,
    rows: [
      { path: '/configuracion', label: 'Configuración' },
    ],
  },
]

const LS_SECCIONES = 'david_sidebar_secciones'

function seccionDeRuta(pathname: string): string | null {
  for (const s of SECCIONES) {
    if (s.rows.some(r => pathname === r.path || pathname.startsWith(r.path + '/'))) return s.id
  }
  return null
}

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { usuario, logout } = useAuth()
  const { collapsed, toggle } = useSidebarState()
  const perfil = usuario?.perfil ?? ''
  const location = useLocation()

  const sidebarWidth = collapsed ? SIDEBAR.widthCollapsed : SIDEBAR.widthOpen

  const [furgos, setFurgos] = useState<Furgoneta[]>([])
  const [expandidas, setExpandidas] = useState<Record<string, boolean>>(() => {
    let base: Record<string, boolean> = {}
    if (typeof window !== 'undefined') {
      try { base = JSON.parse(localStorage.getItem(LS_SECCIONES) ?? '{}') } catch { base = {} }
    }
    const activa = seccionDeRuta(typeof window !== 'undefined' ? window.location.pathname : '')
    if (activa) base[activa] = true
    return base
  })

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(LS_SECCIONES, JSON.stringify(expandidas))
  }, [expandidas])

  useEffect(() => {
    const activa = seccionDeRuta(location.pathname)
    if (activa) setExpandidas(prev => (prev[activa] ? prev : { ...prev, [activa]: true }))
  }, [location.pathname])

  useEffect(() => {
    if (perfil === 'admin') {
      getFurgonetas().then(setFurgos).catch(() => setFurgos([]))
    }
  }, [perfil])

  const rowStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px 10px 18px',
    background: isActive ? NARANJA : BLANCO,
    color: isActive ? ARENA : INK,
    fontFamily: OSW,
    fontWeight: 600,
    fontSize: 12.5,
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
    borderBottom: '1px solid rgba(11,21,36,0.18)',
    textDecoration: 'none',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  })

  const furgoStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 14px 7px 34px',
    background: isActive ? NARANJA : BLANCO,
    color: isActive ? ARENA : INK,
    fontFamily: LEX,
    fontWeight: isActive ? 700 : 500,
    fontSize: 12,
    borderBottom: '1px solid rgba(11,21,36,0.12)',
    textDecoration: 'none',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  })

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />}

      <aside
        style={{
          background: collapsed ? MARINO : ARENA,
          borderRight: `4px solid ${INK}`,
          width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth,
        }}
        className={`fixed top-0 left-0 z-40 h-full flex flex-col transition-all duration-200 overflow-hidden lg:translate-x-0 lg:static lg:z-auto ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Cabecera de marca (bloque marino) */}
        {collapsed ? (
          <div style={{ borderBottom: `3px solid ${INK}`, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 64, padding: '6px 0' }}>
            <button onClick={toggle} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }} title="Expandir">
              <img src="/logo-davidreparte.svg" alt="David Reparte" style={{ height: 32, width: 'auto', display: 'block' }} />
            </button>
          </div>
        ) : (
          <div style={{ background: MARINO, borderBottom: `4px solid ${INK}`, padding: 14, display: 'flex', alignItems: 'center', gap: 12, minHeight: 80, position: 'relative' }}>
            <img src="/logo-davidreparte.svg" alt="David Reparte" style={{ height: 40, width: 'auto', display: 'block' }} />
            <span style={{ fontFamily: OSW, fontSize: 15, color: ARENA, letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 700, lineHeight: 1.15 }}>
              David<br />Reparte
            </span>
            <button onClick={toggle} style={{ color: ARENA, background: 'none', border: 'none', cursor: 'pointer', padding: 6, position: 'absolute', top: 6, right: 6, fontFamily: OSW, fontSize: 14 }} className="hidden lg:block" title="Colapsar">«</button>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto" style={{ overflowX: 'hidden' }}>
          {/* Panel global: bloque tinta */}
          {perfil && (collapsed ? (
            <NavLink to="/" end onClick={onClose} title="Panel global"
              style={{ width: '100%', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
              {({ isActive }) => (<LayoutDashboard size={20} strokeWidth={2} color={isActive ? NARANJA : ARENA} />)}
            </NavLink>
          ) : (
            <NavLink to="/" end onClick={onClose}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '13px 14px',
                background: isActive ? NARANJA : INK,
                color: ARENA,
                fontFamily: OSW, fontWeight: 700, fontSize: 14, letterSpacing: '1.5px', textTransform: 'uppercase',
                borderBottom: `3px solid ${INK}`,
                textDecoration: 'none',
              })}>
              {({ isActive }) => (<>
                <LayoutDashboard size={18} strokeWidth={2.25} color={isActive ? ARENA : AMBAR} style={{ flexShrink: 0 }} />
                <span>Panel global</span>
              </>)}
            </NavLink>
          ))}

          {perfil === 'admin' && SECCIONES.map(sec => {
            const s = SIDEBAR_SECTION_BG[sec.id]
            const Icon = sec.icon
            const abierta = !!expandidas[sec.id]

            if (collapsed) {
              const to = sec.rows[0].path
              const activa = seccionDeRuta(location.pathname) === sec.id
              return (
                <NavLink key={sec.id} to={to} onClick={onClose} title={sec.label}
                  style={{ width: '100%', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                  <Icon size={20} strokeWidth={2} color={activa ? NARANJA : ARENA} />
                </NavLink>
              )
            }

            return (
              <div key={sec.id}>
                {/* Bloque de sección a todo el ancho */}
                <button
                  onClick={() => setExpandidas(prev => ({ ...prev, [sec.id]: !prev[sec.id] }))}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    background: s.bg, color: s.color,
                    border: 'none', borderBottom: `3px solid ${INK}`,
                    padding: '12px 14px',
                    fontFamily: OSW, fontWeight: 700, fontSize: 13.5, letterSpacing: '1.5px', textTransform: 'uppercase',
                    cursor: 'pointer', textAlign: 'left',
                  }}>
                  <Icon size={17} strokeWidth={2.25} color={s.color} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{sec.label}</span>
                  <ChevronRight size={15} strokeWidth={2.5} color={s.color}
                    style={{ transform: abierta ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }} />
                </button>

                {/* Filas blancas */}
                {abierta && sec.rows.map(r => (
                  <div key={r.path}>
                    <NavLink to={r.path} onClick={onClose} end={r.path !== '/flota'}
                      style={({ isActive }) => rowStyle(isActive)}>
                      {({ isActive }) => (<>
                        <span style={{ width: 6, height: 6, background: isActive ? ARENA : INK, flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</span>
                      </>)}
                    </NavLink>
                    {r.path === '/flota' && furgos.map(f => (
                      <NavLink key={f.id} to={`/flota/${f.codigo}`} onClick={onClose}
                        style={({ isActive }) => furgoStyle(isActive)}>
                        {({ isActive }) => (<>
                          <span style={{ width: 5, height: 5, background: isActive ? ARENA : AMBAR, flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {f.matricula} · {f.nombre_corto ?? f.conductor}
                          </span>
                        </>)}
                      </NavLink>
                    ))}
                  </div>
                ))}
              </div>
            )
          })}
        </nav>

        {/* Pie */}
        <div style={{ padding: 12, borderTop: `3px solid ${INK}`, background: collapsed ? MARINO : ARENA, fontFamily: LEX, fontSize: 12, textAlign: collapsed ? 'center' : 'left' }}>
          {!collapsed ? (
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: INK, fontWeight: 700 }}>
                {usuario?.nombre} <span style={{ color: NARANJA, fontFamily: OSW, fontWeight: 700, textTransform: 'uppercase', fontSize: 11, letterSpacing: '1px' }}>{usuario?.perfil}</span>
              </div>
              <button onClick={logout} style={{ color: TERRA, fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: OSW, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                Cerrar sesión
              </button>
            </div>
          ) : (
            <button onClick={logout} style={{ color: ARENA, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', fontFamily: OSW, fontSize: 11 }} title="Cerrar sesión">
              ✕
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
