// DOCUMENTACIÓN CADE · SUBIDA ÚNICA — ERP David (v3)
// Clasifica cada PDF: emisor por IBAN de la cuenta (primero) o por NIF; tipo por contenido.
// Ojo: la cuenta de Juan es cotitular y el banco la muestra a nombre de David → manda el IBAN, no el nombre.
// v3: reconoce también RNT (Relación Nominal de Trabajadores) e ITA (Informe de Trabajadores en Alta).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getDocumentProxy, extractText } from 'npm:unpdf@0.12.1';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const log = (estado: string, detalle: string) => sb.from('robot_log').insert([{ fuente: 'documentacion_subir', estado, detalle: detalle.slice(0, 900) }]);

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const slug = (s: string) => norm(s).replace(/[^a-z0-9]+/g, '-');
const fechaEs = (d: string) => { const m = d.match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
const MESES: Record<string, string> = { enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06', julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12' };

interface Emisor { emisor: string; nif: string; iban: string; nombre: string }

function clasificar(texto: string, ems: Emisor[], nombreFichero: string) {
  const t = norm(texto);
  const fn = norm(nombreFichero);
  const sinEsp = texto.replace(/\s+/g, '').toUpperCase();
  let emisor: string | null = null;
  for (const e of ems) if (e.iban && sinEsp.includes(e.iban)) { emisor = e.emisor; break; }
  if (!emisor) for (const e of ems) { const n = e.nif.toLowerCase(); if (t.includes(n) || t.includes('0' + n)) { emisor = e.emisor; break; } }
  if (!emisor) for (const e of ems) { const ap = norm(e.nombre).split(' ').slice(-2).join(' '); if (ap && t.includes(ap)) { emisor = e.emisor; break; } }

  let documento: string | null = null;
  if (t.includes('relacion nominal de trabajadores') || /\brnt\b/.test(fn)) documento = 'RNT (Relación Nominal de Trabajadores)';
  else if (t.includes('trabajadores en alta') || t.includes('informe de datos para la cotizacion') || /\bita\b/.test(fn)) documento = 'ITA (Informe de Trabajadores en Alta)';
  else if (t.includes('agencia tributaria') && t.includes('obligaciones tributarias')) documento = 'Certificado AEAT al corriente';
  else if (t.includes('tesoreria general') && t.includes('al corriente')) documento = 'Certificado TGSS al corriente';
  else if (t.includes('autonomos') && (t.includes('cotizacion') || t.includes('cuota'))) documento = 'Justificante cuota autónomos (RETA)';
  else if (t.includes('regimen general') && t.includes('cotizacion')) documento = 'Justificante cotización régimen general';

  let expedido: string | null = null;
  const f1 = t.match(/con fecha (\d{1,2}) de ([a-z]+) de (\d{4})/);
  if (f1 && MESES[f1[2]]) expedido = `${f1[3]}-${MESES[f1[2]]}-${f1[1].padStart(2, '0')}`;
  if (!expedido) { const f2 = texto.match(/Fecha:?\s*(\d{2}\/\d{2}\/\d{4})/); if (f2) expedido = fechaEs(f2[1]); }
  if (!expedido) { const f4 = texto.match(/(\d{2}\/\d{2}\/\d{4})/); if (f4) expedido = fechaEs(f4[1]); }
  const imp = texto.match(/-\s?(\d{1,3}(?:\.\d{3})*,\d{2})\s*€/);
  const importe = imp ? Number(imp[1].replace(/\./g, '').replace(',', '.')) : null;
  const csv = texto.match(/Verificaci[oó]n\s+([A-Z0-9]{12,20})/) ?? texto.match(/C[oó]digo:\s*([A-Z0-9-]{20,})/) ?? texto.match(/PAN tarjeta\s+(\d{10,})/);
  return { emisor, documento, expedido, importe, codigo: csv ? csv[1] : null };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { ficheros } = await req.json() as { ficheros: { nombre: string; b64: string }[] };
    if (!ficheros?.length) return Response.json({ error: 'sin ficheros' }, { status: 400, headers: cors });
    const { data: em } = await sb.from('config_emisores').select('emisor, nif, nombre, cuenta_iban');
    const ems: Emisor[] = (em ?? []).map((e: any) => ({ emisor: e.emisor, nif: String(e.nif ?? '').replace(/^0+/, ''), nombre: e.nombre ?? '', iban: String(e.cuenta_iban ?? '').replace(/\s+/g, '').toUpperCase() }));
    const hoy = new Date();
    const periodo = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1).toISOString().slice(0, 10);

    const resultados: unknown[] = [];
    for (const f of ficheros) {
      try {
        const bytes = Uint8Array.from(atob(f.b64), c => c.charCodeAt(0));
        const pdf = await getDocumentProxy(bytes);
        const { text } = await extractText(pdf, { mergePages: true });
        const c = clasificar(text, ems, f.nombre);
        // RNT/ITA solo los tiene quien tiene trabajadores: si no se reconoce el emisor, es de Juan
        if (!c.emisor && c.documento && /^(RNT|ITA)/.test(c.documento)) c.emisor = 'JUAN';
        if (!c.emisor || !c.documento) {
          resultados.push({ fichero: f.nombre, ok: false, motivo: !c.emisor ? 'no reconozco de quién es (ni IBAN ni NIF de David o Juan)' : 'no reconozco qué documento es' });
          continue;
        }
        const ruta = `${c.emisor}/${periodo.slice(0, 7)}/${slug(c.documento)}-${Date.now()}.pdf`;
        const up = await sb.storage.from('documentacion').upload(ruta, bytes, { upsert: true, contentType: 'application/pdf' });
        if (up.error) throw new Error(up.error.message);
        await sb.from('documentos_emisor').delete().eq('emisor', c.emisor).eq('documento', c.documento).eq('periodo', periodo);
        const ins = await sb.from('documentos_emisor').insert([{
          emisor: c.emisor, documento: c.documento, periodo, expedido: c.expedido, importe: c.importe,
          codigo_verificacion: c.codigo, ruta, subido_por: 'erp', notas: f.nombre,
        }]);
        if (ins.error) throw new Error(ins.error.message);
        resultados.push({ fichero: f.nombre, ok: true, emisor: c.emisor, documento: c.documento, expedido: c.expedido, importe: c.importe });
      } catch (e) {
        resultados.push({ fichero: f.nombre, ok: false, motivo: String((e as Error)?.message ?? e) });
      }
    }
    const { data: pend } = await sb.from('v_documentacion_pendiente').select('emisor, documento').eq('estado', 'pedir');
    await log('ok', `${resultados.filter((r: any) => r.ok).length}/${ficheros.length} clasificados; faltan ${pend?.length ?? 0}`);
    return Response.json({ periodo, resultados, pendientes: pend ?? [] }, { headers: cors });
  } catch (e) {
    await log('fallo', String((e as Error)?.message ?? e));
    return Response.json({ error: String((e as Error)?.message ?? e) }, { status: 500, headers: cors });
  }
});
