import { useEffect, useState, useCallback } from 'react'
import { useThemeMode, getTokens, FONT, FS, FW, SPACE, RADIUS, TRACKING } from '@/styles/tokens'
import {
  getFurgonetas, calcularAlertas, getCostesFlotaMes, costeMensualFurgo,
  type Furgoneta, type CostesFlotaMes, type AlertaFlota,
} from '@/lib/flota/queries'

import KpisFlota from '@/components/flota/KpisFlota'
import AlertasFlota from '@/components/flota/AlertasFlota'
import FurgonetaCard from '@/components/flota/FurgonetaCard'
import ModalEditarFurgoneta from '@/components/flota/ModalEditarFurgoneta'

export default function Flota() {
  const theme = useThemeMode()
  const t = getTokens(theme)

  const [furgonetas, setFurgonetas] = useState<Furgoneta[]>([])
  const [costes, setCostes] = useState<CostesFlotaMes>({ total: 0, prestamosAlquiler: 0, combustible: 0, combustiblePorFurgoId: new Map() })
  const [alertas, setAlertas] = useState<AlertaFlota[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [editar, setEditar] = useState<Furgoneta | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      const furgos = await getFurgonetas()
      setFurgonetas(furgos)
      const [c] = await Promise.all([getCostesFlotaMes(furgos)])
      setCostes(c)
      setAlertas(calcularAlertas(furgos))
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const activas = furgonetas.filter(f => f.activa).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[6] }}>
      {/* HEADER */}
      <div>
        <h1 style={{
          margin: 0,
          fontFamily: FONT.title,
          fontSize: 22,
          fontWeight: FW.bold,
          color: t.brandAccent,
          letterSpacing: TRACKING.wider,
          textTransform: 'uppercase',
        }}>
          FLOTA · {activas} FURGONETAS ELÉCTRICAS
        </h1>
        <div style={{ marginTop: 4, fontFamily: FONT.body, fontSize: FS.sm, color: t.textTertiary }}>
          Vehículos activos · Alertas · Coste operativo mensual
        </div>
      </div>

      {err && (
        <div style={{
          background: t.dangerBg, color: t.dangerText,
          border: `1px solid ${t.dangerBorder}`,
          padding: SPACE[4], borderRadius: RADIUS.md,
          fontFamily: FONT.body, fontSize: FS.sm,
        }}>
          Error: {err}. Verifica que se haya ejecutado la migración 015 (añade columnas km, ITV, seguros y crea furgonetas_mantenimientos).
        </div>
      )}

      {loading && furgonetas.length === 0 && (
        <div style={{ padding: SPACE[8], textAlign: 'center', color: t.textTertiary, fontFamily: FONT.body }}>
          Cargando flota…
        </div>
      )}

      {furgonetas.length > 0 && (
        <>
          {/* FILA 1 — KPIs */}
          <KpisFlota furgonetas={furgonetas} costes={costes} alertas={alertas} />

          {/* FILA 2 — Alertas */}
          <AlertasFlota alertas={alertas} />

          {/* FILA 3 — Detalle por furgoneta */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: SPACE[5],
          }}>
            {furgonetas.map(f => (
              <FurgonetaCard
                key={f.id}
                furgo={f}
                costeMes={costeMensualFurgo(f, costes.combustiblePorFurgoId.get(f.id) ?? 0)}
                onEdit={() => setEditar(f)}
              />
            ))}
          </div>
        </>
      )}

      {editar && (
        <ModalEditarFurgoneta
          furgo={editar}
          onClose={() => setEditar(null)}
          onSaved={cargar}
        />
      )}
    </div>
  )
}
