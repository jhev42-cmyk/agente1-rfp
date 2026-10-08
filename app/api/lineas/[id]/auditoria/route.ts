import { NextResponse } from 'next/server'
import { handler, parseId, requireUser } from '../../../../lib/api'
import { prisma } from '../../../../lib/db'

export const GET = handler(async (request, { params }: { params: { id: string } }) => {
  await requireUser(request)
  const registros = await prisma.auditoria.findMany({
    where: { lineaId: parseId(params.id) }, orderBy: { fecha: 'desc' }, take: 1000,
  })
  return NextResponse.json(registros)
})
