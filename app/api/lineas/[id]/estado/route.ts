import { NextResponse } from 'next/server'
import { handler, parseId, requireUser } from '../../../../lib/api'
import { cambiarEstado } from '../../../../lib/lineas'

export const POST = handler(async (request, { params }: { params: { id: string } }) => {
  const user = await requireUser(request)
  await cambiarEstado(parseId(params.id), await request.json(), user)
  return NextResponse.json({ ok: true })
})
