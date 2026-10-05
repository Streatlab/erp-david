// CORREO · CARTERO (T5) — ERP David
// Lee el buzón de David (permiso guardado por correo-auth), clasifica con correo_reglas,
// guarda en correo_entrante y los adjuntos en Storage (bucket privado "correo").
// liquidacion → queda lista para liquidacion-parser (T6) · penalizacion → abre reclamación Cade.
// ?llave=david-correo-2026[&dias=N]
import { createClient } from 'jsr:@supabase/supabase-js@2';

const LLAVE = 'david-correo-2026';
const GMAIL = 'https://gmail.googleapis.com/gmail/v1/users/me';
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const log = (estado: string, detalle: string) => sb.from('robot_log').insert([{ fuente: 'cartero', estado, detalle: detalle.slice(0, 500) }]);

type Regla = { id: number; remitente_contiene: string | null; asunto_contiene: string | null; adjunto_contiene: string | null; tipo: string; prioridad: number };

async function cred(cuenta: string) {
  const { data } = await sb.from('robot_credenciales').select('usuario, password')
    .eq('plataforma', 'google').eq('cuenta', cuenta).eq('activo', true).maybeSingle();
  return data as { usuario: string; password: string } | null;
}

async function accessToken(): Promise<{ token: string; buzon: string }> {
  const app = await cred('app');
  const cartero = await cred('cartero');
  if (!app || !cartero?.password) throw new Error('buzón sin conectar (correo-auth)');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: app.usuario, client_secret: app.password, refresh_token: cartero.password, grant_type: 'refresh_token' }),
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error(`token google ${r.status}: ${j.error_description ?? j.error ?? ''}`);
  return { token: j.access_token, buzon: cartero.usuario };
}

const b64urlABytes = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const minus = (s: string | null | undefined) => (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function clasificar(reglas: Regla[], remitente: string, asunto: string, adjuntos: string[]): string | null {
  const rem = minus(remitente), asu = minus(asunto), adj = adjuntos.map(minus);
  const ordenadas = [...reglas].sort((a, b) => b.prioridad - a.prioridad);
  for (const r of ordenadas) {
    if (!r.remitente_contiene && !r.asunto_contiene && !r.adjunto_contiene) continue;
    if (r.remitente_contiene && !rem.includes(minus(r.remitente_contiene))) continue;
    if (r.asunto_contiene && !asu.includes(minus(r.asunto_contiene))) continue;
    if (r.adjunto_contiene && !adj.some(a => a.includes(minus(r.adjunto_contiene)))) continue;
    return r.tipo;
  }
  return null;
}

function partesConAdjunto(p: any, out: any[] = []): any[] {
  if (p?.filename && p?.body?.attachmentId) out.push(p);
  for (const h of p?.parts ?? []) partesConAdjunto(h, out);
  return out;
}

const cabecera = (m: any, n: string) => (m.payload?.headers ?? []).find((h: any) => h.name.toLowerCase() === n)?.value ?? '';

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  if (url.searchParams.get('llave') !== LLAVE) return new Response('no', { status: 401 });
  const res = { leidos: 0, guardados: 0, adjuntos: 0, reclamaciones: 0, liquidaciones: 0, avisos: [] as string[] };
  try {
    const { token, buzon } = await accessToken();
    const H = { Authorization: `Bearer ${token}` };
    const { data: reglasData } = await sb.from('correo_reglas').select('*').eq('activa', true);
    const reglas = (reglasData ?? []) as Regla[];
    if (!reglas.length) throw new Error('sin reglas de correo activas');

    // Desde el último correo guardado (−1 día) o N días atrás la primera vez
    const dias = Number(url.searchParams.get('dias') ?? 0);
    const { data: ult } = await sb.from('correo_entrante').select('recibido_en').order('recibido_en', { ascending: false }).limit(1).maybeSingle();
    const desdeMs = dias > 0 ? Date.now() - dias * 86400000
      : ult?.recibido_en ? new Date(ult.recibido_en).getTime() - 86400000 : Date.now() - 90 * 86400000;
    const terminos = reglas.flatMap(r => [
      r.remitente_contiene ? `from:${r.remitente_contiene.replace(/\s+/g, '')}` : null,
      !r.remitente_contiene && r.asunto_contiene ? `subject:"${r.asunto_contiene}"` : null,
      !r.remitente_contiene && !r.asunto_contiene && r.adjunto_contiene ? `filename:${r.adjunto_contiene.replace(/\s+/g, '')}` : null,
    ]).filter(Boolean);
    const q = `after:${Math.floor(desdeMs / 1000)} {${[...new Set(terminos)].join(' ')}}`;

    const ids: string[] = [];
    let pageToken = '';
    do {
      const p = new URLSearchParams({ q, maxResults: '100' });
      if (pageToken) p.set('pageToken', pageToken);
      const r = await fetch(`${GMAIL}/messages?${p}`, { headers: H });
      const j = await r.json();
      if (!r.ok) throw new Error(`gmail lista ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
      ids.push(...(j.messages ?? []).map((m: any) => m.id));
      pageToken = j.nextPageToken ?? '';
    } while (pageToken && ids.length < 500);

    const { data: yaEstan } = ids.length
      ? await sb.from('correo_entrante').select('message_id').in('message_id', ids)
      : { data: [] as any[] };
    const vistos = new Set((yaEstan ?? []).map((x: any) => x.message_id));

    for (const id of ids) {
      if (vistos.has(id)) continue;
      res.leidos++;
      const r = await fetch(`${GMAIL}/messages/${id}?format=full`, { headers: H });
      const m = await r.json();
      if (!r.ok) { res.avisos.push(`${id}: ${r.status}`); continue; }
      const remitente = cabecera(m, 'from');
      const asunto = cabecera(m, 'subject');
      const partes = partesConAdjunto(m.payload);
      const tipo = clasificar(reglas, remitente, asunto, partes.map(p => p.filename));
      if (!tipo) continue; // solo se guarda lo que encaja en una regla (no se archiva correo personal)

      const recibido = new Date(Number(m.internalDate)).toISOString();
      const adjuntos: any[] = [];
      for (const p of partes) {
        const a = await fetch(`${GMAIL}/messages/${id}/attachments/${p.body.attachmentId}`, { headers: H });
        const aj = await a.json();
        if (!a.ok || !aj.data) { res.avisos.push(`${id}/${p.filename}: adjunto ${a.status}`); continue; }
        const ruta = `${recibido.slice(0, 7)}/${id}/${p.filename.replace(/[^\w.\-]+/g, '_')}`;
        const { error } = await sb.storage.from('correo').upload(ruta, b64urlABytes(aj.data), { contentType: p.mimeType || 'application/octet-stream', upsert: true });
        if (error) { res.avisos.push(`${p.filename}: ${error.message}`); continue; }
        adjuntos.push({ nombre: p.filename, ruta, tipo: p.mimeType, tamano: p.body.size });
        res.adjuntos++;
      }

      let estado = 'nuevo', detalle: string | null = null;
      if (tipo === 'liquidacion') {
        res.liquidaciones++;
        estado = 'pendiente_parser'; detalle = 'Pendiente del lector de liquidaciones (T6)';
      }
      const { data: fila, error } = await sb.from('correo_entrante').insert([{
        buzon, message_id: id, remitente: remitente.slice(0, 300), asunto: asunto.slice(0, 500),
        recibido_en: recibido, tipo, adjuntos, estado, detalle,
      }]).select('id').single();
      if (error) { if (String(error.code) !== '23505') res.avisos.push(`${id}: ${error.message}`); continue; }
      res.guardados++;

      if (tipo === 'penalizacion') {
        const { error: e2 } = await sb.from('reclamaciones_cade').insert([{
          concepto: `Penalización: ${asunto}`.slice(0, 300), importe: 0,
          fecha_incidencia: recibido.slice(0, 10), notas: `Correo de ${remitente} (cartero #${fila.id})`,
        }]);
        if (e2) res.avisos.push(`reclamación ${id}: ${e2.message}`);
        else { res.reclamaciones++; await sb.from('correo_entrante').update({ estado: 'procesado', detalle: 'Reclamación abierta' }).eq('id', fila.id); }
      }
    }

    const estado = res.avisos.length ? 'aviso' : 'ok';
    const det = `${res.leidos} leídos, ${res.guardados} guardados, ${res.adjuntos} adjuntos, ${res.liquidaciones} liquidaciones, ${res.reclamaciones} reclamaciones${res.avisos.length ? ' · ' + res.avisos.join(' · ') : ''}`;
    await log(estado, det);
    await sb.from('robot_salud').upsert([{ fuente: 'cartero', ultima_ejecucion: new Date().toISOString(), ultimo_dato: new Date().toISOString().slice(0, 10), estado, detalle: det.slice(0, 500) }], { onConflict: 'fuente' });
    return new Response(JSON.stringify(res), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    await log('error', msg);
    await sb.from('robot_salud').upsert([{ fuente: 'cartero', ultima_ejecucion: new Date().toISOString(), estado: 'error', detalle: msg.slice(0, 500) }], { onConflict: 'fuente' });
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
