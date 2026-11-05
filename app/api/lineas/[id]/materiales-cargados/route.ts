import { NextResponse } from 'next/server'
import { handler, parseId, requireUser } from '../../../../lib/api'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// Usar /tmp del sistema (funciona en Vercel)
function getTempPath(id: number): string {
  const tempDir = process.env.VERCEL ? '/tmp' : path.join(os.tmpdir())
  return path.join(tempDir, `materiales-linea-${id}.json`)
}

// GET: Obtener materiales cargados
export const GET = handler(async (request, { params }: { params: { id: string } }) => {
  await requireUser(request)
  const id = parseId(params.id)

  try {
    const filePath = getTempPath(id)

    console.log(`[MATERIALES_GET] Buscando: ${filePath}`)

    if (!fs.existsSync(filePath)) {
      console.log(`[MATERIALES_GET] Archivo no existe: ${filePath}`)
      return NextResponse.json({ success: false, familias: [] })
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    const familias = JSON.parse(content)

    console.log(`[MATERIALES_GET] Encontrado: ${familias.length} familias`)

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
    const filePath = getTempPath(id)

    console.log(`[MATERIALES_POST] Guardando en: ${filePath}`)
    console.log(`[MATERIALES_POST] Familias: ${familias.length}`)

    fs.writeFileSync(filePath, JSON.stringify(familias, null, 2))

    console.log(`[MATERIALES_POST] Guardado exitosamente`)

    return NextResponse.json({ success: true, familias })
  } catch (e) {
    console.error('[MATERIALES_POST]', e)
    return NextResponse.json({ success: false, error: `Error saving materials: ${e}` }, { status: 500 })
  }
})
