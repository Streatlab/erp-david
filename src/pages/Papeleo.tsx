import { useState } from 'react'
import { Inbox, Check } from 'lucide-react'
import { INK, ARENA, BLANCO, GRIS, OLIVA, TERRA, NARANJA, CELESTE, BERENJENA, AMBAR, OSW, LEX } from '@/styles/neobrutal'
import { PageNeo, CabeceraNeo, Banda, TablaWrap, thNeo, tdNeo, KpiNeo, PillsNeo } from '@/components/neo/NeoUI'

/* Papeleo — buzón único de documentos (mismo concepto que Binagre), TEST, neobrutal. */

type Tipo = 'Factura' | 'Nómina' | 'Seguro' | 'Cade' | 'Vehículo'
type Estado = 'pendiente' | 'archivado'

interface Doc { id: string; nombre: string; tipo: Tipo; fecha: string; estado: Estado }

const INIT: Doc[] = [
  { id: '1', nombre: 'TEST · Factura renting furgoneta', tipo: 'Vehículo', fecha: '01 jul', estado: 'pendiente' },
  { id: '2', nombre: 'TEST · Liquidación Cade junio',     tipo: 'Cade',     fecha: '02 jul', estado: 'pendiente' },
  { id: '3', nombre: 'TEST · Nómina Repartidor Uno',      tipo: 'Nómina',   fecha: '30 jun', estado: 'archivado' },
  { id: '4', nombre: 'TEST · Póliza seguro flota',        tipo: 'Seguro',   fecha: '15 jun', estado: 'archivado' },
  { id: '5', nombre: 'TEST · Factura combustible',        tipo: 'Factura',  fecha: '28 jun', estado: 'pendiente' },
]

const COLOR_TIPO: Record<Tipo, string> = { Factura: NARANJA, 'Nómina': OLIVA, Seguro: CELESTE, Cade: BERENJENA, 'Vehículo': AMBAR }

export default function Papeleo() {
  const [docs, setDocs] = useState<Doc[]>(INIT)
  const [filtro, setFiltro] = useState('Todos')

  const archivar = (id: string) => setDocs(prev => prev.map(d => d.id === id ? { ...d, estado: 'archivado' } : d))

  const visibles = filtro === 'Todos' ? docs : filtro === 'Pendientes' ? docs.filter(d => d.estado === 'pendiente') : docs.filter(d => d.estado === 'archivado')
  const pend = docs.filter(d => d.estado === 'pendiente').length

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Finanzas" titulo="Papeleo">
        <PillsNeo value={filtro} onChange={setFiltro} options={['Todos', 'Pendientes', 'Archivados']} />
      </CabeceraNeo>

      <Banda bg={AMBAR} style={{ padding: '14px 40px' }}>
        <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: INK }}>
          Datos TEST · buzón único de documentos, como el de Binagre. Aquí entra todo el papeleo.
        </div>
      </Banda>

      <Banda bg={BLANCO}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 22 }}>
          <KpiNeo label="En el buzón" valor={String(docs.length)} color={CELESTE} />
          <KpiNeo label="Pendientes" valor={String(pend)} color={pend > 0 ? NARANJA : OLIVA} />
          <KpiNeo label="Archivados" valor={String(docs.length - pend)} color={OLIVA} />
        </div>

        {visibles.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: GRIS, fontFamily: OSW, fontWeight: 700, textTransform: 'uppercase' }}>
            <Inbox size={20} /> Buzón vacío para este filtro
          </div>
        ) : (
          <TablaWrap>
            <thead>
              <tr>
                <th style={thNeo}>Documento</th>
                <th style={thNeo}>Tipo</th>
                <th style={thNeo}>Fecha</th>
                <th style={thNeo}>Estado</th>
                <th style={{ ...thNeo, textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((docu, i) => (
                <tr key={docu.id}>
                  <td style={{ ...tdNeo(i % 2 === 1), fontFamily: OSW, fontWeight: 700 }}>{docu.nombre}</td>
                  <td style={tdNeo(i % 2 === 1)}>
                    <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', background: COLOR_TIPO[docu.tipo], color: docu.tipo === 'Vehículo' ? INK : ARENA, border: `2px solid ${INK}`, padding: '2px 8px' }}>{docu.tipo}</span>
                  </td>
                  <td style={{ ...tdNeo(i % 2 === 1), color: GRIS, fontSize: 12 }}>{docu.fecha}</td>
                  <td style={tdNeo(i % 2 === 1)}>
                    <span style={{ fontFamily: OSW, fontWeight: 700, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', background: docu.estado === 'pendiente' ? NARANJA : OLIVA, color: ARENA, border: `2px solid ${INK}`, padding: '2px 8px' }}>{docu.estado}</span>
                  </td>
                  <td style={{ ...tdNeo(i % 2 === 1), textAlign: 'right' }}>
                    {docu.estado === 'pendiente' ? (
                      <button onClick={() => archivar(docu.id)} style={{ background: INK, color: ARENA, border: 'none', padding: '6px 12px', cursor: 'pointer', fontFamily: OSW, fontWeight: 700, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Check size={13} /> Archivar
                      </button>
                    ) : (
                      <span style={{ fontFamily: LEX, fontSize: 12, fontWeight: 600, color: GRIS }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </TablaWrap>
        )}
      </Banda>
    </PageNeo>
  )
}
