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
import { NARANJA, GRIS, ARENA, BLANCO, OSW } from '@/styles/neobrutal'
import { PageNeo, Banda, CabeceraNeo, HeroNeo } from '@/components/neo/NeoUI'

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

      <HeroNeo
        eyebrowTxt="Coste de la flota este mes"
        cifra={loading || !costes || !furgos.length ? '—' : fmtEur(costes.costeTotal)}
        frase={loading || !costes || !furgos.length ? 'Sin datos todavía'
          : masCara && masCara.coste > 0 ? `Todo incluido. La que más cuesta: ${masCara.f.matricula}, ${fmtEur(masCara.coste)} al mes.`
          : 'Lo que te cuesta mover las furgonetas este mes, todo incluido'}
        color={NARANJA}
        apoyo={furgos.length ? [
          { label: 'Combustible', valor: fmtEur(costes?.combustibleTotal ?? 0) },
          { label: 'Préstamos', valor: fmtEur(costes?.prestamoTotal ?? 0) },
          { label: 'Operativas', valor: `${operativas} / ${furgos.length}${todasOk ? '' : ' · hay paradas'}` },
        ] : undefined}
      />

      {loading && (
        <Banda bg={ARENA}>
          <div style={{ fontFamily: OSW, fontWeight: 700, fontSize: 22, textTransform: 'uppercase', color: GRIS }}>Cargando flota…</div>
        </Banda>
      )}

      {!loading && (<>
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
