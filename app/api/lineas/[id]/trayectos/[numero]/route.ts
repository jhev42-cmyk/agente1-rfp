import { NextResponse } from 'next/server'
import { handler, parseId, requireUser } from '../../../../../lib/api'
import { ajustarTrayecto } from '../../../../../lib/lineas'

export const PATCH = handler(async (request, { params }: { params: { id: string; numero: string } }) => {
  const user = await requireUser(request)
  const r = await ajustarTrayecto(parseId(params.id), parseId(params.numero), await request.json(), user.email)
  return NextResponse.json({ retirados: r.retirados })
})
