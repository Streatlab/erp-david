// BANCO · AUTORIZACIÓN (Enable Banking) — ERP David
// Flujo: ?llave=...&accion=bancos | accion=iniciar&banco=..&psu=personal|business
// El banco redirige aquí con ?code=..&state=.. y se guarda la sesión.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const API = 'https://api.enablebanking.com';
const LLAVE = Deno.env.get('LLAVE_BANCO') ?? ''; // la llave no se guarda en el repo (ver README)
const REDIRECT = 'https://rribmludsuirmyprfkop.supabase.co/functions/v1/banco-auth';
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const b64url = (b: ArrayBuffer | Uint8Array) => {
  const bytes = b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = '';
  for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const txt = (s: string) => b64url(new TextEncoder().encode(s));
const log = (estado: string, detalle: string) => sb.from('robot_log').insert([{ fuente: 'banco_auth', estado, detalle }]);

async function credenciales() {
  const { data } = await sb.from('robot_credenciales')
    .select('usuario, password').eq('plataforma', 'enablebanking').eq('cuenta', 'david').eq('activo', true).maybeSingle();
  if (!data?.usuario || !data?.password) throw new Error('sin credenciales de enablebanking para david');
  return { appId: data.usuario as string, pem: data.password as string };
}

async function jwt(appId: string, pem: string): Promise<string> {
  const cuerpo = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(cuerpo), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const ahora = Math.floor(Date.now() / 1000);
  const cab = txt(JSON.stringify({ typ: 'JWT', alg: 'RS256', kid: appId }));
  const carga = txt(JSON.stringify({ iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat: ahora, exp: ahora + 3600 }));
  const firma = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${cab}.${carga}`));
  return `${cab}.${carga}.${b64url(firma)}`;
}

function pagina(titulo: string, cuerpo: string, ok = true) {
  return new Response(
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo}</title><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F5ECD9;color:#1C1A14;margin:0;padding:24px;line-height:1.55}
.card{background:#FDF8EC;border:1px solid rgba(22,53,92,.14);border-radius:14px;padding:24px;max-width:520px;margin:40px auto}
h1{font-size:20px;margin:0 0 12px;color:${ok ? '#16355C' : '#C94A2C'}}
p{font-size:14px;margin:8px 0}
a.btn{display:block;background:#F26B1F;color:#FDF8EC;text-decoration:none;padding:14px 16px;border-radius:10px;font-weight:500;text-align:center;margin:10px 0}
</style></head><body><div class="card"><h1>${titulo}</h1>${cuerpo}</div></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const accion = url.searchParams.get('accion');

  // ── Vuelta del banco ────────────────────────────────────────────────
  if (code) {
    try {
      const { appId, pem } = await credenciales();
      const token = await jwt(appId, pem);
      const r = await fetch(`${API}/sessions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const j = await r.json();
      if (!r.ok) {
        await log('sesion_error', JSON.stringify(j).slice(0, 500));
        return pagina('No se pudo completar', `<p>El banco no devolvió permiso válido. Vuelve a intentarlo.</p><p style="color:#7A5A3A;font-size:12px">${(j?.message ?? r.status)}</p>`, false);
      }

      const bruto = (j.accounts_data ?? j.accounts ?? []) as any[];
      const cuentas = bruto.map((a: any) => ({
        uid: typeof a === 'string' ? a : (a.uid ?? a.resource_id ?? null),
        iban: typeof a === 'string' ? null : (a.account_id?.iban ?? a.iban ?? null),
        nombre: typeof a === 'string' ? null : (a.name ?? a.product ?? null),
      })).filter((c: any) => c.uid);

      const banco = j.aspsp?.name ?? url.searchParams.get('state')?.split('|')[0] ?? 'banco';
      const validez = j.access?.valid_until ?? null;

      await sb.from('banco_sesiones').insert([{
        titular: 'david', banco, session_id: j.session_id ?? null,
        estado: 'autorizada', cuentas, valida_hasta: validez,
      }]);

      for (const c of cuentas) {
        const { data: existe } = await sb.from('cuentas_bancarias')
          .select('id').eq('iban', c.iban).maybeSingle();
        if (existe?.id) {
          await sb.from('cuentas_bancarias').update({ cuenta_uid: c.uid, banco, activa: true }).eq('id', existe.id);
        } else {
          await sb.from('cuentas_bancarias').insert([{
            alias: c.nombre ?? `${banco} ${(c.iban ?? '').slice(-4)}`,
            banco, iban: c.iban, iban_mask: c.iban ? `…${c.iban.slice(-4)}` : null,
            cuenta_uid: c.uid, titular: 'david', activa: true, descargar: false,
          }]);
        }
      }

      await log('sesion_ok', `${banco}: ${cuentas.length} cuentas, válida hasta ${validez}`);
      return pagina('Banco conectado', `<p><b>${banco}</b> conectado correctamente.</p><p>${cuentas.length} cuenta(s) enlazada(s).</p><p>Ya puedes cerrar esta página y conectar el siguiente banco.</p>`);
    } catch (e) {
      await log('sesion_fallo', String((e as Error)?.message ?? e));
      return pagina('Error', `<p>${String((e as Error)?.message ?? e)}</p>`, false);
    }
  }

  if (!LLAVE || url.searchParams.get('llave') !== LLAVE) return new Response('no', { status: 401 });

  const { appId, pem } = await credenciales();
  const token = await jwt(appId, pem);
  const cab = { Authorization: `Bearer ${token}`, accept: 'application/json', 'Content-Type': 'application/json' };

  // ── Listado de bancos disponibles en España ─────────────────────────
  if (accion === 'bancos') {
    const r = await fetch(`${API}/aspsps?country=ES`, { headers: cab });
    const j = await r.json();
    const lista = (j.aspsps ?? []).map((a: any) => ({ name: a.name, psu_types: a.psu_types, beta: a.beta ?? false }));
    return new Response(JSON.stringify({ total: lista.length, aspsps: lista }, null, 2), { headers: { 'Content-Type': 'application/json' } });
  }

  // ── Menú de conexión para David ─────────────────────────────────────
  if (accion === 'menu') {
    const bancos = ['BBVA', 'CaixaBank', 'N26'];
    const enlaces = bancos.map((b) =>
      `<a class="btn" href="${REDIRECT}?llave=${LLAVE}&accion=iniciar&banco=${encodeURIComponent(b)}">Conectar ${b}</a>`).join('');
    return pagina('Conectar tus bancos', `<p>Pulsa cada banco y entra con tus claves habituales. Solo damos permiso de <b>lectura</b> de movimientos.</p>${enlaces}<p style="color:#7A5A3A;font-size:12px">El permiso dura 90 días y se renueva igual de fácil.</p>`);
  }

  // ── Iniciar autorización de un banco ────────────────────────────────
  if (accion === 'iniciar') {
    const banco = url.searchParams.get('banco') ?? 'BBVA';
    const psu = url.searchParams.get('psu') ?? 'personal';
    const validUntil = new Date(Date.now() + 89 * 86400000).toISOString().replace(/\.\d{3}Z$/, '.000+00:00');
    const r = await fetch(`${API}/auth`, {
      method: 'POST',
      headers: cab,
      body: JSON.stringify({
        access: { valid_until: validUntil },
        aspsp: { name: banco, country: 'ES' },
        state: `${banco}|david`,
        redirect_url: REDIRECT,
        psu_type: psu,
      }),
    });
    const j = await r.json();
    if (!r.ok || !j.url) {
      await log('auth_error', `${banco}: ${JSON.stringify(j).slice(0, 400)}`);
      return pagina('No se pudo abrir el banco', `<p>${banco} no aceptó la petición.</p><p style="color:#7A5A3A;font-size:12px">${j?.message ?? r.status}</p><p><a class="btn" href="${REDIRECT}?llave=${LLAVE}&accion=menu">Volver</a></p>`, false);
    }
    await sb.from('banco_sesiones').insert([{ titular: 'david', banco, estado: 'esperando_autorizacion' }]);
    return Response.redirect(j.url, 302);
  }

  return pagina('Banco · David', `<p><a class="btn" href="${REDIRECT}?llave=${LLAVE}&accion=menu">Conectar bancos</a></p>`);
});
