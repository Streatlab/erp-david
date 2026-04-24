import { useState } from 'react'
import { useTheme, getTokens, FONT } from '@/styles/tokens'
import { ModTitle } from '@/components/configuracion/ModTitle'
import { ConfigShell } from '@/components/configuracion/ConfigShell'
import CategoriasPanel from './CategoriasPanel'
import ReglasPanel from './ReglasPanel'
import CuentasPanel from './CuentasPanel'
import PresupuestosPanel from './PresupuestosPanel'
import ProvisionesPanel from './ProvisionesPanel'

type Sub = 'categorias' | 'reglas' | 'cuentas' | 'presupuestos' | 'provisiones'

const PILLS: { id: Sub; label: string }[] = [
  { id: 'categorias',   label: 'Categorías de conciliación' },
  { id: 'reglas',       label: 'Reglas automáticas' },
  { id: 'cuentas',      label: 'Cuentas bancarias' },
  { id: 'presupuestos', label: 'Presupuestos mensuales' },
  { id: 'provisiones',  label: 'Provisiones IVA/IRPF' },
]

export default function BancosPage() {
  const theme = useTheme()
  const T = getTokens(theme)
  const [sub, setSub] = useState<Sub>('categorias')

  return (
    <ConfigShell>
      <ModTitle>Bancos y cuentas</ModTitle>
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
                fontFamily: FONT.sans,
                fontSize: 11,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                fontWeight: isActive ? 600 : 500,
                background: isActive ? T.brandAccent : T.bgSurface,
                color: isActive ? '#ffffff' : T.textSecondary,
                border: `0.5px solid ${isActive ? T.brandAccent : T.borderDefault}`,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >{p.label}</button>
          )
        })}
      </div>
      {sub === 'categorias' && <CategoriasPanel />}
      {sub === 'reglas' && <ReglasPanel />}
      {sub === 'cuentas' && <CuentasPanel />}
      {sub === 'presupuestos' && <PresupuestosPanel />}
      {sub === 'provisiones' && <ProvisionesPanel />}
    </ConfigShell>
  )
}
