import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Entregas from '@/pages/Entregas'
import Conciliacion from '@/pages/Conciliacion'
import BancosPage from '@/pages/configuracion/bancos/BancosPage'
import Running from '@/pages/finanzas/Running'
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
        <Route path="configuracion" element={<Navigate to="/configuracion/bancos" replace />} />

        {/* Configuración · Bancos (Proveedores es el primer pill interno) */}
        <Route path="configuracion/bancos" element={<ProtectedRoute solo={['admin']}><BancosPage /></ProtectedRoute>} />

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
