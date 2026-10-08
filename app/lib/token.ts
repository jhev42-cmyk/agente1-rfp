// Firma y verificación del token de sesión con Web Crypto, para que funcione igual en el
// middleware (Edge) y en las rutas de la API (Node). El token viaja en una cookie HttpOnly.

export const COOKIE_SESION = 'sesion'
export const SESSION_HOURS = 12

export type DatosToken = { uid: number; v: number; exp: number }

function secreto(): string {
  const s = process.env.AUTH_SECRET
  if (s) return s
  if (process.env.NODE_ENV !== 'production') return 'dev-only-secret'
  throw new Error('AUTH_SECRET no está configurado')
}

const aBase64Url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const deBase64Url = (s: string) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4))
  return Uint8Array.from(b, (c) => c.charCodeAt(0))
}

async function hmac(datos: string) {
  const clave = await crypto.subtle.importKey('raw', new TextEncoder().encode(secreto()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return aBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', clave, new TextEncoder().encode(datos))))
}

// Comparación en tiempo constante para no filtrar la firma por tiempos de respuesta.
function iguales(a: string, b: string) {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

export async function firmarToken(uid: number, version: number) {
  const datos: DatosToken = { uid, v: version, exp: Date.now() + SESSION_HOURS * 3600 * 1000 }
  const payload = aBase64Url(new TextEncoder().encode(JSON.stringify(datos)))
  return `${payload}.${await hmac(payload)}`
}

// Solo verifica firma y vencimiento. Que el usuario siga activo y la versión de sesión coincida
// lo comprueba la API contra la base (ver getSesion en auth.ts).
export async function verificarToken(token: string | undefined | null): Promise<DatosToken | null> {
  if (!token) return null
  const [payload, firma] = token.split('.')
  if (!payload || !firma) return null
  if (!iguales(await hmac(payload), firma)) return null
  try {
    const d = JSON.parse(new TextDecoder().decode(deBase64Url(payload)))
    if (typeof d.uid !== 'number' || typeof d.v !== 'number' || typeof d.exp !== 'number' || d.exp < Date.now()) return null
    return d
  } catch {
    return null
  }
}
