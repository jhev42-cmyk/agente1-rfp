import { NextResponse } from 'next/server'
import { HttpError, handler, parseId, requireUser } from '../../../../lib/api'
import { prisma } from '../../../../lib/db'
import { Calculo, calcular, erroresAprobacion } from '../../../../lib/lineas'

// Materiales consolidados y cotización. En revisión y aprobada se devuelve la cotización congelada
// al enviar a revisión, de modo que los cambios posteriores del catálogo o de precios no la alteran.
export const GET = handler(async (request, { params }: { params: { id: string } }) => {
  await requireUser(request)
  const id = parseId(params.id)
  const linea = await prisma.linea.findUnique({ where: { id }, select: { estado: true, snapshot: true } })
  if (!linea) throw new HttpError(404, 'Línea no encontrada')
  if (linea.estado !== 'BORRADOR' && linea.snapshot) {
    const congelada = linea.snapshot as unknown as Calculo
    return NextResponse.json({ ...congelada, congelado: true, errores: linea.estado === 'APROBADA' ? [] : erroresAprobacion(congelada) })
  }
  const c = await calcular(id)
  return NextResponse.json({ ...c, congelado: false, errores: erroresAprobacion(c) })
})
