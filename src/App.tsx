import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import PanelGlobal from '@/pages/PanelGlobal'
import Entregas from '@/pages/Entregas'
import Conciliacion from '@/pages/Conciliacion'
import Flota from '@/pages/Flota'
import FurgonetaDetalle from '@/pages/FurgonetaDetalle'
import BancosPage from '@/pages/configuracion/bancos/BancosPage'
import Running from '@/pages/finanzas/Running'
import FacturacionEmitida from '@/pages/finanzas/FacturacionEmitida'
import Liquidaciones from '@/pages/finanzas/Liquidaciones'
import PagosCobros from '@/pages/finanzas/PagosCobros'
import PuntoEquilibrio from '@/pages/finanzas/PuntoEquilibrio'
import Ventas from '@/pages/finanzas/Ventas'
import Escenarios from '@/pages/finanzas/Escenarios'
import ReclamacionesCade from '@/pages/ReclamacionesCade'
import Papeleo from '@/pages/Papeleo'
import Tareas from '@/pages/Tareas'
import Personas from '@/pages/equipo/Personas'
import Organigrama from '@/pages/equipo/Organigrama'
import Presencia from '@/pages/equipo/Presencia'
import Checklists from '@/pages/operaciones/Checklists'
import Manuales from '@/pages/operaciones/Manuales'
import LibroEquipos from '@/pages/operaciones/LibroEquipos'
import DanosVehiculos from '@/pages/operaciones/DanosVehiculos'
import Mantenimiento from '@/pages/operaciones/Mantenimiento'
import Informes from '@/pages/informes/Informes'
import InformesEquipo from '@/pages/informes/InformesEquipo'
import Usuarios from '@/pages/configuracion/Usuarios'
import Placeholder from '@/pages/Placeholder'

function ProtectedRoute({ children, solo }: { children: React.ReactNode; solo?: string[] }) {
  const { usuario } = useAuth()
  if (!usuario) return <Navigate to="/login" replace />
  if (solo && !solo.includes(usuario.perfil)) return <Navigate to="/" replace />
  return <>{children}</>
}

const PLACEHOLDERS = [
  'libro-facturas',
  'pedidos',
  'inventarios',
]

function AppRoutes() {
  const { usuario } = useAuth()

  return (
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
        <Route path="finanzas/escenarios"    element={<ProtectedRoute solo={['admin']}><Escenarios /></ProtectedRoute>} />
        <Route path="conciliacion"           element={<ProtectedRoute solo={['admin']}><Conciliacion /></ProtectedRoute>} />

        {/* Operación */}
        <Route path="entregas"      element={<ProtectedRoute solo={['admin']}><Entregas /></ProtectedRoute>} />
        <Route path="flota"         element={<ProtectedRoute solo={['admin']}><Flota /></ProtectedRoute>} />
        <Route path="flota/:codigo" element={<ProtectedRoute solo={['admin']}><FurgonetaDetalle /></ProtectedRoute>} />
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

        {/* Informes */}
        <Route path="informes"        element={<ProtectedRoute solo={['admin']}><Informes /></ProtectedRoute>} />
        <Route path="informes-equipo" element={<ProtectedRoute solo={['admin']}><InformesEquipo /></ProtectedRoute>} />

        {/* Secciones en fases (placeholder navegable) */}
        {PLACEHOLDERS.map(p => (
          <Route key={p} path={p} element={<ProtectedRoute solo={['admin']}><Placeholder /></ProtectedRoute>} />
        ))}

        {/* Redirects de rutas antiguas */}
        <Route path="liquidacion-cade" element={<Navigate to="/finanzas/liquidaciones" replace />} />

        {/* Configuración */}
        <Route path="configuracion" element={<Navigate to="/configuracion/bancos" replace />} />
        <Route path="configuracion/bancos" element={<ProtectedRoute solo={['admin']}><BancosPage /></ProtectedRoute>} />
        <Route path="configuracion/usuarios" element={<ProtectedRoute solo={['admin']}><Usuarios /></ProtectedRoute>} />
        <Route path="configuracion/:slug" element={<ProtectedRoute solo={['admin']}><Placeholder /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
