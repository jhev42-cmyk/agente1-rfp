import { NextRequest, NextResponse } from 'next/server'
import { handler, HttpError } from '@/app/lib/api'
import { prisma } from '@/app/lib/db'

// PATCH /api/lineas/[id]/postes/[posteId]/normas/[normaId] - Cambiar norma seleccionada o configuración
export const PATCH = handler(async (request: NextRequest, { params }: any) => {
  const { id, posteId, normaId } = params
  const { seleccionada, configuracionId } = await request.json()

  // Verificar que el poste existe
  const poste = await prisma.poste.findUnique({
    where: { id: parseInt(posteId) },
    include: { linea: true },
  })

  if (!poste || poste.linea.id !== parseInt(id)) {
    throw new HttpError(404, 'Poste no encontrado')
  }

  // Obtener la relación PosteNorma
  const posteNorma = await prisma.posteNorma.findUnique({
    where: { posteId_normaId: { posteId: poste.id, normaId: parseInt(normaId) } },
  })

  if (!posteNorma) {
    throw new HttpError(404, 'Norma no asignada a este poste')
  }

  // Si se marca como seleccionada, deseleccionar las demás
  const updateData: any = {}

  if (seleccionada === true) {
    await prisma.posteNorma.updateMany({
      where: { posteId: poste.id, NOT: { normaId: parseInt(normaId) } },
      data: { seleccionada: false },
    })
    updateData.seleccionada = true
  } else if (seleccionada === false) {
    updateData.seleccionada = false
  }

  if (configuracionId !== undefined) {
    if (configuracionId === null) {
      updateData.configuracionId = null
    } else {
      const config = await prisma.normaConfiguracion.findUnique({
        where: { id: parseInt(configuracionId) },
      })

      if (!config || config.normaId !== parseInt(normaId)) {
        throw new HttpError(400, 'Configuración no válida para esta norma')
      }

      updateData.configuracionId = parseInt(configuracionId)
    }
  }

  const actualizado = await prisma.posteNorma.update({
    where: { id: posteNorma.id },
    data: updateData,
    include: {
      norma: { include: { configuraciones: true } },
      configuracion: true,
    },
  })

  return NextResponse.json(actualizado)
})

// DELETE /api/lineas/[id]/postes/[posteId]/normas/[normaId] - Eliminar norma del poste
export const DELETE = handler(async (request: NextRequest, { params }: any) => {
  const { id, posteId, normaId } = params

  // Verificar que el poste existe
  const poste = await prisma.poste.findUnique({
    where: { id: parseInt(posteId) },
    include: { linea: true },
  })

  if (!poste || poste.linea.id !== parseInt(id)) {
    throw new HttpError(404, 'Poste no encontrado')
  }

  // Verificar que existe la relación
  const posteNorma = await prisma.posteNorma.findUnique({
    where: { posteId_normaId: { posteId: poste.id, normaId: parseInt(normaId) } },
  })

  if (!posteNorma) {
    throw new HttpError(404, 'Norma no asignada a este poste')
  }

  // Eliminar la relación
  await prisma.posteNorma.delete({
    where: { id: posteNorma.id },
  })

  return NextResponse.json({ ok: true })
})
