import { NextResponse } from 'next/server'
import { Rol } from '@prisma/client'
import { handler, HttpError, parseId, requireAdmin } from '../../../lib/api'
import { hashPassword, passwordTemporal } from '../../../lib/auth'
import { prisma } from '../../../lib/db'

// Cambia rol, activa/desactiva o restablece la contraseña. Desactivar y restablecer cierran las
// sesiones abiertas del usuario (sube sessionVersion).
export const PATCH = handler(async (request, { params }: { params: { id: string } }) => {
  const admin = await requireAdmin(request)
  const id = parseId(params.id)
  const { rol, activo, restablecer } = await request.json().catch(() => ({}))
  const usuario = await prisma.usuario.findUnique({ where: { id } })
  if (!usuario) throw new HttpError(404, 'Usuario no encontrado')

  const quitaAdmin = (rol !== undefined && rol !== Rol.ADMIN) || activo === false
  if (id === admin.id && quitaAdmin) throw new HttpError(400, 'No puedes quitarte el rol de administrador ni desactivarte')
  if (usuario.rol === Rol.ADMIN && quitaAdmin) {
    const admins = await prisma.usuario.count({ where: { rol: Rol.ADMIN, activo: true } })
    if (admins <= 1) throw new HttpError(400, 'Debe quedar al menos un administrador activo')
  }

  const data: { rol?: Rol; activo?: boolean; passwordHash?: string; sessionVersion?: { increment: number } } = {}
  if (rol !== undefined) {
    if (!Object.values(Rol).includes(rol)) throw new HttpError(400, 'Rol inválido')
    data.rol = rol
  }
  if (activo !== undefined) {
    data.activo = !!activo
    if (!activo) data.sessionVersion = { increment: 1 }
  }
  let temporal: string | undefined
  if (restablecer) {
    temporal = passwordTemporal()
    data.passwordHash = hashPassword(temporal)
    data.sessionVersion = { increment: 1 }
  }
  await prisma.usuario.update({ where: { id }, data })
  return NextResponse.json({ ok: true, ...(temporal ? { passwordTemporal: temporal } : {}) })
})
