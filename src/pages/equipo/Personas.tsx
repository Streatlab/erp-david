import { useState } from 'react'
import { UserPlus, Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import {
  INK, MARINO, ARENA, BLANCO, GRIS, OLIVA, TERRA, CELESTE, NARANJA, AMBAR,
  OSW, LEX, SHADOW, BORDER_CARD,
} from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda, TablaWrap, thNeo, tdNeo, BotonNeo } from '@/components/neo/NeoUI'

/* ── Módulo Personas ──────────────────────────────────────────────
   Mismo contenido y funcionamiento que "Empleados" de Binagre
   (alta, estado, antigüedad, archivar/reactivar, borrar), con datos
   TEST y pasado por el filtro Neobrutal Mediterráneo de David.
   Cuando exista la tabla real de David, se cambia el TEST por Supabase. */

type EstadoEmpleado = 'activo' | 'vacaciones' | 'baja' | 'despedido'

interface Empleado {
  id: string
  nombre: string
  email: string
  nif: string
  cargo: string
  fecha_alta: string
  estado: EstadoEmpleado
}

const DATOS_TEST: Empleado[] = [
  { id: '1', nombre: 'TEST · David Reparte',   email: 'david@test.local',  nif: '00000000A', cargo: 'Administrador', fecha_alta: '2022-01-10', estado: 'activo' },
  { id: '2', nombre: 'TEST · Repartidor Uno',  email: 'rep1@test.local',   nif: '11111111B', cargo: 'Repartidor',    fecha_alta: '2023-03-01', estado: 'activo' },
  { id: '3', nombre: 'TEST · Repartidor Dos',  email: 'rep2@test.local',   nif: '22222222C', cargo: 'Repartidor',    fecha_alta: '2024-06-15', estado: 'vacaciones' },
  { id: '4', nombre: 'TEST · Repartidor Tres', email: 'rep3@test.local',   nif: '33333333D', cargo: 'Repartidor',    fecha_alta: '2024-11-02', estado: 'baja' },
  { id: '5', nombre: 'TEST · Antiguo',         email: 'ex@test.local',     nif: '44444444E', cargo: 'Repartidor',    fecha_alta: '2021-05-20', estado: 'despedido' },
]

function estadoColor(e: EstadoEmpleado): string {
  if (e === 'activo') return OLIVA
  if (e === 'vacaciones') return CELESTE
  if (e === 'baja') return GRIS
  return TERRA
}
function esArchivado(e: EstadoEmpleado): boolean {
  return e === 'baja' || e === 'despedido'
}
function calcAntiguedad(fechaAlta: string): string {
  const diff = Date.now() - new Date(fechaAlta + 'T12:00:00').getTime()
  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
  const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44))
  if (years > 0) return `${years}a ${months}m`
  return `${months} mes${months !== 1 ? 'es' : ''}`
}

function Avatar({ nombre, archivado }: { nombre: string; archivado: boolean }) {
  const initials = nombre.replace('TEST · ', '').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (
    <div style={{
      width: 38, height: 38, border: `3px solid ${INK}`, flexShrink: 0,
      background: archivado ? GRIS : NARANJA, color: ARENA,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: OSW, fontSize: 14, fontWeight: 700,
    }}>
      {initials}
    </div>
  )
}

export default function Personas() {
  const [empleados, setEmpleados] = useState<Empleado[]>(DATOS_TEST)

  const toggleArchivo = (emp: Empleado) => {
    setEmpleados(prev => prev.map(e => {
      if (e.id !== emp.id) return e
      return { ...e, estado: esArchivado(e.estado) ? 'activo' : 'baja' }
    }))
  }
  const borrar = (emp: Empleado) => {
    if (!window.confirm(`BORRAR a ${emp.nombre}. No se puede deshacer. ¿Continuar?`)) return
    setEmpleados(prev => prev.filter(e => e.id !== emp.id))
  }
  const nuevo = () => {
    const n = empleados.length + 1
    setEmpleados(prev => [...prev, {
      id: String(Date.now()), nombre: `TEST · Nuevo ${n}`, email: `nuevo${n}@test.local`,
      nif: '—', cargo: 'Repartidor', fecha_alta: new Date().toISOString().slice(0, 10), estado: 'activo',
    }])
  }

  const activos = empleados.filter(e => !esArchivado(e.estado)).length

  const accionBtn: React.CSSProperties = {
    width: 32, height: 32, border: `2px solid ${INK}`, background: BLANCO,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  }

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Equipo" titulo="Personas">
        <BotonNeo onClick={nuevo}>
          <UserPlus size={14} style={{ marginRight: 6 }} /> Nuevo empleado
        </BotonNeo>
      </CabeceraNeo>

      {/* Aviso datos TEST */}
      <Banda bg={AMBAR} style={{ padding: '14px 40px' }}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: INK }}>
          Datos TEST · misma ficha y funcionamiento que Binagre. Se conectará a los empleados reales de David.
        </div>
      </Banda>

      <Banda bg={BLANCO}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', color: MARINO, marginBottom: 14 }}>
          {activos} activo{activos !== 1 ? 's' : ''} · {empleados.length} en total
        </div>

        <TablaWrap>
          <thead>
            <tr>
              <th style={thNeo}>Empleado</th>
              <th style={thNeo}>NIF</th>
              <th style={thNeo}>Cargo</th>
              <th style={thNeo}>Antigüedad</th>
              <th style={thNeo}>Estado</th>
              <th style={{ ...thNeo, textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {empleados.map((emp, i) => {
              const archivado = esArchivado(emp.estado)
              return (
                <tr key={emp.id} style={{ opacity: archivado ? 0.6 : 1 }}>
                  <td style={tdNeo(i % 2 === 1)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar nombre={emp.nombre} archivado={archivado} />
                      <div>
                        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 14, color: INK }}>{emp.nombre}</div>
                        <div style={{ fontFamily: LEX, fontSize: 11, color: GRIS }}>{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...tdNeo(i % 2 === 1), color: GRIS, fontSize: 12 }}>{emp.nif}</td>
                  <td style={{ ...tdNeo(i % 2 === 1), color: GRIS }}>{emp.cargo}</td>
                  <td style={{ ...tdNeo(i % 2 === 1), color: GRIS, fontSize: 12 }}>{calcAntiguedad(emp.fecha_alta)}</td>
                  <td style={tdNeo(i % 2 === 1)}>
                    <span style={{
                      fontFamily: OSW, fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
                      background: estadoColor(emp.estado), color: emp.estado === 'baja' ? INK : ARENA,
                      border: `2px solid ${INK}`, padding: '2px 8px', whiteSpace: 'nowrap',
                    }}>
                      {emp.estado}
                    </span>
                  </td>
                  <td style={{ ...tdNeo(i % 2 === 1), textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button onClick={() => toggleArchivo(emp)} style={accionBtn} title={archivado ? 'Reactivar' : 'Pasar a antiguos'}>
                        {archivado ? <ArchiveRestore size={15} color={OLIVA} /> : <Archive size={15} color={INK} />}
                      </button>
                      <button onClick={() => borrar(emp)} style={accionBtn} title="Borrar">
                        <Trash2 size={15} color={TERRA} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </TablaWrap>
        <div style={{ fontFamily: LEX, fontSize: 12, fontWeight: 600, color: GRIS, marginTop: 12, boxShadow: SHADOW === '' ? undefined : undefined, borderTop: `0px solid ${BORDER_CARD}` }}>
          Clic en los iconos para archivar/reactivar o borrar (sobre datos TEST).
        </div>
      </Banda>
    </PageNeo>
  )
}
