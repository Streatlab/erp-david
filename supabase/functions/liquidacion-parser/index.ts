// LIQUIDACIÓN CADE · LECTOR + FACTURA + ENVÍOS — ERP David (v8)
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getDocumentProxy } from 'npm:unpdf@0.12.1';

const LLAVE = Deno.env.get('LLAVE_LIQ') ?? ''; // la llave no se guarda en el repo (ver README)
const BUCKET = 'correo';
const FACTURAR_DESDE = '2026-09-01';
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const log = (estado: string, detalle: string) => sb.from('robot_log').insert([{ fuente: 'liquidacion_parser', estado, detalle: detalle.slice(0, 900) }]);
let DEBUG = '';

const num = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'));
const fecha = (d: string) => { const [dd, mm, yy] = d.split('/'); return `20${yy}-${mm}-${dd}`; };
const eur = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

interface Entrega { cliente: string; ref: string; fecha: string; destino: string; kilos: number; base: number; compl: number; fijo: number; importe: number }
interface Dia { fecha: string; entregas: number; base: number; compl: number; fijo: number; total: number }
interface Inc { codigo: string; fecha: string; importe: number }

const reEnt = /^(\S+) (\S+) (\d{3,4}) (\d\d\/\d\d\/\d\d) (.+?) (-?[\d.,]+) (-?[\d.,]+) (-?[\d.,]+) (-?[\d.,]+) (-?[\d.,]+)$/;
const reInc = /^([A-Z][A-Z.\-]*(?: [A-Z][A-Z.\-]*){0,2}) (\d{3,4}) (\d\d\/\d\d\/\d\d) (-?[\d.,]+) ([\d.,]+) ([\d.,]+) (-?[\d.,]+)$/;
const reDia = /TOTAL CONDUCTOR (\d+) ENTREGAS (\d+) (-?[\d.,]+) (-?[\d.,]+) (-?[\d.,]+) (-?[\d.,]+)/;
const reTot = /T\s?O\s?T\s?A\s?L ENTREGAS (\d+) (.*)$/;

async function textoConLineas(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const out: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    const items = (tc.items as any[]).filter(i => typeof i.str === 'string' && i.str.trim() !== '')
      .map(i => ({ x: i.transform[4] as number, y: i.transform[5] as number, s: i.str as string }));
    items.sort((a, b) => (b.y - a.y) || (a.x - b.x));
    const lineas: { y: number; items: { x: number; s: string }[] }[] = [];
    for (const it of items) {
      const l = lineas.length ? lineas[lineas.length - 1] : null;
      if (l && Math.abs(l.y - it.y) <= 2.5) l.items.push({ x: it.x, s: it.s });
      else lineas.push({ y: it.y, items: [{ x: it.x, s: it.s }] });
    }
    for (const l of lineas) { l.items.sort((a, b) => a.x - b.x); out.push(l.items.map(i => i.s.trim()).join(' ')); }
  }
  return out.join('\n');
}

function cabecera(texto: string, entregas: Entrega[]) {
  const t = texto.replace(/\s+/g, ' ');
  const cab = t.match(/Transportista:\s*(\d+)\s*,?\s*Fecha registro:\s*(\d\d)\/(\d\d)\/(\d\d)\s*\.\.\s*(\d\d)\/(\d\d)\/(\d\d)/);
  if (cab) return { codigo: cab[1], desde: `20${cab[4]}-${cab[3]}-${cab[2]}`, hasta: `20${cab[7]}-${cab[6]}-${cab[5]}` };
  const c = t.match(/Transportista:\s*(\d{3,4})/) ?? t.match(/TOTAL CONDUCTOR (\d{3,4})/);
  if (!c || !entregas.length) return null;
  const fs = entregas.map(e => e.fecha).sort();
  const m = fs[Math.floor(fs.length / 2)].slice(0, 7);
  const ult = new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate();
  return { codigo: c[1], desde: `${m}-01`, hasta: `${m}-${String(ult).padStart(2, '0')}` };
}

function parsear(texto: string) {
  const lineas = texto.split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const entregas: Entrega[] = []; const dias: Dia[] = []; const incs: Inc[] = []; const otras: string[] = [];
  let totalPdf: { entregas: number; total: number } | null = null;
  let ultimaFecha = '';
  for (const l of lineas) {
    const md = l.match(reDia);
    if (md) { dias.push({ fecha: ultimaFecha, entregas: +md[2], base: num(md[3]), compl: num(md[4]), fijo: num(md[5]), total: num(md[6]) }); continue; }
    const mt = l.match(reTot);
    if (mt && !/CONDUCTOR/.test(l)) { const nums = mt[2].match(/-?\d{1,3}(?:\.\d{3})*,\d\d/g) ?? []; totalPdf = { entregas: +mt[1], total: num(nums[nums.length - 1]) }; continue; }
    const me = l.match(reEnt);
    if (me) {
      ultimaFecha = fecha(me[4]);
      entregas.push({ cliente: me[1], ref: me[2], fecha: ultimaFecha, destino: me[5].replace(/\s*-\s*$/, '').trim(), kilos: num(me[6]), base: num(me[7]), compl: num(me[8]), fijo: num(me[9]), importe: num(me[10]) });
      continue;
    }
    const mi = l.match(reInc);
    if (mi) { incs.push({ codigo: mi[1], fecha: fecha(mi[3]), importe: num(mi[7]) }); ultimaFecha = fecha(mi[3]); continue; }
    if (/\d,\d\d/.test(l) && !/^Cliente |Transportista:|PRORRATEO|Pág|asalgado/.test(l)) otras.push(l);
  }
  const cab = cabecera(texto, entregas);
  if (!cab) throw new Error('no encuentro el código de transportista ni el periodo');
  if (!totalPdf) throw new Error(`no encuentro la línea TOTAL ENTREGAS (leídas ${lineas.length} líneas, ${entregas.length} entregas, ${dias.length} días)`);
  const sumaDias = Math.round(dias.reduce((s, d) => s + d.total, 0) * 100) / 100;
  const cuadra = Math.abs(sumaDias - totalPdf.total) < 0.02;
  const vistos = new Map<string, number>(); const dups: string[] = [];
  for (const e of entregas) { const k = `${e.fecha}|${e.ref}`; vistos.set(k, (vistos.get(k) ?? 0) + 1); }
  for (const [k, n] of vistos) if (n > 1) dups.push(k);
  const alertas: string[] = [];
  if (!cuadra) alertas.push(`No cuadra: días suman ${eur(sumaDias)} y el PDF dice ${eur(totalPdf.total)} (diferencia ${eur(totalPdf.total - sumaDias)})`);
  if (otras.length) alertas.push(`Líneas no reconocidas: ${otras.slice(0, 6).join(' | ')}`);
  if (dups.length) alertas.push(`${dups.length} referencia(s) repetida(s) el mismo día: ${dups.map(d => d.split('|')[1]).join(', ')}`);
  const diasAlta = dias.filter(d => d.total > 0 && d.compl / d.total > 0.7).length;
  if (diasAlta) alertas.push(`${diasAlta} día(s) con más del 70% de garantía (poca carga de trabajo)`);
  return { ...cab, entregas, dias, incs, totalPdf, sumaDias, cuadra, dups, alertas, otras };
}

async function emisorDe(codigo: string, f: string): Promise<string> {
  const { data } = await sb.rpc('emisor_de', { p_transportista: codigo, p_fecha: f });
  return (data as string) ?? 'DAVID';
}

async function procesarPdf(bytes: Uint8Array, fichero: string, correoId: number | null) {
  const text = await textoConLineas(bytes);
  if (DEBUG === 'texto') return { texto: text.slice(0, 6000) } as any;
  if (DEBUG) { const p = parsear(text); return { codigo: p.codigo, mes: p.desde, suma: p.sumaDias, total: p.totalPdf.total, incs: p.incs, otras: p.otras, n_dias: p.dias.length } as any; }
  const p = parsear(text);
  const mes = p.desde.slice(0, 7) + '-01';
  const emisor = await emisorDe(p.codigo, p.hasta);
  const baseEnt = Math.round(p.dias.reduce((s, d) => s + d.base, 0) * 100) / 100;
  const compl = Math.round(p.dias.reduce((s, d) => s + d.compl, 0) * 100) / 100;
  const recortes = Math.round(p.incs.filter(i => i.importe < 0).reduce((s, i) => s + i.importe, 0) * 100) / 100;
  const { data: rep } = await sb.from('emisores_transportistas').select('repartidor').eq('transportista', p.codigo).lte('vigente_desde', p.hasta).or(`vigente_hasta.is.null,vigente_hasta.gte.${p.hasta}`).order('vigente_desde', { ascending: false }).limit(1).maybeSingle();
  const facturable = mes >= FACTURAR_DESDE;
  const fila = {
    transportista: p.codigo, mes, entregas: p.entregas.length, importe_entregas: baseEnt, complemento_minimo: compl,
    total: p.totalPdf.total, emisor, recortes, recortes_detalle: p.incs.map(i => `${i.codigo} ${i.fecha} ${eur(i.importe)}`).join(' · ') || null,
    correo_id: correoId, fichero, estado: !p.cuadra ? 'error_cuadre' : (facturable ? 'cuadrada' : 'facturada_fuera_erp'), dias: p.dias.length, total_pdf: p.totalPdf.total,
    alertas: p.alertas, fecha_registro_desde: p.desde, fecha_registro_hasta: p.hasta,
  };
  const { data: liq, error: e1 } = await sb.from('liquidaciones_cade').upsert([fila], { onConflict: 'transportista,mes' }).select('id, factura_id').single();
  if (e1) throw new Error('liquidaciones_cade: ' + e1.message);
  const liqId = liq.id as string;
  await sb.from('liquidaciones_cade_lineas').delete().eq('liquidacion_id', liqId);
  await sb.from('liquidaciones_cade_entregas').delete().eq('liquidacion_id', liqId);
  await sb.from('liquidaciones_cade_incidencias').delete().eq('liquidacion_id', liqId).eq('estado', 'propuesta');
  await sb.from('liquidaciones_cade_lineas').insert(p.dias.map(d => ({
    liquidacion_id: liqId, transportista: p.codigo, repartidor_nombre: rep?.repartidor ?? null, fecha: d.fecha,
    entregas: d.entregas, importe_entregas: d.base, garantia_aplicada: d.compl,
    penalizacion: Math.abs(p.incs.filter(i => i.fecha === d.fecha && i.importe < 0).reduce((s, i) => s + i.importe, 0)),
    penalizacion_motivo: p.incs.filter(i => i.fecha === d.fecha && i.importe < 0).map(i => i.codigo).join(', ') || null,
    extra: p.incs.filter(i => i.fecha === d.fecha && i.importe > 0).reduce((s, i) => s + i.importe, 0),
    extra_motivo: p.incs.filter(i => i.fecha === d.fecha && i.importe > 0).map(i => i.codigo).join(', ') || null,
    total_linea: d.total,
  })));
  const dupSet = new Set(p.dups);
  for (let i = 0; i < p.entregas.length; i += 200) {
    await sb.from('liquidaciones_cade_entregas').insert(p.entregas.slice(i, i + 200).map(e => ({
      liquidacion_id: liqId, transportista: p.codigo, fecha: e.fecha, cliente: e.cliente, ref_cliente: e.ref, destino: e.destino,
      kilos: e.kilos, importe_base: e.base, complemento: e.compl, fijo: e.fijo, importe: e.importe, duplicada: dupSet.has(`${e.fecha}|${e.ref}`),
    })));
  }
  const negativas = p.incs.filter(i => i.importe < 0);
  if (negativas.length) await sb.from('liquidaciones_cade_incidencias').insert(negativas.map(i => ({
    liquidacion_id: liqId, transportista: p.codigo, fecha: i.fecha, codigo: i.codigo, importe: i.importe,
    descripcion: `${i.codigo} aplicado por Cade el ${i.fecha}: ${eur(i.importe)}`,
  })));
  let facturaId = liq.factura_id as string | null;
  if (p.cuadra && facturable && !facturaId) {
    const { data: ya } = await sb.from('facturas_emitidas').select('id').eq('transportista', p.codigo).eq('periodo', mes).maybeSingle();
    if (ya?.id) { facturaId = ya.id; await sb.from('liquidaciones_cade').update({ factura_id: facturaId, estado: 'facturada' }).eq('id', liqId); }
  }
  if (p.cuadra && facturable && !facturaId) {
    const { data: ult } = await sb.from('facturas_emitidas').select('numero_factura').eq('emisor', emisor).order('numero_factura', { ascending: false }).limit(1).maybeSingle();
    const numero = (ult?.numero_factura ?? 0) + 1;
    const d = new Date(mes); const mesTxt = `${MESES[d.getMonth()]} ${d.getFullYear()}`;
    const { data: fac, error: e2 } = await sb.from('facturas_emitidas').insert([{
      cliente: 'CADE', concepto: `Reparto a domicilio ${mesTxt} (CADE ${p.codigo})`, transportista: p.codigo, periodo: mes,
      fecha_factura: p.hasta, numero_factura: numero, base_imponible: p.totalPdf.total, iva_pct: 21, estado: 'PENDIENTE', emisor,
      notas: `Generada desde liquidación ${fichero}`,
    }]).select('id').single();
    if (e2) throw new Error('facturas_emitidas: ' + e2.message);
    facturaId = fac.id;
    await sb.from('liquidaciones_cade').update({ factura_id: facturaId, estado: 'facturada' }).eq('id', liqId);
    const { data: cfg } = await sb.from('config_emisores').select('nombre, email_envio, firma_html').eq('emisor', emisor).maybeSingle();
    const { data: docs } = await sb.from('documentacion_cade').select('nombre').eq('activa', true).eq('obligatorio', true);
    const totalIva = Math.round(p.totalPdf.total * 1.21 * 100) / 100;
    await sb.from('envios_cade').insert([{
      liquidacion_id: liqId, tipo: 'factura', emisor, transportista: p.codigo, factura_id: facturaId,
      destinatario: 'proveedor@cade-distribucion.com',
      asunto: `Factura ${numero} — ${cfg?.nombre ?? emisor} — liquidación ${p.codigo} ${mesTxt}`,
      cuerpo: `Buenos días,\n\nAdjunto la factura nº ${numero} correspondiente a la liquidación del transportista ${p.codigo} de ${mesTxt}: base ${eur(p.totalPdf.total)}, IVA 21%, total ${eur(totalIva)}.\n\n${(docs ?? []).length ? 'Adjunto también: ' + docs!.map(x => x.nombre).join(', ') + '.\n\n' : ''}Un saludo,\n${cfg?.nombre ?? emisor}`,
      adjuntos: [{ tipo: 'factura', factura_id: facturaId }, { tipo: 'liquidacion', ruta: fichero }],
      estado: 'borrador', detalle: `Sale desde ${cfg?.email_envio ?? '(sin buzón configurado)'}`,
    }]);
  }
  await log(p.cuadra ? 'ok' : 'error_cuadre', `${fichero}: ${p.codigo} ${mes} → ${p.entregas.length} entregas, ${p.dias.length} días, total ${eur(p.totalPdf.total)}, ${p.incs.length} incidencia(s), ${p.alertas.length} alerta(s)`);
  return { liquidacion_id: liqId, codigo: p.codigo, mes, emisor, entregas: p.entregas.length, dias: p.dias.length, total: p.totalPdf.total, cuadra: p.cuadra, incidencias: p.incs, alertas: p.alertas, factura_id: facturaId, facturable };
}

async function procesarCorreo(id: number) {
  const { data: c } = await sb.from('correo_entrante').select('id, adjuntos').eq('id', id).single();
  if (!c) throw new Error('correo no encontrado');
  const res: unknown[] = [];
  for (const a of (c.adjuntos as any[])) {
    if (!/^\d{3,4}\.pdf$/i.test(a.nombre ?? '')) continue;
    const { data: f, error } = await sb.storage.from(BUCKET).download(a.ruta);
    if (error || !f) { res.push({ fichero: a.nombre, error: error?.message ?? 'no descargado' }); continue; }
    try { res.push(await procesarPdf(new Uint8Array(await f.arrayBuffer()), a.ruta, id)); }
    catch (e) { await log('fallo', `${a.ruta}: ${(e as Error).message}`); res.push({ fichero: a.nombre, error: (e as Error).message }); }
  }
  if (DEBUG) return res;
  const ok = res.length && res.every((r: any) => !r.error);
  await sb.from('correo_entrante').update({ estado: ok ? 'procesado' : 'error', detalle: JSON.stringify(res).slice(0, 900), liquidacion_id: (res.find((r: any) => r.liquidacion_id) as any)?.liquidacion_id ?? null }).eq('id', id);
  return res;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (!LLAVE || url.searchParams.get('llave') !== LLAVE) return new Response('no', { status: 401 });
  DEBUG = url.searchParams.get('debug') ?? '';
  try {
    if (req.method === 'POST') {
      const ct = req.headers.get('content-type') ?? '';
      let bytes: Uint8Array; let nombre: string;
      if (ct.includes('application/json')) {
        const j = await req.json();
        if (!j.pdf_b64) return Response.json({ error: 'falta pdf_b64' }, { status: 400 });
        bytes = Uint8Array.from(atob(j.pdf_b64), c => c.charCodeAt(0)); nombre = j.nombre ?? 'liquidacion.pdf';
      } else {
        const form = await req.formData();
        const f = form.get('pdf') as File | null;
        if (!f) return Response.json({ error: 'falta el fichero pdf' }, { status: 400 });
        bytes = new Uint8Array(await f.arrayBuffer()); nombre = f.name;
      }
      const ruta = `manual/${new Date().toISOString().slice(0, 10)}/${nombre}`;
      await sb.storage.from(BUCKET).upload(ruta, bytes, { upsert: true, contentType: 'application/pdf' });
      return Response.json(await procesarPdf(bytes, ruta, null));
    }
    const correoId = url.searchParams.get('correo_id');
    if (correoId) return Response.json(await procesarCorreo(+correoId));
    const ruta = url.searchParams.get('ruta');
    if (ruta) {
      const { data: f, error } = await sb.storage.from(BUCKET).download(ruta);
      if (error || !f) return Response.json({ error: error?.message ?? 'no descargado' }, { status: 404 });
      return Response.json(await procesarPdf(new Uint8Array(await f.arrayBuffer()), ruta, null));
    }
    if (url.searchParams.get('pendientes')) {
      const { data: cs } = await sb.from('correo_entrante').select('id').eq('tipo', 'liquidacion').in('estado', ['pendiente_parser', 'nuevo', 'error']).order('recibido_en');
      const out: Record<string, unknown> = {};
      for (const c of cs ?? []) out[c.id] = await procesarCorreo(c.id);
      return Response.json(out);
    }
    return Response.json({ uso: '?correo_id=N | ?pendientes=1 | ?ruta=... | POST pdf' });
  } catch (e) {
    await log('fallo', String((e as Error)?.message ?? e));
    return Response.json({ error: String((e as Error)?.message ?? e) }, { status: 500 });
  }
});
