import { NextResponse } from 'next/server'
import { handler, parseId, requireUser } from '../../../../lib/api'
import * as fs from 'fs'
import * as path from 'path'

// GET: Obtener materiales cargados
export const GET = handler(async (request, { params }: { params: { id: string } }) => {
  await requireUser(request)
  const id = parseId(params.id)

  try {
    const tempDir = path.join(process.cwd(), 'tmp')
    const filePath = path.join(tempDir, `materiales-${id}.json`)

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ success: false, familias: [] })
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    const familias = JSON.parse(content)

    return NextResponse.json({ success: true, familias })
  } catch (e) {
    console.error('[MATERIALES_GET]', e)
    return NextResponse.json({ success: false, familias: [] })
  }
})

// POST: Guardar materiales cargados
export const POST = handler(async (request, { params }: { params: { id: string } }) => {
  await requireUser(request)
  const id = parseId(params.id)
  const { familias } = await request.json()

  if (!Array.isArray(familias)) {
    return NextResponse.json({ success: false, error: 'Invalid format' }, { status: 400 })
  }

  try {
    const tempDir = path.join(process.cwd(), 'tmp')

    // Crear directorio tmp si no existe
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    const filePath = path.join(tempDir, `materiales-${id}.json`)
    fs.writeFileSync(filePath, JSON.stringify(familias, null, 2))

    return NextResponse.json({ success: true, familias })
  } catch (e) {
    console.error('[MATERIALES_POST]', e)
    return NextResponse.json({ success: false, error: 'Error saving materials' }, { status: 500 })
  }
})
