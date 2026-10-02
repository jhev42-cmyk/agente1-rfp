import { createHmac, scryptSync, timingSafeEqual } from 'crypto'

// Usuarios de la herramienta. Solo se guarda el hash scrypt de la contraseña (formato scrypt$salt$hash).
// Para agregar uno: generar salt + hash con crypto.scryptSync(password, salt, 32) y añadirlo aquí.
// Se migrará a la tabla User de Prisma cuando se conecte la base de datos.
const USERS = [
  { id: 1, email: 'admin@rfp.local', name: 'Administrador', role: 'admin', hash: 'scrypt$11f9df3cc6a87df94a27836be0f0177b$52349de1cefeda6f4a1367a1201b4c55adb47c33195ca64c48d3840435f2a7d5' },
  { id: 2, email: 'analista1@rfp.local', name: 'Analista 1', role: 'analista', hash: 'scrypt$f9db57d6d5421e3e2dcbefa9078292f7$ef503f49ad415dd5eeda9f3f2fec48254dc0cc863af427642f3adffd4a86bb88' },
  { id: 3, email: 'analista2@rfp.local', name: 'Analista 2', role: 'analista', hash: 'scrypt$e6a18d27bab39f12b5a713555d77647b$ce7575ed3bc20832e7abcbba6d4dc3db86d376334deb87681e2383d7339183fa' },
]

const SESSION_HOURS = 12

export type SessionUser = { id: number; email: string; name: string; role: string }

function secret(): string {
  const s = process.env.AUTH_SECRET
  if (s) return s
  if (process.env.NODE_ENV !== 'production') return 'dev-only-secret'
  throw new Error('AUTH_SECRET no está configurado')
}

function sign(data: string): string {
  return createHmac('sha256', secret()).update(data).digest('base64url')
}

export function authenticate(email: string, password: string): SessionUser | null {
  const user = USERS.find((u) => u.email === email.trim().toLowerCase())
  if (!user) return null
  const [, salt, hash] = user.hash.split('$')
  const expected = Buffer.from(hash, 'hex')
  const actual = scryptSync(password, salt, expected.length)
  if (!timingSafeEqual(expected, actual)) return null
  return { id: user.id, email: user.email, name: user.name, role: user.role }
}

export function createToken(user: SessionUser): string {
  const payload = Buffer.from(
    JSON.stringify({ ...user, exp: Date.now() + SESSION_HOURS * 3600 * 1000 })
  ).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function verifyToken(authHeader: string | null): SessionUser | null {
  if (!authHeader) return null
  const [payload, signature] = authHeader.replace('Bearer ', '').split('.')
  if (!payload || !signature) return null
  const expected = Buffer.from(sign(payload))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (typeof data.exp !== 'number' || data.exp < Date.now()) return null
    return { id: data.id, email: data.email, name: data.name, role: data.role }
  } catch {
    return null
  }
}
