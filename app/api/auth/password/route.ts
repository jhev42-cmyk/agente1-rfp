import { NextResponse } from 'next/server'
import { handler, HttpError, requireUser } from '../../../lib/api'
import { hashPassword, passwordValido, ponerCookieSesion, validarPasswordNueva } from '../../../lib/auth'
import { prisma } from '../../../lib/db'

// Cambio de contraseña propio. Cierra las demás sesiones del usuario y renueva la actual.
export const POST = handler(async (request) => {
  const user = await requireUser(request)
  const { actual, nueva } = await request.json().catch(() => ({}))
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: user.id } })
  if (!passwordValido(String(actual || ''), usuario.passwordHash)) throw new HttpError(400, 'La contraseña actual no es correcta')
  let password: string
  try { password = validarPasswordNueva(nueva) } catch (e) { throw new HttpError(400, (e as Error).message) }
  if (password === actual) throw new HttpError(400, 'La nueva contraseña debe ser distinta de la actual')

  const actualizado = await prisma.usuario.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(password), sessionVersion: { increment: 1 } },
  })
  return ponerCookieSesion(NextResponse.json({ ok: true }), actualizado.id, actualizado.sessionVersion)
})
