import { NextResponse } from 'next/server'
import { HttpError, handler, parseId, requireUser } from '../../../../../lib/api'
import { prisma } from '../../../../../lib/db'

// Exportar normas seleccionadas de la línea a un archivo .txt
export const GET = handler(async (request, { params }: { params: { id: string } }) => {
  await requireUser(request)
  const id = parseId(params.id)

  // Obtener todos los postes con sus normas
  const postes = await prisma.poste.findMany({
    where: { lineaId: id },
    orderBy: [{ trayecto: { numero: 'asc' } }, { numero: 'asc' }],
    select: {
      codigo: true,
      normas: {
        select: {
          normaId: true,
          seleccionada: true,
        },
      },
    },
  })

  if (!postes.length) {
    throw new HttpError(404, 'No hay postes en la línea')
  }

  // Obtener todas las normas
  const normaIds = new Set<number>()
  for (const poste of postes) {
    for (const pn of poste.normas) {
      if (pn.seleccionada) {
        normaIds.add(pn.normaId)
      }
    }
  }

  if (normaIds.size === 0) {
    throw new HttpError(400, 'No hay normas seleccionadas en los postes')
  }

  const normas = await prisma.norma.findMany({
    where: { id: { in: Array.from(normaIds) } },
    select: { codigo: true },
    orderBy: { codigo: 'asc' },
  })

  // Generar contenido del archivo .txt
  const content = `NORMAS SELECCIONADAS EN LA LÍNEA
=====================================

${normas.map(n => n.codigo).join('\n')}

Total de normas: ${normas.length}
Generado: ${new Date().toLocaleString('es-CO')}
`

  // Retornar como descarga de archivo
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="normas-seleccionadas.txt"',
    },
  })
})
