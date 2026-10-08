import { NextResponse } from 'next/server'
import { handler, requireUser } from '../../../lib/api'

export const GET = handler(async (request) => {
  return NextResponse.json({ user: await requireUser(request) })
})

// Depende de la sesión del usuario: nunca se pre-renderiza.
export const dynamic = 'force-dynamic'
