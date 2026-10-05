import { NextResponse } from 'next/server'
import { handler, requireUser } from '../../../lib/api'
import { listarNormas } from '../../../lib/catalogo'

// Todas las versiones (vigentes y anteriores): los postes pueden apuntar a una versión anterior.
export const GET = handler(async (request) => {
  requireUser(request)
  const operador = request.nextUrl.searchParams.get('operador') || undefined
  return NextResponse.json(await listarNormas(operador))
})

// Depende de la sesión del usuario: nunca se pre-renderiza.
export const dynamic = 'force-dynamic'
