import { NextRequest, NextResponse } from 'next/server'
import { handler, HttpError } from '@/app/lib/api'
import { prisma } from '@/app/lib/db'

// GET /api/lineas/[lineaId]/postes/[posteId]/normas-disponibles?operador=CELSIA
// Obtener normas disponibles que no están ya asignadas al poste
export const GET = handler(async (request: NextRequest, { params }: any) => {
  const { lineaId, posteId } = params
  const { searchParams } = new URL(request.url)
  const operador = searchParams.get('operador')

  // Verificar que el poste existe
  const poste = await prisma.poste.findUnique({
    where: { id: parseInt(posteId) },
    include: {
      linea: true,
      normas: { select: { normaId: true } },
    },
  })

  if (!poste || poste.linea.id !== parseInt(lineaId)) {
    throw new HttpError(404, 'Poste no encontrado')
  }

  // Obtener normas ya asignadas
  const normasAsignadas = poste.normas.map((pn) => pn.normaId)

  // Filtrar: normas vigentes, del operador especificado, no asignadas
  const where: any = {
    vigente: true,
    NOT: { id: { in: normasAsignadas } },
  }

  if (operador) {
    where.operador = operador
  }

  const normas = await prisma.norma.findMany({
    where,
    include: {
      configuraciones: {
        select: { id: true, nombre: true, orden: true },
        orderBy: { orden: 'asc' },
      },
    },
    orderBy: [{ operador: 'asc' }, { codigo: 'asc' }],
  })

  return NextResponse.json(normas)
})
