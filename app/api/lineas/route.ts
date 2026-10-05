import { NextResponse } from 'next/server'
import { handler, requireUser } from '../../lib/api'
import { prisma } from '../../lib/db'
import { crearLinea } from '../../lib/lineas'

export const GET = handler(async (request) => {
  requireUser(request)
  const lineas = await prisma.linea.findMany({
    orderBy: [{ updatedAt: 'desc' }],
    select: {
      id: true, grupo: true, revision: true, nombre: true, longitudKm: true, operador: true, estado: true,
      creadoPor: true, createdAt: true, updatedAt: true, aprobadaPor: true, aprobadaAt: true,
      _count: { select: { postes: true } },
      postes: { where: { OR: [{ normaId: null }, { configuracionId: null }] }, select: { id: true } },
    },
  })
  return NextResponse.json(lineas.map(({ postes, _count, ...l }) => ({ ...l, postes: _count.postes, pendientes: postes.length })))
})

export const POST = handler(async (request) => {
  const user = requireUser(request)
  const linea = await crearLinea(await request.json(), user.email)
  return NextResponse.json({ id: linea.id }, { status: 201 })
})

// Depende de la sesión del usuario: nunca se pre-renderiza.
export const dynamic = 'force-dynamic'
