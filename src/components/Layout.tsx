import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { ARENA, INK, MARINO, OSW } from '@/styles/neobrutal'

/* Papel mediterráneo: arena cálida con trama de puntos celeste + terracota.
   Da vida al fondo sin restar legibilidad (los bloques la tapan en contenido). */
const PAPEL_MEDITERRANEO = {
  backgroundColor: '#F3E4C6',
  backgroundImage:
    'radial-gradient(rgba(45,125,210,0.13) 1.6px, transparent 1.7px), radial-gradient(rgba(201,74,44,0.10) 1.6px, transparent 1.7px)',
  backgroundSize: '26px 26px, 26px 26px',
  backgroundPosition: '0 0, 13px 13px',
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div
      className="flex h-screen"
      style={{ ...PAPEL_MEDITERRANEO, color: INK, fontFamily: "'Lexend', sans-serif" }}
    >
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="h-12 flex items-center px-4 lg:hidden"
          style={{
            background: MARINO,
            borderBottom: `4px solid ${INK}`,
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ color: ARENA, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Abrir menú"
          >
            <Menu size={20} strokeWidth={2} />
          </button>
          <span
            className="ml-3"
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
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6" style={PAPEL_MEDITERRANEO}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
