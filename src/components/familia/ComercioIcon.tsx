/**
 * ComercioIcon.tsx — Logo del comercio (si lo conocemos) o icono genérico del rubro.
 * Los logos se sirven desde /public/logos (copia local, no dependen de internet); si falta uno, se pinta el icono del rubro.
 */
import { useState, type ComponentType } from 'react'
import {
  ShoppingCart, PawPrint, Beef, Banknote, Utensils, IceCreamCone, Coffee, Ticket, Shirt, Gift, Baby, Store, SprayCan,
  Pill, Glasses, Leaf, Zap, Wallet, Wrench, Camera, Package, Landmark, Shield, Wifi, Phone, Heart, Receipt, Car, House,
  Plane, CreditCard, HandHeart,
} from 'lucide-react'
import { INK, BLANCO } from '@/styles/neobrutal'

type Icono = ComponentType<{ size?: number; strokeWidth?: number; color?: string }>

/* Comercios con logo reconocible: fragmento del nombre (minúsculas) → dominio */
const DOMINIOS: [string, string][] = [
  ['family cash', 'familycash.es'], ['consum', 'consum.es'], ['mercadona', 'mercadona.com'], ['lidl', 'lidl.es'],
  ['carrefour', 'carrefour.es'], ['dia ', 'dia.es'], ['aliexpress', 'aliexpress.com'], ['decathlon', 'decathlon.es'],
  ['sprinter', 'sprintersports.com'], ['zinzino', 'zinzino.com'], ['bigmat', 'bigmat.es'], ['starlink', 'starlink.com'],
  ['axa', 'axa.es'], ['occident', 'occident.com'], ['google', 'google.com'], ['unicef', 'unicef.es'],
  ['médicos sin fronteras', 'msf.es'], ['hacienda', 'agenciatributaria.gob.es'], ['caixabank', 'caixabank.es'],
  ['cetelem', 'cetelem.es'], ['oney', 'oney.es'], ['hyundai', 'hyundai.com'], ['xfera', 'yoigo.com'],
  ['redhuevo', 'redhuevo.com'], ['suma gesti', 'suma.es'], ['plenergy', 'plenergy.es'], ['leroy', 'leroymerlin.es'],
]

/* Icono genérico por subcategoría / categoría */
const POR_SUB: Record<string, Icono> = {
  supermercado: ShoppingCart, 'comida-animales': PawPrint, 'carniceria-panaderia': Beef, 'bizum-comida': Banknote,
  restaurantes: Utensils, heladerias: IceCreamCone, 'cafeterias-pastelerias': Coffee, ocio: Ticket, viajes: Plane,
  ropa: Shirt, regalos: Gift, ninos: Baby, bazar: Store, drogueria: SprayCan, farmacia: Pill, optica: Glasses,
  suplementos: Pill, herbolario: Leaf, recarga: Zap, parking: Car, efectivo: Wallet, reparaciones: Wrench,
  fotografo: Camera, bizum: Banknote, otros: Package,
  financiacion: Landmark, 'impuestos-familia': Receipt, 'hogar-seguros': Shield, internet: Wifi, suscripciones: CreditCard,
  donaciones: HandHeart, alimentacion: ShoppingCart, compras: Store, coche: Car, hogar: House, salud: Heart,
}

export function dominioDe(nombre: string): string | null {
  const n = `${nombre.toLowerCase()} `
  const hit = DOMINIOS.find(([k]) => n.includes(k))
  return hit ? hit[1] : null
}

export function IconoRubro({ clave, size = 14, color = INK }: { clave: string; size?: number; color?: string }) {
  const I = POR_SUB[clave] ?? (clave.includes('tel') ? Phone : Package)
  return <I size={size} strokeWidth={2.4} color={color} />
}

export default function ComercioIcon({ nombre, rubro, size = 24 }: { nombre: string; rubro: string; size?: number }) {
  const [fallo, setFallo] = useState(false)
  const dom = dominioDe(nombre)
  const caja = {
    width: size, height: size, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: BLANCO, border: `2px solid ${INK}`, overflow: 'hidden',
  } as const
  return (
    <span style={caja} aria-hidden>
      {dom && !fallo
        ? <img src={`/logos/${dom}.png`} alt="" width={size - 6} height={size - 6}
            style={{ display: 'block' }} loading="lazy" onError={() => setFallo(true)} />
        : <IconoRubro clave={rubro} size={Math.round(size * 0.6)} />}
    </span>
  )
}
