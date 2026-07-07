import { useState } from 'react'
import { LogIn, LogOut } from 'lucide-react'
import { INK, ARENA, BLANCO, GRIS, OLIVA, TERRA, AMBAR, OSW, LEX } from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda, TablaWrap, thNeo, tdNeo, BotonNeo, KpiNeo } from '@/components/neo/NeoUI'

/* Control de presencia — mismo concepto que Binagre (fichajes), datos TEST, neobrutal. */

interface Fichaje { id: string; nombre: string; entrada: string | null; salida: string | null }

const HOY: Fichaje[] = [
  { id: '1', nombre: 'TEST · David Reparte',   entrada: '07:45', salida: '15:10' },
  { id: '2', nombre: 'TEST · Repartidor Uno',  entrada: '08:02', salida: null },
  { id: '3', nombre: 'TEST · Repartidor Dos',  entrada: '08:15', salida: null },
  { id: '4', nombre: 'TEST · Repartidor Tres', entrada: null,    salida: null },
]

function horas(f: Fichaje): string {
  if (!f.entrada) return '—'
  const [eh, em] = f.entrada.split(':').map(Number)
  const fin = f.salida ?? new Date().toTimeString().slice(0, 5)
  const [sh, sm] = fin.split(':').map(Number)
  const min = (sh * 60 + sm) - (eh * 60 + em)
  if (min <= 0) return '—'
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`
}

export default function Presencia() {
  const [fichajes, setFichajes] = useState<Fichaje[]>(HOY)
  const ahora = () => new Date().toTimeString().slice(0, 5)

  const fichar = (id: string, tipo: 'entrada' | 'salida') => {
    setFichajes(prev => prev.map(f => f.id === id ? { ...f, [tipo]: ahora() } : f))
  }

  const dentro = fichajes.filter(f => f.entrada && !f.salida).length
  const trabajados = fichajes.filter(f => f.entrada).length

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Equipo" titulo="Presencia" />

      <Banda bg={AMBAR} style={{ padding: '14px 40px' }}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: INK }}>
          Datos TEST · fichajes del día. Misma lógica que Binagre (entrada/salida/horas).
        </div>
      </Banda>

      <Banda bg={BLANCO}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 22 }}>
          <KpiNeo label="En turno ahora" valor={String(dentro)} color={OLIVA} />
          <KpiNeo label="Han fichado hoy" valor={String(trabajados)} />
          <KpiNeo label="Sin fichar" valor={String(fichajes.length - trabajados)} color={TERRA} />
        </div>

        <TablaWrap>
          <thead>
            <tr>
              <th style={thNeo}>Empleado</th>
              <th style={thNeo}>Entrada</th>
              <th style={thNeo}>Salida</th>
              <th style={thNeo}>Horas</th>
              <th style={{ ...thNeo, textAlign: 'right' }}>Fichar</th>
            </tr>
          </thead>
          <tbody>
            {fichajes.map((f, i) => (
              <tr key={f.id}>
                <td style={{ ...tdNeo(i % 2 === 1), fontFamily: OSW, fontWeight: 700, fontSize: 14 }}>{f.nombre}</td>
                <td style={{ ...tdNeo(i % 2 === 1), color: f.entrada ? INK : GRIS }}>{f.entrada ?? '—'}</td>
                <td style={{ ...tdNeo(i % 2 === 1), color: f.salida ? INK : GRIS }}>{f.salida ?? '—'}</td>
                <td style={{ ...tdNeo(i % 2 === 1), fontFamily: OSW, fontWeight: 700 }}>{horas(f)}</td>
                <td style={{ ...tdNeo(i % 2 === 1), textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    {!f.entrada && (
                      <BotonNeo onClick={() => fichar(f.id, 'entrada')} bg={OLIVA}><LogIn size={13} style={{ marginRight: 4 }} />Entrada</BotonNeo>
                    )}
                    {f.entrada && !f.salida && (
                      <BotonNeo onClick={() => fichar(f.id, 'salida')} bg={TERRA}><LogOut size={13} style={{ marginRight: 4 }} />Salida</BotonNeo>
                    )}
                    {f.entrada && f.salida && (
                      <span style={{ fontFamily: LEX, fontSize: 12, fontWeight: 600, color: GRIS }}>Jornada cerrada</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TablaWrap>
      </Banda>
    </PageNeo>
  )
}
