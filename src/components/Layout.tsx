import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from '@/components/Sidebar'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div
      className="flex h-screen font-sans"
      style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}
    >
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="h-12 flex items-center px-4 lg:hidden"
          style={{
            background: 'var(--bg-surface)',
            borderBottom: '0.5px solid var(--border-default)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Abrir menú"
          >
            <Menu size={20} strokeWidth={1.5} />
          </button>
          <span
            className="ml-3 text-xs"
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
              letterSpacing: 'var(--tracking-wide)',
              textTransform: 'uppercase',
              fontWeight: 500,
            }}
          >
            David Reparte
          </span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
