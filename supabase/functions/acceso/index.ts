// Función `acceso` — entrada rápida al ERP sin sesión (PIN por dispositivo y huella).
// Acciones: metodos · pin-crear · pin-entrar · huella-registrar · huella-reto · huella-entrar
// pin-crear y huella-registrar exigen sesión real (Authorization: Bearer <jwt de usuario>).
// pin-entrar y huella-entrar devuelven un token_hash de enlace mágico que el cliente canjea con verifyOtp.
import { createClient } from 'npm:@supabase/supabase-js@2'

const URL_SB = Deno.env.get('SUPABASE_URL')!
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const sb = createClient(URL_SB, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } })

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

function origenPermitido(origin: string): boolean {
  try {
    const u = new URL(origin)
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true
    return u.protocol === 'https:' && (u.hostname === 'davidparte.vercel.app' || u.hostname.endsWith('.vercel.app'))
  } catch { return false }
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  const bin = atob(b64)
  return Uint8Array.from(bin, c => c.charCodeAt(0))
}
function bytesToB64url(b: Uint8Array): string {
  let s = ''
  for (const x of b) s += String.fromCharCode(x)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function usuarioPorEmail(email: string) {
  const { data } = await sb.from('usuarios').select('id, nombre, perfil, email, activo')
    .ilike('email', email.trim()).maybeSingle()
  if (!data || !data.activo) return null
  return data as { id: number; nombre: string; perfil: string; email: string }
}

async function usuarioDeSesion(req: Request) {
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!jwt) return null
  const { data } = await sb.auth.getUser(jwt)
  const email = data.user?.email
  return email ? usuarioPorEmail(email) : null
}

async function enlaceMagico(email: string) {
  const { data, error } = await sb.auth.admin.generateLink({ type: 'magiclink', email })
  if (error || !data?.properties?.hashed_token) throw new Error(error?.message ?? 'sin token')
  return data.properties.hashed_token
}

// Firma ECDSA de WebAuthn viene en DER; WebCrypto quiere r||s (64 bytes)
function derARaw(der: Uint8Array): Uint8Array {
  let i = 2
  if (der[1] & 0x80) i += der[1] & 0x7f
  const leer = () => {
    i++ // 0x02
    const len = der[i++]
    let v = der.slice(i, i + len)
    i += len
    while (v.length > 32 && v[0] === 0) v = v.slice(1)
    const out = new Uint8Array(32)
    out.set(v, 32 - v.length)
    return out
  }
  const r = leer(), s = leer()
  const raw = new Uint8Array(64)
  raw.set(r, 0); raw.set(s, 32)
  return raw
}

async function verificarFirma(spkiB64: string, alg: number, datos: Uint8Array, firma: Uint8Array) {
  const spki = b64urlToBytes(spkiB64)
  if (alg === -257) {
    const k = await crypto.subtle.importKey('spki', spki, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
    return crypto.subtle.verify('RSASSA-PKCS1-v1_5', k, firma, datos)
  }
  const k = await crypto.subtle.importKey('spki', spki, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
  return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, k, derARaw(firma), datos)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  let body: Record<string, string> = {}
  try { body = await req.json() } catch { return json({ error: 'Petición no válida' }, 400) }
  const accion = body.accion
  const dispositivo = String(body.dispositivo ?? '').slice(0, 100)

  try {
    if (accion === 'metodos') {
      const u = body.email ? await usuarioPorEmail(body.email) : null
      if (!u || !dispositivo) return json({ pin: false, huella: false })
      const [{ data: p }, { count }] = await Promise.all([
        sb.from('accesos_pin').select('bloqueado_hasta').eq('usuario_id', u.id).eq('dispositivo', dispositivo).eq('revocado', false).maybeSingle(),
        sb.from('accesos_huella').select('id', { count: 'exact', head: true }).eq('usuario_id', u.id).eq('dispositivo', dispositivo).eq('revocado', false),
      ])
      return json({ pin: !!p, huella: (count ?? 0) > 0, bloqueado_hasta: p?.bloqueado_hasta ?? null })
    }

    if (accion === 'pin-crear') {
      const u = await usuarioDeSesion(req)
      if (!u) return json({ error: 'Sesión no válida' }, 401)
      if (!/^\d{4}$/.test(body.pin ?? '') || !dispositivo) return json({ error: 'El PIN debe tener 4 cifras' }, 400)
      const { error } = await sb.rpc('acceso_pin_guardar', { p_usuario: u.id, p_dispositivo: dispositivo, p_pin: body.pin })
      if (error) throw error
      return json({ ok: true })
    }

    if (accion === 'pin-entrar') {
      const u = body.email ? await usuarioPorEmail(body.email) : null
      if (!u || !dispositivo) return json({ error: 'Este correo no tiene acceso al ERP' }, 403)
      const { data, error } = await sb.rpc('acceso_pin_comprobar', { p_usuario: u.id, p_dispositivo: dispositivo, p_pin: String(body.pin ?? '') })
      if (error) throw error
      const r = Array.isArray(data) ? data[0] : data
      if (r?.resultado !== 'ok') return json({ error: r?.resultado ?? 'incorrecto', bloqueado_hasta: r?.bloqueado_hasta ?? null, restantes: r?.restantes ?? 0 }, 403)
      return json({ token_hash: await enlaceMagico(u.email), email: u.email, nombre: u.nombre })
    }

    if (accion === 'huella-registrar') {
      const u = await usuarioDeSesion(req)
      if (!u) return json({ error: 'Sesión no válida' }, 401)
      if (!body.credential_id || !body.public_key || !dispositivo) return json({ error: 'Datos de huella incompletos' }, 400)
      const { error } = await sb.from('accesos_huella').upsert({
        usuario_id: u.id, dispositivo, credential_id: body.credential_id,
        public_key: body.public_key, alg: Number(body.alg ?? -7), revocado: false,
      }, { onConflict: 'credential_id' })
      if (error) throw error
      return json({ ok: true })
    }

    if (accion === 'huella-reto') {
      const u = body.email ? await usuarioPorEmail(body.email) : null
      if (!u || !dispositivo) return json({ error: 'Este correo no tiene acceso al ERP' }, 403)
      const { data: creds } = await sb.from('accesos_huella').select('credential_id').eq('usuario_id', u.id).eq('dispositivo', dispositivo).eq('revocado', false)
      if (!creds?.length) return json({ error: 'Sin huella en este dispositivo' }, 404)
      const reto = bytesToB64url(crypto.getRandomValues(new Uint8Array(32)))
      await sb.from('accesos_retos').delete().lt('expira', new Date().toISOString())
      await sb.from('accesos_retos').insert({ usuario_id: u.id, dispositivo, reto })
      return json({ reto, credenciales: creds.map(c => c.credential_id) })
    }

    if (accion === 'huella-entrar') {
      const u = body.email ? await usuarioPorEmail(body.email) : null
      if (!u || !dispositivo) return json({ error: 'Este correo no tiene acceso al ERP' }, 403)
      const { data: cred } = await sb.from('accesos_huella').select('public_key, alg')
        .eq('usuario_id', u.id).eq('credential_id', body.credential_id ?? '').eq('revocado', false).maybeSingle()
      if (!cred) return json({ error: 'Huella no registrada' }, 403)

      const clientDataBytes = b64urlToBytes(body.client_data ?? '')
      const clientData = JSON.parse(new TextDecoder().decode(clientDataBytes))
      if (clientData.type !== 'webauthn.get' || !origenPermitido(clientData.origin)) return json({ error: 'Huella no válida' }, 403)

      const { data: retos } = await sb.from('accesos_retos').select('id')
        .eq('usuario_id', u.id).eq('reto', clientData.challenge).gt('expira', new Date().toISOString())
      if (!retos?.length) return json({ error: 'Reto caducado, vuelve a intentarlo' }, 403)
      await sb.from('accesos_retos').delete().eq('id', retos[0].id)

      const authData = b64urlToBytes(body.authenticator_data ?? '')
      const rpHash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(new URL(clientData.origin).hostname)))
      if (!rpHash.every((b, i) => authData[i] === b) || !(authData[32] & 0x01)) return json({ error: 'Huella no válida' }, 403)

      const hashCD = new Uint8Array(await crypto.subtle.digest('SHA-256', clientDataBytes))
      const datos = new Uint8Array(authData.length + hashCD.length)
      datos.set(authData, 0); datos.set(hashCD, authData.length)
      const ok = await verificarFirma(cred.public_key, cred.alg, datos, b64urlToBytes(body.firma ?? ''))
      if (!ok) return json({ error: 'Huella no válida' }, 403)
      return json({ token_hash: await enlaceMagico(u.email), email: u.email, nombre: u.nombre })
    }

    return json({ error: 'Acción desconocida' }, 400)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
