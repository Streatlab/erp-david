import { useState } from 'react'
import { useThemeMode, getTokens, FONT, FS, FW, SPACE, RADIUS } from '@/styles/tokens'
import { Label } from '@/components/panel/shared'
import { actualizarFurgoneta, type Furgoneta } from '@/lib/flota/queries'

interface Props {
  furgo: Furgoneta
  onClose: () => void
  onSaved: () => void
}

export default function ModalEditarFurgoneta({ furgo, onClose, onSaved }: Props) {
  const theme = useThemeMode()
  const t = getTokens(theme)

  const [conductor, setConductor]       = useState(furgo.conductor || '')
  const [matricula, setMatricula]       = useState(furgo.matricula || '')
  const [modelo, setModelo]             = useState(furgo.modelo || '')
  const [ruta, setRuta]                 = useState(furgo.ruta || '')
  const [kmActual, setKmActual]         = useState(furgo.km_actual?.toString() ?? '')
  const [kmProx, setKmProx]             = useState(furgo.km_proxima_revision?.toString() ?? '')
  const [itv, setItv]                   = useState(furgo.itv_fecha ?? '')
  const [seguro, setSeguro]             = useState(furgo.seguro_fecha_vencimiento ?? '')
  const [prestamo, setPrestamo]         = useState(furgo.prestamo_mensual?.toString() ?? '')
  const [seguroAnual, setSeguroAnual]   = useState(furgo.seguro_anual?.toString() ?? '')
  const [alquiler, setAlquiler]         = useState(furgo.alquiler_mensual?.toString() ?? '')
  const [estado, setEstado]             = useState<Furgoneta['estado']>(furgo.estado ?? 'OPERATIVA')

  const [guardando, setGuardando] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const num = (s: string) => {
    const v = Number(s.replace(',', '.'))
    return isFinite(v) ? v : null
  }

  async function guardar() {
    setGuardando(true); setErr(null)
    try {
      await actualizarFurgoneta(furgo.id, {
        conductor: conductor.trim() || null as unknown as string,
        matricula: matricula.trim() || null,
        modelo: modelo.trim() || null,
        ruta: ruta.trim() || null,
        km_actual: num(kmActual),
        km_proxima_revision: num(kmProx),
        itv_fecha: itv || null,
        seguro_fecha_vencimiento: seguro || null,
        prestamo_mensual: num(prestamo),
        seguro_anual: num(seguroAnual),
        alquiler_mensual: num(alquiler),
        estado,
      })
      onSaved()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: t.bgOverlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: SPACE[4] }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 560, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto',
          background: t.bgSurface, borderRadius: RADIUS.lg, padding: SPACE[6],
          border: `0.5px solid ${t.borderDefault}`, boxShadow: t.shadowModal,
          display: 'flex', flexDirection: 'column', gap: SPACE[4],
        }}
      >
        <div>
          <Label>Editar furgoneta</Label>
          <div style={{ marginTop: 4, fontFamily: FONT.title, fontSize: FS.lg, fontWeight: FW.bold, color: t.textPrimary, textTransform: 'uppercase' }}>
            {furgo.conductor || furgo.nombre_corto}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACE[3] }}>
          <Field label="Conductor"  value={conductor}  onChange={setConductor} />
          <Field label="Matrícula"  value={matricula}  onChange={setMatricula} />
          <Field label="Modelo"     value={modelo}     onChange={setModelo} />
          <Field label="Ruta"       value={ruta}       onChange={setRuta} placeholder="Alcoi / Ontinyent" />
          <Field label="Km actual"  value={kmActual}   onChange={setKmActual} type="number" />
          <Field label="Km próxima revisión" value={kmProx} onChange={setKmProx} type="number" />
          <Field label="ITV (fecha)"           value={itv}    onChange={setItv}    type="date" />
          <Field label="Seguro (vencimiento)"  value={seguro} onChange={setSeguro} type="date" />
          <Field label="Préstamo mensual €"    value={prestamo}    onChange={setPrestamo}    type="number" />
          <Field label="Alquiler mensual €"    value={alquiler}    onChange={setAlquiler}    type="number" />
          <Field label="Seguro anual €"        value={seguroAnual} onChange={setSeguroAnual} type="number" />
          <SelectField
            label="Estado" value={estado ?? 'OPERATIVA'} onChange={v => setEstado(v as Furgoneta['estado'])}
            opciones={[
              { v: 'OPERATIVA',     l: 'Operativa' },
              { v: 'EN_REVISION',   l: 'En revisión' },
              { v: 'FUERA_SERVICIO',l: 'Fuera servicio' },
            ]}
          />
        </div>

        {err && (
          <div style={{ background: t.dangerBg, color: t.dangerText, padding: SPACE[3], borderRadius: RADIUS.md, fontSize: FS.sm }}>
            {err}
          </div>
        )}

        <div style={{ display: 'flex', gap: SPACE[2], justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: RADIUS.md, border: `1px solid ${t.borderDefault}`,
            background: 'transparent', color: t.textSecondary, fontFamily: FONT.body, fontSize: FS.sm, cursor: 'pointer',
          }}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={{
            padding: '8px 16px', borderRadius: RADIUS.md, border: 0,
            background: t.brandAccent, color: '#fff', fontFamily: FONT.body, fontSize: FS.sm, fontWeight: FW.medium, cursor: 'pointer',
            opacity: guardando ? 0.6 : 1,
          }}>{guardando ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: FONT.body, fontSize: FS.xs, color: t.textSecondary }}>
      <span style={{ fontFamily: FONT.title, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: '8px 10px',
          borderRadius: RADIUS.md, border: `1px solid ${t.borderDefault}`,
          background: t.bgSurfaceAlt, color: t.textPrimary,
          fontFamily: FONT.body, fontSize: FS.sm, outline: 'none',
        }}
      />
    </label>
  )
}

function SelectField({ label, value, onChange, opciones }: { label: string; value: string; onChange: (v: string) => void; opciones: { v: string; l: string }[] }) {
  const theme = useThemeMode()
  const t = getTokens(theme)
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: FONT.body, fontSize: FS.xs, color: t.textSecondary }}>
      <span style={{ fontFamily: FONT.title, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: '8px 10px', borderRadius: RADIUS.md, border: `1px solid ${t.borderDefault}`,
          background: t.bgSurfaceAlt, color: t.textPrimary,
          fontFamily: FONT.body, fontSize: FS.sm, outline: 'none',
        }}
      >
        {opciones.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  )
}
