import { NextResponse } from 'next/server'
import { handler, requireUser } from '../../../lib/api'
import { listarMateriales } from '../../../lib/catalogo'

export const GET = handler(async (request) => {
  await requireUser(request)
  return NextResponse.json(await listarMateriales())
})

// Depende de la sesión del usuario: nunca se pre-renderiza.
export const dynamic = 'force-dynamic'
