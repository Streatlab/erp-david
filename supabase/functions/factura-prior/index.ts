// FACTURA PRIOR — ERP David. Factura quincenal de Juan a Muestrarios Prior (4 servicios × 600 € + IVA).
// Cron días 1 y 16: día 1 → fecha último día del mes anterior (2ª quincena); día 16 → fecha 15 (1ª quincena).
// Nº = siguiente de Juan en el año. Registra en facturas_emitidas (PENDIENTE), PDF en documentacion/,
// tarea en Hoy y WhatsApp (texto a los destinos con tema 'facturas'; PDF solo a Rubén).
// GET ?llave=…            → modo automático (no duplica si ya existe la de esa fecha)
// GET ?llave=…&fecha=AAAA-MM-DD   → fuerza esa fecha de factura
// GET ?llave=…&pdf=<id>   → rehace el PDF de una factura Prior existente y se lo manda a Rubén (&silencio=1: sin WhatsApp)
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';

const LLAVE = Deno.env.get('LLAVE_PRIOR') ?? '';
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const PRECIO = 600, SERVICIOS = 4, IVA = 21, CLIENTE = 'MUESTRARIOS', EMISOR = 'JUAN';
const CONCEPTO = 'Traslado mercancías Almacén Cocentaina';
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
// Miles con punto siempre (el formateador del sistema no agrupa los importes de 4 cifras)
const eur = (n: number) => { const [e, d] = Math.abs(n).toFixed(2).split('.'); return (n < 0 ? '-' : '') + e.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + d + ' €'; };
const fechaLarga = (d: string) => { const [y, m, dd] = d.split('-'); return `${+dd} de ${MESES[+m - 1]} de ${y}`; };
const fechaCorta = (d: string) => { const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };
const pad = (n: number) => String(n).padStart(2, '0');

function hoyMadrid() {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [y, m, d] = p.split('-').map(Number); return { y, m, d };
}
function fechaQueToca(): string | null {
  const { y, m, d } = hoyMadrid();
  if (d === 16) return `${y}-${pad(m)}-15`;
  if (d === 1) { const u = new Date(Date.UTC(y, m - 1, 0)); return `${u.getUTCFullYear()}-${pad(u.getUTCMonth() + 1)}-${pad(u.getUTCDate())}`; }
  return null;
}

async function hacerPdf(f: Record<string, any>) {
  const { data: em } = await sb.from('config_emisores').select('*').eq('emisor', EMISOR).single();
  const { data: cl } = await sb.from('clientes_factura').select('*').eq('codigo', CLIENTE).single();
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const R = await pdf.embedFont(StandardFonts.Helvetica);
  const B = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.1, 0.1, 0.1), sombra = rgb(0.85, 0.85, 0.85);
  const t = (s: string, x: number, y: number, o: { f?: any; s?: number } = {}) => page.drawText(s ?? '', { x, y, font: o.f ?? R, size: o.s ?? 9, color: ink });
  const tr = (s: string, xr: number, y: number, o: { f?: any; s?: number } = {}) => { const fo = o.f ?? R, sz = o.s ?? 9; t(s, xr - fo.widthOfTextAtSize(s, sz), y, { f: fo, s: sz }); };
  const box = (x: number, y: number, w: number, h: number, fill?: any) => page.drawRectangle({ x, y, width: w, height: h, borderColor: ink, borderWidth: 0.8, color: fill });

  t(em.nombre, 55, 785, { f: B, s: 13 });
  tr('FACTURA', 545, 790, { s: 22 });
  t(em.nif, 55, 755); t(em.direccion ?? '', 55, 743);
  t((em.cp_ciudad ?? '').replace(/^(\d{5}) (.*)$/, '$2, $1'), 55, 731);
  t(em.email ?? '', 55, 719); t(em.telefono ?? '', 55, 707);
  t('FECHA:', 375, 743, { f: B }); tr(fechaLarga(f.fecha_factura), 545, 743);
  t('N.º DE FACTURA', 375, 731, { f: B }); tr(String(f.serie ?? '') + String(f.numero_factura), 545, 731);

  let y = 672; t('FACTURAR A:', 55, y, { f: B });
  for (const l of [cl.razon_social, cl.direccion, cl.cp_ciudad, cl.provincia, 'CIF ' + cl.cif]) { y -= 12; t(l ?? '', 55, y, { s: 8.5 }); }

  // Tabla con bordes y cabecera gris, como la plantilla
  y = 585;
  box(50, y - 6, 495, 20, sombra);
  t('DESCRIPCIÓN', 150, y); t('UD', 365, y); t('SERVICIO', 412, y); tr('IMPORTE', 540, y);
  for (let i = 0; i < SERVICIOS; i++) {
    y -= 20; box(50, y - 6, 495, 20);
    t(CONCEPTO, 55, y); tr('1', 380, y); tr(PRECIO.toFixed(2), 455, y); tr(eur(PRECIO), 540, y);
  }
  const base = Number(f.base_imponible), cuota = Number(f.cuota_iva), total = Number(f.total);
  tr('BASE IMPONIBLE', 445, 205); tr(eur(base), 541, 205);
  box(447, 180, 98, 17); tr('IVA', 445, 185); tr(`${Number(f.iva_pct).toFixed(2)}%`, 541, 185);
  box(447, 160, 98, 17, sombra); tr('CUOTA IVA', 445, 165); tr(eur(cuota), 541, 165, { f: B });
  box(447, 120, 98, 17, sombra); tr('TOTAL', 445, 125, { f: B }); tr(eur(total), 541, 125, { f: B });
  t(`Pagadera a nombre de ${em.nombre}.`, 55, 95);
  t(`Cuenta bancaria BBVA ${em.cuenta_iban}`, 55, 75, { s: 8 });

  const bytes = await pdf.save();
  const ruta = `facturas/${EMISOR}/${String(f.fecha_factura).slice(0, 4)}/factura-${f.numero_factura}-prior.pdf`;
  const up = await sb.storage.from('documentacion').upload(ruta, bytes, { upsert: true, contentType: 'application/pdf' });
  if (up.error) throw new Error(up.error.message);
  await sb.from('facturas_emitidas').update({ pdf_ruta: ruta }).eq('id', f.id);
  return { bytes, ruta };
}

async function whatsapp(texto: string, pdf?: { bytes: Uint8Array; nombre: string }) {
  const { data: c } = await sb.from('robot_credenciales').select('usuario, password, url_base').eq('plataforma', 'green_api').eq('activo', true).limit(1).maybeSingle();
  if (!c?.usuario) return 'sin_whatsapp';
  const base = String(c.url_base ?? 'https://api.green-api.com').replace(/\/$/, '');
  const { data: dest } = await sb.from('avisos_whatsapp').select('nombre, destino, temas').eq('activo', true);
  let n = 0;
  for (const d of dest ?? []) {
    const temas: string[] = d.temas ?? ['todo'];
    if (!temas.includes('todo') && !temas.includes('facturas')) continue;
    const chatId = String(d.destino).replace(/\D/g, '') + '@c.us';
    const esRuben = /rub[eé]n/i.test(String(d.nombre));
    if (pdf && esRuben) {
      const fd = new FormData();
      fd.append('chatId', chatId); fd.append('caption', texto); fd.append('fileName', pdf.nombre);
      fd.append('file', new Blob([pdf.bytes], { type: 'application/pdf' }), pdf.nombre);
      await fetch(`${base}/waInstance${c.usuario}/sendFileByUpload/${c.password}`, { method: 'POST', body: fd });
    } else {
      await fetch(`${base}/waInstance${c.usuario}/sendMessage/${c.password}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chatId, message: texto }) });
    }
    n++;
  }
  return `enviado a ${n}`;
}

const log = (estado: string, detalle: string) => sb.from('robot_log').insert({ fuente: 'factura_prior', estado, detalle });

Deno.serve(async (req) => {
  const u = new URL(req.url);
  if (!LLAVE || u.searchParams.get('llave') !== LLAVE) return new Response('no', { status: 403 });
  try {
    // Rehacer PDF de una existente
    const pid = u.searchParams.get('pdf');
    if (pid) {
      const { data: f } = await sb.from('facturas_emitidas').select('*').eq('id', pid).eq('cliente', CLIENTE).single();
      if (!f) throw new Error('factura no encontrada');
      const p = await hacerPdf(f);
      const w = u.searchParams.get('silencio') ? 'sin aviso' : await whatsapp(`📄 Factura ${f.numero_factura} de Juan a Muestrarios Prior · ${fechaCorta(f.fecha_factura)} · ${eur(Number(f.total))}`, { bytes: p.bytes, nombre: `Factura ${f.numero_factura} Prior.pdf` });
      return Response.json({ ok: true, ruta: p.ruta, whatsapp: w });
    }

    const fecha = u.searchParams.get('fecha') ?? fechaQueToca();
    if (!fecha) return Response.json({ ok: true, nada: 'hoy no toca' });
    const { data: ya } = await sb.from('facturas_emitidas').select('id, numero_factura').eq('emisor', EMISOR).eq('cliente', CLIENTE).eq('fecha_factura', fecha).maybeSingle();
    if (ya) { await log('ok', `ya existía la factura ${ya.numero_factura} del ${fecha}`); return Response.json({ ok: true, ya_existia: ya.numero_factura }); }

    const anio = fecha.slice(0, 4);
    const { data: ult } = await sb.from('facturas_emitidas').select('numero_factura').eq('emisor', EMISOR).eq('serie', '')
      .gte('fecha_factura', `${anio}-01-01`).lte('fecha_factura', `${anio}-12-31`).order('numero_factura', { ascending: false }).limit(1).maybeSingle();
    const numero = Number(ult?.numero_factura ?? 0) + 1;
    const base = PRECIO * SERVICIOS, cuota = Math.round(base * IVA) / 100, total = base + cuota;
    const quincena = fecha.endsWith('-15') ? '1ª' : '2ª';
    const mes = MESES[+fecha.slice(5, 7) - 1].slice(0, 3);
    const { data: f, error } = await sb.from('facturas_emitidas').insert({
      emisor: EMISOR, serie: '', numero_factura: numero, numero_original: String(numero), cliente: CLIENTE,
      concepto: `${CONCEPTO} (${SERVICIOS} servicios × ${PRECIO} €)`, fecha_factura: fecha, periodo: `${fecha.slice(0, 7)}-01`,
      base_imponible: base, iva_pct: IVA, cuota_iva: cuota, total, estado: 'PENDIENTE',
      notas: `Generada automáticamente (Prior, ${quincena} quincena ${mes})`,
    }).select('*').single();
    if (error) throw new Error(error.message);

    const p = await hacerPdf(f);
    await sb.from('tareas').insert({
      titulo: `Enviar factura ${numero} a Muestrarios Prior`,
      descripcion: `Factura ${numero} de Juan (${fechaCorta(fecha)}, ${eur(total)}) creada sola. El PDF está en Facturación y te ha llegado por WhatsApp.`,
      area: 'Finanzas', asignado: 'Rubén', fecha_limite: hoyMadridIso(), prioridad: 'media', estado: 'pendiente',
    });
    const w = await whatsapp(`🧾 ERP David · Factura ${numero} de Juan a Muestrarios Prior creada · ${fechaCorta(fecha)} · ${eur(total)} (${SERVICIOS} × ${PRECIO} € + IVA). Queda pendiente de cobro.`, { bytes: p.bytes, nombre: `Factura ${numero} Prior.pdf` });
    await log('ok', `factura ${numero} del ${fecha} · ${eur(total)} · ${w}`);
    return Response.json({ ok: true, numero, fecha, total, ruta: p.ruta, whatsapp: w });
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    await log('error', msg);
    await whatsapp(`⚠️ ERP David · La factura automática de Prior ha fallado: ${msg}`).catch(() => {});
    return Response.json({ error: msg }, { status: 500 });
  }
});

function hoyMadridIso() { const { y, m, d } = hoyMadrid(); return `${y}-${pad(m)}-${pad(d)}`; }
