import { NextResponse } from 'next/server'
import { handler, requireAdmin } from '../../../lib/api'
import { importarPrecios } from '../../../lib/catalogo'

export const POST = handler(async (request) => {
  const user = requireAdmin(request)
  return NextResponse.json(await importarPrecios(await request.json(), user.email), { status: 201 })
})
