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
import ReclamacionesCade from '@/pages/ReclamacionesCade'
import Personas from '@/pages/equipo/Personas'
import Placeholder from '@/pages/Placeholder'

function ProtectedRoute({ children, solo }: { children: React.ReactNode; solo?: string[] }) {
  const { usuario } = useAuth()
  if (!usuario) return <Navigate to="/login" replace />
  if (solo && !solo.includes(usuario.perfil)) return <Navigate to="/" replace />
  return <>{children}</>
}

const PLACEHOLDERS = [
  'tareas',
  'papeleo',
  'checklists',
  'manuales',
  'libro-facturas',
  'equipos',
  'danos-vehiculos',
  'pedidos',
  'inventarios',
  'mantenimiento',
  'informes-equipo',
  'informes',
  'organigrama',
  'presencia',
  'finanzas/ventas',
  'finanzas/escenarios',
]

function AppRoutes() {
  const { usuario } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<PanelGlobal />} />

        {/* Finanzas */}
        <Route path="finanzas/facturacion"   element={<ProtectedRoute solo={['admin']}><FacturacionEmitida /></ProtectedRoute>} />
        <Route path="finanzas/liquidaciones" element={<ProtectedRoute solo={['admin']}><Liquidaciones /></ProtectedRoute>} />
        <Route path="finanzas/pagos-cobros"  element={<ProtectedRoute solo={['admin']}><PagosCobros /></ProtectedRoute>} />
        <Route path="punto-equilibrio"       element={<ProtectedRoute solo={['admin']}><PuntoEquilibrio /></ProtectedRoute>} />
        <Route path="running"                element={<ProtectedRoute solo={['admin']}><Running /></ProtectedRoute>} />
        <Route path="conciliacion"           element={<ProtectedRoute solo={['admin']}><Conciliacion /></ProtectedRoute>} />

        {/* Operación */}
        <Route path="entregas"         element={<ProtectedRoute solo={['admin']}><Entregas /></ProtectedRoute>} />
        <Route path="flota"            element={<ProtectedRoute solo={['admin']}><Flota /></ProtectedRoute>} />
        <Route path="flota/:codigo"    element={<ProtectedRoute solo={['admin']}><FurgonetaDetalle /></ProtectedRoute>} />
        <Route path="reclamaciones"    element={<ProtectedRoute solo={['admin']}><ReclamacionesCade /></ProtectedRoute>} />

        {/* Equipo */}
        <Route path="personal" element={<ProtectedRoute solo={['admin']}><Personas /></ProtectedRoute>} />

        {/* Secciones en fases (placeholder navegable) */}
        {PLACEHOLDERS.map(p => (
          <Route key={p} path={p} element={<ProtectedRoute solo={['admin']}><Placeholder /></ProtectedRoute>} />
        ))}

        {/* Redirects de rutas antiguas */}
        <Route path="liquidacion-cade" element={<Navigate to="/finanzas/liquidaciones" replace />} />

        {/* Configuración */}
        <Route path="configuracion" element={<Navigate to="/configuracion/bancos" replace />} />
        <Route path="configuracion/bancos" element={<ProtectedRoute solo={['admin']}><BancosPage /></ProtectedRoute>} />
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
