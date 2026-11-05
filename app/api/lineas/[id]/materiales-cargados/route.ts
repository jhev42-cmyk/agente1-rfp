import { NextResponse } from 'next/server'
import { handler, parseId, requireUser } from '../../../../lib/api'

// Almacenamiento temporal en memoria (se pierde al reiniciar el servidor)
// En producción, usar Redis o base de datos
const materialesCache = new Map<number, any[]>()

// GET: Obtener materiales cargados
export const GET = handler(async (request, { params }: { params: { id: string } }) => {
  await requireUser(request)
  const id = parseId(params.id)
  const materiales = materialesCache.get(id)

  if (!materiales) {
    return NextResponse.json({ success: false, familias: [] })
  }

  return NextResponse.json({ success: true, familias: materiales })
})

// POST: Guardar materiales cargados
export const POST = handler(async (request, { params }: { params: { id: string } }) => {
  await requireUser(request)
  const id = parseId(params.id)
  const { familias } = await request.json()

  if (!Array.isArray(familias)) {
    return NextResponse.json({ success: false, error: 'Invalid format' }, { status: 400 })
  }

  materialesCache.set(id, familias)
  return NextResponse.json({ success: true, familias })
})
