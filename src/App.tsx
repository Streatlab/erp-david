import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import PanelGlobal from '@/pages/PanelGlobal'
const Entregas = lazy(() => import('@/pages/Entregas'))
const Conciliacion = lazy(() => import('@/pages/Conciliacion'))
const Flota = lazy(() => import('@/pages/Flota'))
const FurgonetaDetalle = lazy(() => import('@/pages/FurgonetaDetalle'))
const Reposicion = lazy(() => import('@/pages/flota/Reposicion'))
const BancosPage = lazy(() => import('@/pages/configuracion/bancos/BancosPage'))
const Running = lazy(() => import('@/pages/finanzas/Running'))
const RunningFamilia = lazy(() => import('@/pages/finanzas/RunningFamilia'))
const DocumentacionCade = lazy(() => import('@/pages/finanzas/DocumentacionCade'))
const FacturacionEmitida = lazy(() => import('@/pages/finanzas/FacturacionEmitida'))
const Liquidaciones = lazy(() => import('@/pages/finanzas/Liquidaciones'))
const PagosCobros = lazy(() => import('@/pages/finanzas/PagosCobros'))
const PuntoEquilibrio = lazy(() => import('@/pages/finanzas/PuntoEquilibrio'))
const Ventas = lazy(() => import('@/pages/finanzas/Ventas'))
const Escenarios = lazy(() => import('@/pages/finanzas/Escenarios'))
const ReclamacionesCade = lazy(() => import('@/pages/ReclamacionesCade'))
const Papeleo = lazy(() => import('@/pages/Papeleo'))
const Tareas = lazy(() => import('@/pages/Tareas'))
const Personas = lazy(() => import('@/pages/equipo/Personas'))
const Organigrama = lazy(() => import('@/pages/equipo/Organigrama'))
const Presencia = lazy(() => import('@/pages/equipo/Presencia'))
const CalendarioLaboral = lazy(() => import('@/pages/equipo/CalendarioLaboral'))
const Checklists = lazy(() => import('@/pages/operaciones/Checklists'))
const Manuales = lazy(() => import('@/pages/operaciones/Manuales'))
const LibroEquipos = lazy(() => import('@/pages/operaciones/LibroEquipos'))
const DanosVehiculos = lazy(() => import('@/pages/operaciones/DanosVehiculos'))
const Mantenimiento = lazy(() => import('@/pages/operaciones/Mantenimiento'))
const Informes = lazy(() => import('@/pages/informes/Informes'))
const InformesEquipo = lazy(() => import('@/pages/informes/InformesEquipo'))
const Usuarios = lazy(() => import('@/pages/configuracion/Usuarios'))

/* Cada pantalla se descarga la primera vez que se abre (antes iba toda la app en un bloque de 1,7 MB) */
function Cargando() {
  return <div style={{ padding: 24, fontFamily: "'Oswald', sans-serif", fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', fontSize: 13 }}>Cargando…</div>
}

function ProtectedRoute({ children, solo }: { children: React.ReactNode; solo?: string[] }) {
  const { usuario, estado } = useAuth()
  if (estado === 'cargando') return null
  if (!usuario) return <Navigate to="/login" replace />
  if (solo && !solo.includes(usuario.perfil)) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { usuario } = useAuth()

  return (
    <Suspense fallback={<Cargando />}>
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<PanelGlobal />} />

        <Route path="tareas" element={<ProtectedRoute solo={['admin']}><Tareas /></ProtectedRoute>} />

        {/* Finanzas */}
        <Route path="papeleo"                element={<ProtectedRoute solo={['admin']}><Papeleo /></ProtectedRoute>} />
        <Route path="finanzas/facturacion"   element={<ProtectedRoute solo={['admin']}><FacturacionEmitida /></ProtectedRoute>} />
        <Route path="finanzas/ventas"        element={<ProtectedRoute solo={['admin']}><Ventas /></ProtectedRoute>} />
        <Route path="finanzas/liquidaciones" element={<ProtectedRoute solo={['admin']}><Liquidaciones /></ProtectedRoute>} />
        <Route path="finanzas/pagos-cobros"  element={<ProtectedRoute solo={['admin']}><PagosCobros /></ProtectedRoute>} />
        <Route path="punto-equilibrio"       element={<ProtectedRoute solo={['admin']}><PuntoEquilibrio /></ProtectedRoute>} />
        <Route path="running"                element={<ProtectedRoute solo={['admin']}><Running /></ProtectedRoute>} />
        <Route path="finanzas/running-familia" element={<ProtectedRoute solo={['admin']}><RunningFamilia /></ProtectedRoute>} />
        <Route path="finanzas/documentacion" element={<ProtectedRoute solo={['admin']}><DocumentacionCade /></ProtectedRoute>} />
        <Route path="finanzas/escenarios"    element={<ProtectedRoute solo={['admin']}><Escenarios /></ProtectedRoute>} />
        <Route path="conciliacion"           element={<ProtectedRoute solo={['admin']}><Conciliacion /></ProtectedRoute>} />

        {/* Operación */}
        <Route path="entregas"      element={<ProtectedRoute solo={['admin']}><Entregas /></ProtectedRoute>} />
        <Route path="flota"             element={<ProtectedRoute solo={['admin']}><Flota /></ProtectedRoute>} />
        <Route path="flota/reposicion"  element={<ProtectedRoute solo={['admin']}><Reposicion /></ProtectedRoute>} />
        <Route path="flota/:codigo"     element={<ProtectedRoute solo={['admin']}><FurgonetaDetalle /></ProtectedRoute>} />
        <Route path="reclamaciones" element={<ProtectedRoute solo={['admin']}><ReclamacionesCade /></ProtectedRoute>} />
        <Route path="danos-vehiculos" element={<ProtectedRoute solo={['admin']}><DanosVehiculos /></ProtectedRoute>} />
        <Route path="mantenimiento" element={<ProtectedRoute solo={['admin']}><Mantenimiento /></ProtectedRoute>} />
        <Route path="checklists"    element={<ProtectedRoute solo={['admin']}><Checklists /></ProtectedRoute>} />
        <Route path="manuales"      element={<ProtectedRoute solo={['admin']}><Manuales /></ProtectedRoute>} />
        <Route path="equipos"       element={<ProtectedRoute solo={['admin']}><LibroEquipos /></ProtectedRoute>} />

        {/* Equipo */}
        <Route path="personal"    element={<ProtectedRoute solo={['admin']}><Personas /></ProtectedRoute>} />
        <Route path="organigrama" element={<ProtectedRoute solo={['admin']}><Organigrama /></ProtectedRoute>} />
        <Route path="presencia"   element={<ProtectedRoute solo={['admin']}><Presencia /></ProtectedRoute>} />
        <Route path="calendario-laboral" element={<ProtectedRoute solo={['admin']}><CalendarioLaboral /></ProtectedRoute>} />

        {/* Informes */}
        <Route path="informes"        element={<ProtectedRoute solo={['admin']}><Informes /></ProtectedRoute>} />
        <Route path="informes-equipo" element={<ProtectedRoute solo={['admin']}><InformesEquipo /></ProtectedRoute>} />

        <Route path="liquidacion-cade" element={<Navigate to="/finanzas/liquidaciones" replace />} />

        {/* Configuración */}
        <Route path="configuracion" element={<Navigate to="/configuracion/bancos" replace />} />
        <Route path="configuracion/bancos" element={<ProtectedRoute solo={['admin']}><BancosPage /></ProtectedRoute>} />
        <Route path="configuracion/usuarios" element={<ProtectedRoute solo={['admin']}><Usuarios /></ProtectedRoute>} />
        <Route path="configuracion/:slug" element={<Navigate to="/configuracion/bancos" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
