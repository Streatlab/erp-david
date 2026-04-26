/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '../supabase';

// Tipos ─────────────────────────────────────────────────────────
export interface Furgoneta {
  id: string;
  codigo: string;
  conductor: string;
  matricula: string;
  modelo: string;
  ruta?: string | null;
  nombre_corto?: string | null;
  estado: 'OPERATIVA' | 'EN_REVISION' | 'FUERA_SERVICIO';
  km_actual?: number | null;
  km_proxima_revision?: number | null;
  itv_fecha?: string | null;
  seguro_fecha_vencimiento?: string | null;
  prestamo_mensual?: number | null;
  seguro_anual?: number | null;
  alquiler_mensual?: number | null;
  conductor_id?: string | null;
  activa: boolean;
}

export interface SeguroFurgo {
  id: string;
  furgoneta_id: string;
  compania?: string | null;
  numero_poliza?: string | null;
  telefono?: string | null;
  email?: string | null;
  mediador_nombre?: string | null;
  mediador_tel?: string | null;
  coberturas?: string | null;
  franquicia_eur?: number | null;
  prima_anual_eur?: number | null;
  forma_pago?: string | null;
  fecha_proximo_cobro?: string | null;
  fecha_renovacion?: string | null;
  drive_poliza_id?: string | null;
  drive_condicionado_id?: string | null;
  drive_recibo_id?: string | null;
  notas?: string | null;
}

export interface ItvFurgo {
  id: string;
  furgoneta_id: string;
  estacion?: string | null;
  estacion_tel?: string | null;
  ultima_fecha?: string | null;
  ultima_km?: number | null;
  ultima_resultado?: string | null;
  proxima_fecha?: string | null;
  drive_informe_id?: string | null;
  notas?: string | null;
}

export interface FotoFurgo {
  id: string;
  furgoneta_id: string;
  drive_file_id: string;
  url_publica?: string | null;
  es_portada: boolean;
  fecha?: string | null;
  subida_por?: string | null;
  notas?: string | null;
}

export interface Conductor {
  id: string;
  nombre: string;
  apellidos?: string | null;
  dni?: string | null;
  fecha_nacimiento?: string | null;
  fecha_alta?: string | null;
  tipo_contrato?: string | null;
  salario_mensual?: number | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  carnet_tipo?: string | null;
  carnet_caducidad?: string | null;
  cuenta_bancaria?: string | null;
  drive_dni_id?: string | null;
  drive_carnet_id?: string | null;
  drive_contrato_id?: string | null;
  notas?: string | null;
  activo: boolean;
}

// Queries ───────────────────────────────────────────────────────
export async function getFurgonetas(): Promise<Furgoneta[]> {
  const { data, error } = await supabase
    .from('furgonetas')
    .select('*')
    .order('codigo', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Furgoneta[];
}

export async function getSeguro(furgoId: string): Promise<SeguroFurgo | null> {
  const { data, error } = await supabase
    .from('furgonetas_seguros')
    .select('*')
    .eq('furgoneta_id', furgoId)
    .maybeSingle();
  if (error) return null;
  return data as SeguroFurgo | null;
}

export async function getItv(furgoId: string): Promise<ItvFurgo | null> {
  const { data, error } = await supabase
    .from('furgonetas_itv')
    .select('*')
    .eq('furgoneta_id', furgoId)
    .maybeSingle();
  if (error) return null;
  return data as ItvFurgo | null;
}

export async function getFotos(furgoId: string): Promise<FotoFurgo[]> {
  const { data, error } = await supabase
    .from('furgonetas_fotos')
    .select('*')
    .eq('furgoneta_id', furgoId)
    .order('fecha', { ascending: false });
  if (error) return [];
  return (data ?? []) as FotoFurgo[];
}

export async function getConductor(conductorId: string): Promise<Conductor | null> {
  const { data, error } = await supabase
    .from('conductores')
    .select('*')
    .eq('id', conductorId)
    .maybeSingle();
  if (error) return null;
  return data as Conductor | null;
}

// Coste flota mes actual (lee de conciliacion REAL, no movimientos_banco fantasma)
export interface CosteFlota {
  combustibleTotal: number;
  combustiblePorFurgo: Record<string, number>;
  prestamoTotal: number;
  seguroTotal: number;
  alquilerTotal: number;
  costeTotal: number;
}

export async function getCosteFlotaMes(): Promise<CosteFlota> {
  const hoy = new Date();
  const start = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().slice(0, 10);

  const furgos = await getFurgonetas();
  const operativas = furgos.filter((f) => f.estado === 'OPERATIVA');

  // Combustible / energía vehículo desde conciliacion
  const { data: movs } = await supabase
    .from('conciliacion')
    .select('importe, categoria, fecha, furgoneta_id, prorrateo')
    .gte('fecha', start)
    .lte('fecha', end)
    .in('categoria', [
      'Combustible/Energía vehículo',
      'Combustible',
      'COMBUSTIBLE',
      'COMBUSTIBLE_ENERGIA_VEHICULO',
      'Recargas eléctricas',
    ]);

  const combustiblePorFurgo: Record<string, number> = {};
  let combustibleTotal = 0;

  for (const m of movs ?? []) {
    const importe = Math.abs(Number(m.importe ?? 0));
    if (importe === 0) continue;
    if (m.furgoneta_id) {
      combustiblePorFurgo[m.furgoneta_id] = (combustiblePorFurgo[m.furgoneta_id] ?? 0) + importe;
      combustibleTotal += importe;
    } else if (m.prorrateo && operativas.length > 0) {
      const cuota = importe / operativas.length;
      for (const f of operativas) {
        combustiblePorFurgo[f.id] = (combustiblePorFurgo[f.id] ?? 0) + cuota;
      }
      combustibleTotal += importe;
    }
  }

  let prestamoTotal = 0;
  let seguroTotal = 0;
  let alquilerTotal = 0;
  for (const f of operativas) {
    prestamoTotal += Number(f.prestamo_mensual ?? 0);
    seguroTotal += Number(f.seguro_anual ?? 0) / 12;
    alquilerTotal += Number(f.alquiler_mensual ?? 0);
  }

  return {
    combustibleTotal,
    combustiblePorFurgo,
    prestamoTotal,
    seguroTotal,
    alquilerTotal,
    costeTotal: combustibleTotal + prestamoTotal + seguroTotal + alquilerTotal,
  };
}

export function costeMensualFurgo(f: Furgoneta, combustibleMes: number): number {
  const prestamo = Number(f.prestamo_mensual ?? 0);
  const seguro = Number(f.seguro_anual ?? 0) / 12;
  const alquiler = Number(f.alquiler_mensual ?? 0);
  return prestamo + seguro + alquiler + combustibleMes;
}

export function driveFileUrl(fileId: string | null | undefined): string | null {
  if (!fileId) return null;
  return `https://drive.google.com/file/d/${fileId}/view`;
}
