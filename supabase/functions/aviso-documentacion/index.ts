// AVISO DOCUMENTACIÓN CADE — ERP David
// Cada día 1-10 del mes: si falta documentación de algún emisor, manda UN correo al día a Rubén
// desde el buzón de David (Gmail API), con lo que falta, dónde sacarlo y el enlace al ERP para subirlo.
// ?llave=..            → ejecución normal (respeta 1 correo/día)
// ?llave=..&forzar=1   → manda ya aunque hoy ya se haya mandado
import { createClient } from 'jsr:@supabase/supabase-js@2';

const LLAVE = Deno.env.get('LLAVE_DOCS') ?? ''; // la llave no se guarda en el repo (ver README)
const PARA = 'ruben@streatlab.com';
const ERP = 'https://davidparte.vercel.app/finanzas/documentacion';
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const log = (estado: string, detalle: string) => sb.from('robot_log').insert([{ fuente: 'aviso_documentacion', estado, detalle: detalle.slice(0, 900) }]);
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const NOMBRE: Record<string, string> = { DAVID: 'David Sanz Navarro', JUAN: 'Juan Rus Martínez' };

const b64url = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

async function tokenGmail(): Promise<string> {
  const { data: app } = await sb.from('robot_credenciales').select('usuario,password').eq('plataforma', 'google').eq('cuenta', 'app').single();
  const { data: tok } = await sb.from('robot_credenciales').select('usuario,password').eq('plataforma', 'google').eq('cuenta', 'cartero').single();
  if (!app || !tok) throw new Error('faltan credenciales de Google');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: app.usuario, client_secret: app.password, refresh_token: tok.password, grant_type: 'refresh_token' }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('token Google: ' + JSON.stringify(j).slice(0, 200));
  return j.access_token;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (!LLAVE || url.searchParams.get('llave') !== LLAVE) return new Response('no', { status: 401 });
  const forzar = !!url.searchParams.get('forzar');
  try {
    const { data: pend } = await sb.from('v_documentacion_pendiente').select('*').eq('estado', 'pedir');
    if (!pend?.length) { await log('ok', 'documentación completa, no se avisa'); return Response.json({ enviado: false, motivo: 'todo al día' }); }

    const hoy = new Date().toISOString().slice(0, 10);
    if (!forzar) {
      const { data: ya } = await sb.from('avisos_enviados').select('id').eq('tipo', 'documentacion').eq('clave', hoy).maybeSingle();
      if (ya) return Response.json({ enviado: false, motivo: 'ya enviado hoy' });
    }

    const d = new Date(); const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const mesFact = `${MESES[prev.getMonth()]} ${prev.getFullYear()}`;
    const porEmisor = new Map<string, any[]>();
    for (const p of pend) { if (!porEmisor.has(p.emisor)) porEmisor.set(p.emisor, []); porEmisor.get(p.emisor)!.push(p); }

    let html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1C1A14">
<p>Hola Rubén,</p>
<p>Para enviar a Cade las facturas de <b>${mesFact}</b> falta esta documentación. Necesita certificado digital, así que tienes que sacarla tú:</p>`;
    let txt = `Para enviar a Cade las facturas de ${mesFact} falta:\n\n`;
    for (const [em, docs] of porEmisor) {
      html += `<p style="margin:16px 0 6px"><b>${esc(NOMBRE[em] ?? em)}</b></p><ol>`;
      txt += `${NOMBRE[em] ?? em}\n`;
      for (const x of docs) {
        html += `<li style="margin-bottom:6px"><b>${esc(x.documento)}</b><br><span style="color:#7A5A3A">${esc(x.como_obtenerlo ?? '')}</span></li>`;
        txt += `  - ${x.documento}: ${x.como_obtenerlo ?? ''}\n`;
      }
      html += `</ol>`;
    }
    html += `<p style="margin-top:20px"><a href="${ERP}" style="background:#F26B1F;color:#FDF8EC;padding:12px 18px;text-decoration:none;border-radius:8px;font-weight:bold">Subir documentación al ERP</a></p>
<p style="color:#7A5A3A;font-size:12px">Mientras falte algo, las facturas de ese emisor se quedan en borrador y no salen a Cade. Este aviso se repite cada día hasta el 10 o hasta que esté todo.</p></div>`;
    txt += `\nSúbela aquí: ${ERP}\n`;

    const boundary = 'b' + crypto.randomUUID();
    const asunto = `Documentación Cade pendiente — ${mesFact} (${pend.length})`;
    const raw = [
      `To: ${PARA}`, `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(asunto)))}?=`, 'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`, '',
      `--${boundary}`, 'Content-Type: text/plain; charset=UTF-8', '', txt,
      `--${boundary}`, 'Content-Type: text/html; charset=UTF-8', '', html,
      `--${boundary}--`,
    ].join('\r\n');

    const token = await tokenGmail();
    const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: b64url(raw) }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error('Gmail: ' + JSON.stringify(j).slice(0, 300));
    await sb.from('avisos_enviados').upsert([{ tipo: 'documentacion', clave: hoy, destinatario: PARA, detalle: `${pend.length} documento(s) pendiente(s)` }], { onConflict: 'tipo,clave' });
    await log('enviado', `${PARA}: ${pend.length} pendiente(s)`);
    return Response.json({ enviado: true, pendientes: pend.length, id: j.id });
  } catch (e) {
    await log('fallo', String((e as Error)?.message ?? e));
    return Response.json({ error: String((e as Error)?.message ?? e) }, { status: 500 });
  }
});
