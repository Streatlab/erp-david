// BANCO · SALDOS — ERP David. Guarda el saldo real de cada cuenta (Enable Banking /balances).
// El robot de movimientos (banco-sync) no trae saldos; esta función se lo pregunta al banco una vez al día
// y Panel ▸ Hoy lo muestra. GET ?llave=<llave>
import { createClient } from 'jsr:@supabase/supabase-js@2';

const API = 'https://api.enablebanking.com';
const LLAVE = Deno.env.get('LLAVE_BANCO') ?? ''; // la llave no se guarda en el repo (ver README)
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const b64url = (b: ArrayBuffer | Uint8Array) => {
  const bytes = b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = ''; for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const txt = (s: string) => b64url(new TextEncoder().encode(s));
const log = (estado: string, detalle: string) => sb.from('robot_log').insert([{ fuente: 'banco_saldos', estado, detalle: detalle.slice(0, 500) }]);

async function token(): Promise<string> {
  const { data } = await sb.from('robot_credenciales').select('usuario, password')
    .eq('plataforma', 'enablebanking').eq('cuenta', 'david').eq('activo', true).maybeSingle();
  if (!data?.usuario || !data?.password) throw new Error('sin credenciales enablebanking david');
  const cuerpo = (data.password as string).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(cuerpo), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const ahora = Math.floor(Date.now() / 1000);
  const cab = txt(JSON.stringify({ typ: 'JWT', alg: 'RS256', kid: data.usuario }));
  const carga = txt(JSON.stringify({ iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat: ahora, exp: ahora + 3600 }));
  const firma = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${cab}.${carga}`));
  return `${cab}.${carga}.${b64url(firma)}`;
}

// Prioridad de tipos de saldo: cierre contable > disponible > esperado > el primero que venga
const ORDEN = ['CLBD', 'ITBD', 'CLAV', 'ITAV', 'XPCD', 'OPBD', 'VALU'];
function elegir(bal: any[]): { importe: number; tipo: string } | null {
  const v = (bal ?? []).filter((b) => b?.balance_amount?.amount != null);
  if (!v.length) return null;
  v.sort((a, b) => {
    const ia = ORDEN.indexOf(a.balance_type), ib = ORDEN.indexOf(b.balance_type);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return { importe: Number(v[0].balance_amount.amount), tipo: String(v[0].balance_type ?? '') };
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  if (!LLAVE || url.searchParams.get('llave') !== LLAVE) return new Response('no', { status: 401 });
  const res: any = { actualizadas: 0, sin_saldo: 0, errores: [] as string[] };
  try {
    const tok = await token();
    const { data: cuentas } = await sb.from('cuentas_bancarias').select('id, alias, banco, iban_mask, cuenta_uid, activa').not('cuenta_uid', 'is', null);
    for (const c of cuentas ?? []) {
      if (c.activa === false) continue;
      try {
        const r = await fetch(`${API}/accounts/${c.cuenta_uid}/balances`, { headers: { Authorization: `Bearer ${tok}`, accept: 'application/json' } });
        const j = await r.json();
        if (!r.ok) throw new Error(`${r.status}: ${JSON.stringify(j).slice(0, 120)}`);
        const s = elegir(j.balances);
        if (!s) { res.sin_saldo++; continue; }
        await sb.from('cuentas_bancarias').update({ saldo_actual: s.importe, saldo: s.importe, saldo_fecha: new Date().toISOString(), saldo_tipo: s.tipo }).eq('id', c.id);
        res.actualizadas++;
      } catch (e) { res.errores.push(`${c.banco} ${c.iban_mask ?? ''}: ${(e as Error).message}`.slice(0, 160)); }
    }
    await log(res.errores.length ? 'aviso' : 'ok', `${res.actualizadas} saldos, ${res.sin_saldo} sin saldo${res.errores.length ? ' · ' + res.errores.join(' · ') : ''}`);
    return new Response(JSON.stringify(res), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    await log('error', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
});
