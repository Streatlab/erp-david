import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { INK, ARENA, BLANCO, GRIS, OLIVA, TERRA, NARANJA, CELESTE, AMBAR, OSW, LEX } from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda, TablaWrap, thNeo, tdNeo, BotonNeo } from '@/components/neo/NeoUI'

/* Usuarios — mismo concepto que Binagre (cuentas + rol + activo/inactivo), TEST, neobrutal. */

interface Usuario { id: string; nombre: string; email: string; rol: 'admin' | 'repartidor'; activo: boolean }

const INIT: Usuario[] = [
  { id: '1', nombre: 'TEST · David',        email: 'david@test.local', rol: 'admin',      activo: true },
  { id: '2', nombre: 'TEST · Repartidor 1', email: 'rep1@test.local',  rol: 'repartidor', activo: true },
  { id: '3', nombre: 'TEST · Repartidor 2', email: 'rep2@test.local',  rol: 'repartidor', activo: true },
  { id: '4', nombre: 'TEST · Antiguo',      email: 'ex@test.local',    rol: 'repartidor', activo: false },
]

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>(INIT)

  const toggle = (id: string) => setUsuarios(prev => prev.map(u => u.id === id ? { ...u, activo: !u.activo } : u))
  const nuevo = () => {
    const n = usuarios.length + 1
    setUsuarios(prev => [...prev, { id: String(Date.now()), nombre: `TEST · Usuario ${n}`, email: `user${n}@test.local`, rol: 'repartidor', activo: true }])
  }

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Configuración" titulo="Usuarios">
        <BotonNeo onClick={nuevo}><UserPlus size={14} style={{ marginRight: 6 }} /> Nuevo usuario</BotonNeo>
      </CabeceraNeo>

      <Banda bg={AMBAR} style={{ padding: '14px 40px' }}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: INK }}>
          Datos TEST · gestión de accesos y roles, como en Binagre.
        </div>
      </Banda>

      <Banda bg={BLANCO}>
        <TablaWrap>
          <thead>
            <tr>
              <th style={thNeo}>Usuario</th>
              <th style={thNeo}>Email</th>
              <th style={thNeo}>Rol</th>
              <th style={thNeo}>Estado</th>
              <th style={{ ...thNeo, textAlign: 'right' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u, i) => (
              <tr key={u.id} style={{ opacity: u.activo ? 1 : 0.6 }}>
                <td style={{ ...tdNeo(i % 2 === 1), fontFamily: OSW, fontWeight: 700 }}>{u.nombre}</td>
                <td style={{ ...tdNeo(i % 2 === 1), color: GRIS, fontSize: 12 }}>{u.email}</td>
                <td style={tdNeo(i % 2 === 1)}>
                  <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', background: u.rol === 'admin' ? NARANJA : CELESTE, color: ARENA, border: `2px solid ${INK}`, padding: '2px 8px' }}>{u.rol}</span>
                </td>
                <td style={tdNeo(i % 2 === 1)}>
                  <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', background: u.activo ? OLIVA : GRIS, color: ARENA, border: `2px solid ${INK}`, padding: '2px 8px' }}>{u.activo ? 'activo' : 'inactivo'}</span>
                </td>
                <td style={{ ...tdNeo(i % 2 === 1), textAlign: 'right' }}>
                  <BotonNeo onClick={() => toggle(u.id)} bg={u.activo ? TERRA : OLIVA}>{u.activo ? 'Desactivar' : 'Activar'}</BotonNeo>
                </td>
              </tr>
            ))}
          </tbody>
        </TablaWrap>
        <div style={{ fontFamily: LEX, fontSize: 12, fontWeight: 600, color: GRIS, marginTop: 12 }}>Sobre datos TEST. Se conectará a los usuarios reales de David.</div>
      </Banda>
    </PageNeo>
  )
}
