import { NextResponse } from 'next/server'
import { handler, requireUser } from '../../../lib/api'
import { prisma } from '../../../lib/db'

// Registro de líneas eliminadas (los datos de la línea ya no existen; queda el resumen).
export const GET = handler(async (request) => {
  requireUser(request)
  return NextResponse.json(await prisma.auditoria.findMany({
    where: { lineaId: null, entidad: 'linea', accion: 'eliminar' }, orderBy: { fecha: 'desc' }, take: 200,
  }))
})

// Depende de la sesión del usuario: nunca se pre-renderiza.
export const dynamic = 'force-dynamic'
