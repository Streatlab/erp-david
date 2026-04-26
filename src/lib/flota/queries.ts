/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '../supabase';

// ─── Tipos ──────────────────────────────────────────────────
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
  id: string; furgoneta_id: string;
  compania?: string | null; numero_poliza?: string | null;
  telefono?: string | null; email?: string | null;
  mediador_nombre?: string | null; mediador_tel?: string | null;
  coberturas?: string | null; franquicia_eur?: number | null;
  prima_anual_eur?: number | null; forma_pago?: string | null;
  fecha_proximo_cobro?: string | null; fecha_renovacion?: string | null;
  drive_poliza_id?: string | null; drive_condicionado_id?: string | null;
  drive_recibo_id?: string | null; notas?: string | null;
}

export interface ItvFurgo {
  id: string; furgoneta_id: string;
  estacion?: string | null; estacion_tel?: string | null;
  ultima_fecha?: string | null; ultima_km?: number | null;
  ultima_resultado?: string | null; proxima_fecha?: string | null;
  drive_informe_id?: string | null; notas?: string | null;
}

export interface FotoFurgo {
  id: string; furgoneta_id: string;
  drive_file_id: string; url_publica?: string | null;
  es_portada: boolean; fecha?: string | null;
  subida_por?: string | null; notas?: string | null;
}

export interface Conductor {
  id: string; nombre: string; apellidos?: string | null;
  dni?: string | null; fecha_nacimiento?: string | null;
  fecha_alta?: string | null; tipo_contrato?: string | null;
  salario_mensual?: number | null; telefono?: string | null;
  email?: string | null; direccion?: string | null;
  carnet_tipo?: string | null; carnet_caducidad?: string | null;
  cuenta_bancaria?: string | null;
  drive_dni_id?: string | null; drive_carnet_id?: string | null;
  drive_contrato_id?: string | null;
  notas?: string | null; activo: boolean;
}

export interface ParteKm {
  id: string; furgoneta_id: string; conductor_id?: string | null;
  semana_lunes: string; km_inicio?: number | null; km_fin?: number | null;
  km_recorridos?: number | null; notas?: string | null;
}

export interface RevisionVisual {
  id: string; furgoneta_id: string; conductor_id?: string | null;
  semana_lunes: string;
  drive_frontal_id?: string | null; drive_lateral_izq_id?: string | null;
  drive_lateral_dch_id?: string | null; drive_trasera_id?: string | null;
  drive_interior_id?: string | null;
  daños_detectados?: boolean; notas?: string | null;
}

export interface Mantenimiento {
  id: string; furgoneta_id: string;
  fecha: string; km?: number | null;
  taller?: string | null; taller_tel?: string | null;
  tipo?: string | null; descripcion?: string | null;
  coste_eur?: number | null; drive_factura_id?: string | null;
  notas?: string | null;
}

export interface Prestamo {
  id: string; furgoneta_id: string;
  entidad?: string | null; numero_prestamo?: string | null;
  importe_total?: number | null; cuota_mensual?: number | null;
  fecha_inicio?: string | null; fecha_fin?: string | null;
  cuotas_pagadas?: number | null; cuotas_totales?: number | null;
  tae?: number | null; drive_contrato_id?: string | null;
  notas?: string | null;
}

export interface Documento {
  id: string; furgoneta_id: string;
  tipo: string; descripcion?: string | null;
  drive_file_id: string; fecha_documento?: string | null;
  fecha_caducidad?: string | null; notas?: string | null;
}

export interface Incidencia {
  id: string; furgoneta_id: string; conductor_id?: string | null;
  tipo: 'MULTA' | 'SINIESTRO' | 'OTRO';
  fecha: string; importe_eur?: number | null;
  descripcion?: string | null;
  recurrida?: boolean; resultado_recurso?: string | null;
  drive_documento_id?: string | null;
  estado?: string | null; notas?: string | null;
}

// ─── Queries ────────────────────────────────────────────────
export async function getFurgonetas(): Promise<Furgoneta[]> {
  const { data, error } = await supabase.from('furgonetas').select('*').order('codigo', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Furgoneta[];
}

export async function getFurgonetaPorCodigo(codigo: string): Promise<Furgoneta | null> {
  const { data } = await supabase.from('furgonetas').select('*').eq('codigo', codigo).maybeSingle();
  return data as Furgoneta | null;
}

export async function getSeguro(furgoId: string): Promise<SeguroFurgo | null> {
  const { data } = await supabase.from('furgonetas_seguros').select('*').eq('furgoneta_id', furgoId).maybeSingle();
  return data as SeguroFurgo | null;
}

export async function getItv(furgoId: string): Promise<ItvFurgo | null> {
  const { data } = await supabase.from('furgonetas_itv').select('*').eq('furgoneta_id', furgoId).maybeSingle();
  return data as ItvFurgo | null;
}

export async function getFotos(furgoId: string): Promise<FotoFurgo[]> {
  const { data } = await supabase.from('furgonetas_fotos').select('*').eq('furgoneta_id', furgoId).order('fecha', { ascending: false });
  return (data ?? []) as FotoFurgo[];
}

export async function getConductor(conductorId: string): Promise<Conductor | null> {
  const { data } = await supabase.from('conductores').select('*').eq('id', conductorId).maybeSingle();
  return data as Conductor | null;
}

export async function getPartesKm(furgoId: string): Promise<ParteKm[]> {
  const { data } = await supabase.from('furgonetas_partes_km').select('*').eq('furgoneta_id', furgoId).order('semana_lunes', { ascending: false }).limit(20);
  return (data ?? []) as ParteKm[];
}

export async function getRevisionesVisuales(furgoId: string): Promise<RevisionVisual[]> {
  const { data } = await supabase.from('furgonetas_revisiones_visuales').select('*').eq('furgoneta_id', furgoId).order('semana_lunes', { ascending: false }).limit(12);
  return (data ?? []) as RevisionVisual[];
}

export async function getMantenimientos(furgoId: string): Promise<Mantenimiento[]> {
  const { data } = await supabase.from('furgonetas_mantenimientos_hist').select('*').eq('furgoneta_id', furgoId).order('fecha', { ascending: false });
  return (data ?? []) as Mantenimiento[];
}

export async function getPrestamo(furgoId: string): Promise<Prestamo | null> {
  const { data } = await supabase.from('furgonetas_prestamos').select('*').eq('furgoneta_id', furgoId).maybeSingle();
  return data as Prestamo | null;
}

export async function getDocumentos(furgoId: string): Promise<Documento[]> {
  const { data } = await supabase.from('furgonetas_documentos').select('*').eq('furgoneta_id', furgoId).order('fecha_documento', { ascending: false });
  return (data ?? []) as Documento[];
}

export async function getIncidencias(furgoId: string): Promise<Incidencia[]> {
  const { data } = await supabase.from('furgonetas_incidencias').select('*').eq('furgoneta_id', furgoId).order('fecha', { ascending: false });
  return (data ?? []) as Incidencia[];
}

// ─── Coste flota mes ───────────────────────────────────────
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

  const { data: movs } = await supabase
    .from('conciliacion')
    .select('importe, categoria, fecha, furgoneta_id, prorrateo')
    .gte('fecha', start)
    .lte('fecha', end)
    .in('categoria', [
      'Combustible/Energía vehículo', 'Combustible',
      'COMBUSTIBLE', 'COMBUSTIBLE_ENERGIA_VEHICULO', 'Recargas eléctricas',
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

  let prestamoTotal = 0, seguroTotal = 0, alquilerTotal = 0;
  for (const f of operativas) {
    prestamoTotal += Number(f.prestamo_mensual ?? 0);
    seguroTotal += Number(f.seguro_anual ?? 0) / 12;
    alquilerTotal += Number(f.alquiler_mensual ?? 0);
  }

  return {
    combustibleTotal, combustiblePorFurgo,
    prestamoTotal, seguroTotal, alquilerTotal,
    costeTotal: combustibleTotal + prestamoTotal + seguroTotal + alquilerTotal,
  };
}

export function costeMensualFurgo(f: Furgoneta, combustibleMes: number): number {
  return Number(f.prestamo_mensual ?? 0) + Number(f.seguro_anual ?? 0) / 12 + Number(f.alquiler_mensual ?? 0) + combustibleMes;
}

export function driveFileUrl(fileId: string | null | undefined): string | null {
  if (!fileId) return null;
  return `https://drive.google.com/file/d/${fileId}/view`;
}

export function driveThumb(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
}
