import { NextResponse } from 'next/server'
import { handler, parseId, requireUser } from '../../../../../lib/api'
import { editarPartida, eliminarPartida } from '../../../../../lib/lineas'

type Ctx = { params: { id: string; partidaId: string } }

export const PATCH = handler(async (request, { params }: Ctx) => {
  const user = requireUser(request)
  await editarPartida(parseId(params.id), parseId(params.partidaId), await request.json(), user.email)
  return NextResponse.json({ ok: true })
})

export const DELETE = handler(async (request, { params }: Ctx) => {
  const user = requireUser(request)
  const { motivo } = await request.json().catch(() => ({}))
  await eliminarPartida(parseId(params.id), parseId(params.partidaId), motivo, user.email)
  return NextResponse.json({ ok: true })
})
