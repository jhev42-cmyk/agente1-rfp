import { NextResponse } from 'next/server'
import { HttpError, handler, parseId, requireUser } from '../../../../lib/api'
import * as fs from 'fs'
import * as path from 'path'

export const GET = handler(async (request, { params }: { params: { id: string } }) => {
  await requireUser(request)
  const id = parseId(params.id)

  try {
    const projectRoot = process.cwd()
    const csvPath = path.join(projectRoot, 'public', 'materiales_normas_celsia.csv')

    if (!fs.existsSync(csvPath)) {
      throw new HttpError(404, 'CSV de materiales no encontrado.')
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const lineas = csvContent.split('\n').filter(l => l.trim())

    // Parsear el CSV agrupado por familias
    const familias: any[] = []
    let familiaActual: any = null
    let enHeaders = false

    for (const linea of lineas) {
      const partes = linea.split(';').map(p => p.trim().replace(/^"|"$/g, ''))

      // Detectar línea de familia (formato: "Familia;;")
      if (partes.length >= 1 && partes[1] === '' && partes[2] === '' && !linea.includes('Descripción')) {
        if (familiaActual) familias.push(familiaActual)
        familiaActual = {
          nombre: partes[0],
          items: [],
        }
        enHeaders = false
      } else if (partes[0] === 'Descripción técnica' || partes[0] === 'Descripción') {
        // Headers de tabla
        enHeaders = true
      } else if (enHeaders && partes[0]) {
        // Verificar si es línea de totales
        if (partes[0].includes('Total')) {
          if (familiaActual) {
            familiaActual.total = {
              nombre: partes[0],
              cantidad: parseFloat(partes[1]) || 0,
            }
          }
        } else {
          // Es un material
          if (familiaActual) {
            familiaActual.items.push({
              descripcion: partes[0],
              cantidad: partes[1] ? parseFloat(partes[1]) : 0,
              presenteEn: partes[2] || '',
            })
          }
        }
      }
    }

    if (familiaActual) familias.push(familiaActual)

    console.log(`[MATERIALES] CSV parseado: ${familias.length} familias`)

    return NextResponse.json({
      success: true,
      familias,
    })
  } catch (error: any) {
    console.error('[MATERIALES] Error:', error.message)
    if (error instanceof HttpError) throw error
    throw new HttpError(500, `Error al cargar materiales: ${error.message}`)
  }
})
