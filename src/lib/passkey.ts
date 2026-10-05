// Huella (WebAuthn / passkey) ligada a este dispositivo.
import { llamarAcceso, canjearToken, textoError } from '@/lib/accesoRapido'

function aB64url(buf: ArrayBuffer): string {
  let s = ''
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function deB64url(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  const bin = atob(b64)
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function huellaDisponible(): Promise<boolean> {
  try {
    return !!window.PublicKeyCredential &&
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch { return false }
}

export async function registrarHuella(email: string, nombre: string): Promise<string | null> {
  try {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'David Reparte', id: window.location.hostname },
        user: { id: new TextEncoder().encode(email), name: email, displayName: nombre },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
        attestation: 'none',
        timeout: 60000,
      },
    }) as PublicKeyCredential | null
    if (!cred) return 'Registro cancelado'
    const resp = cred.response as AuthenticatorAttestationResponse
    const spki = resp.getPublicKey?.()
    if (!spki) return 'Este navegador no permite huella para el ERP'
    const r = await llamarAcceso('huella-registrar', {
      credential_id: aB64url(cred.rawId),
      public_key: aB64url(spki),
      alg: resp.getPublicKeyAlgorithm?.() ?? -7,
    })
    return r.ok ? null : textoError(r)
  } catch {
    return 'No se pudo registrar la huella'
  }
}

export async function entrarConHuella(email: string): Promise<string | null> {
  const reto = await llamarAcceso('huella-reto', { email })
  if (!reto.reto) return textoError(reto)
  try {
    const cred = await navigator.credentials.get({
      publicKey: {
        challenge: deB64url(reto.reto),
        rpId: window.location.hostname,
        allowCredentials: (reto.credenciales ?? []).map(id => ({ type: 'public-key' as const, id: deB64url(id) })),
        userVerification: 'required',
        timeout: 60000,
      },
    }) as PublicKeyCredential | null
    if (!cred) return 'Huella cancelada'
    const resp = cred.response as AuthenticatorAssertionResponse
    const r = await llamarAcceso('huella-entrar', {
      email,
      credential_id: aB64url(cred.rawId),
      client_data: aB64url(resp.clientDataJSON),
      authenticator_data: aB64url(resp.authenticatorData),
      firma: aB64url(resp.signature),
    })
    if (!r.token_hash) return textoError(r)
    return canjearToken(r.token_hash)
  } catch {
    return 'Huella cancelada o no reconocida'
  }
}
