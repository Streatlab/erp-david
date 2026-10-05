/**
 * Mi furgoneta — lo que el repartidor necesita saber de su vehículo:
 * km, próxima revisión, ITV, seguro y botón para avisar de un daño.
 * Nada de dinero (préstamo, cuotas): eso es solo de admin.
 */
import { useEffect, useRef, useState } from 'react'
import { Camera, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { INK, OLIVA, TERRA, NARANJA, CELESTE, AMBAR, GRIS, MARINO } from '@/styles/neobrutal'
import { diasHasta, fechaLarga, fechaCorta, subirFoto, ymd, type Furgoneta } from '@/lib/portal'
import { Tarjeta, Titulo, Texto, Cifra, Etiqueta, BotonGrande, Vacio, Pildora, campo, etiquetaCampo, rejilla, columna } from './ui'

interface Itv { proxima_fecha: string | null; ultima_fecha: string | null; ultima_resultado: string | null; estacion: string | null }
interface Seguro { compania: string | null; numero_poliza: string | null; telefono: string | null; fecha_renovacion: string | null }
interface Mant { fecha: string; km: number | null; tipo: string | null; taller: string | null; descripcion: string | null }
interface Incid { id: string; tipo: string | null; fecha: string; descripcion: string | null; estado: string | null }

function colorPlazo(dias: number | null) {
  if (dias === null) return GRIS
  if (dias < 0) return TERRA
  if (dias <= 30) return NARANJA
  return OLIVA
}

function textoPlazo(dias: number | null) {
  if (dias === null) return 'Sin fecha apuntada'
  if (dias < 0) return `Caducada hace ${-dias} días`
  if (dias === 0) return 'Es hoy'
  return `Faltan ${dias} días`
}

export default function PortalFurgoneta({ conductorId, furgoneta }: { conductorId: string | null; furgoneta: Furgoneta | null }) {
  const [itv, setItv] = useState<Itv | null>(null)
  const [seguro, setSeguro] = useState<Seguro | null>(null)
  const [mant, setMant] = useState<Mant[]>([])
  const [incid, setIncid] = useState<Incid[]>([])
  const [abierto, setAbierto] = useState(false)
  const [tipo, setTipo] = useState('daño')
  const [texto, setTexto] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState<{ t: string; c: string } | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const cargar = async () => {
    if (!furgoneta) return
    const [i, s, m, n] = await Promise.all([
      supabase.from('furgonetas_itv').select('proxima_fecha, ultima_fecha, ultima_resultado, estacion').eq('furgoneta_id', furgoneta.id).order('proxima_fecha', { ascending: false }).limit(1),
      supabase.from('furgonetas_seguros').select('compania, numero_poliza, telefono, fecha_renovacion').eq('furgoneta_id', furgoneta.id).order('fecha_renovacion', { ascending: false }).limit(1),
      supabase.from('furgonetas_mantenimientos_hist').select('fecha, km, tipo, taller, descripcion').eq('furgoneta_id', furgoneta.id).order('fecha', { ascending: false }).limit(5),
      supabase.from('furgonetas_incidencias').select('id, tipo, fecha, descripcion, estado').eq('furgoneta_id', furgoneta.id).order('fecha', { ascending: false }).limit(10),
    ])
    setItv(((i.data ?? [])[0] as Itv) ?? null)
    setSeguro(((s.data ?? [])[0] as Seguro) ?? null)
    setMant((m.data ?? []) as Mant[])
    setIncid((n.data ?? []) as Incid[])
  }
  useEffect(() => { cargar() }, [furgoneta?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!furgoneta) return <Vacio>No tienes furgoneta asignada. Habla con Rubén para que te la asigne.</Vacio>

  const fechaItv = itv?.proxima_fecha ?? furgoneta.itv_fecha
  const fechaSeguro = seguro?.fecha_renovacion ?? furgoneta.seguro_fecha_vencimiento
  const dItv = diasHasta(fechaItv)
  const dSeg = diasHasta(fechaSeguro)
  const kmRev = furgoneta.km_proxima_revision && furgoneta.km_actual != null ? furgoneta.km_proxima_revision - furgoneta.km_actual : null

  const enviar = async () => {
    if (!texto.trim()) { setMsg({ t: 'Cuenta qué ha pasado.', c: TERRA }); return }
    setEnviando(true); setMsg(null)
    const url = foto ? await subirFoto(`danos/${furgoneta.codigo}`, foto) : null
    const { error } = await supabase.from('furgonetas_incidencias').insert({
      furgoneta_id: furgoneta.id, conductor_id: conductorId, tipo, fecha: ymd(new Date()),
      descripcion: texto.trim(), estado: 'pendiente', notas: url ? `Foto: ${url}` : null,
    })
    setEnviando(false)
    if (error) { setMsg({ t: 'No se ha podido enviar. Prueba otra vez.', c: TERRA }); return }
    setMsg({ t: 'Aviso enviado. Rubén ya lo ve.', c: OLIVA })
    setTexto(''); setFoto(null); setAbierto(false)
    cargar()
  }

  return (
    <div style={columna}>
      <Tarjeta color={MARINO}>
        <Etiqueta>Tu furgoneta</Etiqueta>
        <Cifra size={34}>{furgoneta.matricula}</Cifra>
        <Texto>{furgoneta.modelo ?? '—'}{furgoneta.ruta ? ` · ruta ${furgoneta.ruta}` : ''}</Texto>
        <Texto suave>Marca ahora: <b>{furgoneta.km_actual != null ? `${furgoneta.km_actual.toLocaleString('es-ES')} km` : 'sin apuntar todavía'}</b></Texto>
      </Tarjeta>

      <div style={rejilla(210)}>
        <Tarjeta color={colorPlazo(dItv)}>
          <Etiqueta>ITV</Etiqueta>
          <Cifra size={26} color={colorPlazo(dItv)}>{textoPlazo(dItv)}</Cifra>
          <Texto suave>{fechaItv ? fechaLarga(fechaItv) : 'Rubén tiene que apuntar la fecha'}</Texto>
          {itv?.estacion && <Texto suave>Estación: {itv.estacion}</Texto>}
        </Tarjeta>

        <Tarjeta color={kmRev === null ? GRIS : kmRev < 0 ? TERRA : kmRev <= 2000 ? NARANJA : OLIVA}>
          <Etiqueta>Próxima revisión</Etiqueta>
          <Cifra size={26}>{kmRev === null ? 'Sin dato' : kmRev < 0 ? `Pasada ${(-kmRev).toLocaleString('es-ES')} km` : `En ${kmRev.toLocaleString('es-ES')} km`}</Cifra>
          <Texto suave>{furgoneta.km_proxima_revision ? `A los ${furgoneta.km_proxima_revision.toLocaleString('es-ES')} km` : 'Rubén tiene que apuntarla'}</Texto>
        </Tarjeta>

        <Tarjeta color={colorPlazo(dSeg)}>
          <Etiqueta>Seguro</Etiqueta>
          <Cifra size={26} color={colorPlazo(dSeg)}>{dSeg === null ? 'Sin fecha' : dSeg < 0 ? 'Vencido' : `Hasta ${fechaCorta(fechaSeguro)}`}</Cifra>
          {seguro?.compania && <Texto suave>{seguro.compania}{seguro.numero_poliza ? ` · póliza ${seguro.numero_poliza}` : ''}</Texto>}
          {seguro?.telefono && <a href={`tel:${seguro.telefono}`} style={{ fontWeight: 700, color: CELESTE }}>Asistencia: {seguro.telefono}</a>}
        </Tarjeta>
      </div>

      <Tarjeta color={TERRA}>
        <Titulo>¿Algún golpe, avería o multa?</Titulo>
        {!abierto ? (
          <BotonGrande bg={TERRA} onClick={() => { setAbierto(true); setMsg(null) }}><AlertTriangle size={20} /> Avisar a Rubén</BotonGrande>
        ) : (
          <div style={columna}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['daño', 'avería', 'multa'].map((t) => (
                <button key={t} onClick={() => setTipo(t)} style={{
                  minHeight: 44, padding: '8px 16px', border: `3px solid ${INK}`, background: tipo === t ? INK : '#fff',
                  color: tipo === t ? '#fff' : INK, fontWeight: 700, fontSize: 16, textTransform: 'capitalize', cursor: 'pointer',
                }}>{t}</button>
              ))}
            </div>
            <label>
              <span style={etiquetaCampo}>Qué ha pasado</span>
              <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} style={{ ...campo, minHeight: 90 }} placeholder="Ej. rozón en la puerta trasera derecha al aparcar" />
            </label>
            <input ref={input} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
            <BotonGrande bg={foto ? OLIVA : CELESTE} onClick={() => input.current?.click()}><Camera size={20} /> {foto ? 'Foto añadida' : 'Añadir foto'}</BotonGrande>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <BotonGrande bg={TERRA} onClick={enviar} disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar aviso'}</BotonGrande>
              <BotonGrande bg={GRIS} color={INK} onClick={() => setAbierto(false)}>Cancelar</BotonGrande>
            </div>
          </div>
        )}
        {msg && <Texto style={{ color: msg.c }}>{msg.t}</Texto>}
      </Tarjeta>

      {incid.length > 0 && (
        <>
          <Titulo>Avisos de esta furgoneta</Titulo>
          {incid.map((i) => (
            <Tarjeta key={i.id} color={i.estado === 'cerrada' || i.estado === 'resuelta' ? OLIVA : AMBAR}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <Texto style={{ textTransform: 'capitalize' }}>{i.tipo ?? 'Aviso'} · {fechaCorta(i.fecha)}</Texto>
                <Pildora texto={i.estado ?? 'pendiente'} bg={i.estado === 'cerrada' || i.estado === 'resuelta' ? OLIVA : AMBAR} color={INK} />
              </div>
              {i.descripcion && <Texto suave>{i.descripcion}</Texto>}
            </Tarjeta>
          ))}
        </>
      )}

      {mant.length > 0 && (
        <>
          <Titulo>Últimos pasos por el taller</Titulo>
          {mant.map((m, k) => (
            <Tarjeta key={k} color={CELESTE}>
              <Texto>{fechaLarga(m.fecha)}{m.km ? ` · ${m.km.toLocaleString('es-ES')} km` : ''}</Texto>
              <Texto suave>{[m.tipo, m.taller, m.descripcion].filter(Boolean).join(' · ')}</Texto>
            </Tarjeta>
          ))}
        </>
      )}
    </div>
  )
}
