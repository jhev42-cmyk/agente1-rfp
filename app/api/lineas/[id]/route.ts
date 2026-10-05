import { NextResponse } from 'next/server'
import { HttpError, handler, parseId, requireUser } from '../../../lib/api'
import { prisma } from '../../../lib/db'
import { editarLinea } from '../../../lib/lineas'

type Ctx = { params: { id: string } }

export const GET = handler(async (request, { params }: Ctx) => {
  requireUser(request)
  const id = parseId(params.id)
  const linea = await prisma.linea.findUnique({
    where: { id },
    select: {
      id: true, grupo: true, revision: true, nombre: true, longitudKm: true, operador: true, estado: true,
      kmzNombre: true, creadoPor: true, createdAt: true, updatedAt: true, aprobadaPor: true, aprobadaAt: true,
      trayectos: { orderBy: { numero: 'asc' }, select: { numero: true, cantidadPostes: true } },
      postes: {
        orderBy: [{ trayecto: { numero: 'asc' } }, { numero: 'asc' }],
        select: { id: true, codigo: true, numero: true, normaId: true, configuracionId: true, trayecto: { select: { numero: true } } },
      },
      partidas: { orderBy: { id: 'asc' } },
    },
  })
  if (!linea) throw new HttpError(404, 'Línea no encontrada')
  const revisiones = await prisma.linea.findMany({
    where: { grupo: linea.grupo }, orderBy: { revision: 'asc' }, select: { id: true, revision: true, estado: true },
  })
  return NextResponse.json({
    ...linea,
    postes: linea.postes.map(({ trayecto, ...p }) => ({ ...p, trayecto: trayecto.numero })),
    revisiones,
  })
})

export const PATCH = handler(async (request, { params }: Ctx) => {
  const user = requireUser(request)
  await editarLinea(parseId(params.id), await request.json(), user.email)
  return NextResponse.json({ ok: true })
})
