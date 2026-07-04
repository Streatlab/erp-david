import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { ARENA, INK, MARINO, OSW } from '@/styles/neobrutal'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div
      className="flex h-screen"
      style={{ background: ARENA, color: INK, fontFamily: "'Lexend', sans-serif" }}
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

        <main className="flex-1 overflow-y-auto p-4 md:p-6" style={{ background: ARENA }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
