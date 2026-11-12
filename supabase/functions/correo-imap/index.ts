// CORREO · CARTERO IMAP — ERP David
// Lee el buzón de Juan (admin@streatlab.com, IMAP) — todas las carpetas, papelera y spam incluidas (Rubén borra
// las liquidaciones tras subirlas), salvo borradores y enviados — con las mismas reglas que el cartero de Gmail.
// Solo guarda lo que encaja en una regla (Cade). ?llave=<llave>[&dias=N][&diag=1]
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { ImapFlow } from 'npm:imapflow@1.0.164';
import PostalMime from 'npm:postal-mime@2.3.2';

const LLAVE = Deno.env.get('LLAVE_CORREO') ?? ''; // la llave no se guarda en el repo (ver README)
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const log = (estado: string, detalle: string) => sb.from('robot_log').insert([{ fuente: 'cartero_juan', estado, detalle: detalle.slice(0, 500) }]);
type Regla = { remitente_contiene: string | null; asunto_contiene: string | null; adjunto_contiene: string | null; tipo: string; prioridad: number };
const minus = (s: string | null | undefined) => (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function clasificar(reglas: Regla[], remitente: string, asunto: string, adjuntos: string[]): string | null {
  const rem = minus(remitente), asu = minus(asunto), adj = adjuntos.map(minus);
  for (const r of [...reglas].sort((a, b) => b.prioridad - a.prioridad)) {
    if (!r.remitente_contiene && !r.asunto_contiene && !r.adjunto_contiene) continue;
    if (r.remitente_contiene && !rem.includes(minus(r.remitente_contiene))) continue;
    if (r.asunto_contiene && !asu.includes(minus(r.asunto_contiene))) continue;
    if (r.adjunto_contiene && !adj.some(a => a.includes(minus(r.adjunto_contiene)))) continue;
    return r.tipo;
  }
  return null;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  if (!LLAVE || url.searchParams.get('llave') !== LLAVE) return new Response('no', { status: 401 });
  const res = { host: '', carpetas: [] as string[], leidos: 0, guardados: 0, adjuntos: 0, liquidaciones: 0, avisos: [] as string[] };
  let cli: ImapFlow | null = null;
  try {
    const { data: cred } = await sb.from('robot_credenciales').select('usuario, password, url_base').eq('plataforma', 'imap').eq('cuenta', 'juan').eq('activo', true).maybeSingle();
    if (!cred?.password) throw new Error('sin credenciales IMAP de Juan');
    const buzon = cred.usuario as string;
    const host = cred.url_base || `mail.${buzon.split('@')[1]}`;
    cli = new ImapFlow({ host, port: 993, secure: true, auth: { user: buzon, pass: cred.password }, logger: false, tls: { rejectUnauthorized: false }, socketTimeout: 30000 });
    await cli.connect();
    res.host = host;
    const diag = !!url.searchParams.get('diag');
    const { data: reglasData } = await sb.from('correo_reglas').select('*').eq('activa', true);
    const reglas = (reglasData ?? []) as Regla[];
    const dias = Number(url.searchParams.get('dias') ?? 0);
    const { data: ult } = await sb.from('correo_entrante').select('recibido_en').eq('buzon', buzon).order('recibido_en', { ascending: false }).limit(1).maybeSingle();
    const desde = new Date(dias > 0 ? Date.now() - dias * 86400000 : ult?.recibido_en ? new Date(ult.recibido_en).getTime() - 86400000 : Date.now() - 20 * 86400000);

    const lista = await cli.list();
    const carpetas = lista.filter((b: any) => !b.flags?.has('\\Noselect') && !['\\Drafts', '\\Sent'].includes(b.specialUse ?? '') && !/draft|borrador|sent|enviad|lda-dupes/i.test(b.path)).map((b: any) => b.path);
    for (const carpeta of carpetas) {
      const lock = await cli.getMailboxLock(carpeta);
      try {
        const uids = (await cli.search({ since: desde }, { uid: true })) || [];
        const candidatos: { uid: number; mid: string; rem: string; asu: string; fecha: Date }[] = [];
        if (uids.length) for await (const m of cli.fetch(uids, { envelope: true, uid: true }, { uid: true })) {
          const env: any = m.envelope ?? {};
          const rem = (env.from ?? []).map((f: any) => `${f.name ?? ''} <${f.address ?? ''}>`).join(', ');
          const asu = env.subject ?? '';
          if (!clasificar(reglas, rem, asu, [])) continue;
          candidatos.push({ uid: m.uid, mid: 'imap:' + (env.messageId ?? `${carpeta}:${m.uid}`), rem, asu, fecha: env.date ? new Date(env.date) : new Date() });
        }
        res.carpetas.push(`${carpeta}(${uids.length}/${candidatos.length})`);
        if (diag || !candidatos.length) continue;
        const { data: ya } = await sb.from('correo_entrante').select('message_id').in('message_id', candidatos.map(c => c.mid));
        const vistos = new Set((ya ?? []).map((x: any) => x.message_id));
        for (const c of candidatos) {
          if (vistos.has(c.mid)) continue;
          vistos.add(c.mid);
          res.leidos++;
          const msg = await cli.fetchOne(String(c.uid), { source: true }, { uid: true });
          if (!msg?.source) { res.avisos.push(`uid ${c.uid}: sin contenido`); continue; }
          const parsed = await PostalMime.parse(msg.source);
          const atts = (parsed.attachments ?? []).filter((a: any) => a.filename);
          const tipo = clasificar(reglas, c.rem, c.asu, atts.map((a: any) => a.filename));
          if (!tipo) continue;
          const recibido = c.fecha.toISOString();
          const dir = c.mid.replace(/[^\w.\-]+/g, '_').slice(0, 80);
          const adjuntos: any[] = [];
          for (const a of atts) {
            const ruta = `${recibido.slice(0, 7)}/${dir}/${a.filename.replace(/[^\w.\-]+/g, '_')}`;
            const bytes = a.content instanceof Uint8Array ? a.content : new Uint8Array(a.content);
            const { error } = await sb.storage.from('correo').upload(ruta, bytes, { contentType: a.mimeType || 'application/octet-stream', upsert: true });
            if (error) { res.avisos.push(`${a.filename}: ${error.message}`); continue; }
            adjuntos.push({ nombre: a.filename, ruta, tipo: a.mimeType, tamano: bytes.length });
            res.adjuntos++;
          }
          const esLiq = tipo === 'liquidacion';
          if (esLiq) res.liquidaciones++;
          const { error } = await sb.from('correo_entrante').insert([{
            buzon, message_id: c.mid, remitente: c.rem.slice(0, 300), asunto: c.asu.slice(0, 500), recibido_en: recibido, tipo, adjuntos,
            estado: esLiq ? 'pendiente_parser' : 'nuevo', detalle: esLiq ? 'Pendiente del lector de liquidaciones' : null,
          }]);
          if (error) { if (String(error.code) !== '23505') res.avisos.push(`${c.mid}: ${error.message}`); continue; }
          res.guardados++;
        }
      } finally { lock.release(); }
    }
    if (diag) return Response.json(res);
    const estado = res.avisos.length ? 'aviso' : 'ok';
    const det = `${res.host} · ${res.leidos} leídos, ${res.guardados} guardados, ${res.adjuntos} adjuntos, ${res.liquidaciones} liquidaciones${res.avisos.length ? ' · ' + res.avisos.join(' · ') : ''}`;
    await log(estado, det);
    await sb.from('robot_salud').upsert([{ fuente: 'cartero_juan', ultima_ejecucion: new Date().toISOString(), ultimo_dato: new Date().toISOString().slice(0, 10), estado, detalle: det.slice(0, 500) }], { onConflict: 'fuente' });
    return Response.json(res);
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    await log('error', msg);
    await sb.from('robot_salud').upsert([{ fuente: 'cartero_juan', ultima_ejecucion: new Date().toISOString(), estado: 'error', detalle: msg.slice(0, 500) }], { onConflict: 'fuente' });
    return Response.json({ error: msg, ...res }, { status: 500 });
  } finally { try { await cli?.logout(); } catch (_) {} }
});
