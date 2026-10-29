import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import MenuCuenta from '@/components/MenuCuenta'
import SelectorPeriodoNeo from '@/components/neo/SelectorPeriodoNeo'
import EstrellaPantalla from '@/components/neo/EstrellaPantalla'
import { PeriodoProvider } from '@/lib/periodoGlobal'
import { FavoritosProvider } from '@/lib/favoritos'
import { ARENA, INK, MARINO, OSW } from '@/styles/neobrutal'
import { useAuth } from '@/context/AuthContext'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { usuario, logout } = useAuth()

  /* Repartidor: solo su portal, sin menú de administración ni selector de periodo */
  if (usuario?.perfil === 'repartidor') {
    return (
      <div className="min-h-screen" style={{ backgroundColor: ARENA, color: INK, fontFamily: "'Lexend', sans-serif" }}>
        <header className="h-12 flex items-center px-4" style={{ background: MARINO, borderBottom: `4px solid ${INK}` }}>
          <img src="/logo-davidreparte.svg" alt="David Reparte" style={{ height: 28, width: 'auto' }} />
          <span className="ml-3" style={{ color: ARENA, fontFamily: OSW, fontSize: 13, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600 }}>David Reparte</span>
          <button onClick={logout} className="ml-auto" style={{ color: ARENA, background: 'none', border: 'none', cursor: 'pointer', fontFamily: OSW, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>Salir</button>
        </header>
        <main><Outlet /></main>
      </div>
    )
  }

  return (
    <PeriodoProvider>
    <FavoritosProvider>
    <div
      className="flex h-screen"
      style={{ backgroundColor: ARENA, color: INK, fontFamily: "'Lexend', sans-serif" }}
    >
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra superior: en móvil lleva el botón de menú; en todas las pantallas, el círculo con las iniciales */}
        <header
          className="h-14 flex items-center px-4"
          style={{
            background: MARINO,
            borderBottom: `4px solid ${INK}`,
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
            style={{ color: ARENA, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Abrir menú"
          >
            <Menu size={20} strokeWidth={2} />
          </button>
          <span
            className="ml-3 lg:hidden"
            style={{
              color: ARENA,
              fontFamily: OSW,
              fontSize: 13,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            David Reparte
          </span>
          <div className="ml-auto flex items-center gap-3">
            <EstrellaPantalla />
            <SelectorPeriodoNeo />
            <MenuCuenta />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6" style={{ backgroundColor: ARENA }}>
          <Outlet />
        </main>
      </div>
    </div>
    </FavoritosProvider>
    </PeriodoProvider>
  )
}
