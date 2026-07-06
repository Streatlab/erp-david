import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getFurgonetas,
  getCosteFlotaMes,
  costeMensualFurgo,
  type Furgoneta,
  type CosteFlota,
} from '../lib/flota/queries'
import FurgonetaCard from '../components/flota/FurgonetaCard'
import { fmtEur } from '@/lib/format'
import { NARANJA, AMBAR, MARINO, OLIVA, TERRA, GRIS, ARENA, ARENA_CL, BLANCO, OSW } from '@/styles/neobrutal'
import { PageNeo, Banda, CabeceraNeo, KpiNeo } from '@/components/neo/NeoUI'

export default function Flota() {
  const navigate = useNavigate()
  const [furgos, setFurgos] = useState<Furgoneta[]>([])
  const [costes, setCostes] = useState<CosteFlota | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const [fs, cs] = await Promise.all([getFurgonetas(), getCosteFlotaMes()])
        setFurgos(fs)
        setCostes(cs)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const operativas = furgos.filter((f) => f.estado === 'OPERATIVA').length
  const todasOk = furgos.length > 0 && operativas === furgos.length

  /* ¿Qué furgoneta cuesta más? */
  const masCara = furgos.length && costes
    ? furgos
        .map(f => ({ f, coste: costeMensualFurgo(f, costes.combustiblePorFurgo[f.id] ?? 0) }))
        .sort((a, b) => b.coste - a.coste)[0]
    : null

  return (
    <PageNeo>
      <CabeceraNeo eyebrowTxt="Flota" titulo="Tus furgonetas">
        <div style={{ fontSize: 13, fontWeight: 600, color: ARENA, opacity: 0.85 }}>
          Clic en una furgoneta para ver su ficha completa.
        </div>
      </CabeceraNeo>

      {loading && (
        <Banda bg={ARENA}>
          <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 22, textTransform: 'uppercase', color: GRIS }}>Cargando flota…</div>
        </Banda>
      )}

      {!loading && (<>
        {/* ¿Cuánto te cuesta moverte? */}
        <Banda bg={ARENA_CL}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 18 }}>
            <KpiNeo label="Coste flota mes" valor={fmtEur(costes?.costeTotal ?? 0)} color={NARANJA} sub="Todo incluido" />
            <KpiNeo label="Combustible mes" valor={fmtEur(costes?.combustibleTotal ?? 0)} color={AMBAR === '#F5B84A' ? '#C89B2A' : AMBAR} />
            <KpiNeo label="Préstamos mes" valor={fmtEur(costes?.prestamoTotal ?? 0)} color={MARINO} />
            <KpiNeo label="Operativas" valor={`${operativas} / ${furgos.length}`} color={todasOk ? OLIVA : TERRA} sub={todasOk ? 'Toda la flota en la calle' : 'Hay furgonetas paradas'} />
          </div>
          {masCara && (
            <div style={{ marginTop: 18, fontFamily: OSW, fontWeight: 700, fontSize: 'clamp(18px,2.2vw,26px)', textTransform: 'uppercase', letterSpacing: '-0.5px' }}>
              La que más te cuesta: <span style={{ background: NARANJA, color: ARENA, padding: '0 10px' }}>{masCara.f.matricula}</span> · {fmtEur(masCara.coste)}/mes
            </div>
          )}
        </Banda>

        {/* Fichas */}
        <Banda bg={BLANCO}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {furgos.map((f) => (
              <FurgonetaCard
                key={f.id}
                furgoneta={f}
                costeMes={costeMensualFurgo(f, costes?.combustiblePorFurgo[f.id] ?? 0)}
                combustibleMes={costes?.combustiblePorFurgo[f.id] ?? 0}
                onClick={() => navigate(`/flota/${f.codigo}`)}
              />
            ))}
          </div>
        </Banda>
      </>)}
    </PageNeo>
  )
}
