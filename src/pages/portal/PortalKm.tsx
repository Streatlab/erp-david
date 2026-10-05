/**
 * Kilómetros — foto del cuentakilómetros + cifra. Obligatorio lunes (inicio)
 * y domingo (fin). Al guardar, la base de datos actualiza la furgoneta y el
 * fondo de reposición, y marca para revisar lecturas raras.
 */
import { useEffect, useRef, useState } from 'react'
import { Camera, Check } from 'lucide-react'
import { INK, OLIVA, TERRA, NARANJA, CELESTE, AMBAR, GRIS, OSW } from '@/styles/neobrutal'
import {
  lecturasDe, guardarLectura, subirFoto, faltaKmSemana, fechaLarga, lunesDe, ymd,
  type Furgoneta, type Lectura,
} from '@/lib/portal'
import { Tarjeta, Titulo, Texto, Cifra, BotonGrande, Vacio, Pildora, campo, etiquetaCampo, columna } from './ui'

const MOMENTO_TXT: Record<Lectura['momento'], string> = {
  inicio_semana: 'Inicio de semana', fin_semana: 'Fin de semana', suelto: 'Lectura suelta',
}

function momentoPorDefecto(): Lectura['momento'] {
  const d = new Date().getDay() // 0 domingo
  if (d === 0 || d === 6) return 'fin_semana'
  return 'inicio_semana'
}

export default function PortalKm({ conductorId, furgoneta, onGuardado }: {
  conductorId: string | null; furgoneta: Furgoneta | null; onGuardado?: () => void
}) {
  const [lecturas, setLecturas] = useState<Lectura[]>([])
  const [cargando, setCargando] = useState(true)
  const [foto, setFoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [km, setKm] = useState('')
  const [momento, setMomento] = useState<Lectura['momento']>(momentoPorDefecto())
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<{ txt: string; color: string } | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const recargar = async () => {
    if (!furgoneta) { setCargando(false); return }
    setLecturas(await lecturasDe(furgoneta.id))
    setCargando(false)
  }
  useEffect(() => { recargar() }, [furgoneta?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  if (!furgoneta) return <Vacio>No tienes furgoneta asignada. Habla con Rubén para que te la asigne.</Vacio>
  if (cargando) return <Vacio>Cargando tus kilómetros…</Vacio>

  const falta = faltaKmSemana(lecturas)
  const ultima = lecturas.find((l) => l.estado === 'ok')
  const kmNum = Number(km)
  const sospechoso = !!ultima && km !== '' && (kmNum < ultima.km_leido || kmNum - ultima.km_leido > 2000)

  const elegirFoto = (f: File | null) => {
    setFoto(f)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(f ? URL.createObjectURL(f) : null)
    setMensaje(null)
  }

  const guardar = async () => {
    if (!foto) { setMensaje({ txt: 'Primero haz la foto del cuentakilómetros.', color: TERRA }); return }
    if (!km || !Number.isFinite(kmNum) || kmNum <= 0) { setMensaje({ txt: 'Escribe los kilómetros que marca.', color: TERRA }); return }
    setGuardando(true); setMensaje(null)
    const url = await subirFoto(`km/${furgoneta.codigo}`, foto)
    if (!url) { setGuardando(false); setMensaje({ txt: 'No se ha podido subir la foto. Revisa la conexión y prueba otra vez.', color: TERRA }); return }
    const r = await guardarLectura({ conductor_id: conductorId, furgoneta_id: furgoneta.id, momento, km_leido: Math.round(kmNum), foto_url: url })
    setGuardando(false)
    if (!r.ok) { setMensaje({ txt: 'No se ha podido guardar. Prueba otra vez.', color: TERRA }); return }
    setMensaje(r.revisar
      ? { txt: 'Guardado. La cifra es rara respecto a la anterior: Rubén la revisará.', color: AMBAR }
      : { txt: '¡Hecho! Kilómetros apuntados.', color: OLIVA })
    setKm(''); elegirFoto(null)
    await recargar()
    onGuardado?.()
  }

  // Km de cada semana: última lectura de la semana − última de la anterior
  const porSemana = new Map<string, number>()
  for (const l of [...lecturas].filter((x) => x.estado === 'ok').reverse()) porSemana.set(ymd(lunesDe(new Date(l.fecha + 'T12:00:00'))), l.km_leido)
  const semanas = Array.from(porSemana.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  const kmSemanas = semanas.slice(1).map(([s, v], i) => ({ semana: s, km: v - semanas[i][1] })).reverse().slice(0, 6)

  return (
    <div style={columna}>
      {falta && (
        <Tarjeta color={NARANJA} bg="#FFF4E8">
          <Titulo color={NARANJA}>Te falta apuntar los kilómetros de esta semana</Titulo>
          <Texto>Haz una foto al cuentakilómetros y escribe la cifra. Es un minuto.</Texto>
        </Tarjeta>
      )}

      <Tarjeta color={CELESTE}>
        <Titulo>Apuntar kilómetros · {furgoneta.matricula}</Titulo>

        <input ref={input} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
          onChange={(e) => elegirFoto(e.target.files?.[0] ?? null)} />

        {preview ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <img src={preview} alt="Foto del cuentakilómetros" style={{ width: '100%', maxHeight: 280, objectFit: 'contain', border: `3px solid ${INK}`, background: INK }} />
            <BotonGrande bg={GRIS} color={INK} onClick={() => input.current?.click()}><Camera size={20} /> Repetir foto</BotonGrande>
          </div>
        ) : (
          <BotonGrande bg={CELESTE} onClick={() => input.current?.click()}><Camera size={22} /> Hacer foto del cuentakilómetros</BotonGrande>
        )}

        <label>
          <span style={etiquetaCampo}>¿Cuántos kilómetros marca?</span>
          <input type="number" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value.replace(/[^\d]/g, ''))}
            placeholder={ultima ? `La última vez: ${ultima.km_leido.toLocaleString('es-ES')}` : 'Ej. 84250'}
            style={{ ...campo, fontFamily: OSW, fontSize: 28 }} />
        </label>

        {sospechoso && (
          <Texto style={{ color: TERRA }}>
            Ojo: la última vez marcaba {ultima!.km_leido.toLocaleString('es-ES')} km. Revisa que la cifra esté bien.
          </Texto>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['inicio_semana', 'fin_semana', 'suelto'] as const).map((m) => (
            <button key={m} onClick={() => setMomento(m)} style={{
              minHeight: 44, padding: '8px 14px', border: `3px solid ${INK}`, background: momento === m ? INK : '#fff',
              color: momento === m ? '#fff' : INK, fontFamily: OSW, fontWeight: 700, fontSize: 15, textTransform: 'uppercase', cursor: 'pointer',
            }}>{MOMENTO_TXT[m]}</button>
          ))}
        </div>

        <BotonGrande bg={OLIVA} onClick={guardar} disabled={guardando}>
          <Check size={22} /> {guardando ? 'Guardando…' : 'Guardar kilómetros'}
        </BotonGrande>

        {mensaje && <Texto style={{ color: mensaje.color, fontSize: 17 }}>{mensaje.txt}</Texto>}
      </Tarjeta>

      {kmSemanas.length > 0 && (
        <Tarjeta color={OLIVA}>
          <Titulo>Kilómetros por semana</Titulo>
          {kmSemanas.map((s) => (
            <div key={s.semana} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `2px dashed ${GRIS}`, padding: '6px 0' }}>
              <Texto>Semana del {new Date(s.semana + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</Texto>
              <Cifra size={24}>{s.km.toLocaleString('es-ES')} km</Cifra>
            </div>
          ))}
        </Tarjeta>
      )}

      <Titulo>Tus últimas lecturas</Titulo>
      {lecturas.length === 0 ? <Vacio>Todavía no has apuntado ninguna lectura.</Vacio> : lecturas.slice(0, 10).map((l) => (
        <Tarjeta key={l.id} color={l.estado === 'ok' ? OLIVA : AMBAR}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <Cifra size={28}>{l.km_leido.toLocaleString('es-ES')} km</Cifra>
              <Texto suave>{fechaLarga(l.fecha)} · {MOMENTO_TXT[l.momento]}</Texto>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {l.estado === 'revisar' && <Pildora texto="En revisión" bg={AMBAR} color={INK} />}
              {l.foto_url && (
                <a href={l.foto_url} target="_blank" rel="noreferrer">
                  <img src={l.foto_url} alt="Foto" style={{ width: 64, height: 64, objectFit: 'cover', border: `3px solid ${INK}` }} />
                </a>
              )}
            </div>
          </div>
        </Tarjeta>
      ))}
    </div>
  )
}
