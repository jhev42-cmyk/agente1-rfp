import { NextResponse } from 'next/server'
import { handler, parseId, requireUser } from '../../../../lib/api'
import { asignarNorma } from '../../../../lib/lineas'

// Asigna (o quita, con normaId null) la norma y configuración a uno o varios postes.
export const PATCH = handler(async (request, { params }: { params: { id: string } }) => {
  const user = await requireUser(request)
  return NextResponse.json(await asignarNorma(parseId(params.id), await request.json(), user.email))
})
