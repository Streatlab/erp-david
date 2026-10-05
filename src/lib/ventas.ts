// Ventas consolidadas: total del negocio = todos los códigos, emita David o Juan.
export interface FilaConsolidada {
  mes: string
  transportista: string | null
  repartidor: string | null
  emisor: string | null
  facturas: number
  base: number
  iva: number
  total: number
}

export const CODIGOS_CADE = ['9392', '939', '9391', '972']

export function agruparVentas(filas: FilaConsolidada[]) {
  const suma = (fs: FilaConsolidada[], k: 'total' | 'base' = 'total') => fs.reduce((s, f) => s + Number(f[k] ?? 0), 0)
  const porRep = new Map<string, number>()
  for (const f of filas) {
    const k = f.repartidor ?? 'Otros clientes'
    porRep.set(k, (porRep.get(k) ?? 0) + Number(f.total ?? 0))
  }
  return {
    total: suma(filas),
    base: suma(filas, 'base'),
    david: suma(filas.filter(f => (f.emisor ?? '').toUpperCase() === 'DAVID')),
    juan: suma(filas.filter(f => (f.emisor ?? '').toUpperCase() === 'JUAN')),
    cade: suma(filas.filter(f => CODIGOS_CADE.includes(f.transportista ?? ''))),
    porRepartidor: [...porRep.entries()].map(([repartidor, total]) => ({ repartidor, total })).sort((a, b) => b.total - a.total),
  }
}
