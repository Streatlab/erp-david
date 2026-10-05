import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { EmisorFila } from '@/lib/equipo'

export interface Persona {
  id: string; nombre: string; alias: string | null; estado: string | null; ciudad: string | null; notas: string | null; fecha_alta: string | null
}
export interface FurgoEq { id: string; codigo: string; nombre_corto: string; conductor: string | null; matricula: string | null }

/* Equipo real: personas (equipo), códigos y emisores (emisores_transportistas) y furgonetas asignadas. */
export function useEquipo(tick = 0) {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [emisores, setEmisores] = useState<EmisorFila[]>([])
  const [furgos, setFurgos] = useState<FurgoEq[]>([])
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('equipo').select('id, nombre, alias, estado, ciudad, notas, fecha_alta').order('nombre'),
      supabase.from('emisores_transportistas').select('transportista, emisor, repartidor, vigente_desde, vigente_hasta'),
      supabase.from('furgonetas').select('id, codigo, nombre_corto, conductor, matricula').eq('activa', true).order('codigo'),
    ]).then(([p, e, f]) => {
      const err = p.error ?? e.error ?? f.error
      if (err) setError(err.message)
      setPersonas((p.data ?? []) as Persona[])
      setEmisores((e.data ?? []) as EmisorFila[])
      setFurgos((f.data ?? []) as FurgoEq[])
      setCargando(false)
    })
  }, [tick])

  const furgoDe = (alias: string | null) => furgos.find(f => (f.conductor ?? '').trim().toLowerCase() === (alias ?? '').trim().toLowerCase()) ?? null
  return { personas, emisores, furgos, furgoDe, error, cargando }
}

export const hoyISO = () => new Date().toISOString().slice(0, 10)
