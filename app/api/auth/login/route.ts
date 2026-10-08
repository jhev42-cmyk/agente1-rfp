import { NextResponse } from 'next/server'
import { handler, HttpError } from '../../../lib/api'
import { passwordValido, ponerCookieSesion, rolSesion } from '../../../lib/auth'
import { prisma } from '../../../lib/db'

// Límite de intentos fallidos dentro de la ventana: por correo (protege cada cuenta) y por IP, más
// alto, para no bloquear a toda una oficina que sale a internet por la misma IP.
const MAX_FALLIDOS_CORREO = 5
const MAX_FALLIDOS_IP = 20
const VENTANA_MIN = 15

export const POST = handler(async (request) => {
  const { email: emailIn, password } = await request.json().catch(() => ({}))
  const email = String(emailIn || '').trim().toLowerCase()
  if (!email || !password) throw new HttpError(400, 'Email y contraseña requeridos')
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'desconocida'

  const desde = new Date(Date.now() - VENTANA_MIN * 60 * 1000)
  const [porCorreo, porIp] = await Promise.all([
    prisma.intentoLogin.count({ where: { exito: false, fecha: { gte: desde }, email } }),
    prisma.intentoLogin.count({ where: { exito: false, fecha: { gte: desde }, ip } }),
  ])
  if (porCorreo >= MAX_FALLIDOS_CORREO || porIp >= MAX_FALLIDOS_IP) {
    throw new HttpError(429, `Demasiados intentos fallidos. Espera ${VENTANA_MIN} minutos e inténtalo de nuevo.`)
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } })
  const valido = !!usuario && usuario.activo && passwordValido(String(password), usuario.passwordHash)
  await prisma.intentoLogin.create({ data: { email, ip, exito: valido } })
  if (!valido) throw new HttpError(401, 'Credenciales inválidas')

  const res = NextResponse.json({ user: { id: usuario!.id, email: usuario!.email, name: usuario!.nombre, role: rolSesion(usuario!.rol) } })
  return ponerCookieSesion(res, usuario!.id, usuario!.sessionVersion)
})
