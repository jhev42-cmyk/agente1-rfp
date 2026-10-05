import { NextResponse } from 'next/server'
import { handler, parseId, requireUser } from '../../../../lib/api'
import { crearPartida } from '../../../../lib/lineas'

export const POST = handler(async (request, { params }: { params: { id: string } }) => {
  const user = requireUser(request)
  const partida = await crearPartida(parseId(params.id), await request.json(), user.email)
  return NextResponse.json({ id: partida.id }, { status: 201 })
})
