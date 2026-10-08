import { NextResponse } from 'next/server'
import { handler, requireUser } from '../../../lib/api'
import { prisma } from '../../../lib/db'

// Cambios del catálogo (normas, esquemas, precios); los de las líneas están en /api/lineas/[id]/auditoria.
export const GET = handler(async (request) => {
  await requireUser(request)
  return NextResponse.json(await prisma.auditoria.findMany({ where: { lineaId: null, entidad: { in: ['norma', 'precio'] } }, orderBy: { fecha: 'desc' }, take: 500 }))
})

// Depende de la sesión del usuario: nunca se pre-renderiza.
export const dynamic = 'force-dynamic'
