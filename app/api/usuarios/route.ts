import { NextResponse } from 'next/server'
import { Rol } from '@prisma/client'
import { handler, HttpError, requireAdmin } from '../../lib/api'
import { hashPassword, passwordTemporal } from '../../lib/auth'
import { prisma } from '../../lib/db'

export const GET = handler(async (request) => {
  await requireAdmin(request)
  const [usuarios, accesos] = await Promise.all([
    prisma.usuario.findMany({
      orderBy: { email: 'asc' },
      select: { id: true, email: true, nombre: true, rol: true, activo: true, createdAt: true },
    }),
    prisma.intentoLogin.findMany({ orderBy: { fecha: 'desc' }, take: 100 }),
  ])
  return NextResponse.json({ usuarios, accesos })
})

// Crea un usuario con una contraseña temporal que se muestra una sola vez.
export const POST = handler(async (request) => {
  await requireAdmin(request)
  const { email: emailIn, nombre: nombreIn, rol } = await request.json().catch(() => ({}))
  const email = String(emailIn || '').trim().toLowerCase()
  const nombre = String(nombreIn || '').trim()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, 'Correo inválido')
  if (!nombre) throw new HttpError(400, 'Indica el nombre')
  if (!Object.values(Rol).includes(rol)) throw new HttpError(400, 'Rol inválido')
  if (await prisma.usuario.findUnique({ where: { email } })) throw new HttpError(409, 'Ya existe un usuario con ese correo')
  const temporal = passwordTemporal()
  const u = await prisma.usuario.create({ data: { email, nombre, rol, passwordHash: hashPassword(temporal) } })
  return NextResponse.json({ id: u.id, passwordTemporal: temporal }, { status: 201 })
})

// Depende de la sesión del usuario: nunca se pre-renderiza.
export const dynamic = 'force-dynamic'
