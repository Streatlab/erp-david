// BANCO · ROBOT NOCTURNO (Enable Banking) — ERP David
// v2: descarga movimientos + vigila caducidad y avisa por WhatsApp (Green API propia de David) a <=15 dias.
// v3 (02-oct-2026): si el banco solo permite pedir los ultimos 90 dias (N26 devolvia 422 cada noche en una
//     subcuenta sin historico), se repite la descarga acotada a 89 dias en vez de fallar.
// v4 (T2): respeta el interruptor Descargar de cada cuenta (las cuentas nuevas se dan de alta solas),
//     cuentas Personales sin regla van a "Pendiente revisar (personal)" y se guarda la cuenta de origen.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const API = 'https://api.enablebanking.com';
const LLAVE = 'david-banco-2026';
const INICIO = '2026-04-28';
const ENLACE = 'https://rribmludsuirmyprfkop.supabase.co/functions/v1/banco-auth?llave=david-banco-2026&accion=iniciar&banco=';
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

const b64url = (b: ArrayBuffer | Uint8Array) => {
  const bytes = b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = ''; for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const txt = (s: string) => b64url(new TextEncoder().encode(s));
const log = (estado: string, detalle: string, fuente = 'banco_sync') => sb.from('robot_log').insert([{ fuente, estado, detalle }]);

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

async function avisarWhatsapp(texto: string): Promise<string> {
  const { data: cred } = await sb.from('robot_credenciales').select('usuario, password, url_base')
    .eq('plataforma', 'green_api').eq('activo', true).limit(1).maybeSingle();
  if (!cred?.usuario || !cred?.password) return 'sin_whatsapp_configurado';
  const base = (cred.url_base || 'https://api.green-api.com').replace(/\/$/, '');
  const { data: destinos } = await sb.from('avisos_whatsapp').select('destino').eq('activo', true);
  if (!destinos?.length) return 'sin_destinos';
  let ok = 0;
  for (const d of destinos) {
    const chatId = `${String(d.destino).replace(/\D/g, '')}@c.us`;
    const r = await fetch(`${base}/waInstance${cred.usuario}/sendMessage/${cred.password}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chatId, message: texto }),
    }).catch(() => null);
    if (r?.ok) ok++;
  }
  return `enviado ${ok}/${destinos.length}`;
}

async function vigilarBanco(banco: string, valida_hasta: string | null) {
  const quedan = valida_hasta ? Math.floor((new Date(valida_hasta).getTime() - Date.now()) / 86400000) : 999;
  const f = valida_hasta ? String(valida_hasta).slice(0, 10) : 's/f';
  const estado = quedan <= 0 ? 'caducada' : quedan <= 15 ? 'caduca_pronto' : 'ok';
  const fuente = `banco_${banco.toLowerCase()}`;
  await sb.from('robot_salud').upsert([{ fuente, ultima_ejecucion: new Date().toISOString(), ultimo_dato: valida_hasta, estado,
    detalle: estado === 'caducada' ? `Conexion ${banco} CADUCADA (${f}).` : estado === 'caduca_pronto' ? `Conexion ${banco} caduca en ${quedan} dia(s) (${f}).` : `Conexion ${banco} en vigor hasta ${f}.` }], { onConflict: 'fuente' });
  if (estado === 'ok') return;
  const desde = new Date(Date.now() - 20 * 3600 * 1000).toISOString();
  const { count } = await sb.from('robot_log').select('id', { count: 'exact', head: true }).eq('fuente', fuente).eq('estado', 'alerta').gte('created_at', desde);
  if ((count ?? 0) > 0) return;
  const enlace = ENLACE + encodeURIComponent(banco);
  const msg = estado === 'caducada'
    ? `⚠️ ERP David · Conexión de ${banco} CADUCADA (${f})\nYa no entran sus movimientos. Renuévala aquí con tus claves del banco:\n${enlace}`
    : `⚠️ ERP David · Conexión de ${banco} caduca en ${quedan} día(s) (${f})\nRenuévala antes con tus claves del banco:\n${enlace}`;
  const res = await avisarWhatsapp(msg);
  await log('alerta', `${banco}: ${estado} (${f}) whatsapp ${res}`, fuente);
}

async function sha256(s: string) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
const norm = (s: string) => (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

function concepto(t: any): string {
  const rem = Array.isArray(t.remittance_information) ? t.remittance_information.join(' ') : (t.remittance_information ?? '');
  const parte = (t.credit_debit_indicator === 'CRDT' ? t.debtor?.name : t.creditor?.name) ?? '';
  return (rem || parte || t.bank_transaction_code?.description || 'Movimiento').toString().replace(/\s+/g, ' ').trim().slice(0, 300);
}

async function descargar(tok: string, uid: string, desde: string) {
  const out: any[] = []; let cont: string | null = null; let vueltas = 0;
  do {
    const q = new URLSearchParams({ date_from: desde });
    if (cont) q.set('continuation_key', cont);
    const r = await fetch(`${API}/accounts/${uid}/transactions?${q}`, { headers: { Authorization: `Bearer ${tok}`, accept: 'application/json' } });
    const j = await r.json();
    if (!r.ok) throw new Error(`transacciones ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
    out.push(...(j.transactions ?? []));
    cont = j.continuation_key ?? null; vueltas++;
  } while (cont && vueltas < 50);
  return out;
}

// v3: algunos bancos (N26) rechazan rangos de mas de 90 dias con un 422. Si pasa, se repite acotado a 89 dias.
const SOLO_90_DIAS = /90-day|Wrong transactions period/i;
async function descargarConTope(tok: string, uid: string, desde: string, etiqueta: string) {
  try {
    return await descargar(tok, uid, desde);
  } catch (e) {
    const msg = String((e as Error).message ?? e);
    const tope = new Date(Date.now() - 89 * 86400000).toISOString().slice(0, 10);
    if (!SOLO_90_DIAS.test(msg) || desde >= tope) throw e;
    await log('info', `${etiqueta}: el banco solo permite 90 dias; historico acotado desde ${tope}`);
    return await descargar(tok, uid, tope);
  }
}

type Cuenta = { cuenta_uid: string; descargar: boolean; personal: boolean };

async function cuentasConocidas(): Promise<Map<string, Cuenta>> {
  const { data } = await sb.from('cuentas_bancarias').select('cuenta_uid, descargar, personal').not('cuenta_uid', 'is', null);
  return new Map((data ?? []).map((c: any) => [c.cuenta_uid, c as Cuenta]));
}

async function volcar(cuentas: Map<string, Cuenta>) {
  const { data: reglas } = await sb.from('reglas_conciliacion').select('patron, categoria_codigo, prioridad').eq('activa', true);
  const rs = (reglas ?? []).filter((r: any) => r.patron && r.categoria_codigo)
    .map((r: any) => ({ p: norm(r.patron), c: r.categoria_codigo, pr: r.prioridad ?? 0 }))
    .sort((a: any, b: any) => b.pr - a.pr || b.p.length - a.p.length);
  const { data: filas } = await sb.from('banco_movimientos_raw').select('*').eq('volcado', false).gte('fecha', INICIO).order('fecha').limit(2000);
  let n = 0;
  for (const m of filas ?? []) {
    const imp = Number(m.importe);
    const cn = norm(m.concepto);
    const base = `${m.fecha}|${imp.toFixed(2)}|${(m.concepto ?? '').toLowerCase()}|`;
    const { count } = await sb.from('conciliacion').select('id', { count: 'exact', head: true }).like('dedup_key', `${base.replace(/[%_]/g, '\\$&')}%`);
    const regla = rs.find((r: any) => r.p && cn.includes(r.p));
    const personal = !!cuentas.get(m.cuenta_uid)?.personal;
    const sinRegla = personal
      ? (imp < 0 ? 'pendiente-personal-gasto' : 'pendiente-personal-ingreso')
      : (imp < 0 ? 'pendiente-revisar-gasto' : 'pendiente-revisar-ingreso');
    const { error } = await sb.from('conciliacion').insert([{
      fecha: m.fecha, concepto: m.concepto, importe: imp, tipo: imp < 0 ? 'gasto' : 'ingreso',
      categoria: regla?.c ?? sinRegla,
      mes: String(m.fecha).slice(0, 7), dedup_key: `${base}${count ?? 0}`,
      origen_efectivo: cn.startsWith('ret. efectivo') || cn.startsWith('retirada efectivo'),
      cuenta_origen: m.iban ?? m.cuenta_uid ?? null,
      notas: `Banco ${m.banco}${m.iban ? ' …' + String(m.iban).slice(-4) : ''} (robot)`,
    }]);
    if (!error || String(error.code) === '23505') { await sb.from('banco_movimientos_raw').update({ volcado: true }).eq('id', m.id); if (!error) n++; }
    else await log('volcado_error', `${m.id}: ${error.message}`.slice(0, 300));
  }
  return n;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  if (url.searchParams.get('llave') !== LLAVE) return new Response('no', { status: 401 });
  if (url.searchParams.get('prueba_whatsapp') === '1') {
    const r = await avisarWhatsapp('✅ ERP David · Prueba de avisos. Te llegará un mensaje así 15 días antes de que caduque la conexión de cada banco.');
    return new Response(JSON.stringify({ whatsapp: r }), { headers: { 'Content-Type': 'application/json' } });
  }
  const res: any = { cuentas: 0, omitidas: 0, nuevos: 0, volcados: 0, avisos: [] as string[] };
  try {
    const tok = await token();
    const cuentas = await cuentasConocidas();
    const { data: ses } = await sb.from('banco_sesiones').select('*').eq('estado', 'autorizada').order('id', { ascending: false });
    const vistos = new Set<string>();
    const vigilados = new Set<string>();
    for (const s of ses ?? []) {
      if (!vigilados.has(s.banco)) { vigilados.add(s.banco); await vigilarBanco(s.banco, s.valida_hasta ?? null); }
      if (s.valida_hasta && new Date(s.valida_hasta).getTime() < Date.now()) {
        await sb.from('banco_sesiones').update({ estado: 'caducada' }).eq('id', s.id); res.avisos.push(`${s.banco} caducado`); continue;
      }
      for (const c of (s.cuentas ?? []) as any[]) {
        if (!c.uid || vistos.has(c.uid)) continue; vistos.add(c.uid);
        const etiqueta = `${s.banco} ${c.iban ? '…' + String(c.iban).slice(-4) : c.uid}`;
        // Cuenta nueva: se da de alta sola (descargar por defecto) para poder gestionarla en Bancos
        if (!cuentas.has(c.uid)) {
          const alta = { cuenta_uid: c.uid, descargar: true, personal: false };
          await sb.from('cuentas_bancarias').insert([{
            alias: c.nombre ?? `${s.banco} ${String(c.iban ?? c.uid).slice(-4)}`, banco: s.banco,
            iban: c.iban ?? null, iban_mask: c.iban ? `•••• ${String(c.iban).slice(-4)}` : '—',
            cuenta_uid: c.uid, titular: s.titular ?? null, descargar: true, personal: false, activa: true,
          }]);
          cuentas.set(c.uid, alta);
        }
        if (!cuentas.get(c.uid)!.descargar) { res.omitidas++; continue; }
        const { data: ult } = await sb.from('banco_movimientos_raw').select('fecha').eq('cuenta_uid', c.uid).order('fecha', { ascending: false }).limit(1).maybeSingle();
        let desde = INICIO;
        if (ult?.fecha) { const d = new Date(ult.fecha); d.setDate(d.getDate() - 5); desde = d.toISOString().slice(0, 10); }
        try {
          const txs = await descargarConTope(tok, c.uid, desde, etiqueta);
          res.cuentas++;
          const filas: any[] = [];
          for (const t of txs) {
            if (t.status && t.status !== 'BOOK') continue;
            const fecha = t.booking_date ?? t.value_date ?? t.transaction_date; if (!fecha) continue;
            let imp = Number(t.transaction_amount?.amount ?? 0);
            if (t.credit_debit_indicator === 'DBIT' && imp > 0) imp = -imp;
            const con = concepto(t);
            const huella = await sha256(`${c.iban ?? c.uid}|${fecha}|${imp.toFixed(2)}|${con}|${t.entry_reference ?? t.transaction_id ?? ''}`);
            filas.push({ banco: s.banco, iban: c.iban ?? null, cuenta_uid: c.uid, entry_reference: t.entry_reference ?? t.transaction_id ?? null,
              fecha, fecha_valor: t.value_date ?? null, importe: imp, moneda: t.transaction_amount?.currency ?? 'EUR', concepto: con,
              contraparte: (imp < 0 ? t.creditor?.name : t.debtor?.name) ?? null, estado_banco: t.status ?? null, crudo: t, huella, volcado: false });
          }
          for (let i = 0; i < filas.length; i += 200) {
            const { data, error } = await sb.from('banco_movimientos_raw').upsert(filas.slice(i, i + 200), { onConflict: 'huella', ignoreDuplicates: true }).select('id');
            if (error) throw new Error(error.message);
            res.nuevos += data?.length ?? 0;
          }
        } catch (e) { res.avisos.push(`${etiqueta}: ${(e as Error).message}`.slice(0, 200)); }
      }
    }
    res.volcados = await volcar(cuentas);
    const estado = res.avisos.length ? 'aviso' : 'ok';
    const det = `${res.cuentas} cuentas, ${res.nuevos} nuevos, ${res.volcados} a conciliacion${res.omitidas ? `, ${res.omitidas} sin descargar` : ''}${res.avisos.length ? ' · ' + res.avisos.join(' · ') : ''}`;
    await log(estado, det);
    await sb.from('robot_salud').upsert([{ fuente: 'banco_sync', ultima_ejecucion: new Date().toISOString(), ultimo_dato: new Date().toISOString().slice(0, 10), estado, detalle: det.slice(0, 500) }], { onConflict: 'fuente' });
    return new Response(JSON.stringify(res), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    await log('error', msg);
    await sb.from('robot_salud').upsert([{ fuente: 'banco_sync', ultima_ejecucion: new Date().toISOString(), estado: 'error', detalle: msg.slice(0, 500) }], { onConflict: 'fuente' });
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
});
