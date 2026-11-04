// CORREO · PERMISO DE GOOGLE — buzón de David (cartero) y buzón de Juan (admin@streatlab.com)
// ?llave=..&accion=conectar[&cuenta=juan]  → pantalla de permisos de Google
// Google vuelve con ?code=..&state=<cuenta> → guarda el permiso permanente
// Permisos: leer, enviar y preparar borradores (los borradores los revisa y envía Rubén).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const LLAVE = Deno.env.get('LLAVE_CORREO') ?? ''; // la llave no se guarda en el repo (ver README)
const REDIRECT = 'https://rribmludsuirmyprfkop.supabase.co/functions/v1/correo-auth';
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
].join(' ');
const CUENTAS: Record<string, { clave: string; nombre: string }> = {
  david: { clave: 'cartero', nombre: 'David (davidsanzn@gmail.com)' },
  juan: { clave: 'cartero-juan', nombre: 'Juan (admin@streatlab.com)' },
};
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const log = (estado: string, detalle: string) => sb.from('robot_log').insert([{ fuente: 'correo_auth', estado, detalle }]);

async function cred(cuenta: string) {
  const { data } = await sb.from('robot_credenciales').select('usuario, password').eq('plataforma', 'google').eq('cuenta', cuenta).maybeSingle();
  return data as { usuario: string; password: string } | null;
}

function pagina(titulo: string, cuerpo: string, ok = true) {
  return new Response(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F5ECD9;color:#1C1A14;margin:0;padding:24px;line-height:1.55}
.card{background:#FDF8EC;border:1px solid rgba(22,53,92,.14);border-radius:14px;padding:24px;max-width:520px;margin:40px auto}
h1{font-size:20px;margin:0 0 12px;color:${ok ? '#16355C' : '#C94A2C'}}p{font-size:14px;margin:8px 0}
a.btn{display:block;background:#F26B1F;color:#FDF8EC;text-decoration:none;padding:14px 16px;border-radius:10px;font-weight:500;text-align:center;margin:12px 0}
</style></head><body><div class="card"><h1>${titulo}</h1>${cuerpo}</div></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const accion = url.searchParams.get('accion');

  if (code) {
    const cuenta = CUENTAS[url.searchParams.get('state') ?? 'david'] ?? CUENTAS.david;
    const app = await cred('app');
    if (!app) return pagina('Falta configurar', '<p>No hay credenciales de Google guardadas.</p>', false);
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: app.usuario, client_secret: app.password, redirect_uri: REDIRECT, grant_type: 'authorization_code' }),
    });
    const j = await r.json();
    if (!r.ok || !j.refresh_token) {
      await log('token_error', JSON.stringify(j).slice(0, 400));
      return pagina('No se pudo completar', `<p>Google no devolvió permiso permanente.</p><p style="font-size:12px;color:#7A5A3A">${j?.error_description ?? j?.error ?? r.status}</p><p>Vuelve a intentarlo y acepta todas las casillas.</p>`, false);
    }
    let buzon = 'desconocido';
    try {
      const p = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', { headers: { Authorization: `Bearer ${j.access_token}` } });
      buzon = (await p.json()).emailAddress ?? buzon;
    } catch { /* da igual */ }
    await sb.from('robot_credenciales').upsert([{ plataforma: 'google', cuenta: cuenta.clave, usuario: buzon, password: j.refresh_token, activo: true }], { onConflict: 'plataforma,cuenta' });
    await log('permiso_ok', `${cuenta.clave}: buzón ${buzon} autorizado`);
    return pagina('Correo conectado', `<p>Buzón <b>${buzon}</b> conectado para ${cuenta.nombre}.</p><p>El ERP ya puede leer las liquidaciones y dejarte los correos preparados en borradores.</p><p>Puedes cerrar esta página.</p>`);
  }

  if (!LLAVE || url.searchParams.get('llave') !== LLAVE) return new Response('no', { status: 401 });
  const cuentaKey = url.searchParams.get('cuenta') === 'juan' ? 'juan' : 'david';

  if (accion === 'estado') {
    const d = await cred('cartero'), jn = await cred('cartero-juan');
    return Response.json({ david: d?.usuario ?? null, juan: jn?.usuario ?? null });
  }

  if (accion === 'conectar') {
    const app = await cred('app');
    if (!app) return pagina('Falta un paso previo', '<p>Todavía no están guardadas las credenciales de Google del ERP.</p>', false);
    const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    auth.searchParams.set('client_id', app.usuario);
    auth.searchParams.set('redirect_uri', REDIRECT);
    auth.searchParams.set('response_type', 'code');
    auth.searchParams.set('scope', SCOPES);
    auth.searchParams.set('access_type', 'offline');
    auth.searchParams.set('prompt', 'consent');
    auth.searchParams.set('include_granted_scopes', 'true');
    auth.searchParams.set('state', cuentaKey);
    if (cuentaKey === 'juan') auth.searchParams.set('login_hint', 'admin@streatlab.com');
    return Response.redirect(auth.toString(), 302);
  }

  const c = CUENTAS[cuentaKey];
  return pagina(`Correo · ${c.nombre}`,
    `<p>Conecta el buzón de ${c.nombre} para leer las liquidaciones de Cade y dejarte los correos de facturas preparados como borrador.</p>
     <a class="btn" href="${REDIRECT}?llave=${LLAVE}&accion=conectar&cuenta=${cuentaKey}">Conectar el correo</a>
     <p style="font-size:12px;color:#7A5A3A">Permisos: leer, enviar y preparar borradores. Nada sale sin que tú lo envíes.</p>`);
});
