import { NextResponse } from 'next/server'
import { handler, parseId, requireAdmin, requireUser } from '../../../../lib/api'
import { detalleNorma, nuevaVersionNorma } from '../../../../lib/catalogo'

type Ctx = { params: { id: string } }

export const GET = handler(async (request, { params }: Ctx) => {
  await requireUser(request)
  return NextResponse.json(await detalleNorma(parseId(params.id)))
})

// Crea una nueva versión de la norma con los materiales enviados.
export const POST = handler(async (request, { params }: Ctx) => {
  const user = await requireAdmin(request)
  const nueva = await nuevaVersionNorma(parseId(params.id), await request.json(), user.email)
  return NextResponse.json({ id: nueva.id, version: nueva.version }, { status: 201 })
})
