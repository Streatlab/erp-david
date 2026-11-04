// FACTURAS · PAQUETE O BORRADOR — ERP David (v2)
// POST { mes: 'YYYY-MM-01', emisor: 'DAVID'|'JUAN', accion: 'zip'|'borrador' }
// Con TUS plantillas Excel genera cada "FACTURA N.xlsx" + PDF y la "01 RELACIÓN FACTURAS" actualizada.
//  - zip: enlace de descarga con todo.
//  - borrador DAVID (Gmail): deja el correo preparado como borrador en davidsanzn@gmail.com.
//  - borrador JUAN (admin@streatlab.com, que no es Gmail): genera un fichero .eml con los adjuntos que se abre
//    con doble clic en Outlook como mensaje sin enviar, listo para revisar y enviar.
// Nunca envía nada.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import JSZip from 'npm:jszip@3.10.1';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const serial = (d: string) => Math.round((Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 86400000);
const xmlEsc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const r4 = (n: number) => Math.round(n * 10000) / 10000;

async function bajar(ruta: string): Promise<Uint8Array | null> {
  const { data } = await sb.storage.from('documentacion').download(ruta);
  return data ? new Uint8Array(await data.arrayBuffer()) : null;
}
function addStr(ss: { xml: string; list: string[] }, t: string): number {
  const i = ss.list.indexOf(t); if (i >= 0) return i;
  ss.list.push(t);
  ss.xml = ss.xml.replace('</sst>', `<si><t>${xmlEsc(t)}</t></si></sst>`).replace(/uniqueCount="\d+"/, `uniqueCount="${ss.list.length}"`);
  return ss.list.length - 1;
}
function leerSS(xml: string) { return { xml, list: [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => m[1].replace(/<[^>]+>/g, '')) }; }
const setV = (s: string, ref: string, v: string | number) => s.replace(new RegExp(`(<c r="${ref}"[^>]*>(?:<f>[^<]*</f>)?)<v>[^<]*</v>`), `$1<v>${v}</v>`);

async function facturaXlsx(tpl: Uint8Array, f: any, mesTxt: string): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(tpl);
  let s = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
  const ss = leerSS(await zip.file('xl/sharedStrings.xml')!.async('string'));
  const base = Number(f.base_imponible), iva = r4(base * 0.21), tot = r4(base + iva);
  s = setV(s, 'E4', serial(f.fecha_factura));
  s = setV(s, 'E5', addStr(ss, String(f.serie ?? '') + String(f.numero_factura)));
  if (f.transportista) s = setV(s, 'E7', Number(f.transportista));
  if (String(f.cliente).toUpperCase() === 'CADE') {
    s = setV(s, 'B15', addStr(ss, `Reparto a domicilio ${mesTxt}`));
    s = setV(s, 'D15', base); s = setV(s, 'E15', base);
  } else {
    const n = Math.max(1, Math.round(base / 600));
    for (let i = 0; i < 4; i++) { const r = 15 + i; if (i < n) { s = setV(s, `D${r}`, 600); s = setV(s, `E${r}`, 600); } }
  }
  s = setV(s, 'E32', base); s = setV(s, 'E34', iva); s = setV(s, 'E36', tot);
  zip.file('xl/worksheets/sheet1.xml', s); zip.file('xl/sharedStrings.xml', ss.xml);
  return await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

async function relacionXlsx(tpl: Uint8Array, facturas: any[]): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(tpl);
  let s = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
  const ss = leerSS(await zip.file('xl/sharedStrings.xml')!.async('string'));
  const ya = new Set<string>();
  for (const m of s.matchAll(/<c r="F(\d+)"[^>]*><v>(\d+)<\/v><\/c>/g)) { if (+m[1] >= 5 && +m[1] <= 198) ya.add(ss.list[+m[2]] ?? m[2]); }
  for (const m of s.matchAll(/<c r="F(\d+)"[^>]*t="s"[^>]*><v>(\d+)<\/v><\/c>/g)) { if (+m[1] >= 5 && +m[1] <= 198) ya.add(ss.list[+m[2]]); }
  let fila = 5; while (fila < 198 && new RegExp(`<c r="A${fila}"[^>]*t="s"`).test(s)) fila++;
  let alb = 0; for (const m of s.matchAll(/<c r="C(\d+)"[^>]*><v>(\d+)<\/v>/g)) alb = Math.max(alb, +m[2]);
  for (const f of facturas) {
    const num = String(f.serie ?? '') + String(f.numero_factura);
    if (ya.has(num) || fila >= 198) continue;
    const bi = Number(f.base_imponible), iva = r4(bi * 0.21), tot = r4(bi + iva);
    const esCade = String(f.cliente).toUpperCase() === 'CADE';
    const conc = esCade ? `CADE ${f.transportista}` : 'Traslado mercancías Almacén Cocentaina';
    alb++;
    const cells = `<c r="A${fila}" s="1" t="s"><v>${addStr(ss, esCade ? 'CADE' : 'MUESTRARIOS')}</v></c>` +
      `<c r="B${fila}" s="1"><v>${serial(f.fecha_factura)}</v></c><c r="C${fila}" s="2"><v>${alb}</v></c>` +
      `<c r="D${fila}" s="20" t="s"><v>${addStr(ss, conc)}</v></c><c r="E${fila}" s="1"><v>${serial(f.fecha_factura)}</v></c>` +
      `<c r="F${fila}" s="7" t="s"><v>${addStr(ss, num)}</v></c><c r="G${fila}" s="21"><v>${bi}</v></c>` +
      `<c r="H${fila}" s="3"><f>Tabla2[[#This Row],[BI]]*0.21</f><v>${iva}</v></c><c r="I${fila}" s="4"><f>SUM(Tabla2[[#This Row],[BI]:[IVA]])</f><v>${tot}</v></c>`;
    s = s.replace(new RegExp(`(<row r="${fila}"[^>]*>)[\\s\\S]*?(</row>)`), `$1${cells}$2`);
    fila++;
  }
  zip.file('xl/worksheets/sheet1.xml', s); zip.file('xl/sharedStrings.xml', ss.xml);
  let wb = await zip.file('xl/workbook.xml')!.async('string');
  if (!/fullCalcOnLoad/.test(wb)) wb = wb.replace(/<calcPr /, '<calcPr fullCalcOnLoad="1" ');
  zip.file('xl/workbook.xml', wb);
  return await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

async function tokenGmail(cuenta: string): Promise<{ token: string; buzon: string }> {
  const { data: app } = await sb.from('robot_credenciales').select('usuario,password').eq('plataforma', 'google').eq('cuenta', 'app').single();
  const { data: tok } = await sb.from('robot_credenciales').select('usuario,password').eq('plataforma', 'google').eq('cuenta', cuenta).maybeSingle();
  if (!app || !tok) throw new Error('el buzón de David no está conectado');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: app.usuario, client_secret: app.password, refresh_token: tok.password, grant_type: 'refresh_token' }) });
  const j = await r.json(); if (!j.access_token) throw new Error('Google no da permiso: hay que volver a conectar el buzón');
  return { token: j.access_token, buzon: tok.usuario };
}
const b64 = (u: Uint8Array) => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const b64url = (t: string) => btoa(unescape(encodeURIComponent(t))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const enc = (t: string) => `=?UTF-8?B?${btoa(unescape(encodeURIComponent(t)))}?=`;

function mime(from: string, to: string, subject: string, cuerpo: string, adj: { nombre: string; bytes: Uint8Array; tipo: string }[], sinEnviar: boolean) {
  const bnd = 'b' + crypto.randomUUID();
  return [`From: ${from}`, `To: ${to}`, `Subject: ${enc(subject)}`, ...(sinEnviar ? ['X-Unsent: 1'] : []), 'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${bnd}"`, '', `--${bnd}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', btoa(unescape(encodeURIComponent(cuerpo))).replace(/.{76}/g, '$&\r\n'),
    ...adj.flatMap(a => [`--${bnd}`, `Content-Type: ${a.tipo}; name="${enc(a.nombre)}"`, 'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${enc(a.nombre)}"`, '', b64(a.bytes).replace(/.{76}/g, '$&\r\n')]),
    `--${bnd}--`, ''].join('\r\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { mes, emisor, accion } = await req.json();
    const d = new Date(mes + 'T00:00:00'); const mesTxt = `${MESES[d.getMonth()]} ${d.getFullYear()}`;
    const { data: facs } = await sb.from('facturas_emitidas').select('*').eq('emisor', emisor).eq('periodo', mes).order('numero_factura');
    if (!facs?.length) throw new Error('no hay facturas de ese mes para ese emisor');
    const { data: em } = await sb.from('config_emisores').select('*').eq('emisor', emisor).single();
    const tplCade = await bajar(`plantillas/${emisor}/factura_cade.xlsx`);
    const tplPrior = await bajar(`plantillas/${emisor}/factura_prior.xlsx`) ?? tplCade;
    const tplRel = await bajar(`plantillas/${emisor}/relacion.xlsx`);
    if (!tplCade || !tplRel) throw new Error('faltan las plantillas de ' + emisor + ' (factura y relación): súbelas una vez en Facturación ▸ Plantillas');

    const ficheros: { nombre: string; bytes: Uint8Array; tipo: string }[] = [];
    const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    for (const f of facs) {
      const tpl = String(f.cliente).toUpperCase() === 'CADE' ? tplCade : tplPrior!;
      ficheros.push({ nombre: `FACTURA_${f.serie ?? ''}${f.numero_factura}.xlsx`, bytes: await facturaXlsx(tpl, f, mesTxt), tipo: XLSX });
      const p = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/factura-pdf`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ factura_id: f.id }) });
      const pj = await p.json();
      if (pj.ruta) { const pdf = await bajar(pj.ruta); if (pdf) ficheros.push({ nombre: `FACTURA_${f.serie ?? ''}${f.numero_factura}.pdf`, bytes: pdf, tipo: 'application/pdf' }); }
    }
    const { data: todas } = await sb.from('facturas_emitidas').select('*').eq('emisor', emisor).gte('fecha_factura', `${d.getFullYear()}-01-01`).order('fecha_factura').order('numero_factura');
    const rel = await relacionXlsx(tplRel, todas ?? []);
    await sb.storage.from('documentacion').upload(`plantillas/${emisor}/relacion.xlsx`, rel, { upsert: true, contentType: XLSX });
    ficheros.push({ nombre: `01_RELACIÓN_FACTURAS_${d.getFullYear()}.xlsx`, bytes: rel, tipo: XLSX });

    if (accion === 'borrador') {
      const cade = facs.filter((f: any) => String(f.cliente).toUpperCase() === 'CADE');
      const lista = cade.map((f: any) => `- Factura nº ${f.numero_factura} · repartidor ${f.transportista} · base ${Number(f.base_imponible).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`).join('\n');
      const nombre = (em.nombre as string).split(' ').map((w: string) => w[0] + w.slice(1).toLowerCase()).join(' ');
      const cuerpo = `Buenos días,\n\nAdjunto las facturas de ${mesTxt}:\n\n${lista}\n\nUn saludo,\n${nombre}`;
      const adj = ficheros.filter(x => x.tipo === 'application/pdf');
      const para = em.email_cade_facturas ?? 'proveedor@cade-distribucion.com';
      const asunto = `Facturas ${mesTxt} — ${em.nombre}`;

      if (emisor === 'JUAN') {
        // admin@streatlab.com no es Gmail: se entrega un .eml que Outlook abre como borrador sin enviar
        const eml = new TextEncoder().encode(mime(em.email, para, asunto, cuerpo, adj, true));
        const ruta = `paquetes/JUAN/${mes.slice(0, 7)}/Facturas Juan ${mesTxt}.eml`;
        await sb.storage.from('documentacion').upload(ruta, eml, { upsert: true, contentType: 'message/rfc822' });
        const { data: s } = await sb.storage.from('documentacion').createSignedUrl(ruta, 3600, { download: true });
        await sb.from('envios_cade').update({ estado: 'borrador_eml', detalle: 'Correo preparado para abrir en Outlook (admin@streatlab.com)' }).in('factura_id', cade.map((f: any) => f.id));
        return Response.json({ ok: true, eml: true, url: s?.signedUrl, adjuntos: adj.map(a => a.nombre) }, { headers: cors });
      }

      const { token, buzon } = await tokenGmail('cartero');
      const raw = mime(buzon, para, asunto, cuerpo, adj, false);
      const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: { raw: b64url(raw) } }) });
      const j = await r.json(); if (!r.ok) throw new Error('Gmail: ' + JSON.stringify(j).slice(0, 200));
      await sb.from('envios_cade').update({ estado: 'borrador_gmail', detalle: `Borrador preparado en ${buzon}` }).in('factura_id', cade.map((f: any) => f.id));
      return Response.json({ ok: true, borrador: true, buzon, adjuntos: adj.map(a => a.nombre) }, { headers: cors });
    }

    const z = new JSZip(); for (const f of ficheros) z.file(f.nombre, f.bytes);
    const zb = await z.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    const ruta = `paquetes/${emisor}/${mes.slice(0, 7)}/Facturas ${emisor === 'JUAN' ? 'Juan' : 'David'} ${mesTxt}.zip`;
    await sb.storage.from('documentacion').upload(ruta, zb, { upsert: true, contentType: 'application/zip' });
    const { data: s } = await sb.storage.from('documentacion').createSignedUrl(ruta, 3600, { download: true });
    return Response.json({ ok: true, url: s?.signedUrl, ficheros: ficheros.map(f => f.nombre) }, { headers: cors });
  } catch (e) {
    return Response.json({ error: String((e as Error)?.message ?? e) }, { status: 500, headers: cors });
  }
});
