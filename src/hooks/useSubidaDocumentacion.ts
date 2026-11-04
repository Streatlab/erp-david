import { useState } from 'react'
import { supabase } from '@/lib/supabase'

/* Subida única de la documentación de Cade: se mandan todos los PDF de David y de Juan juntos y el servidor
   (función documentacion-subir) reconoce de quién es cada uno (por IBAN o NIF) y qué documento es. */

export interface ResSubida { fichero: string; ok: boolean; emisor?: string; documento?: string; motivo?: string }

function aB64(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result).split(',')[1] ?? '')
    r.onerror = () => rej(new Error('no se pudo leer ' + f.name))
    r.readAsDataURL(f)
  })
}

export function useSubidaDocumentacion(onTerminado: () => void | Promise<void>) {
  const [subiendo, setSubiendo] = useState(false)
  const [res, setRes] = useState<ResSubida[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function subir(files: FileList | null) {
    if (!files || !files.length) return
    setSubiendo(true); setErr(null); setRes(null)
    try {
      const ficheros = await Promise.all(Array.from(files).map(async f => ({ nombre: f.name, b64: await aB64(f) })))
      const { data, error } = await supabase.functions.invoke('documentacion-subir', { body: { ficheros } })
      if (error) throw error
      setRes((data?.resultados ?? []) as ResSubida[])
      await onTerminado()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setSubiendo(false)
    }
  }

  return { subir, subiendo, res, err }
}
