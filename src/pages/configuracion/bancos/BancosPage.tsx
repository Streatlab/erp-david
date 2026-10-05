import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { HeroNeo } from '@/components/neo/NeoUI'
import { OLIVA, AMBAR } from '@/styles/neobrutal'
import { sesionPorBanco, diasHasta } from '@/lib/bancos'
import type { Sesion } from '@/lib/bancos'
import { useTheme, FONT } from '@/styles/tokens'
import { ModTitle } from '@/components/configuracion/ModTitle'
import { ConfigShell } from '@/components/configuracion/ConfigShell'
import ProveedoresPanel from './ProveedoresPanel'
import CategoriasPanel from './CategoriasPanel'
import ReglasPanel from './ReglasPanel'
import CuentasBancoPanel from './CuentasBancoPanel'
import PresupuestosPanel from './PresupuestosPanel'
import ProvisionesPanel from './ProvisionesPanel'

type Sub = 'proveedores' | 'categorias' | 'reglas' | 'cuentas' | 'presupuestos' | 'provisiones'

const PILLS: { id: Sub; label: string }[] = [
  { id: 'cuentas',      label: 'Cuentas bancarias' },
  { id: 'proveedores',  label: 'Proveedores' },
  { id: 'categorias',   label: 'Categorías de conciliación' },
  { id: 'reglas',       label: 'Reglas automáticas' },
  { id: 'presupuestos', label: 'Presupuestos mensuales' },
  { id: 'provisiones',  label: 'Provisiones IVA/IRPF' },
]

export default function BancosPage() {
  const { T } = useTheme()
  const [sub, setSub] = useState<Sub>('cuentas')
  const [res, setRes] = useState<{ cuentas: number; conectadas: number } | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('cuentas_bancarias').select('id, banco, activa'),
      supabase.from('banco_sesiones').select('id, banco, estado, valida_hasta, created_at'),
    ]).then(([c, s]) => {
      if (c.error || s.error) { setRes(null); return }
      const act = ((c.data ?? []) as { banco: string; activa: boolean }[]).filter(x => x.activa)
      const ses = sesionPorBanco((s.data ?? []) as Sesion[])
      const ok = act.filter(x => { const se = ses.get(x.banco); return se?.estado === 'autorizada' && (diasHasta(se.valida_hasta) ?? 0) >= 0 })
      setRes({ cuentas: act.length, conectadas: ok.length })
    })
  }, [])

  return (
    <ConfigShell>
      <ModTitle>Bancos y cuentas</ModTitle>
      <HeroNeo eyebrowTxt="Conexión bancaria" cifra={res && res.cuentas > 0 ? `${res.conectadas}/${res.cuentas}` : '—'}
        frase={res && res.cuentas > 0 ? 'cuentas activas con conexión bancaria vigente' : 'Sin datos todavía'}
        color={res && res.cuentas > 0 ? (res.conectadas === res.cuentas ? OLIVA : AMBAR) : AMBAR} />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
        {PILLS.map(p => {
          const isActive = sub === p.id
          return (
            <button
              key={p.id}
              onClick={() => setSub(p.id)}
              style={{
                padding: '7px 14px',
                borderRadius: 6,
                fontFamily: FONT.heading,
                fontSize: 11,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                fontWeight: isActive ? 600 : 500,
                background: isActive ? 'var(--brand-accent)' : T.card,
                color: isActive ? '#ffffff' : T.sec,
                border: `0.5px solid ${isActive ? 'var(--brand-accent)' : T.brd}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >{p.label}</button>
          )
        })}
      </div>
      {sub === 'proveedores' && <ProveedoresPanel />}
      {sub === 'categorias' && <CategoriasPanel />}
      {sub === 'reglas' && <ReglasPanel />}
      {sub === 'cuentas' && <CuentasBancoPanel />}
      {sub === 'presupuestos' && <PresupuestosPanel />}
      {sub === 'provisiones' && <ProvisionesPanel />}
    </ConfigShell>
  )
}
