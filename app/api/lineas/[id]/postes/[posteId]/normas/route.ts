import { NextRequest, NextResponse } from 'next/server'
import { handler, HttpError } from '@/app/lib/api'
import { prisma } from '@/app/lib/db'

// GET /api/lineas/[id]/postes/[posteId]/normas - Obtener normas del poste
export const GET = handler(async (request: NextRequest, { params }: any) => {
  const { id, posteId } = params

  const poste = await prisma.poste.findUnique({
    where: { id: parseInt(posteId) },
    include: {
      normas: {
        include: {
          norma: { include: { configuraciones: true } },
          configuracion: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      linea: true,
    },
  })

  if (!poste || poste.linea.id !== parseInt(id)) {
    throw new HttpError(404, 'Poste no encontrado')
  }

  return NextResponse.json(poste.normas)
})

// POST /api/lineas/[id]/postes/[posteId]/normas - Agregar norma al poste
export const POST = handler(async (request: NextRequest, { params }: any) => {
  const { id, posteId } = params
  const { normaId, configuracionId } = await request.json()

  if (!normaId) throw new HttpError(400, 'normaId requerido')

  // Verificar que el poste existe y pertenece a la línea
  const poste = await prisma.poste.findUnique({
    where: { id: parseInt(posteId) },
    include: { linea: true },
  })

  if (!poste || poste.linea.id !== parseInt(id)) {
    throw new HttpError(404, 'Poste no encontrado')
  }

  // Verificar que la norma existe
  const norma = await prisma.norma.findUnique({
    where: { id: parseInt(normaId) },
  })

  if (!norma) throw new HttpError(404, 'Norma no encontrada')

  // Si hay configuracionId, verificar que pertenece a esta norma
  if (configuracionId) {
    const config = await prisma.normaConfiguracion.findUnique({
      where: { id: parseInt(configuracionId) },
    })

    if (!config || config.normaId !== norma.id) {
      throw new HttpError(400, 'Configuración no válida para esta norma')
    }
  }

  // Verificar si ya existe la relación (no duplicar)
  const existe = await prisma.posteNorma.findUnique({
    where: { posteId_normaId: { posteId: poste.id, normaId: norma.id } },
  })

  if (existe) throw new HttpError(409, 'La norma ya está asignada a este poste')

  // Crear la relación
  const posteNorma = await prisma.posteNorma.create({
    data: {
      posteId: poste.id,
      normaId: norma.id,
      configuracionId: configuracionId ? parseInt(configuracionId) : null,
      seleccionada: false,
    },
    include: {
      norma: { include: { configuraciones: true } },
      configuracion: true,
    },
  })

  return NextResponse.json(posteNorma, { status: 201 })
})
