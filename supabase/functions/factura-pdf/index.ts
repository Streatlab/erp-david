// FACTURA PDF — ERP David. Mismo formato que la plantilla Excel de David y Juan (negro y gris, sin color).
// POST { factura_id }  → guarda el PDF en bucket documentacion/facturas/... y devuelve enlace firmado.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const eur = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const fechaLarga = (d: string) => { const [y, m, dd] = d.split('-'); return `${+dd} de ${MESES[+m - 1]} de ${y}`; };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { factura_id } = await req.json();
    const { data: f, error } = await sb.from('facturas_emitidas').select('*').eq('id', factura_id).single();
    if (error || !f) throw new Error('factura no encontrada');
    const { data: em } = await sb.from('config_emisores').select('*').eq('emisor', f.emisor).single();
    const { data: cl } = await sb.from('clientes_factura').select('*').eq('codigo', String(f.cliente).toUpperCase()).maybeSingle();

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    const R = await pdf.embedFont(StandardFonts.Helvetica);
    const B = await pdf.embedFont(StandardFonts.HelveticaBold);
    const ink = rgb(0.1, 0.1, 0.1), gris = rgb(0.5, 0.5, 0.5), sombra = rgb(0.85, 0.85, 0.85);
    const t = (s: string, x: number, y: number, o: { f?: any; s?: number; c?: any } = {}) => page.drawText(s ?? '', { x, y, font: o.f ?? R, size: o.s ?? 9, color: o.c ?? ink });
    const tr = (s: string, xr: number, y: number, o: { f?: any; s?: number } = {}) => { const fo = o.f ?? R, sz = o.s ?? 9; t(s, xr - fo.widthOfTextAtSize(s, sz), y, { f: fo, s: sz }); };
    const box = (x: number, y: number, w: number, h: number, fill?: any) => page.drawRectangle({ x, y, width: w, height: h, borderColor: ink, borderWidth: 0.8, color: fill });

    // Cabecera
    t(em.nombre, 55, 785, { f: B, s: 13 });
    tr('FACTURA', 545, 790, { f: R, s: 22 });
    t(em.nif, 55, 755); t(em.direccion ?? '', 55, 743);
    t((em.cp_ciudad ?? '').replace(/^(\d{5}) (.*)$/, '$2, $1'), 55, 731);
    t(em.email ?? '', 55, 719); t(em.telefono ?? '', 55, 707);
    t('FECHA:', 375, 743, { f: B }); t(fechaLarga(f.fecha_factura), 445, 743);
    t('N.º DE FACTURA', 375, 731, { f: B }); t(String(f.serie ?? '') + String(f.numero_factura), 445, 731);
    if (f.transportista) {
      box(372, 695, 70, 20); box(442, 695, 103, 20);
      t('REPARTIDOR', 378, 702, { f: B, s: 8 });
      const rp = String(f.transportista); t(rp, 493 - R.widthOfTextAtSize(rp, 11) / 2, 701, { s: 11 });
    }
    // Cliente
    let y = 672; t('FACTURAR A:', 55, y, { f: B });
    const lineasCli = cl ? [cl.razon_social, cl.direccion, cl.cp_ciudad, cl.provincia, 'CIF ' + cl.cif] : [f.cliente];
    for (const l of lineasCli) { y -= 12; t(l ?? '', 55, y, { s: 8.5 }); }

    // Tabla
    y = 585;
    t('DESCRIPCIÓN', 150, y); t('UD', 365, y); t('SERVICIO', 412, y); tr('IMPORTE', 545, y);
    y -= 24;
    const base = Number(f.base_imponible);
    t(f.concepto ?? 'Reparto a domicilio', 55, y); tr('1.00', 385, y); tr(base.toLocaleString('en-US', { minimumFractionDigits: 2 }), 455, y); tr(eur(base), 545, y);

    const iva = Math.round(base * Number(f.iva_pct ?? 21)) / 100;
    const totl = Math.round((base + iva) * 100) / 100;
    tr('BASE IMPONIBLE', 445, 205); tr(eur(base), 545, 205);
    box(447, 180, 98, 17); tr('IVA', 445, 185); tr(`${(Number(f.iva_pct ?? 21)).toFixed(2)}%`, 541, 185);
    box(447, 160, 98, 17, sombra); tr('CUOTA IVA', 445, 165); tr(eur(iva), 541, 165, { f: B });
    box(447, 120, 98, 17, sombra); tr('TOTAL', 445, 125, { f: B }); tr(eur(totl), 541, 125, { f: B });

    t(`Pagadera a nombre de ${em.nombre}.`, 55, 95);
    t(`Cuenta bancaria BBVA ${em.cuenta_iban}`, 55, 75, { s: 8 });

    const bytes = await pdf.save();
    const ruta = `facturas/${f.emisor}/${new Date(f.fecha_factura).getFullYear()}/factura-${f.numero_factura}-${f.transportista ?? 'servicio'}.pdf`;
    const up = await sb.storage.from('documentacion').upload(ruta, bytes, { upsert: true, contentType: 'application/pdf' });
    if (up.error) throw new Error(up.error.message);
    await sb.from('facturas_emitidas').update({ pdf_ruta: ruta }).eq('id', f.id);
    const { data: s } = await sb.storage.from('documentacion').createSignedUrl(ruta, 600);
    return Response.json({ ok: true, ruta, url: s?.signedUrl }, { headers: cors });
  } catch (e) {
    return Response.json({ error: String((e as Error)?.message ?? e) }, { status: 500, headers: cors });
  }
});
