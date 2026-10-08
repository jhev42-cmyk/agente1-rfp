import { NextResponse } from 'next/server'
import { handler, parseId, requireUser } from '../../../../lib/api'
import { crearRevision } from '../../../../lib/lineas'

export const POST = handler(async (request, { params }: { params: { id: string } }) => {
  const user = await requireUser(request)
  const { motivo } = await request.json().catch(() => ({}))
  const nueva = await crearRevision(parseId(params.id), motivo, user.email)
  return NextResponse.json({ id: nueva.id, revision: nueva.revision }, { status: 201 })
})
