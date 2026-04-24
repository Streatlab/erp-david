import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Entregas from '@/pages/Entregas'
import Conciliacion from '@/pages/Conciliacion'
import Configuracion from '@/pages/Configuracion'
import BancosPage from '@/pages/configuracion/bancos/BancosPage'
import MarcasPage from '@/pages/configuracion/marcas/MarcasPage'
import TabMarcas from '@/pages/configuracion/marcas/TabMarcas'
import TabAccesosUber from '@/pages/configuracion/marcas/TabAccesosUber'
import TabCanales from '@/pages/configuracion/marcas/TabCanales'
import TabTiposCocina from '@/pages/configuracion/marcas/TabTiposCocina'
import ComprasPage from '@/pages/configuracion/compras/ComprasPage'
import TabCostes from '@/pages/configuracion/compras/TabCostes'
import TabProveedores from '@/pages/configuracion/compras/TabProveedores'
import TabCategorias from '@/pages/configuracion/compras/TabCategorias'
import TabUnidades from '@/pages/configuracion/compras/TabUnidades'
import UsuariosPage from '@/pages/configuracion/usuarios/UsuariosPage'
import Running from '@/pages/Running'
import Placeholder from '@/pages/Placeholder'

function ProtectedRoute({ children, solo }: { children: React.ReactNode; solo?: string[] }) {
  const { usuario } = useAuth()
  if (!usuario) return <Navigate to="/login" replace />
  if (solo && !solo.includes(usuario.perfil)) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { usuario } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />

        <Route path="entregas"         element={<ProtectedRoute solo={['admin']}><Entregas /></ProtectedRoute>} />
        <Route path="personal"         element={<ProtectedRoute solo={['admin']}><Placeholder /></ProtectedRoute>} />
        <Route path="flota"            element={<ProtectedRoute solo={['admin']}><Placeholder /></ProtectedRoute>} />
        <Route path="liquidacion-cade" element={<ProtectedRoute solo={['admin']}><Placeholder /></ProtectedRoute>} />
        <Route path="conciliacion"     element={<ProtectedRoute solo={['admin']}><Conciliacion /></ProtectedRoute>} />
        <Route path="running"          element={<ProtectedRoute solo={['admin']}><Running /></ProtectedRoute>} />
        <Route path="punto-equilibrio" element={<ProtectedRoute solo={['admin']}><Placeholder /></ProtectedRoute>} />
        <Route path="contabilidad"     element={<ProtectedRoute solo={['admin']}><Placeholder /></ProtectedRoute>} />
        <Route path="hacienda"         element={<ProtectedRoute solo={['admin']}><Placeholder /></ProtectedRoute>} />
        <Route path="operativa"        element={<ProtectedRoute solo={['admin']}><Placeholder /></ProtectedRoute>} />

        {/* Configuración · Redirect */}
        <Route path="configuracion" element={<Navigate to="/configuracion/marcas" replace />} />

        {/* Configuración · Legacy (accesible solo por URL directa) */}
        <Route path="configuracion/configuracion" element={<ProtectedRoute solo={['admin']}><Configuracion /></ProtectedRoute>} />

        {/* Configuración · Marcas */}
        <Route path="configuracion/marcas" element={<ProtectedRoute solo={['admin']}><MarcasPage /></ProtectedRoute>}>
          <Route index element={<TabMarcas />} />
          <Route path="accesos-uber" element={<TabAccesosUber />} />
          <Route path="canales" element={<TabCanales />} />
          <Route path="tipos-cocina" element={<TabTiposCocina />} />
        </Route>

        {/* Configuración · Bancos */}
        <Route path="configuracion/bancos" element={<ProtectedRoute solo={['admin']}><BancosPage /></ProtectedRoute>} />

        {/* Configuración · Compras */}
        <Route path="configuracion/compras" element={<ProtectedRoute solo={['admin']}><ComprasPage /></ProtectedRoute>}>
          <Route index element={<Navigate to="costes" replace />} />
          <Route path="costes"      element={<TabCostes />} />
          <Route path="proveedores" element={<TabProveedores />} />
          <Route path="categorias"  element={<TabCategorias />} />
          <Route path="unidades"    element={<TabUnidades />} />
        </Route>

        {/* Configuración · Usuarios */}
        <Route path="configuracion/usuarios" element={<ProtectedRoute solo={['admin']}><UsuariosPage /></ProtectedRoute>} />

        {/* Configuración · Fallback */}
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
