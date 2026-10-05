import { NextResponse } from 'next/server'
import { HttpError, handler, parseId, requireUser } from '../../../../lib/api'
import { prisma } from '../../../../lib/db'
import { calcular, erroresAprobacion } from '../../../../lib/lineas'

// Materiales consolidados y cotización. Una línea aprobada devuelve la cotización congelada al
// aprobar, de modo que los cambios posteriores del catálogo o de precios no la alteran.
export const GET = handler(async (request, { params }: { params: { id: string } }) => {
  requireUser(request)
  const id = parseId(params.id)
  const linea = await prisma.linea.findUnique({ where: { id }, select: { estado: true, snapshot: true } })
  if (!linea) throw new HttpError(404, 'Línea no encontrada')
  if (linea.estado === 'APROBADA' && linea.snapshot) {
    return NextResponse.json({ ...(linea.snapshot as object), congelado: true, errores: [] })
  }
  const c = await calcular(id)
  return NextResponse.json({ ...c, congelado: false, errores: erroresAprobacion(c) })
})
